/**
 * Bright Data SERP API - البحث في محركات البحث
 * يستخدم Bright Data SERP proxy للحصول على نتائج بحث حقيقية
 */

const SERP_HOST = process.env.BRIGHT_DATA_SERP_HOST || "brd.superproxy.io";
const SERP_PORT = parseInt(process.env.BRIGHT_DATA_SERP_PORT || "22225");
const SERP_USERNAME = process.env.BRIGHT_DATA_SERP_USERNAME || "";
const SERP_PASSWORD = process.env.BRIGHT_DATA_SERP_PASSWORD || "";

/**
 * تنفيذ طلب SERP عبر Bright Data proxy
 */
export async function serpRequest(url: string): Promise<string> {
  const proxyUrl = `http://${SERP_USERNAME}:${SERP_PASSWORD}@${SERP_HOST}:${SERP_PORT}`;
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    // @ts-ignore
    proxy: proxyUrl,
  });
  
  if (!response.ok) {
    throw new Error(`SERP request failed: ${response.status}`);
  }
  
  return response.text();
}

/**
 * البحث في Google عن حسابات Instagram
 */
export async function searchInstagramSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:instagram.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
  
  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "instagram.com");
  } catch {
    return [];
  }
}

/**
 * البحث في Google عن حسابات TikTok
 */
export async function searchTikTokSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:tiktok.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
  
  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "tiktok.com");
  } catch {
    return [];
  }
}

/**
 * البحث في Google عن حسابات Snapchat
 */
export async function searchSnapchatSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:snapchat.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
  
  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "snapchat.com");
  } catch {
    return [];
  }
}

/**
 * البحث في Google عن حسابات LinkedIn
 */
export async function searchLinkedInSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:linkedin.com/company ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
  
  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "linkedin.com");
  } catch {
    return [];
  }
}

/**
 * تحليل نتائج Google HTML واستخراج الروابط
 */
export function parseGoogleResultsPublic(html: string, domainFilter: string): Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}> {
  const results: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  
  // استخراج الروابط من HTML
  const linkRegex = /href="(https?:\/\/[^"]*?)"/g;
  const titleRegex = /<h3[^>]*>(.*?)<\/h3>/g;
  const snippetRegex = /<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>(.*?)<\/div>/g;
  
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    if (!domainFilter || url.includes(domainFilter)) {
      links.push(url);
    }
  }
  
  // استخراج usernames من الروابط
  for (const url of links.slice(0, 10)) {
    let username = "";
    
    if (domainFilter === "instagram.com") {
      const m = url.match(/instagram\.com\/([^/?#]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "tiktok.com") {
      const m = url.match(/tiktok\.com\/@([^/?#]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "snapchat.com") {
      const m = url.match(/snapchat\.com\/add\/([^/?#]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "linkedin.com") {
      const m = url.match(/linkedin\.com\/company\/([^/?#]+)/);
      username = m?.[1] || "";
    } else {
      username = url;
    }
    
    if (username && !["explore", "p", "reel", "stories", "accounts"].includes(username)) {
      results.push({
        username,
        displayName: username,
        bio: "",
        url,
      });
    }
  }
  
  return results;
}
