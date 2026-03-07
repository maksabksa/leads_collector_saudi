import "dotenv/config";
import express from "express";
// ===== SSE clients store =====
const sseClients = new Set<import("http").ServerResponse>();
export function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  Array.from(sseClients).forEach(res => {
    try { res.write(payload); } catch { sseClients.delete(res); }
  });
}
export function broadcastChatUpdate(chatId: number, accountId: string) {
  broadcastSSE("chat-update", { chatId, accountId, ts: Date.now() });
}
export function broadcastVoiceProcessing(chatId: number, accountId: string, status: "processing" | "done" | "failed") {
  broadcastSSE("voice-processing", { chatId, accountId, status, ts: Date.now() });
}
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// استعادة جلسات واتساب تلقائياً من قاعدة البيانات
async function restoreWhatsAppSessions() {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return;
    const { whatsappAccounts } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const { startWhatsAppSession, setIncomingMessageHandler } = await import("../whatsappAutomation");
    const { storagePut } = await import("../storage");

    // تسجيل معالج الرسائل الواردة
    setIncomingMessageHandler(async ({ accountId, phone, contactName, message, hasMedia, mediaBase64, mimetype, filename }) => {
      try {
        const { whatsappChats, whatsappChatMessages } = await import("../../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        const db2 = await getDb();
        if (!db2) return;

        // رفع الوسائط إلى S3 إذا وجدت
        let uploadedMediaUrl: string | undefined;
        let resolvedMediaType: string | undefined;
        let resolvedFilename: string | undefined;
        if (hasMedia && mediaBase64 && mimetype) {
          try {
            const ext = mimetype.split("/")[1]?.split(";")[0] || "bin";
            const key = `wa-media/${accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const buffer = Buffer.from(mediaBase64, "base64");
            const { url } = await storagePut(key, buffer, mimetype);
            uploadedMediaUrl = url;
            resolvedMediaType = mimetype.startsWith("image") ? "image"
              : mimetype.startsWith("video") ? "video"
              : mimetype.startsWith("audio") ? "audio"
              : "document";
            resolvedFilename = filename;
          } catch (e) {
            console.error("[WhatsApp] خطأ رفع وسائط واردة:", e);
          }
        }

        // البحث عن المحادثة أو إنشاء جديدة
        let [chat] = await db2.select().from(whatsappChats).where(
          and(eq(whatsappChats.accountId, accountId), eq(whatsappChats.phone, phone))
        ).limit(1);

        const lastMsg = uploadedMediaUrl ? (message || `صورة/ملف`) : message;

        // ===== جلب اسم جهة الاتصال بأولوية: اسم واتساب > اسم Lead > رقم الهاتف =====
        let resolvedContactName = contactName; // اسم واتساب (pushname) إن وجد
        if (!resolvedContactName) {
          // البحث عن الرقم في جدول leads
          try {
            const { leads } = await import("../../drizzle/schema");
            const { or, like } = await import("drizzle-orm");
            // تنظيف الرقم: حذف الرموز غير الرقمية
            const cleanPhone = phone.replace(/\D/g, "");
            const [matchedLead] = await db2.select({ companyName: leads.companyName })
              .from(leads)
              .where(
                or(
                  like(leads.verifiedPhone, `%${cleanPhone.slice(-9)}%`),
                  like(leads.verifiedPhone, `%${cleanPhone}%`)
                )
              ).limit(1);
            if (matchedLead?.companyName) {
              resolvedContactName = matchedLead.companyName;
            }
          } catch { /* تجاهل */ }
        }

        if (!chat) {
          const [res] = await db2.insert(whatsappChats).values({
            accountId, phone,
            contactName: resolvedContactName,
            lastMessage: lastMsg, lastMessageAt: new Date(), unreadCount: 1,
          });
          const insertId = (res as { insertId: number }).insertId;
          [chat] = await db2.select().from(whatsappChats).where(eq(whatsappChats.id, insertId)).limit(1);
        } else {
          // تحديث الاسم تلقائياً:
          // 1. إذا وصل اسم واتساب (pushname) جديد → تحديث
          // 2. إذا لم يكن هناك اسم محفوظ ووجد اسم Lead → تحديث
          const shouldUpdateName = resolvedContactName && (
            !chat.contactName || // لا يوجد اسم محفوظ
            (contactName && contactName !== chat.contactName) // وصل اسم واتساب جديد
          );
          await db2.update(whatsappChats).set({
            lastMessage: lastMsg,
            lastMessageAt: new Date(),
            unreadCount: chat.unreadCount + 1,
            ...(shouldUpdateName ? { contactName: resolvedContactName } : {}),
          }).where(eq(whatsappChats.id, chat.id));
        }

        await db2.insert(whatsappChatMessages).values({
          chatId: chat.id, accountId, direction: "incoming",
          message: message || "",
          mediaUrl: uploadedMediaUrl,
          mediaType: resolvedMediaType,
          mediaFilename: resolvedFilename,
          status: "read",
        });
        // ===== إشعار SSE للـ frontend بوصول رسالة جديدة =====
        broadcastChatUpdate(chat.id, accountId);
        // ===== الرد التلقائي بالـ AI ======
        // يرد على الرسائل النصية والصوتية (voice/audio)
        const isVoiceMessage = (resolvedMediaType === "audio" && !!uploadedMediaUrl) || (!message?.trim() && resolvedMediaType === "audio");
        const hasTextOrVoice = (message && message.trim()) || isVoiceMessage;
        if (hasTextOrVoice) {
          // نفذ بشكل غير متزامن حتى لا يؤخر حفظ الرسالة الواردة
          setImmediate(async () => {
            try {
              const { aiSettings, aiPersonality, ragDocuments, ragConversationExamples } = await import("../../drizzle/schema");
              const { sql: sqlFn } = await import("drizzle-orm");
              const { invokeLLM } = await import("./llm");
              const { sendWhatsAppMessage } = await import("../whatsappAutomation");
              const db3 = await getDb();
              if (!db3) return;

              // جلب الإعدادات العامة
              const [settings] = await db3.select().from(aiSettings).limit(1);
              const globalEnabled = settings?.globalAutoReplyEnabled ?? false;

              // جلب حالة المحادثة
              const { whatsappChats: waChats } = await import("../../drizzle/schema");
              const { and: and2, eq: eq2 } = await import("drizzle-orm");
              const [freshChat] = await db3.select().from(waChats).where(
                and2(eq2(waChats.accountId, accountId), eq2(waChats.phone, phone))
              ).limit(1);
              const chatAutoReply = freshChat?.aiAutoReplyEnabled ?? false;

              // ===== منطق الرد التلقائي =====
              // globalEnabled = مفتاح الرد العام (يُفعّل/يُوقف الكل)
              // chatAutoReply = مفتاح الرد لهذه المحادثة بالذات
              // المنطق: يرد إذا كان chatAutoReply مفعّلاً (سواء كان globalEnabled مفعلاً أو لا)
              // هذا يسمح بتفعيل AI لمحادثة واحدة حتى لو كان الـ AI الإجمالي معطلاً
              if (!chatAutoReply) {
                console.log(`[AI AutoReply] ⏸ متوقف - chatAutoReply=${chatAutoReply} (globalEnabled=${globalEnabled})`);
                return;
              }
              if (!globalEnabled) {
                console.log(`[AI AutoReply] ✅ رد مخصص لمحادثة واحدة - globalEnabled=false لكن chatAutoReply=true`);
              }

              // ===== تحويل الرسالة الصوتية لنص (Whisper) =====
              let effectiveMessage = message || "";
              if (isVoiceMessage && uploadedMediaUrl) {
                try {
                  const { transcribeAudio } = await import("./voiceTranscription");
                  console.log(`[AI AutoReply] 🎤 بدء تحويل صوتي - URL: ${uploadedMediaUrl?.substring(0, 80)}... mimetype: ${mimetype}`);
                  // إرسال حالة معالجة الصوت للـ frontend
                  if (freshChat) broadcastVoiceProcessing(freshChat.id, accountId, "processing");
                  const transcribeResult = await transcribeAudio({ audioUrl: uploadedMediaUrl, language: "ar" });
                  if ("text" in transcribeResult && transcribeResult.text?.trim()) {
                    effectiveMessage = transcribeResult.text.trim();
                    console.log(`[AI AutoReply] 🎤 تحويل صوتي: "${effectiveMessage}"`);
                    if (freshChat) broadcastVoiceProcessing(freshChat.id, accountId, "done");
                  } else {
                    // لوغ تفصيلي لمعرفة سبب الفشل
                    const errResult = transcribeResult as any;
                    console.log(`[AI AutoReply] ⚠️ فشل تحويل الصوت - سبب: ${errResult.error || JSON.stringify(transcribeResult)}`);
                    if (freshChat) broadcastVoiceProcessing(freshChat.id, accountId, "failed");
                    // بدلاً من إرسال رسالة محيرة، لا ترد على الرسائل الصوتية إذا فشل التحويل
                    return;
                  }
                } catch (transcribeErr) {
                  console.error("[AI AutoReply] خطأ تحويل الصوت:", transcribeErr);
                  if (freshChat) broadcastVoiceProcessing(freshChat.id, accountId, "failed");
                  // لا ترد على الرسائل الصوتية إذا فشل التحويل بدلاً من إرسال رسالة محيرة
                  return;
                }
              }
              // ===== فحص الكلمات المفتاحية لبناء المحادثة =====
              const conversationKeywords = (settings as any)?.conversationKeywords;
              const kwList: Array<{keyword: string, response: string, isActive: boolean}> =
                Array.isArray(conversationKeywords) ? conversationKeywords
                : (typeof conversationKeywords === "string" ? JSON.parse(conversationKeywords || "[]") : []);
              const msgLower = effectiveMessage.toLowerCase();
              for (const kw of kwList) {
                if (kw.isActive && msgLower.includes(kw.keyword.toLowerCase())) {
                  // إرسال رد الكلمة المفتاحية
                  await sendWhatsAppMessage(phone, kw.response, accountId);
                  const { whatsappChatMessages: waChatMsgs2 } = await import("../../drizzle/schema");
                  if (freshChat) {
                    await db3.insert(waChatMsgs2).values({
                      chatId: freshChat.id, accountId, direction: "outgoing",
                      message: kw.response, status: "sent",
                    });
                    await db3.update(waChats).set({
                      lastMessage: kw.response, lastMessageAt: new Date(),
                    }).where(eq2(waChats.id, freshChat.id));
                  }
                  console.log(`[AI AutoReply] 🔑 رد بكلمة مفتاحية "${kw.keyword}" أُرسل إلى ${phone}`);
                  return; // لا تكمل لـ AI بعد رد الكلمة المفتاحية
                }
              }

              // ===== فحص كلمات التصعيد الفوري =====
              const escalationEnabled = (settings as any)?.escalationEnabled ?? false;
              const escalationPhone = (settings as any)?.escalationPhone;
              const escalationMessage = (settings as any)?.escalationMessage || "يرجى التواصل مع أحد ممثلينا لمساعدتك بشكل أفضل.";
              const escalationKeywordsRaw = (settings as any)?.escalationKeywords;
              const escalationKws: string[] = Array.isArray(escalationKeywordsRaw) ? escalationKeywordsRaw
                : (typeof escalationKeywordsRaw === "string" ? JSON.parse(escalationKeywordsRaw || "[]") : []);

              if (escalationEnabled && escalationKws.length > 0) {
                const hasEscalationKw = escalationKws.some(kw => msgLower.includes(kw.toLowerCase()));
                if (hasEscalationKw) {
                  // إرسال رسالة التصعيد للعميل
                  await sendWhatsAppMessage(phone, escalationMessage, accountId);
                  const { whatsappChatMessages: waChatMsgs3 } = await import("../../drizzle/schema");
                  if (freshChat) {
                    await db3.insert(waChatMsgs3).values({
                      chatId: freshChat.id, accountId, direction: "outgoing",
                      message: escalationMessage, status: "sent",
                    });
                    await db3.update(waChats).set({
                      lastMessage: escalationMessage, lastMessageAt: new Date(),
                    }).where(eq2(waChats.id, freshChat.id));
                  }
                  // إرسال إشعار لرقم التصعيد
                  if (escalationPhone) {
                    const escalationNotif = `🚨 تصعيد من العميل ${freshChat?.contactName || phone}:\n"${effectiveMessage}"${isVoiceMessage ? " (رسالة صوتية)" : ""}\n\nالرجاء التواصل معه مباشرة.`;
                    await sendWhatsAppMessage(escalationPhone, escalationNotif, accountId);
                  }
                  console.log(`[AI AutoReply] 🚨 تصعيد فوري أُرسل لـ ${escalationPhone} بسبب كلمة مفتاحية`);
                  return;
                }
              }

              // جلب شخصية AI
              const [personality] = await db3.select().from(aiPersonality).limit(1);

              // البحث في قاعدة المعرفة
              const keywords = effectiveMessage.split(/\s+/).filter((w: string) => w.length > 2).slice(0, 5);
              const ragContext: string[] = [];
              for (const keyword of keywords) {
                const docs = await db3.select({ content: ragDocuments.content, title: ragDocuments.title, docType: ragDocuments.docType })
                  .from(ragDocuments)
                  .where(and2(
                    eq2(ragDocuments.isActive, true),
                    sqlFn`(${ragDocuments.content} LIKE ${`%${keyword}%`} OR ${ragDocuments.title} LIKE ${`%${keyword}%`})`
                  ))
                  .limit(2);
                for (const doc of docs) {
                  const snippet = `[${doc.docType === "faq" ? "سؤال وجواب" : "معلومة"}] ${doc.title}: ${doc.content.substring(0, 200)}`;
                  if (!ragContext.includes(snippet)) ragContext.push(snippet);
                }
                const examples = await db3.select({ customerMessage: ragConversationExamples.customerMessage, idealResponse: ragConversationExamples.idealResponse })
                  .from(ragConversationExamples)
                  .where(and2(
                    eq2(ragConversationExamples.isActive, true),
                    sqlFn`${ragConversationExamples.customerMessage} LIKE ${`%${keyword}%`}`
                  ))
                  .limit(1);
                for (const ex of examples) {
                  ragContext.push(`[مثال] عندما يقول العميل: "${ex.customerMessage}" → الرد: "${ex.idealResponse}"`);
                }
              }

              // بناء system prompt
              const voiceInstructions = isVoiceMessage
                ? "\n\nتنبيه مهم: الرسالة التالية تم تحويلها آلياً من صوت إلى نص وقد تحتوي على أخطاء إملائية بسيطة. افهم المعنى العام ورد بشكل طبيعي كأنك سمعت الصوت مباشرة. لا تذكر أن الرسالة صوتية في ردك."
                : "";
              const systemPrompt = [
                personality?.systemPrompt || settings?.systemPrompt || "أنت مساعد مبيعات سعودي محترف يرد على رسائل العملاء بشكل ودي واحترافي.",
                settings?.businessContext ? `\nمعلومات النشاط التجاري: ${settings.businessContext}` : "",
                personality?.businessContext ? `\nمعلومات إضافية: ${personality.businessContext}` : "",
                personality?.rules?.length ? `\nالقواعد: ${(personality.rules as string[]).join(" | ")}` : "",
                ragContext.length > 0 ? `\n\n=== معلومات من قاعدة المعرفة ===\n${ragContext.join("\n")}` : "",
                voiceInstructions,
                "\n\nالتعليمات: رد باللغة العربية بشكل مختصر ومفيد. لا تذكر أنك ذكاء اصطناعي. لا تذكر أنك مساعد نصي فقط. رد مباشرة على استفسار العميل.",
              ].filter(Boolean).join("");

              let aiReply = "";
              let aiFailedToRespond = false;

              try {
                const aiResponse = await invokeLLM({
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `رسالة العميل${freshChat?.contactName ? ` (${freshChat.contactName})` : ""}${isVoiceMessage ? " (رسالة صوتية تم تحويلها لنص)" : ""}: "${effectiveMessage}"` },
                  ],
                });
                aiReply = ((aiResponse.choices[0]?.message?.content as string) || "").trim();
                if (!aiReply) aiFailedToRespond = true;
              } catch (llmErr) {
                console.error("[AI AutoReply] فشل LLM:", llmErr);
                aiFailedToRespond = true;
              }

              // ===== تصعيد عند عجز AI =====
              if (aiFailedToRespond && escalationEnabled && escalationPhone) {
                const escalationNotif = `⚠️ عجز AI عن الرد على العميل ${freshChat?.contactName || phone}:\n"${effectiveMessage}"${isVoiceMessage ? " (رسالة صوتية)" : ""}\n\nالرجاء الرد يدوياً.`;
                await sendWhatsAppMessage(escalationPhone, escalationNotif, accountId);
                // إرسال رسالة للعميل
                const clientMsg = escalationMessage;
                await sendWhatsAppMessage(phone, clientMsg, accountId);
                const { whatsappChatMessages: waChatMsgs4 } = await import("../../drizzle/schema");
                if (freshChat) {
                  await db3.insert(waChatMsgs4).values({
                    chatId: freshChat.id, accountId, direction: "outgoing",
                    message: clientMsg, status: "sent",
                  });
                  await db3.update(waChats).set({
                    lastMessage: clientMsg, lastMessageAt: new Date(),
                  }).where(eq2(waChats.id, freshChat.id));
                }
                console.log(`[AI AutoReply] ⚠️ تصعيد عند عجز AI - أُرسل إشعار لـ ${escalationPhone}`);
                return;
              }

              if (aiReply && freshChat) {
                const { whatsappChatMessages: waChatMsgs } = await import("../../drizzle/schema");
                // ===== رد صوتي إذا كانت الرسالة الواردة صوتية والخيار مفعّل =====
                const voiceReplyEnabled = settings?.voiceReplyEnabled;
                const voiceReplyScope = (settings as any)?.voiceReplyScope || "voice_only";
                const ttsVoice = (settings as any)?.ttsVoice || "nova";
                let sentAsVoice = false;
                // الرد صوتياً إذا: (نطاق = صوتية فقط وكانت صوتية) أو (نطاق = جميع الرسائل)
                const shouldReplyWithVoice = voiceReplyEnabled && (
                  voiceReplyScope === "all_messages" || (voiceReplyScope === "voice_only" && isVoiceMessage)
                );
                if (shouldReplyWithVoice) {
                  const ttsStart = Date.now();
                  let ttsStatus: "success" | "failed" | "fallback" = "failed";
                  let ttsAudioUrl: string | null = null;
                  let ttsAudioSize = 0;
                  let ttsError: string | null = null;
                  try {
                    const { textToSpeech } = await import("./tts");
                    const { storagePut } = await import("../storage");
                    const { ttsLogs: ttsLogsTable } = await import("../../drizzle/schema");
                    const voiceDialect = (settings as any)?.voiceDialect || "ar";
                    console.log(`[AI AutoReply] 🔊 تحويل رد AI لصوت (${ttsVoice} / ${voiceDialect})...`);
                    const ttsResult = await textToSpeech({ text: aiReply, voice: ttsVoice as any, speed: settings?.voiceSpeed || 1.0, lang: voiceDialect });
                    if ("audioBuffer" in ttsResult) {
                      // رفع الملف لـ S3
                      const fileKey = `ai-voice-replies/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
                      const { url: audioUrl } = await storagePut(fileKey, ttsResult.audioBuffer, "audio/mpeg");
                      ttsAudioUrl = audioUrl;
                      ttsAudioSize = ttsResult.audioBuffer.length;
                      // إرسال الملف الصوتي كمرفق واتساب
                      const { sendWhatsAppMedia } = await import("../whatsappAutomation");
                      const audioBase64 = ttsResult.audioBuffer.toString("base64");
                      const mediaResult = await sendWhatsAppMedia(phone, audioBase64, "audio/mpeg", "reply.mp3", "", accountId);
                      if (mediaResult.success) {
                        sentAsVoice = true;
                        ttsStatus = "success";
                        console.log(`[AI AutoReply] 🔊 رد صوتي أُرسل إلى ${phone} (${ttsAudioSize} bytes)`);
                        // حفظ الرد في قاعدة البيانات مع رابط الصوت
                        await db3.insert(waChatMsgs).values({
                          chatId: freshChat.id, accountId, direction: "outgoing",
                          message: aiReply, mediaUrl: audioUrl, mediaType: "audio", mediaFilename: "reply.mp3",
                          status: "sent", isAutoReply: true,
                        });
                        await db3.update(waChats).set({
                          lastMessage: "🔊 " + aiReply.substring(0, 50),
                          lastMessageAt: new Date(),
                        }).where(eq2(waChats.id, freshChat.id));
                      } else {
                        ttsStatus = "fallback";
                        ttsError = `فشل إرسال الصوت: ${mediaResult.error}`;
                        console.log(`[AI AutoReply] ⚠️ فشل إرسال الصوت - سيرد نصياً: ${mediaResult.error}`);
                      }
                    } else {
                      ttsStatus = "fallback";
                      ttsError = `${ttsResult.error}: ${ttsResult.details || ""}`;
                      console.log(`[AI AutoReply] ⚠️ فشل TTS: ${ttsResult.error} - ${ttsResult.details}`);
                    }
                    // ===== تسجيل نتيجة TTS في قاعدة البيانات =====
                    const ttsDuration = Date.now() - ttsStart;
                    await db3.insert(ttsLogsTable).values({
                      accountId,
                      phone,
                      chatId: freshChat.id,
                      status: ttsStatus,
                      textLength: aiReply.length,
                      audioSizeBytes: ttsAudioSize || null,
                      audioUrl: ttsAudioUrl,
                      errorMessage: ttsError,
                      durationMs: ttsDuration,
                      ttsEngine: "gtts",
                      voiceDialect: voiceDialect,
                    } as any).catch(() => {}); // لا نوقف العملية إذا فشل التسجيل
                    // ===== إشعار المشرف عند الفشل =====
                    if (ttsStatus !== "success") {
                      const { notifyOwner } = await import("./notification");
                      await notifyOwner({
                        title: "⚠️ فشل الرد الصوتي TTS",
                        content: `فشل تحويل الرد الصوتي للعميل ${phone.replace("@c.us", "")}\nالسبب: ${ttsError || "خطأ غير معروف"}\nسيُرسل الرد نصياً بدلاً من ذلك.`,
                      }).catch(() => {}); // لا نوقف العملية إذا فشل الإشعار
                    }
                  } catch (ttsErr) {
                    ttsStatus = "failed";
                    ttsError = ttsErr instanceof Error ? ttsErr.message : String(ttsErr);
                    console.error("[AI AutoReply] خطأ TTS:", ttsErr);
                    // إشعار المشرف بالخطأ الحرج
                    try {
                      const { notifyOwner } = await import("./notification");
                      await notifyOwner({
                        title: "🚨 خطأ حرج في محرك TTS",
                        content: `خطأ في تحويل الصوت للعميل ${phone.replace("@c.us", "")}\n${ttsError}\nسيُرسل الرد نصياً.`,
                      });
                    } catch {}
                  }
                }
                // إرسال نصي إذا لم يُرسل صوتياً
                if (!sentAsVoice) {
                  await sendWhatsAppMessage(phone, aiReply, accountId);
                  await db3.insert(waChatMsgs).values({
                    chatId: freshChat.id, accountId, direction: "outgoing",
                    message: aiReply, status: "sent",
                  });
                  await db3.update(waChats).set({
                    lastMessage: aiReply,
                    lastMessageAt: new Date(),
                  }).where(eq2(waChats.id, freshChat.id));
                  console.log(`[AI AutoReply] ✅ رد تلقائي أُرسل إلى ${phone}`);
                }
              }
            } catch (aiErr) {
              console.error("[AI AutoReply] خطأ في الرد التلقائي:", aiErr);
            }
          });
        }
      } catch (err) {
        console.error("[WhatsApp] خطأ في حفظ رسالة واردة:", err);
      }
    });

    const accounts = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.isActive, true));

    if (accounts.length === 0) return;

    console.log(`[WhatsApp] استعادة ${accounts.length} حساب(ات) واتساب...`);

    // بدء الجلسات بالتوازي
    for (const account of accounts) {
      startWhatsAppSession(account.accountId)
        .then((result) => {
          console.log(`[WhatsApp] ${account.label} (${account.accountId}): ${result.status}`);
        })
        .catch((err: Error) => {
          console.error(`[WhatsApp] فشل استعادة ${account.accountId}:`, err.message);
        });
    }
  } catch (err) {
    console.error("[WhatsApp] خطأ في استعادة الجلسات:", err);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // ===== SSE endpoint للتحديث الفوري =====
  app.get("/api/sse/chat-updates", (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();
    sseClients.add(res);
    const pingInterval = setInterval(() => {
      try { res.write("event: ping\ndata: {}\n\n"); } catch { clearInterval(pingInterval); }
    }, 25000);
    _req.on("close", () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // استعادة جلسات واتساب بعد 5 ثوانٍ من بدء الخادم
    setTimeout(restoreWhatsAppSessions, 5000);
    // تشغيل cron job جدولة التقارير الأسبوعية بعد 10 ثوانٍ
    setTimeout(() => {
      import("../routers/reportScheduler").then(m => m.startReportSchedulerCron()).catch(console.error);
    }, 10000);
    // تشغيل مدقق عدم الرد بعد 15 ثانية
    setTimeout(() => {
      import("../noReplyChecker").then(m => m.startNoReplyChecker()).catch(console.error);
    }, 15000);
  });
}

startServer().catch(console.error);
