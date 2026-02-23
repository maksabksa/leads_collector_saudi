import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== اختبارات تقرير الإرسال اليومي =====
// نختبر منطق تجميع الإحصائيات بدون الاتصال بقاعدة البيانات

describe("WhatsApp Report - getDailyStats logic", () => {
  // محاكاة بيانات الرسائل
  const mockMessages = [
    { accountId: "acc1", direction: "outgoing", day: "2026-02-20", count: 10 },
    { accountId: "acc1", direction: "incoming", day: "2026-02-20", count: 5 },
    { accountId: "acc2", direction: "outgoing", day: "2026-02-20", count: 8 },
    { accountId: "acc2", direction: "incoming", day: "2026-02-20", count: 3 },
    { accountId: "acc1", direction: "outgoing", day: "2026-02-21", count: 12 },
    { accountId: "acc2", direction: "outgoing", day: "2026-02-21", count: 6 },
  ];

  // دالة مساعدة لتجميع إحصائيات الحسابات (منطق مطابق للـ router)
  function aggregateAccountStats(messages: typeof mockMessages) {
    const map = new Map<string, { sent: number; received: number }>();
    for (const row of messages) {
      if (!map.has(row.accountId)) map.set(row.accountId, { sent: 0, received: 0 });
      const stat = map.get(row.accountId)!;
      if (row.direction === "outgoing") stat.sent += row.count;
      else stat.received += row.count;
    }
    return map;
  }

  // دالة مساعدة لتجميع الإحصائيات اليومية
  function aggregateDailyStats(messages: typeof mockMessages) {
    const dayMap = new Map<string, { day: string; sent: number; received: number }>();
    for (const row of messages) {
      if (!dayMap.has(row.day)) dayMap.set(row.day, { day: row.day, sent: 0, received: 0 });
      const dayData = dayMap.get(row.day)!;
      if (row.direction === "outgoing") dayData.sent += row.count;
      else dayData.received += row.count;
    }
    return Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day));
  }

  it("يجمع الرسائل الصادرة والواردة لكل حساب بشكل صحيح", () => {
    const stats = aggregateAccountStats(mockMessages);

    expect(stats.get("acc1")?.sent).toBe(22); // 10 + 12
    expect(stats.get("acc1")?.received).toBe(5);
    expect(stats.get("acc2")?.sent).toBe(14); // 8 + 6
    expect(stats.get("acc2")?.received).toBe(3);
  });

  it("يحسب معدل الرد بشكل صحيح", () => {
    const stats = aggregateAccountStats(mockMessages);
    const acc1 = stats.get("acc1")!;
    const replyRate = acc1.received > 0 ? Math.round((acc1.sent / acc1.received) * 100) : 0;
    expect(replyRate).toBe(440); // 22/5 * 100 = 440%
  });

  it("يجمع الإحصائيات اليومية بشكل صحيح", () => {
    const daily = aggregateDailyStats(mockMessages);

    expect(daily).toHaveLength(2);
    expect(daily[0].day).toBe("2026-02-20");
    expect(daily[0].sent).toBe(18); // 10 + 8
    expect(daily[0].received).toBe(8); // 5 + 3
    expect(daily[1].day).toBe("2026-02-21");
    expect(daily[1].sent).toBe(18); // 12 + 6
    expect(daily[1].received).toBe(0);
  });

  it("يرتب الأيام تصاعدياً", () => {
    const daily = aggregateDailyStats(mockMessages);
    for (let i = 1; i < daily.length; i++) {
      expect(daily[i].day >= daily[i - 1].day).toBe(true);
    }
  });

  it("يحسب الإجماليات بشكل صحيح", () => {
    const stats = aggregateAccountStats(mockMessages);
    const accounts = Array.from(stats.entries()).map(([id, s]) => ({ accountId: id, ...s }));
    const totals = {
      sent: accounts.reduce((s, a) => s + a.sent, 0),
      received: accounts.reduce((s, a) => s + a.received, 0),
    };
    expect(totals.sent).toBe(36); // 22 + 14
    expect(totals.received).toBe(8); // 5 + 3
  });

  it("يتعامل مع حساب بدون رسائل واردة (معدل رد 0)", () => {
    const onlyOutgoing = [
      { accountId: "acc3", direction: "outgoing", day: "2026-02-20", count: 5 },
    ];
    const stats = aggregateAccountStats(onlyOutgoing);
    const acc3 = stats.get("acc3")!;
    const replyRate = acc3.received > 0 ? Math.round((acc3.sent / acc3.received) * 100) : 0;
    expect(replyRate).toBe(0);
  });

  it("يتعامل مع قائمة رسائل فارغة", () => {
    const stats = aggregateAccountStats([]);
    expect(stats.size).toBe(0);

    const daily = aggregateDailyStats([]);
    expect(daily).toHaveLength(0);
  });
});

describe("WhatsApp Report - account filter in chat list", () => {
  const mockChats = [
    { id: 1, accountId: "acc1", phone: "966501111111", unreadCount: 2 },
    { id: 2, accountId: "acc1", phone: "966502222222", unreadCount: 0 },
    { id: 3, accountId: "acc2", phone: "966503333333", unreadCount: 1 },
    { id: 4, accountId: "acc2", phone: "966504444444", unreadCount: 0 },
  ];

  it("يُظهر جميع المحادثات عند اختيار 'all'", () => {
    const selectedAccountId = "all";
    const filtered = selectedAccountId === "all"
      ? mockChats
      : mockChats.filter(c => c.accountId === selectedAccountId);
    expect(filtered).toHaveLength(4);
  });

  it("يُظهر محادثات حساب معين فقط", () => {
    const selectedAccountId = "acc1";
    const filtered = mockChats.filter(c => c.accountId === selectedAccountId);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(c => c.accountId === "acc1")).toBe(true);
  });

  it("يحسب عدد الرسائل غير المقروءة لكل حساب", () => {
    const acc1Chats = mockChats.filter(c => c.accountId === "acc1");
    const acc1Unread = acc1Chats.reduce((s, c) => s + c.unreadCount, 0);
    expect(acc1Unread).toBe(2);

    const acc2Chats = mockChats.filter(c => c.accountId === "acc2");
    const acc2Unread = acc2Chats.reduce((s, c) => s + c.unreadCount, 0);
    expect(acc2Unread).toBe(1);
  });

  it("يُرجع قائمة فارغة إذا لم توجد محادثات للحساب المحدد", () => {
    const filtered = mockChats.filter(c => c.accountId === "acc_nonexistent");
    expect(filtered).toHaveLength(0);
  });
});
