/**
 * realSocialData.ts
 * جلب بيانات حقيقية من السوشيال ميديا والباك لينك
 *
 * المصادر:
 * - TikTok: Manus Data API (Tiktok/get_user_info + Tiktok/get_user_popular_posts)
 * - Twitter/X: Manus Data API (Twitter/get_user_profile_by_username)
 * - Instagram: Bright Data Dataset API (Instagram profile scraper)
 * - Backlinks: Bright Data SERP API (بحث Google عن روابط تشير للموقع)
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

// ─── Instagram Data Interface ─────────────────────────────────────────────────

export interface InstagramRealData {
  username: string;
  fullName: string;
  followers: number;
  following: number;
  postsCount: number;
  verified: boolean;
  bio: string;
  profilePicUrl: string;
  isPrivate: boolean;
  avgLikes: number;
  avgComments: number;
  avgEngagementRate: number;
  topPosts: Array<{
    id: string;
    caption: string;
    likesCount: number;
    commentsCount: number;
    timestamp: string;
    mediaType: string;
  }>;
  dataSource: "bright_data_instagram";
  fetchedAt: string;
}

// ─── استخراج Instagram username ──────────────────────────────────────────────

function extractInstagramUsername(url: string): string | null {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)
    || url.match(/^@([a-zA-Z0-9._]+)$/)
    || url.match(/^([a-zA-Z0-9._]+)$/);
  if (!match) return null;
  const excluded = ["p", "reel", "stories", "explore", "accounts", "tv"];
  if (excluded.includes(match[1].toLowerCase())) return null;
  return match[1];
}

// ─── جلب بيانات Instagram عبر Bright Data Dataset API ────────────────────────

export async function fetchInstagramData(instagramUrl: string): Promise<InstagramRealData | null> {
  const username = extractInstagramUsername(instagramUrl);
  if (!username) return null;

  const token = process.env.BRIGHT_DATA_API_TOKEN || "";
  if (!token) return null;

  try {
    // طريقة 1: Bright Data Dataset API - Instagram Profile
    const profileUrl = `https://www.instagram.com/${username}/`;

    const response = await fetch("https://api.brightdata.com/datasets/v3/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        dataset_id: "gd_l1vikfnt1wgvvqz95w", // Instagram Profile dataset
        include_errors: false,
        type: "discover_new",
        discover_by: "url",
        data: [{ url: profileUrl }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Fallback: استخدام SERP API لجلب بيانات Instagram
      return await fetchInstagramViaSERP(username);
    }

    const triggerResult = await response.json() as any;
    const snapshotId = triggerResult?.snapshot_id;

    if (!snapshotId) {
      return await fetchInstagramViaSERP(username);
    }

    // انتظار النتيجة (polling)
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise(r => setTimeout(r, 5000)); // انتظر 5 ثوان

      const resultResponse = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: { "Authorization": `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!resultResponse.ok) continue;

      const data = await resultResponse.json() as any;
      if (!Array.isArray(data) || data.length === 0) continue;

      const profile = data[0];
      return parseInstagramProfile(profile, username);
    }

    // Fallback إذا لم تنجح Dataset API
    return await fetchInstagramViaSERP(username);
  } catch (err: any) {
    console.error("[Instagram API] Error:", err.message);
    // Fallback
    return await fetchInstagramViaSERP(username).catch(() => null);
  }
}

// ─── تحليل بيانات Instagram من Dataset API ───────────────────────────────────

function parseInstagramProfile(profile: any, username: string): InstagramRealData {
  const followers = Number(profile.followers_count || profile.follower_count || 0);
  const posts = (profile.posts || profile.recent_posts || []).slice(0, 5);

  const topPosts = posts.map((p: any) => ({
    id: p.id || p.post_id || "",
    caption: (p.description || p.caption || "").substring(0, 100),
    likesCount: Number(p.likes || p.like_count || 0),
    commentsCount: Number(p.comments || p.comment_count || 0),
    timestamp: p.date_posted || p.timestamp || "",
    mediaType: p.media_type || "image",
  }));

  let avgLikes = 0;
  let avgComments = 0;
  let avgEngagementRate = 0;

  if (topPosts.length > 0) {
    avgLikes = Math.round(topPosts.reduce((s: number, p: any) => s + p.likesCount, 0) / topPosts.length);
    avgComments = Math.round(topPosts.reduce((s: number, p: any) => s + p.commentsCount, 0) / topPosts.length);
    if (followers > 0) {
      avgEngagementRate = Math.round(((avgLikes + avgComments) / followers) * 100 * 100) / 100;
    }
  }

  return {
    username: profile.username || username,
    fullName: profile.name || profile.full_name || username,
    followers,
    following: Number(profile.following_count || 0),
    postsCount: Number(profile.posts_count || profile.media_count || 0),
    verified: Boolean(profile.is_verified || profile.verified),
    bio: (profile.biography || profile.bio || "").substring(0, 200),
    profilePicUrl: profile.profile_pic_url || profile.avatar || "",
    isPrivate: Boolean(profile.is_private),
    avgLikes,
    avgComments,
    avgEngagementRate,
    topPosts,
    dataSource: "bright_data_instagram",
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Fallback: جلب بيانات Instagram عبر SERP API ─────────────────────────────

async function fetchInstagramViaSERP(username: string): Promise<InstagramRealData | null> {
  const token = process.env.BRIGHT_DATA_API_TOKEN || "";
  if (!token) return null;

  try {
    // جلب صفحة Instagram مباشرة عبر Bright Data Browser
    const igUrl = `https://www.instagram.com/${username}/`;

    const response = await fetch("https://api.brightdata.com/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        zone: "serp_api1",
        url: igUrl,
        format: "raw",
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) return null;
    const html = await response.text();
    if (!html || html.length < 500) return null;

    // استخراج البيانات من الـ HTML (meta tags + JSON-LD)
    return parseInstagramFromHTML(html, username);
  } catch (err: any) {
    console.error("[Instagram SERP] Error:", err.message);
    return null;
  }
}

// ─── استخراج بيانات Instagram من HTML ────────────────────────────────────────

function parseInstagramFromHTML(html: string, username: string): InstagramRealData | null {
  try {
    // محاولة استخراج من meta tags
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    const description = descMatch ? descMatch[1] : "";

    // استخراج الأرقام من الوصف (مثال: "50.2K Followers, 200 Following, 150 Posts")  
    const followersMatch = description.match(/([d,.]+[KMk]?)\s*(?:Followers|متابع)/i);
    const followingMatch = description.match(/([d,.]+[KMk]?)\s*(?:Following|يتابع)/i);
    const postsMatch = description.match(/([d,.]+[KMk]?)\s*(?:Posts|منشور)/i);

    const parseNum = (str: string): number => {
      if (!str) return 0;
      const clean = str.replace(/,/g, "");
      if (clean.endsWith("K") || clean.endsWith("k")) return Math.round(parseFloat(clean) * 1000);
      if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1000000);
      return parseInt(clean) || 0;
    };

    const followers = followersMatch ? parseNum(followersMatch[1]) : 0;
    const following = followingMatch ? parseNum(followingMatch[1]) : 0;
    const postsCount = postsMatch ? parseNum(postsMatch[1]) : 0;

    // استخراج الوصف الشخصي من JSON-LD
    const jsonLdMatch = html.match(/<script type=["']application\/ld\+json["']>([^<]+)<\/script>/i);
    let bio = "";
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        bio = jsonLd.description || "";
      } catch {}
    }

    // فحص التوثيق
    const verified = html.includes('"is_verified":true') || html.includes('"verified":true');
    const isPrivate = html.includes('"is_private":true') || html.includes('"is_private": true');

    if (followers === 0 && postsCount === 0) return null;

    return {
      username,
      fullName: username,
      followers,
      following,
      postsCount,
      verified,
      bio: bio.substring(0, 200),
      profilePicUrl: "",
      isPrivate,
      avgLikes: 0,
      avgComments: 0,
      avgEngagementRate: 0,
      topPosts: [],
      dataSource: "bright_data_instagram",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── AllRealData Interface ────────────────────────────────────────────────────

export interface AllRealData {
  tiktok: TikTokRealData | null;
  twitter: TwitterRealData | null;
  instagram: InstagramRealData | null;
  backlinks: BacklinkData | null;
  fetchedAt: string;
  availableSources: string[];
}

export async function fetchAllRealData(lead: {
  tiktokUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  website?: string | null;
}): Promise<AllRealData> {
  const sources: string[] = [];

  // تشغيل الطلبات بالتوازي
  const tiktokPromise = lead.tiktokUrl
    ? fetchTikTokData(lead.tiktokUrl).catch(() => null)
    : Promise.resolve(null);

  const twitterPromise = lead.twitterUrl
    ? fetchTwitterData(lead.twitterUrl).catch(() => null)
    : Promise.resolve(null);

  const instagramPromise = lead.instagramUrl
    ? fetchInstagramData(lead.instagramUrl).catch(() => null)
    : Promise.resolve(null);

  const backlinkPromise = lead.website
    ? fetchBacklinkData(lead.website).catch(() => null)
    : Promise.resolve(null);

  const [tiktok, twitter, instagram, backlinks] = await Promise.all([
    tiktokPromise,
    twitterPromise,
    instagramPromise,
    backlinkPromise,
  ]);

  if (tiktok) sources.push("TikTok API");
  if (twitter) sources.push("Twitter API");
  if (instagram) sources.push("Instagram (Bright Data)");
  if (backlinks) sources.push("Bright Data SERP (Backlinks)");

  return {
    tiktok,
    twitter,
    instagram,
    backlinks,
    fetchedAt: new Date().toISOString(),
    availableSources: sources,
  };
}
