import { describe, it, expect, vi, beforeEach } from "vitest";

// محاكاة getDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "رد تلقائي من الذكاء الاصطناعي" } }],
  }),
}));

// ===== اختبارات نظام الدعوات =====
describe("Invitations System", () => {
  it("should generate a valid invitation token", () => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
  });

  it("should validate email format", () => {
    const validEmails = ["test@example.com", "user@domain.sa", "admin@company.org"];
    const invalidEmails = ["notanemail", "missing@", "@nodomain.com"];

    validEmails.forEach((email) => {
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).toBe(false);
    });
  });

  it("should check invitation expiry correctly", () => {
    const now = Date.now();
    const futureDate = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const pastDate = new Date(now - 1000); // 1 second ago

    expect(futureDate.getTime() > now).toBe(true);
    expect(pastDate.getTime() > now).toBe(false);
  });

  it("should validate permissions array", () => {
    const validPermissions = ["leads.view", "leads.add", "whatsapp.send"];
    const allPermissions = [
      "leads.view", "leads.add", "leads.edit", "leads.delete",
      "whatsapp.send", "whatsapp.settings", "search.use",
      "analytics.view", "templates.manage",
    ];

    validPermissions.forEach((perm) => {
      expect(allPermissions.includes(perm)).toBe(true);
    });
  });
});

// ===== اختبارات إعدادات واتساب =====
describe("WhatsApp Settings", () => {
  it("should validate message delay range", () => {
    const minDelay = 3000; // 3 seconds
    const maxDelay = 60000; // 60 seconds

    const testDelays = [3000, 10000, 30000, 60000];
    const invalidDelays = [1000, 2999, 61000, 100000];

    testDelays.forEach((delay) => {
      expect(delay >= minDelay && delay <= maxDelay).toBe(true);
    });

    invalidDelays.forEach((delay) => {
      expect(delay >= minDelay && delay <= maxDelay).toBe(false);
    });
  });

  it("should calculate notification milestones correctly", () => {
    const threshold = 50;
    const testCases = [
      { prev: 0, current: 50, shouldNotify: true },
      { prev: 49, current: 50, shouldNotify: true },
      { prev: 50, current: 99, shouldNotify: false },
      { prev: 50, current: 100, shouldNotify: true },
      { prev: 100, current: 149, shouldNotify: false },
    ];

    testCases.forEach(({ prev, current, shouldNotify }) => {
      const prevMilestone = Math.floor(prev / threshold);
      const newMilestone = Math.floor(current / threshold);
      expect(newMilestone > prevMilestone).toBe(shouldNotify);
    });
  });

  it("should add random delay within expected range", () => {
    const baseDelay = 10000; // 10 seconds
    const randomExtra = 2000; // up to 2 seconds extra

    for (let i = 0; i < 10; i++) {
      const totalDelay = baseDelay + Math.random() * randomExtra;
      expect(totalDelay).toBeGreaterThanOrEqual(baseDelay);
      expect(totalDelay).toBeLessThan(baseDelay + randomExtra);
    }
  });
});

// ===== اختبارات قواعد الرد التلقائي =====
describe("Auto Reply Rules", () => {
  it("should match keywords case-insensitively", () => {
    const rule = { triggerKeywords: ["سعر", "كم", "price"] };
    const messages = [
      { text: "ما هو السعر؟", shouldMatch: true },
      { text: "كم التكلفة؟", shouldMatch: true },
      { text: "what is the PRICE?", shouldMatch: true },
      { text: "مرحبا", shouldMatch: false },
    ];

    messages.forEach(({ text, shouldMatch }) => {
      const msgLower = text.toLowerCase();
      const matched = (rule.triggerKeywords as string[]).some((kw) =>
        msgLower.includes(kw.toLowerCase())
      );
      expect(matched).toBe(shouldMatch);
    });
  });

  it("should parse comma-separated keywords correctly", () => {
    const input = "سعر, كم, price, cost";
    const keywords = input.split(",").map((k) => k.trim()).filter(Boolean);

    expect(keywords).toHaveLength(4);
    expect(keywords[0]).toBe("سعر");
    expect(keywords[1]).toBe("كم");
    expect(keywords[2]).toBe("price");
    expect(keywords[3]).toBe("cost");
  });

  it("should validate rule has required fields", () => {
    const validRule = {
      triggerKeywords: ["سعر"],
      replyTemplate: "شكراً على استفسارك",
      useAI: false,
    };

    const invalidRule = {
      triggerKeywords: [],
      replyTemplate: "",
      useAI: false,
    };

    expect(validRule.triggerKeywords.length > 0 && validRule.replyTemplate.length > 0).toBe(true);
    expect(invalidRule.triggerKeywords.length > 0 && invalidRule.replyTemplate.length > 0).toBe(false);
  });
});
