/**
 * realSocialData.ts
 * جلب بيانات حقيقية من السوشيال ميديا والباك لينك
 *
 * المصادر:
 * - TikTok: Manus Data API (Tiktok/get_user_info + Tiktok/get_user_popular_posts)
 * - Twitter/X: Manus Data API (Twitter/get_user_profile_by_username)
 * - Backlinks: Bright Data SERP API (بحث Google عن روابط تشير للموقع)
 * - Instagram/Snapchat: Bright Data SERP (موجود في serpSearch.ts)
 */

import { callDataApi } from "../_core/dataApi";
import { TRPCError } from "@trpc/server";

// ─── أنواع البيانات ───────────────────────────────────────────────────────────

export interface TikTokRealData {
  username: string;
  nickname: string;
  followers: number;
  following: number;
  hearts: number;       // إجمالي الإعجابات
  videoCount: number;
  verified: boolean;
  description: string;
  avatarUrl: string;
  secUid: string;
  topVideos: Array<{
    id: string;
    description: string;
    playCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    createTime: number;
  }>;
  avgEngagementRate: number; // نسبة التفاعل المتوسطة
  dataSource: "tiktok_api";
  fetchedAt: string;
}

export interface TwitterRealData {
  username: string;
  displayName: string;
  followers: number;
  following: number;
  tweetsCount: number;
  listedCount: number;
  verified: boolean;
  isBlueVerified: boolean;
  description: string;
  location: string;
  website: string;
  createdAt: string;
  profileImageUrl: string;
  dataSource: "twitter_api";
  fetchedAt: string;
}

export interface BacklinkData {
  domain: string;
  totalBacklinks: number;
  referringDomains: string[];
  topSources: Array<{
    domain: string;
    title: string;
    url: string;
    snippet: string;
  }>;
  hasGoogleMyBusiness: boolean;
  hasSocialLinks: boolean;
  dataSource: "bright_data_serp";
  fetchedAt: string;
}

// ─── استخراج username من URL ──────────────────────────────────────────────────

function extractTikTokUsername(url: string): string | null {
  if (!url) return null;
  // أشكال مختلفة: tiktok.com/@username, @username, username فقط
  const match = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/i)
    || url.match(/^@([a-zA-Z0-9._]+)$/)
    || url.match(/^([a-zA-Z0-9._]+)$/);
  return match ? match[1] : null;
}

function extractTwitterUsername(url: string): string | null {
  if (!url) return null;
  // أشكال مختلفة: twitter.com/username, x.com/username, @username
  const match = url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i)
    || url.match(/^@([a-zA-Z0-9_]+)$/)
    || url.match(/^([a-zA-Z0-9_]+)$/);
  if (!match) return null;
  // استبعاد المسارات الشائعة
  const excluded = ["home", "explore", "notifications", "messages", "i", "search", "hashtag"];
  if (excluded.includes(match[1].toLowerCase())) return null;
  return match[1];
}

function extractWebsiteDomain(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── جلب بيانات TikTok ────────────────────────────────────────────────────────

export async function fetchTikTokData(tiktokUrl: string): Promise<TikTokRealData | null> {
  const username = extractTikTokUsername(tiktokUrl);
  if (!username) return null;

  try {
    // جلب معلومات المستخدم الأساسية
    const userInfoRaw = await callDataApi("Tiktok/get_user_info", {
      query: { uniqueId: username },
    }) as any;

    const userInfo = userInfoRaw?.userInfo?.user;
    const stats = userInfoRaw?.userInfo?.stats;

    if (!userInfo || !stats) return null;

    const secUid = userInfo.secUid || "";
    const followers = Number(stats.followerCount || 0);
    const videoCount = Number(stats.videoCount || 0);

    // جلب أشهر الفيديوهات إذا كان لدينا secUid
    let topVideos: TikTokRealData["topVideos"] = [];
    let avgEngagementRate = 0;

    if (secUid && followers > 0) {
      try {
        const popularPostsRaw = await callDataApi("Tiktok/get_user_popular_posts", {
          query: { secUid, count: "10" },
        }) as any;

        const itemList = popularPostsRaw?.data?.itemList || [];
        topVideos = itemList.slice(0, 5).map((item: any) => ({
          id: item.id || "",
          description: (item.desc || "").substring(0, 100),
          playCount: Number(item.stats?.playCount || 0),
          likeCount: Number(item.stats?.diggCount || 0),
          commentCount: Number(item.stats?.commentCount || 0),
          shareCount: Number(item.stats?.shareCount || 0),
          createTime: Number(item.createTime || 0),
        }));

        // حساب معدل التفاعل المتوسط
        if (topVideos.length > 0 && followers > 0) {
          const totalEngagement = topVideos.reduce(
            (sum, v) => sum + v.likeCount + v.commentCount + v.shareCount,
            0
          );
          const avgEngagement = totalEngagement / topVideos.length;
          avgEngagementRate = Math.round((avgEngagement / followers) * 100 * 100) / 100;
        }
      } catch {
        // تجاهل خطأ الفيديوهات - البيانات الأساسية كافية
      }
    }

    return {
      username,
      nickname: userInfo.nickname || username,
      followers,
      following: Number(stats.followingCount || 0),
      hearts: Number(stats.heartCount || 0),
      videoCount,
      verified: Boolean(userInfo.verified),
      description: (userInfo.signature || "").substring(0, 200),
      avatarUrl: userInfo.avatarMedium || "",
      secUid,
      topVideos,
      avgEngagementRate,
      dataSource: "tiktok_api",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[TikTok API] Error:", err.message);
    return null;
  }
}

// ─── جلب بيانات Twitter ───────────────────────────────────────────────────────

export async function fetchTwitterData(twitterUrl: string): Promise<TwitterRealData | null> {
  const username = extractTwitterUsername(twitterUrl);
  if (!username) return null;

  try {
    const profileRaw = await callDataApi("Twitter/get_user_profile_by_username", {
      query: { username },
    }) as any;

    // التنقل في البنية المتداخلة
    const userData = profileRaw?.result?.data?.user?.result;
    if (!userData) return null;

    const core = userData.core || {};
    const legacy = userData.legacy || {};
    const avatar = userData.avatar || {};
    const verification = userData.verification || {};
    const locationData = userData.location || {};

    return {
      username: core.screen_name || username,
      displayName: core.name || username,
      followers: Number(legacy.followers_count || 0),
      following: Number(legacy.friends_count || 0),
      tweetsCount: Number(legacy.statuses_count || 0),
      listedCount: Number(legacy.listed_count || 0),
      verified: Boolean(verification.verified),
      isBlueVerified: Boolean(userData.is_blue_verified),
      description: (legacy.description || "").substring(0, 200),
      location: locationData.location || legacy.location || "",
      website: legacy.url || "",
      createdAt: core.created_at || "",
      profileImageUrl: avatar.image_url || "",
      dataSource: "twitter_api",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[Twitter API] Error:", err.message);
    return null;
  }
}

// ─── تحليل الباك لينك عبر Bright Data SERP ───────────────────────────────────

const BD_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";

async function serpRequest(googleUrl: string): Promise<string> {
  if (!BD_API_TOKEN) return "";

  try {
    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BD_API_TOKEN}`,
      },
      body: JSON.stringify({
        zone: "serp_api1",
        url: googleUrl,
        format: "raw",
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) return "";
    return response.text();
  } catch {
    return "";
  }
}

export async function fetchBacklinkData(websiteUrl: string): Promise<BacklinkData | null> {
  const domain = extractWebsiteDomain(websiteUrl);
  if (!domain) return null;

  try {
    // بحث Google عن المواقع التي تشير لهذا الموقع
    const backlinkQuery = `link:${domain} -site:${domain}`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(backlinkQuery)}&num=20&hl=ar&gl=sa`;

    const html = await serpRequest(googleUrl);

    // استخراج الروابط من HTML
    const referringDomains: string[] = [];
    const topSources: BacklinkData["topSources"] = [];

    if (html) {
      // استخراج النطاقات المُحيلة
      const linkMatches = html.match(/href="(https?:\/\/[^"]+)"/g) || [];
      const seen = new Set<string>();

      for (const linkMatch of linkMatches) {
        const urlMatch = linkMatch.match(/href="(https?:\/\/[^"]+)"/);
        if (!urlMatch) continue;
        const url = urlMatch[1];

        try {
          const urlObj = new URL(url);
          const refDomain = urlObj.hostname.replace(/^www\./, "");

          // تجاهل Google وروابط داخلية
          if (refDomain.includes("google.") || refDomain === domain) continue;
          if (seen.has(refDomain)) continue;
          seen.add(refDomain);

          referringDomains.push(refDomain);
          if (topSources.length < 8) {
            topSources.push({
              domain: refDomain,
              title: refDomain,
              url,
              snippet: "",
            });
          }
        } catch {
          continue;
        }
      }
    }

    // بحث إضافي: Google My Business
    const gmbQuery = `"${domain}" site:google.com/maps OR site:business.google.com`;
    const gmbUrl = `https://www.google.com/search?q=${encodeURIComponent(gmbQuery)}&num=5`;
    const gmbHtml = await serpRequest(gmbUrl);
    const hasGoogleMyBusiness = gmbHtml.includes("google.com/maps") || gmbHtml.includes("business.google.com");

    // فحص وجود روابط سوشيال ميديا
    const socialQuery = `site:instagram.com OR site:twitter.com OR site:tiktok.com "${domain}"`;
    const socialUrl = `https://www.google.com/search?q=${encodeURIComponent(socialQuery)}&num=5`;
    const socialHtml = await serpRequest(socialUrl);
    const hasSocialLinks = socialHtml.includes("instagram.com") || socialHtml.includes("twitter.com") || socialHtml.includes("tiktok.com");

    return {
      domain,
      totalBacklinks: referringDomains.length,
      referringDomains: referringDomains.slice(0, 20),
      topSources: topSources.slice(0, 8),
      hasGoogleMyBusiness,
      hasSocialLinks,
      dataSource: "bright_data_serp",
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[Backlink] Error:", err.message);
    return null;
  }
}

// ─── جمع كل البيانات الحقيقية في مكان واحد ──────────────────────────────────

export interface AllRealData {
  tiktok: TikTokRealData | null;
  twitter: TwitterRealData | null;
  backlinks: BacklinkData | null;
  fetchedAt: string;
  availableSources: string[];
}

export async function fetchAllRealData(lead: {
  tiktokUrl?: string | null;
  twitterUrl?: string | null;
  website?: string | null;
}): Promise<AllRealData> {
  const tasks: Promise<any>[] = [];
  const sources: string[] = [];

  // تشغيل الطلبات بالتوازي
  const tiktokPromise = lead.tiktokUrl
    ? fetchTikTokData(lead.tiktokUrl).catch(() => null)
    : Promise.resolve(null);

  const twitterPromise = lead.twitterUrl
    ? fetchTwitterData(lead.twitterUrl).catch(() => null)
    : Promise.resolve(null);

  const backlinkPromise = lead.website
    ? fetchBacklinkData(lead.website).catch(() => null)
    : Promise.resolve(null);

  const [tiktok, twitter, backlinks] = await Promise.all([
    tiktokPromise,
    twitterPromise,
    backlinkPromise,
  ]);

  if (tiktok) sources.push("TikTok API");
  if (twitter) sources.push("Twitter API");
  if (backlinks) sources.push("Bright Data SERP (Backlinks)");

  return {
    tiktok,
    twitter,
    backlinks,
    fetchedAt: new Date().toISOString(),
    availableSources: sources,
  };
}
