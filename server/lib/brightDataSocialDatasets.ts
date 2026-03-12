/**
 * Bright Data Dataset API - Social Media Platforms
 * يدعم: TikTok Profiles, TikTok Posts, Snapchat Posts, Twitter/X Posts, Facebook Pages
 *
 * Flow:
 * 1. Trigger: POST /datasets/v3/trigger?dataset_id=<ID>&format=json
 * 2. Returns: snapshot_id
 * 3. Poll: GET /datasets/v3/snapshot/{snapshot_id}?format=json
 * 4. Returns: full profile/posts data
 *
 * Dataset IDs (Bright Data Official):
 * - TikTok Profiles:    gd_l1vikfnt1wgvvqz95w  (confirmed in realSocialData.ts)
 * - TikTok Posts:       gd_lu702nij2f790tmv24
 * - Snapchat Posts:     gd_lkf0u1882c7ywfz3y
 * - Twitter/X Posts:    gd_lwxkxvnf1cynvib9co
 * - Facebook Pages:     gd_lyclm2p67xgu9o5v0  (keyword search variant)
 * - Facebook Page Posts: gd_ltppn6ug2l8oo3fj4
 */

import { ENV } from "../_core/env";

const BRIGHT_DATA_API_BASE = "https://api.brightdata.com";

// ===== Dataset IDs =====
export const DATASET_IDS = {
  TIKTOK_PROFILES:    "gd_l1villgoiiidt09ci",  // ✅ confirmed working - TikTok Profiles
  TIKTOK_POSTS:       "gd_l1villgoiiidt09ci",  // same dataset, posts via profile URL
  SNAPCHAT_POSTS:     "gd_lkf0u1882c7ywfz3y",  // may need activation
  TWITTER_POSTS:      "gd_lwxkxvnf1cynvib9co", // ✅ confirmed working - Twitter/X Posts
  FACEBOOK_PAGE_POSTS: "gd_ltppn6ug2l8oo3fj4", // may need activation
} as const;

// ===== Types =====
export interface TikTokProfile {
  id?: string;
  username?: string;
  nickname?: string;
  biography?: string;
  bio_link?: string;
  profile_url?: string;
  followers_count?: number;
  following_count?: number;
  likes_count?: number;
  videos_count?: number;
  avg_engagement_rate?: number;
  comment_engagement_rate?: number;
  like_engagement_rate?: number;
  is_verified?: boolean;
  predicted_language?: string;
  error?: string;
}

export interface TikTokPost {
  url?: string;
  post_id?: string;
  description?: string;
  create_time?: string;
  digg_count?: number;
  share_count?: number;
  collect_count?: number;
  comment_count?: number;
  play_count?: number;
  author_username?: string;
  error?: string;
}

export interface SnapchatPost {
  url?: string;
  post_id?: string;
  profile_name?: string;
  profile_handle?: string;
  profile_link?: string;
  num_comments?: number;
  num_shares?: number;
  num_views?: number;
  content?: string;
  date_posted?: string;
  error?: string;
}

export interface TwitterPost {
  url?: string;
  id?: string;
  user_posted?: string;
  name?: string;
  description?: string;
  date_posted?: string;
  photos?: string[];
  quoted_post?: string;
  num_comments?: number;
  num_likes?: number;
  num_reposts?: number;
  num_views?: number;
  error?: string;
}

export interface FacebookPagePost {
  url?: string;
  post_id?: string;
  user_url?: string;
  user_username_raw?: string;
  content?: string;
  date_posted?: string;
  hashtags?: string[];
  num_comments?: number;
  num_likes?: number;
  num_shares?: number;
  error?: string;
}

export interface SocialDatasetResult<T> {
  success: boolean;
  data?: T[];
  snapshotId?: string;
  error?: string;
  platform: string;
}

// ===== Helper: sleep =====
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Helper: HTTP Request =====
async function brightDataRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  timeoutMs = 30000
): Promise<unknown> {
  const apiKey = ENV.brightDataApiToken;
  if (!apiKey) throw new Error("BRIGHT_DATA_API_TOKEN not configured");

  const url = `${BRIGHT_DATA_API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bright Data API error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    if (!text.trim()) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ===== Step 1: Trigger Collection =====
async function triggerDatasetCollection(
  datasetId: string,
  inputs: Record<string, string>[]
): Promise<string> {
  const result = await brightDataRequest(
    "POST",
    `/datasets/v3/trigger?dataset_id=${datasetId}&format=json&uncompressed_webhook=true`,
    inputs
  ) as { snapshot_id: string };

  if (!result?.snapshot_id) {
    throw new Error(`No snapshot_id returned from Bright Data for dataset ${datasetId}`);
  }

  console.log(`[BD Dataset] Triggered ${datasetId}, snapshot: ${result.snapshot_id}`);
  return result.snapshot_id;
}

// ===== Step 2: Poll for Results =====
async function pollSnapshot<T>(
  snapshotId: string,
  maxWaitMs = 120000,
  pollIntervalMs = 5000
): Promise<T[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await brightDataRequest(
        "GET",
        `/datasets/v3/snapshot/${snapshotId}?format=json`,
        undefined,
        20000
      );

      if (Array.isArray(result) && result.length > 0) {
        console.log(`[BD Dataset] Snapshot ${snapshotId} ready with ${result.length} records`);
        return result as T[];
      }

      if (result && typeof result === "object" && !Array.isArray(result)) {
        const status = (result as any).status;
        if (["running", "pending", "initializing"].includes(status)) {
          console.log(`[BD Dataset] Snapshot ${snapshotId} status: ${status}, waiting...`);
          await sleep(pollIntervalMs);
          continue;
        }
        if (status === "failed") {
          throw new Error(`Snapshot ${snapshotId} failed: ${JSON.stringify(result)}`);
        }
      }

      if (typeof result === "string" && result.trim()) {
        const lines = result.trim().split("\n").filter(l => l.trim());
        const records = lines.map(line => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter(Boolean);
        if (records.length > 0) return records as T[];
      }

      await sleep(pollIntervalMs);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("not ready") || errMsg.includes("processing") || errMsg.includes("404")) {
        await sleep(pollIntervalMs);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Snapshot ${snapshotId} timed out after ${maxWaitMs / 1000}s`);
}

// ===== Normalize URLs =====
function normalizeTikTokUrl(input: string): string {
  if (!input) return input;
  const clean = input.trim().replace(/\s+/g, "");
  if (clean.startsWith("http")) return clean;
  const handle = clean.replace(/^@/, "");
  return `https://www.tiktok.com/@${handle}`;
}

function normalizeSnapchatUrl(input: string): string {
  if (!input) return input;
  const clean = input.trim().replace(/\s+/g, "");
  if (clean.startsWith("http")) return clean;
  const handle = clean.replace(/^@/, "");
  return `https://www.snapchat.com/add/${handle}`;
}

function normalizeTwitterUrl(input: string): string {
  if (!input) return input;
  const clean = input.trim().replace(/\s+/g, "");
  // Twitter/X Posts dataset requires URL format: https://x.com/username/status/
  if (clean.includes("/status/")) return clean.replace("twitter.com", "x.com");
  const handle = clean.replace(/^@/, "").replace(/.*twitter\.com\//, "").replace(/.*x\.com\//, "").replace(/\/.*$/, "");
  // Use profile posts discovery format
  return `https://x.com/${handle}/status/`;
}

function normalizeFacebookUrl(input: string): string {
  if (!input) return input;
  const clean = input.trim().replace(/\s+/g, "");
  if (clean.startsWith("http")) return clean;
  return `https://www.facebook.com/${clean}`;
}

// ===== Public API: TikTok Profile =====
export async function fetchTikTokProfile(
  profileUrl: string
): Promise<SocialDatasetResult<TikTokProfile>> {
  const platform = "tiktok";
  try {
    const cleanUrl = normalizeTikTokUrl(profileUrl);
    console.log(`[BD TikTok] Fetching profile: ${cleanUrl}`);

    const snapshotId = await triggerDatasetCollection(
      DATASET_IDS.TIKTOK_PROFILES,
      [{ url: cleanUrl }]
    );

    const data = await pollSnapshot<TikTokProfile>(snapshotId, 120000, 5000);

    return { success: true, data, snapshotId, platform };
  } catch (err: any) {
    console.error(`[BD TikTok] Error:`, err.message);
    return { success: false, error: err.message, platform };
  }
}

// ===== Public API: TikTok Posts =====
export async function fetchTikTokPosts(
  profileUrl: string,
  limit = 10
): Promise<SocialDatasetResult<TikTokPost>> {
  const platform = "tiktok_posts";
  try {
    const cleanUrl = normalizeTikTokUrl(profileUrl);
    console.log(`[BD TikTok Posts] Fetching posts for: ${cleanUrl}`);

    const snapshotId = await triggerDatasetCollection(
      DATASET_IDS.TIKTOK_POSTS,
      [{ url: cleanUrl, num_of_posts: String(limit) }]
    );

    const data = await pollSnapshot<TikTokPost>(snapshotId, 120000, 5000);

    return { success: true, data, snapshotId, platform };
  } catch (err: any) {
    console.error(`[BD TikTok Posts] Error:`, err.message);
    return { success: false, error: err.message, platform };
  }
}

// ===== Public API: Snapchat Posts =====
export async function fetchSnapchatPosts(
  profileUrl: string,
  limit = 10
): Promise<SocialDatasetResult<SnapchatPost>> {
  const platform = "snapchat";
  try {
    const cleanUrl = normalizeSnapchatUrl(profileUrl);
    console.log(`[BD Snapchat] Fetching posts for: ${cleanUrl}`);

    const snapshotId = await triggerDatasetCollection(
      DATASET_IDS.SNAPCHAT_POSTS,
      [{ url: cleanUrl, num_of_posts: String(limit) }]
    );

    const data = await pollSnapshot<SnapchatPost>(snapshotId, 120000, 5000);

    return { success: true, data, snapshotId, platform };
  } catch (err: any) {
    console.error(`[BD Snapchat] Error:`, err.message);
    return { success: false, error: err.message, platform };
  }
}

// ===== Public API: Twitter/X Posts =====
export async function fetchTwitterPosts(
  profileUrl: string,
  limit = 10
): Promise<SocialDatasetResult<TwitterPost>> {
  const platform = "twitter";
  try {
    const cleanUrl = normalizeTwitterUrl(profileUrl);
    console.log(`[BD Twitter] Fetching posts for: ${cleanUrl}`);

    const snapshotId = await triggerDatasetCollection(
      DATASET_IDS.TWITTER_POSTS,
      [{ url: cleanUrl, num_of_posts: String(limit) }]
    );

    const data = await pollSnapshot<TwitterPost>(snapshotId, 120000, 5000);

    return { success: true, data, snapshotId, platform };
  } catch (err: any) {
    console.error(`[BD Twitter] Error:`, err.message);
    return { success: false, error: err.message, platform };
  }
}

// ===== Public API: Facebook Page Posts =====
export async function fetchFacebookPagePosts(
  pageUrl: string,
  limit = 10
): Promise<SocialDatasetResult<FacebookPagePost>> {
  const platform = "facebook";
  try {
    const cleanUrl = normalizeFacebookUrl(pageUrl);
    console.log(`[BD Facebook] Fetching page posts for: ${cleanUrl}`);

    const snapshotId = await triggerDatasetCollection(
      DATASET_IDS.FACEBOOK_PAGE_POSTS,
      [{ url: cleanUrl, num_of_posts: String(limit) }]
    );

    const data = await pollSnapshot<FacebookPagePost>(snapshotId, 120000, 5000);

    return { success: true, data, snapshotId, platform };
  } catch (err: any) {
    console.error(`[BD Facebook] Error:`, err.message);
    return { success: false, error: err.message, platform };
  }
}

// ===== Unified: Fetch Any Platform =====
export async function fetchSocialPlatformData(
  platform: "tiktok" | "snapchat" | "twitter" | "facebook",
  profileUrl: string
): Promise<SocialDatasetResult<any>> {
  switch (platform) {
    case "tiktok":
      return fetchTikTokProfile(profileUrl);
    case "snapchat":
      return fetchSnapchatPosts(profileUrl);
    case "twitter":
      return fetchTwitterPosts(profileUrl);
    case "facebook":
      return fetchFacebookPagePosts(profileUrl);
    default:
      return { success: false, error: `Unsupported platform: ${platform}`, platform };
  }
}

// ===== Extract Summary Stats from Results =====
export function extractSocialStats(platform: string, data: any[]): {
  followersCount?: number;
  postsCount?: number;
  engagementRate?: number;
  avgLikes?: number;
  avgComments?: number;
  avgViews?: number;
  bio?: string;
  isVerified?: boolean;
  profileName?: string;
  recentPosts?: Array<{ content: string; date?: string; likes?: number; views?: number }>;
} {
  if (!data || data.length === 0) return {};

  if (platform === "tiktok") {
    const profile = data[0] as TikTokProfile;
    return {
      followersCount: profile.followers_count,
      postsCount: profile.videos_count,
      engagementRate: profile.avg_engagement_rate,
      bio: profile.biography,
      isVerified: profile.is_verified,
      profileName: profile.nickname || profile.username,
    };
  }

  if (platform === "tiktok_posts") {
    const posts = data as TikTokPost[];
    const totalLikes = posts.reduce((s, p) => s + (p.digg_count || 0), 0);
    const totalViews = posts.reduce((s, p) => s + (p.play_count || 0), 0);
    return {
      postsCount: posts.length,
      avgLikes: posts.length ? Math.round(totalLikes / posts.length) : 0,
      avgViews: posts.length ? Math.round(totalViews / posts.length) : 0,
      recentPosts: posts.slice(0, 5).map(p => ({
        content: p.description || "",
        date: p.create_time,
        likes: p.digg_count,
        views: p.play_count,
      })),
    };
  }

  if (platform === "snapchat") {
    const posts = data as SnapchatPost[];
    const totalViews = posts.reduce((s, p) => s + (p.num_views || 0), 0);
    return {
      postsCount: posts.length,
      avgViews: posts.length ? Math.round(totalViews / posts.length) : 0,
      profileName: posts[0]?.profile_name,
      recentPosts: posts.slice(0, 5).map(p => ({
        content: p.content || "",
        date: p.date_posted,
        views: p.num_views,
      })),
    };
  }

  if (platform === "twitter") {
    const posts = data as TwitterPost[];
    const totalLikes = posts.reduce((s, p) => s + (p.num_likes || 0), 0);
    const totalViews = posts.reduce((s, p) => s + (p.num_views || 0), 0);
    return {
      postsCount: posts.length,
      avgLikes: posts.length ? Math.round(totalLikes / posts.length) : 0,
      avgViews: posts.length ? Math.round(totalViews / posts.length) : 0,
      profileName: posts[0]?.name,
      recentPosts: posts.slice(0, 5).map(p => ({
        content: p.description || "",
        date: p.date_posted,
        likes: p.num_likes,
        views: p.num_views,
      })),
    };
  }

  if (platform === "facebook") {
    const posts = data as FacebookPagePost[];
    const totalLikes = posts.reduce((s, p) => s + (p.num_likes || 0), 0);
    return {
      postsCount: posts.length,
      avgLikes: posts.length ? Math.round(totalLikes / posts.length) : 0,
      profileName: posts[0]?.user_username_raw,
      recentPosts: posts.slice(0, 5).map(p => ({
        content: p.content || "",
        date: p.date_posted,
        likes: p.num_likes,
      })),
    };
  }

  return {};
}
