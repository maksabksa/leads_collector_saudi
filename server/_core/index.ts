import express from "express";
// ===== SSE clients store =====
const sseClients = new Set<import("http").ServerResponse>();
export function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  Array.from(sseClients).forEach(res => {
    try { res.write(payload); } catch { sseClients.delete(res); }
  });
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

  // ===== PDF Generation via Puppeteer + @sparticuz/chromium (يدعم oklch بشكل كامل) =====
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      const { html, filename = "report.pdf" } = req.body as { html: string; filename: string };
      if (!html) { res.status(400).json({ error: "html is required" }); return; }

      const puppeteer = await import("puppeteer-core");
      const chromium = await import("@sparticuz/chromium");

      // تجربة مسارات Chromium المحلية أولاً (dev)، ثم @sparticuz/chromium (production)
      const { execSync } = await import("child_process");
      const possiblePaths = [
        "/usr/lib/chromium-browser/chromium-browser",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/snap/bin/chromium",
      ];
      let chromiumPath = "";
      for (const p of possiblePaths) {
        try {
          execSync(`test -x ${p}`);
          chromiumPath = p;
          break;
        } catch {}
      }

      let browser;
      if (chromiumPath) {
        console.log("[PDF] Using local Chromium at:", chromiumPath);
        browser = await puppeteer.default.launch({
          executablePath: chromiumPath,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
          headless: true,
        });
      } else {
        // Production: استخدام @sparticuz/chromium
        console.log("[PDF] Local Chromium not found, using @sparticuz/chromium");
        const execPath = await chromium.default.executablePath();
        browser = await puppeteer.default.launch({
          executablePath: execPath,
          args: [...chromium.default.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
          headless: true,
          defaultViewport: { width: 1200, height: 900 },
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      // انتظار تحميل الخطوط
      await new Promise((r) => setTimeout(r, 1500));
      const pdfBuffer = await page.pdf({
        format: "A3",
        printBackground: true,
        margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
      });
      await browser.close();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(Buffer.from(pdfBuffer));
    } catch (err: any) {
      console.error("[PDF Generation] Error:", err);
      res.status(500).json({ error: err.message || "فشل توليد PDF" });
    }
  });

  // ===== Proxy لصور Google Maps (Places Photo API) =====
  app.get("/api/maps-photo", async (req, res) => {
    try {
      const { photo_reference, maxwidth = "800" } = req.query as { photo_reference: string; maxwidth: string };
      if (!photo_reference) { res.status(400).json({ error: "photo_reference is required" }); return; }

      const { makeRequest } = await import("./map");
      // نجلب الصورة عبر Manus map proxy
      const proxyUrl = `/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${photo_reference}`;
      const proxyRes = await (makeRequest as any)(proxyUrl, {}, { raw: true }).catch(() => null);
      if (proxyRes) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(Buffer.isBuffer(proxyRes) ? proxyRes : Buffer.from(proxyRes));
        return;
      }
      res.status(404).json({ error: "لم يتم العثور على الصورة" });
    } catch (err: any) {
      console.error("[Maps Photo Proxy] Error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

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
  });
}

startServer().catch(console.error);
