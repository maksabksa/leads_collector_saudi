/**
 * محرك البحث الذكي - يتعلم من سلوك المستخدم ويحاكي السلوك البشري
 * Human-like Search Engine with Behavioral Learning
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { searchBehaviorLogs, searchBehaviorPatterns } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ===== أنواع البيانات =====
interface BehaviorPattern {
  avgDelay: number;          // متوسط التأخير بين الإجراءات (ms)
  avgScrollDepth: number;    // متوسط عمق التمرير
  preferredFilters: string[]; // الفلاتر المفضلة
  topQueries: string[];       // أكثر الكلمات استخداماً
  successRate: number;        // نسبة النجاح
  avgSessionDuration: number; // متوسط مدة الجلسة
  clickDelays: number[];      // أنماط التأخير في النقر
}

// ===== دوال مساعدة =====

/**
 * استخلاص أنماط السلوك من سجلات البحث
 */
async function extractBehaviorPatterns(
  platform: string,
  logs: Array<{
    query: string;
    filters: string | null;
    sessionDuration: number | null;
    scrollDepth: number | null;
    clickPattern: string | null;
    searchSuccess: boolean | null;
    selectedResults: string | null;
    addedToLeads: number | null;
  }>
): Promise<BehaviorPattern> {
  if (logs.length === 0) {
    return {
      avgDelay: 800 + Math.random() * 400,
      avgScrollDepth: 60,
      preferredFilters: [],
      topQueries: [],
      successRate: 0.8,
      avgSessionDuration: 120,
      clickDelays: [500, 800, 1200, 600, 900],
    };
  }

  // حساب المتوسطات
  const avgSessionDuration = logs.reduce((sum, l) => sum + (l.sessionDuration || 0), 0) / logs.length;
  const avgScrollDepth = logs.reduce((sum, l) => sum + (l.scrollDepth || 0), 0) / logs.length;
  const successRate = logs.filter(l => l.searchSuccess).length / logs.length;

  // استخلاص الفلاتر المفضلة
  const filterCounts: Record<string, number> = {};
  logs.forEach(l => {
    if (l.filters) {
      try {
        const f = JSON.parse(l.filters);
        Object.keys(f).forEach(k => {
          if (f[k]) filterCounts[k] = (filterCounts[k] || 0) + 1;
        });
      } catch {}
    }
  });
  const preferredFilters = Object.entries(filterCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  // استخلاص أكثر الكلمات استخداماً
  const queryCounts: Record<string, number> = {};
  logs.forEach(l => {
    const words = l.query.toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 2) queryCounts[w] = (queryCounts[w] || 0) + 1;
    });
  });
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => k);

  // استخلاص أنماط التأخير
  const allDelays: number[] = [];
  logs.forEach(l => {
    if (l.clickPattern) {
      try {
        const cp = JSON.parse(l.clickPattern);
        if (Array.isArray(cp.delays)) allDelays.push(...cp.delays);
      } catch {}
    }
  });
  const clickDelays = allDelays.length > 0 ? allDelays.slice(-20) : [500, 800, 1200, 600, 900];

  return {
    avgDelay: clickDelays.reduce((a, b) => a + b, 0) / (clickDelays.length || 1),
    avgScrollDepth,
    preferredFilters,
    topQueries,
    successRate,
    avgSessionDuration,
    clickDelays,
  };
}

/**
 * توليد تأخير بشري عشوائي بناءً على الأنماط المُتعلَّمة
 */
function humanDelay(baseMs: number, variance: number = 0.3): number {
  const jitter = (Math.random() - 0.5) * 2 * variance;
  return Math.round(baseMs * (1 + jitter));
}

/**
 * استخدام الذكاء الاصطناعي لتحسين استعلام البحث
 */
async function enhanceQueryWithAI(
  query: string,
  platform: string,
  patterns: BehaviorPattern
): Promise<{
  enhancedQuery: string;
  suggestedHashtags: string[];
  searchStrategy: string;
  estimatedResults: number;
}> {
  const topWordsContext = patterns.topQueries.length > 0
    ? `الكلمات الأكثر نجاحاً في عمليات البحث السابقة: ${patterns.topQueries.join(', ')}`
    : '';

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `أنت محلل بيانات متخصص في تحسين استعلامات البحث على منصات التواصل الاجتماعي.
مهمتك: تحسين استعلام البحث ليعطي أفضل النتائج على منصة ${platform}.
${topWordsContext}
نسبة نجاح البحث السابقة: ${Math.round(patterns.successRate * 100)}%
أجب بـ JSON فقط.`,
      },
      {
        role: "user",
        content: `حسّن استعلام البحث التالي: "${query}"
المنصة: ${platform}

أرجع JSON بالشكل:
{
  "enhancedQuery": "الاستعلام المحسّن",
  "suggestedHashtags": ["#هاشتاق1", "#هاشتاق2"],
  "searchStrategy": "وصف استراتيجية البحث",
  "estimatedResults": 50
}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "enhanced_query",
        strict: true,
        schema: {
          type: "object",
          properties: {
            enhancedQuery: { type: "string" },
            suggestedHashtags: { type: "array", items: { type: "string" } },
            searchStrategy: { type: "string" },
            estimatedResults: { type: "integer" },
          },
          required: ["enhancedQuery", "suggestedHashtags", "searchStrategy", "estimatedResults"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0]?.message?.content as string;
    return JSON.parse(content);
  } catch {
    return {
      enhancedQuery: query,
      suggestedHashtags: [],
      searchStrategy: "بحث مباشر",
      estimatedResults: 20,
    };
  }
}

// ===== الـ Router =====
export const searchBehaviorRouter = router({
  /**
   * تسجيل جلسة بحث جديدة
   */
  logSearchSession: protectedProcedure
    .input(z.object({
      platform: z.string(),
      query: z.string(),
      filters: z.record(z.string(), z.any()).optional(),
      resultsCount: z.number().default(0),
      selectedResults: z.array(z.string()).optional(),
      addedToLeads: z.number().default(0),
      sessionDuration: z.number().default(0),
      scrollDepth: z.number().min(0).max(100).default(0),
      clickPattern: z.object({
        delays: z.array(z.number()),
        positions: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
      }).optional(),
      searchSuccess: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db.insert(searchBehaviorLogs).values({
        userId: ctx.user.id,
        platform: input.platform,
        query: input.query,
        filters: input.filters ? JSON.stringify(input.filters) : null,
        resultsCount: input.resultsCount,
        selectedResults: input.selectedResults ? JSON.stringify(input.selectedResults) : null,
        addedToLeads: input.addedToLeads,
        sessionDuration: input.sessionDuration,
        scrollDepth: input.scrollDepth,
        clickPattern: input.clickPattern ? JSON.stringify(input.clickPattern) : null,
        searchSuccess: input.searchSuccess,
      });

      // تحديث الأنماط بعد كل 5 جلسات
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(searchBehaviorLogs)
        .where(eq(searchBehaviorLogs.platform, input.platform));
      
      const count = countResult[0]?.count || 0;
      if (count % 5 === 0) {
        // إعادة حساب الأنماط
        const recentLogs = await db
          .select()
          .from(searchBehaviorLogs)
          .where(eq(searchBehaviorLogs.platform, input.platform))
          .orderBy(desc(searchBehaviorLogs.createdAt))
          .limit(50);

        const patterns = await extractBehaviorPatterns(input.platform, recentLogs);
        
        // حفظ الأنماط المحدّثة - حذف القديم وإدراج جديد
        await db
          .delete(searchBehaviorPatterns)
          .where(
            and(
              eq(searchBehaviorPatterns.platform, input.platform),
              eq(searchBehaviorPatterns.patternType, "behavioral_profile")
            )
          );
        await db
          .insert(searchBehaviorPatterns)
          .values({
            platform: input.platform,
            patternType: "behavioral_profile",
            patternData: JSON.stringify(patterns),
            confidence: Math.min(100, Math.round(count / 2)),
            sampleSize: count,
          });
      }

      return { success: true };
    }),

  /**
   * الحصول على أنماط السلوك لمنصة معينة
   */
  getBehaviorPatterns: protectedProcedure
    .input(z.object({ platform: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const logs = await db
        .select()
        .from(searchBehaviorLogs)
        .where(eq(searchBehaviorLogs.platform, input.platform))
        .orderBy(desc(searchBehaviorLogs.createdAt))
        .limit(50);

      const patterns = await extractBehaviorPatterns(input.platform, logs);
      
      return {
        patterns,
        sampleSize: logs.length,
        confidence: Math.min(100, Math.round(logs.length * 2)),
        lastUpdated: logs[0]?.createdAt || null,
      };
    }),

  /**
   * الحصول على إحصائيات السلوك الشاملة
   */
  getBehaviorStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const stats = await db
        .select({
          platform: searchBehaviorLogs.platform,
          count: sql<number>`count(*)`,
          avgSuccess: sql<number>`avg(CASE WHEN searchSuccess = 1 THEN 100 ELSE 0 END)`,
          avgDuration: sql<number>`avg(sessionDuration)`,
          totalLeads: sql<number>`sum(addedToLeads)`,
        })
        .from(searchBehaviorLogs)
        .where(eq(searchBehaviorLogs.userId, ctx.user.id))
        .groupBy(searchBehaviorLogs.platform);

      const recentSessions = await db
        .select()
        .from(searchBehaviorLogs)
        .where(eq(searchBehaviorLogs.userId, ctx.user.id))
        .orderBy(desc(searchBehaviorLogs.createdAt))
        .limit(10);

      return { stats, recentSessions };
    }),

  /**
   * تحسين استعلام البحث بالذكاء الاصطناعي
   */
  enhanceQuery: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      platform: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // جلب الأنماط المتعلَّمة
      let patterns: BehaviorPattern = {
        avgDelay: 800,
        avgScrollDepth: 60,
        preferredFilters: [],
        topQueries: [],
        successRate: 0.8,
        avgSessionDuration: 120,
        clickDelays: [500, 800, 1200],
      };

      if (db) {
        const logs = await db
          .select()
          .from(searchBehaviorLogs)
          .where(eq(searchBehaviorLogs.platform, input.platform))
          .orderBy(desc(searchBehaviorLogs.createdAt))
          .limit(30);
        
        patterns = await extractBehaviorPatterns(input.platform, logs);
      }

      const enhanced = await enhanceQueryWithAI(input.query, input.platform, patterns);
      
      return {
        ...enhanced,
        humanDelays: {
          beforeSearch: humanDelay(patterns.avgDelay),
          betweenResults: humanDelay(patterns.avgDelay * 0.5),
          beforeClick: humanDelay(patterns.avgDelay * 0.7),
        },
        learnedPatterns: {
          topWords: patterns.topQueries.slice(0, 5),
          preferredFilters: patterns.preferredFilters,
          successRate: patterns.successRate,
        },
      };
    }),

  /**
   * الحصول على توصيات بحث ذكية بناءً على السلوك السابق
   */
  getSmartSuggestions: protectedProcedure
    .input(z.object({
      platform: z.string(),
      currentQuery: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { suggestions: [], patterns: null };

      // جلب أكثر الاستعلامات نجاحاً
      const successfulSearches = await db
        .select()
        .from(searchBehaviorLogs)
        .where(
          and(
            eq(searchBehaviorLogs.userId, ctx.user.id),
            eq(searchBehaviorLogs.platform, input.platform),
            eq(searchBehaviorLogs.searchSuccess, true)
          )
        )
        .orderBy(desc(searchBehaviorLogs.addedToLeads))
        .limit(20);

      const suggestions = successfulSearches
        .filter(s => s.addedToLeads && s.addedToLeads > 0)
        .map(s => ({
          query: s.query,
          leadsAdded: s.addedToLeads,
          filters: s.filters ? JSON.parse(s.filters) : {},
        }))
        .slice(0, 5);

      const patterns = await extractBehaviorPatterns(input.platform, successfulSearches);

      return { suggestions, patterns };
    }),
});
