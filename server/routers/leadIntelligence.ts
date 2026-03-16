/**
 * Lead Intelligence Router
 * ========================
 * العقل المركزي لمنظومة Lead Intelligence.
 * يربط جميع مصادر البيانات ويطبق خوارزمية الربط الذكي
 * لتحويل النتائج الخام إلى كيانات موحدة قابلة للبيع.
 *
 * Pipeline:
 *   Discovery → Resolution (Identity Linkage) → BusinessLead
 *
 * PHASE 1 CHANGES:
 *  - Updated DiscoveryCandidate construction to use new fields
 *  - source: DiscoverySource (strict union)
 *  - sourceType: DiscoverySourceType (strict union)
 *  - verifiedPhones / candidatePhones (بدلاً من phones)
 *  - verifiedEmails / candidateEmails (جديد)
 *  - verifiedWebsite / candidateWebsites (بدلاً من websites)
 *  - raw: unknown (بدلاً من rawSourceData)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createLeadWithResolution } from "../db";
import {
  resolveLeads,
  computeLinkageScore,
  normalizeName,
  normalizePhone,
  extractDomain,
  explainLinkage,
  clusterCandidates,
} from "../lib/identityLinkage";
import type {
  DiscoveryCandidate,
  DiscoverySource,
  DiscoverySourceType,
} from "../../shared/types/lead-intelligence";

// ─── Helper: تحويل مصدر string إلى DiscoverySource ───────────────────────────

function toDiscoverySource(source: string): DiscoverySource {
  const validSources: DiscoverySource[] = [
    "google", "maps", "instagram", "tiktok", "snapchat",
    "x", "facebook", "linkedin", "telegram", "website",
  ];
  // تحويل google_maps → maps
  if (source === "google_maps") return "maps";
  if (validSources.includes(source as DiscoverySource)) {
    return source as DiscoverySource;
  }
  // fallback: website لأي مصدر غير معروف
  return "website";
}

function toDiscoverySourceType(source: string): DiscoverySourceType {
  if (source === "google" || source === "google_maps") return "search_result";
  if (source === "maps") return "listing";
  if (["instagram", "tiktok", "snapchat", "x", "facebook", "linkedin", "telegram"].includes(source)) {
    return "profile";
  }
  return "page";
}

// ─── Helper: تحويل نتيجة خام إلى DiscoveryCandidate ─────────────────────────

function rawResultToCandidate(
  result: Record<string, unknown>,
  source: string,
  idx: number
): DiscoveryCandidate {
  const displayName = String(result.displayName || result.name || "");
  const bio = String(result.bio || result.description || "");
  const url = String(result.profileUrl || result.url || result.website || "");
  const username = String(result.username || result.id || "");

  // استخراج أرقام الهاتف من النص
  const text = `${displayName} ${bio} ${username}`;
  const phoneMatches =
    text.match(/(?:\+966|00966|0)(?:5[0-9]{8}|[1-9][0-9]{7})/g) || [];

  // أرقام الهاتف: مؤكدة (من حقل phone مباشرة) vs مرشحة (من النص)
  const directPhone = String(result.phone || "").trim();
  const verifiedPhones: string[] = directPhone ? [directPhone] : [];
  const candidatePhones: string[] = phoneMatches.filter(p => p !== directPhone);

  // البريد الإلكتروني
  const directEmail = String(result.email || "").trim();
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const verifiedEmails: string[] = directEmail ? [directEmail] : [];
  const candidateEmails: string[] = emailMatches.filter(e => e !== directEmail);

  // المواقع الإلكترونية
  const directWebsite = String(result.website || "").trim();
  const isSocialUrl = (u: string) =>
    ["instagram.com", "tiktok.com", "twitter.com", "x.com", "snapchat.com", "facebook.com", "linkedin.com", "t.me"].some(
      p => u.includes(p)
    );

  const verifiedWebsite: string | undefined =
    directWebsite && !isSocialUrl(directWebsite) ? directWebsite : undefined;

  const candidateWebsites: string[] = [];
  if (url && url.startsWith("http") && !isSocialUrl(url) && url !== directWebsite) {
    candidateWebsites.push(url);
  }

  // استنتاج المدينة من النص
  const CITY_PATTERNS: Record<string, RegExp> = {
    "الرياض": /\b(الرياض|riyadh)\b/i,
    "جدة": /\b(جدة|jeddah|jidda)\b/i,
    "مكة": /\b(مكة|mecca|makkah)\b/i,
    "المدينة": /\b(المدينة|medina|madinah)\b/i,
    "الدمام": /\b(الدمام|dammam)\b/i,
    "الخبر": /\b(الخبر|khobar)\b/i,
    "الطائف": /\b(الطائف|taif)\b/i,
    "تبوك": /\b(تبوك|tabuk)\b/i,
    "أبها": /\b(أبها|abha)\b/i,
  };

  let cityHint: string | undefined;
  for (const [city, pattern] of Object.entries(CITY_PATTERNS)) {
    if (pattern.test(text)) {
      cityHint = city;
      break;
    }
  }

  // حساب درجة الثقة بناءً على اكتمال البيانات
  let confidence = 0.3;
  if (displayName) confidence += 0.2;
  if (bio && bio.length > 20) confidence += 0.1;
  if (verifiedPhones.length > 0) confidence += 0.2;
  if (verifiedWebsite) confidence += 0.1;
  if (cityHint) confidence += 0.1;

  return {
    id: `${source}-${idx}-${Date.now()}`,
    source: toDiscoverySource(source),
    sourceType: toDiscoverySourceType(source),
    url: url || undefined,
    nameHint: displayName || undefined,
    usernameHint: username || undefined,
    businessNameHint: displayName || undefined,
    categoryHint: String(result.businessType || result.category || "") || undefined,
    cityHint,
    verifiedPhones,
    candidatePhones,
    verifiedEmails,
    candidateEmails,
    verifiedWebsite,
    candidateWebsites,
    confidence: Math.min(confidence, 1),
    raw: result,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

const leadIntelligenceRouter = router({

  /**
   * resolve: يأخذ نتائج خام من مصادر متعددة ويدمجها في كيانات موحدة
   * هذه هي الدالة الأساسية لـ Identity Linkage
   */
  resolve: protectedProcedure
    .input(
      z.object({
        rawResults: z.record(
          z.string(),
          z.array(z.record(z.string(), z.unknown()))
        ),
      })
    )
    .mutation(async ({ input }) => {
      const candidates: DiscoveryCandidate[] = [];

      for (const [platform, results] of Object.entries(input.rawResults)) {
        results.forEach((result, idx) => {
          candidates.push(rawResultToCandidate(result, platform, idx));
        });
      }

      if (candidates.length === 0) {
        return {
          leads: [],
          stats: {
            inputCandidates: 0,
            outputLeads: 0,
            mergedCount: 0,
            mergeRate: "0%",
          },
        };
      }

      const leads = resolveLeads(candidates);
      const mergedCount = candidates.length - leads.length;

      return {
        leads,
        stats: {
          inputCandidates: candidates.length,
          outputLeads: leads.length,
          mergedCount,
          mergeRate: `${Math.round((mergedCount / candidates.length) * 100)}%`,
        },
      };
    }),

  /**
   * compareTwo: مقارنة مرشحين وإظهار تفاصيل درجة التشابه
   * مفيد للـ debugging وفهم قرارات الخوارزمية
   */
  compareTwo: protectedProcedure
    .input(
      z.object({
        candidateA: z.object({
          nameHint: z.string().optional(),
          businessNameHint: z.string().optional(),
          verifiedPhones: z.array(z.string()).default([]),
          candidatePhones: z.array(z.string()).default([]),
          verifiedWebsite: z.string().optional(),
          candidateWebsites: z.array(z.string()).default([]),
          cityHint: z.string().optional(),
          categoryHint: z.string().optional(),
          usernameHint: z.string().optional(),
          source: z.string().default("manual"),
        }),
        candidateB: z.object({
          nameHint: z.string().optional(),
          businessNameHint: z.string().optional(),
          verifiedPhones: z.array(z.string()).default([]),
          candidatePhones: z.array(z.string()).default([]),
          verifiedWebsite: z.string().optional(),
          candidateWebsites: z.array(z.string()).default([]),
          cityHint: z.string().optional(),
          categoryHint: z.string().optional(),
          usernameHint: z.string().optional(),
          source: z.string().default("manual"),
        }),
      })
    )
    .query(async ({ input }) => {
      const a: DiscoveryCandidate = {
        id: `manual-a-${Date.now()}`,
        source: toDiscoverySource(input.candidateA.source),
        sourceType: "profile",
        verifiedEmails: [],
        candidateEmails: [],
        confidence: 0.8,
        raw: input.candidateA,
        nameHint: input.candidateA.nameHint,
        businessNameHint: input.candidateA.businessNameHint,
        verifiedPhones: input.candidateA.verifiedPhones,
        candidatePhones: input.candidateA.candidatePhones,
        verifiedWebsite: input.candidateA.verifiedWebsite,
        candidateWebsites: input.candidateA.candidateWebsites,
        cityHint: input.candidateA.cityHint,
        categoryHint: input.candidateA.categoryHint,
        usernameHint: input.candidateA.usernameHint,
      };

      const b: DiscoveryCandidate = {
        id: `manual-b-${Date.now()}`,
        source: toDiscoverySource(input.candidateB.source),
        sourceType: "profile",
        verifiedEmails: [],
        candidateEmails: [],
        confidence: 0.8,
        raw: input.candidateB,
        nameHint: input.candidateB.nameHint,
        businessNameHint: input.candidateB.businessNameHint,
        verifiedPhones: input.candidateB.verifiedPhones,
        candidatePhones: input.candidateB.candidatePhones,
        verifiedWebsite: input.candidateB.verifiedWebsite,
        candidateWebsites: input.candidateB.candidateWebsites,
        cityHint: input.candidateB.cityHint,
        categoryHint: input.candidateB.categoryHint,
        usernameHint: input.candidateB.usernameHint,
      };

      const score = computeLinkageScore(a, b);
      const explanation = explainLinkage(a, b);

      return {
        score,
        explanation,
        normalizedA: normalizeName(a.businessNameHint || a.nameHint || ""),
        normalizedB: normalizeName(b.businessNameHint || b.nameHint || ""),
      };
    }),

  /**
   * normalizeName: تطبيع اسم العمل للمقارنة
   */
  normalizeName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return {
        original: input.name,
        normalized: normalizeName(input.name),
      };
    }),

  /**
   * normalizePhone: تطبيع رقم الهاتف
   */
  normalizePhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      return {
        original: input.phone,
        normalized: normalizePhone(input.phone),
      };
    }),

  /**
   * extractDomain: استخراج النطاق من URL
   */
  extractDomain: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      return {
        original: input.url,
        domain: extractDomain(input.url),
      };
    }),

  /**
   * clusterPreview: معاينة التجميع قبل الدمج الكامل
   */
  clusterPreview: protectedProcedure
    .input(
      z.object({
        candidates: z.array(
          z.object({
            source: z.string(),
            nameHint: z.string().optional(),
            businessNameHint: z.string().optional(),
            verifiedPhones: z.array(z.string()).default([]),
            candidatePhones: z.array(z.string()).default([]),
            verifiedWebsite: z.string().optional(),
            candidateWebsites: z.array(z.string()).default([]),
            cityHint: z.string().optional(),
            categoryHint: z.string().optional(),
            usernameHint: z.string().optional(),
            confidence: z.number().default(0.5),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const candidates: DiscoveryCandidate[] = input.candidates.map((c, idx) => ({
        id: `preview-${idx}-${Date.now()}`,
        source: toDiscoverySource(c.source),
        sourceType: toDiscoverySourceType(c.source),
        verifiedEmails: [],
        candidateEmails: [],
        raw: c,
        nameHint: c.nameHint,
        businessNameHint: c.businessNameHint,
        verifiedPhones: c.verifiedPhones,
        candidatePhones: c.candidatePhones,
        verifiedWebsite: c.verifiedWebsite,
        candidateWebsites: c.candidateWebsites,
        cityHint: c.cityHint,
        categoryHint: c.categoryHint,
        usernameHint: c.usernameHint,
        confidence: c.confidence,
      }));

      const groups = clusterCandidates(candidates);

      return {
        groups: groups.map(g => ({
          primaryName: g.primary.businessNameHint || g.primary.nameHint,
          primarySource: g.primary.source,
          duplicateCount: g.duplicates.length,
          duplicates: g.duplicates.map(d => ({
            name: d.businessNameHint || d.nameHint,
            source: d.source,
          })),
          mergeConfidence: Math.round(g.mergeConfidence * 100),
          sources: g.sources,
        })),
        stats: {
          totalCandidates: candidates.length,
          uniqueGroups: groups.length,
          mergedCount: candidates.length - groups.length,
        },
      };
    }),

  /**
   * seedFromRaw — PHASE 2
   * إدخال lead خام من أي مصدر عبر createLeadWithResolution()
   * يطبّق normalisation + conservative deduplication تلقائياً.
   * لا يحجب الإدخال أبداً — التكرار يُعلّم فقط ك‘possible_duplicate’.
   */
  seedFromRaw: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1),
      businessType: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      verifiedPhone: z.string().optional(),
      website: z.string().optional(),
      instagramUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      tiktokUrl: z.string().optional(),
      snapchatUrl: z.string().optional(),
      facebookUrl: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { source, ...leadData } = input;
      const id = await createLeadWithResolution({
        ...leadData,
        city: leadData.city || "غير محدد",
        businessType: leadData.businessType || "غير محدد",
        notes: leadData.notes
          ? `[source: ${source || 'unknown'}] ${leadData.notes}`
          : source ? `[source: ${source}]` : undefined,
      });
      return { id, source: source || 'unknown' };
    }),

  /**
   * scoreLeadById — PHASE 5
   * Manual trigger for the scoring pipeline.
   * Runs: AuditEngine → MissingFields → Readiness → OpportunityEngine → LeadScorer → PriorityLabeler.
   * Returns structured result with per-step observability.
   * NOT auto-wired into enrichment — manual trigger only.
   */
  scoreLeadById: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { runScoringPipeline } = await import("../scoring/index.js");
      const result = await runScoringPipeline(input.leadId);
      return {
        success: result.success,
        leadId: result.leadId,
        score: result.score,
        opportunities: result.opportunities,
        readinessState: result.readinessState,
        dbUpdated: result.dbUpdated,
        dbSkipReason: result.dbSkipReason,
        completedSteps: result.completedSteps,
        failedSteps: result.failedSteps,
      };
    }),

  /**
   * enrichLeadById — PHASE 4
   * Manual trigger for enrichment pipeline.
   * Runs Gate → Website → Social → Audit → Readiness Recompute.
   * Returns structured result with per-step observability.
   */
  enrichLeadById: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { getLeadById } = await import("../db.js");
      const { runEnrichmentPipeline } = await import("../enrichment/index.js");

      const lead = await getLeadById(input.leadId);
      if (!lead) {
        return {
          success: false,
          reason: "lead_not_found",
          leadId: input.leadId,
        };
      }

      const result = await runEnrichmentPipeline(lead);
      return {
        success: true,
        leadId: input.leadId,
        gateResult: result.gateResult,
        gateReason: result.gateReason,
        websiteEnriched: result.websiteEnriched,
        socialEnriched: result.socialEnriched,
        platformsEnriched: result.platformsEnriched,
        auditCompleted: result.auditCompleted,
        readinessRecomputed: result.readinessRecomputed,
        errors: result.errors,
      };
    }),

  /**
   * generateSalesBrief — PHASE 6A
   * Deterministic, stateless SalesBrief generation.
   * Runs scoring pipeline then generates brief from templates.
   * No DB writes. Manual trigger only.
   */
  generateSalesBrief: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const { runSalesBriefPipeline } = await import("../salesBrief/index.js");
      return runSalesBriefPipeline(input.leadId);
    }),
});
// ────────────────────────────────────────────────────────────────────────────────
// TODO PHASE 3 — resolveAndSave: multi-source resolution before insertion
// TODO PHASE 3 — linkAssetsToLead: persist LeadAsset[] to leadAssets table
// ────────────────────────────────────────────────────────────────────────────────
export { leadIntelligenceRouter };
