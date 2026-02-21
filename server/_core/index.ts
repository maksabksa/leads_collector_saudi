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
          await db2.update(whatsappChats).set({
            lastMessage: lastMsg, lastMessageAt: new Date(), unreadCount: chat.unreadCount + 1,
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
