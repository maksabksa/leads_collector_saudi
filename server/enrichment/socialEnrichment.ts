/**
 * PHASE 4 — Social Enrichment
 * Wrapper خفيف حول fetchAllRealData() يُخزّن النتائج في socialAnalyses.
 * لا يكتب في جدول leads مباشرة — يكتب في socialAnalyses فقط.
 */
import { getDb } from "../db";
import { socialAnalyses } from "../../drizzle/schema";
import type { Lead } from "../../drizzle/schema";
import { fetchAllRealData } from "../routers/realSocialData";

export type SocialEnrichmentResult =
  | { success: true; platformsEnriched: string[] }
  | { success: false; reason: string };

export async function runSocialEnrichment(
  lead: Lead
): Promise<SocialEnrichmentResult> {
  // تحقق من وجود منصة واحدة على الأقل
  const hasSocialPresence =
    lead.instagramUrl ||
    lead.twitterUrl ||
    lead.tiktokUrl ||
    lead.snapchatUrl ||
    lead.facebookUrl ||
    lead.linkedinUrl;

  if (!hasSocialPresence) {
    return { success: false, reason: "no_social_profiles" };
  }

  const db = await getDb();
  if (!db) {
    return { success: false, reason: "db_unavailable" };
  }

  let allData: Awaited<ReturnType<typeof fetchAllRealData>>;
  try {
    allData = await fetchAllRealData({
      instagramUrl: lead.instagramUrl ?? undefined,
      twitterUrl: lead.twitterUrl ?? undefined,
      tiktokUrl: lead.tiktokUrl ?? undefined,
      website: lead.website ?? undefined,
    });
  } catch (err) {
    return {
      success: false,
      reason: `social_fetch_failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const platformsEnriched: string[] = [];

  // حفظ Instagram
  if (allData.instagram) {
    const ig = allData.instagram;
    await db.insert(socialAnalyses).values({
      leadId: lead.id,
      platform: "instagram",
      profileUrl: lead.instagramUrl ?? undefined,
      hasAccount: true,
      followersCount: ig.followers ?? undefined,
      engagementRate: ig.avgEngagementRate ?? undefined,
      postsCount: ig.postsCount ?? undefined,
      avgLikes: ig.avgLikes ?? undefined,
      dataSource: "bright_data",
      rawAnalysis: JSON.stringify(ig),
      analysisText: `Instagram: ${ig.followers ?? 0} followers`,
    });
    platformsEnriched.push("instagram");
  }

  // حفظ Twitter/X — twitterUrl في schema يُخزّن رابط X أيضاً
  if (allData.twitter) {
    const tw = allData.twitter;
    await db.insert(socialAnalyses).values({
      leadId: lead.id,
      platform: "twitter",
      profileUrl: lead.twitterUrl ?? undefined,
      hasAccount: true,
      followersCount: tw.followers ?? undefined,
      postsCount: tw.tweetsCount ?? undefined,
      dataSource: "bright_data",
      rawAnalysis: JSON.stringify(tw),
      analysisText: `Twitter/X: ${tw.followers ?? 0} followers`,
    });
    platformsEnriched.push("twitter");
  }

  // حفظ TikTok
  if (allData.tiktok) {
    const tt = allData.tiktok;
    await db.insert(socialAnalyses).values({
      leadId: lead.id,
      platform: "tiktok",
      profileUrl: lead.tiktokUrl ?? undefined,
      hasAccount: true,
      followersCount: tt.followers ?? undefined,
      engagementRate: tt.avgEngagementRate ?? undefined,
      postsCount: tt.videoCount ?? undefined,
      dataSource: "bright_data",
      rawAnalysis: JSON.stringify(tt),
      analysisText: `TikTok: ${tt.followers ?? 0} followers`,
    });
    platformsEnriched.push("tiktok");
  }

  return { success: true, platformsEnriched };
}
