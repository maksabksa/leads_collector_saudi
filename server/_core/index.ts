import "dotenv/config";
import express from "express";
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
        if (!chat) {
          const [res] = await db2.insert(whatsappChats).values({
            accountId, phone, contactName, lastMessage: lastMsg, lastMessageAt: new Date(), unreadCount: 1,
          });
          const insertId = (res as { insertId: number }).insertId;
          [chat] = await db2.select().from(whatsappChats).where(eq(whatsappChats.id, insertId)).limit(1);
        } else {
          // تحديث الاسم تلقائياً: أولوية اسم واتساب (pushname) > الاسم المحفوظ > رقم الهاتف
          const nameUpdate = contactName && contactName !== chat.contactName ? { contactName } : {};
          await db2.update(whatsappChats).set({
            lastMessage: lastMsg,
            lastMessageAt: new Date(),
            unreadCount: chat.unreadCount + 1,
            ...nameUpdate,
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

        // ===== الرد التلقائي بالـ AI =====
        if (message && message.trim()) {
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
              if (!globalEnabled && !chatAutoReply) return;
              // جلب شخصية AI
              const [personality] = await db3.select().from(aiPersonality).limit(1);
              // البحث في قاعدة المعرفة
              const keywords = message.split(/\s+/).filter((w: string) => w.length > 2).slice(0, 5);
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
              const systemPrompt = [
                personality?.systemPrompt || settings?.systemPrompt || "أنت مساعد مبيعات سعودي محترف يرد على رسائل العملاء بشكل ودي واحترافي.",
                settings?.businessContext ? `\nمعلومات النشاط التجاري: ${settings.businessContext}` : "",
                personality?.businessContext ? `\nمعلومات إضافية: ${personality.businessContext}` : "",
                personality?.rules?.length ? `\nالقواعد: ${(personality.rules as string[]).join(" | ")}` : "",
                ragContext.length > 0 ? `\n\n=== معلومات من قاعدة المعرفة ===\n${ragContext.join("\n")}` : "",
                "\n\nالتعليمات: رد باللغة العربية بشكل مختصر ومفيد. لا تذكر أنك AI. رد مباشرة على استفسار العميل.",
              ].filter(Boolean).join("");
              const aiResponse = await invokeLLM({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: `رسالة العميل${freshChat?.contactName ? ` (${freshChat.contactName})` : ""}: "${message}"` },
                ],
              });
              const aiReply = ((aiResponse.choices[0]?.message?.content as string) || "").trim();
              if (aiReply && freshChat) {
                const { whatsappChatMessages: waChatMsgs } = await import("../../drizzle/schema");
                // إرسال الرد عبر واتساب
                await sendWhatsAppMessage(phone, aiReply, accountId);
                // حفظ الرد في قاعدة البيانات
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
  });
}

startServer().catch(console.error);
