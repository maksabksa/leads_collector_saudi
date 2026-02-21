import { eq, desc, asc, and, or, like, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  leads, InsertLead, Lead,
  zones, InsertZone, Zone,
  websiteAnalyses, InsertWebsiteAnalysis,
  socialAnalyses, InsertSocialAnalysis,
  searchJobs, InsertSearchJob, SearchJob,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== USER HELPERS =====
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== ZONES HELPERS =====
export async function getAllZones(): Promise<Zone[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(zones).orderBy(asc(zones.region), asc(zones.name));
}

export async function getZoneById(id: number): Promise<Zone | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  return result[0];
}

export async function createZone(data: InsertZone): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(zones).values(data);
  return (result[0] as any).insertId;
}

export async function updateZone(id: number, data: Partial<InsertZone>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(zones).set(data).where(eq(zones.id, id));
}

export async function deleteZone(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(zones).where(eq(zones.id, id));
}

export async function updateZoneLeadsCount(zoneId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const result = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.zoneId, zoneId));
  const count = result[0]?.count ?? 0;
  await db.update(zones).set({ leadsCount: count }).where(eq(zones.id, zoneId));
}

// ===== LEADS HELPERS =====
export async function getAllLeads(filters?: {
  zoneId?: number;
  city?: string;
  businessType?: string;
  analysisStatus?: string;
  search?: string;
}): Promise<Lead[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.zoneId) conditions.push(eq(leads.zoneId, filters.zoneId));
  if (filters?.city) conditions.push(eq(leads.city, filters.city));
  if (filters?.businessType) conditions.push(like(leads.businessType, `%${filters.businessType}%`));
  if (filters?.analysisStatus) conditions.push(eq(leads.analysisStatus, filters.analysisStatus as any));
  if (filters?.search) conditions.push(like(leads.companyName, `%${filters.search}%`));
  const query = conditions.length > 0
    ? db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt))
    : db.select().from(leads).orderBy(desc(leads.createdAt));
  return query;
}

export async function getLeadById(id: number): Promise<Lead | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: InsertLead): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(leads).values(data);
  const insertId = (result[0] as any).insertId;
  if (data.zoneId) await updateZoneLeadsCount(data.zoneId);
  return insertId;
}

export async function updateLead(id: number, data: Partial<InsertLead>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
  const lead = await getLeadById(id);
  if (lead?.zoneId) await updateZoneLeadsCount(lead.zoneId);
}

export async function deleteLead(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const lead = await getLeadById(id);
  await db.delete(leads).where(eq(leads.id, id));
  if (lead?.zoneId) await updateZoneLeadsCount(lead.zoneId);
}

export async function getLeadsStats() {
  const db = await getDb();
  if (!db) return { total: 0, analyzed: 0, pending: 0, byCity: [], byZone: [] };
  const total = await db.select({ count: sql<number>`count(*)` }).from(leads);
  const analyzed = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.analysisStatus, 'completed'));
  const pending = await db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.analysisStatus, 'pending'));
  const byCity = await db.select({ city: leads.city, count: sql<number>`count(*)` }).from(leads).groupBy(leads.city).orderBy(desc(sql`count(*)`)).limit(10);
  const byZone = await db.select({ zoneName: leads.zoneName, count: sql<number>`count(*)` }).from(leads).groupBy(leads.zoneName).orderBy(desc(sql`count(*)`)).limit(10);
  return {
    total: total[0]?.count ?? 0,
    analyzed: analyzed[0]?.count ?? 0,
    pending: pending[0]?.count ?? 0,
    byCity,
    byZone,
  };
}

// ===== WEBSITE ANALYSIS HELPERS =====
export async function getWebsiteAnalysisByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(websiteAnalyses).where(eq(websiteAnalyses.leadId, leadId)).orderBy(desc(websiteAnalyses.analyzedAt)).limit(1);
  return result[0];
}

export async function createWebsiteAnalysis(data: InsertWebsiteAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(websiteAnalyses).values(data);
  return (result[0] as any).insertId;
}

// ===== SOCIAL ANALYSIS HELPERS =====
export async function getSocialAnalysesByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialAnalyses).where(eq(socialAnalyses.leadId, leadId)).orderBy(desc(socialAnalyses.analyzedAt));
}

export async function createSocialAnalysis(data: InsertSocialAnalysis): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(socialAnalyses).values(data);
  return (result[0] as any).insertId;
}

export async function getTopGaps() {
  const db = await getDb();
  if (!db) return [];
  const results = await db.select({ gaps: websiteAnalyses.technicalGaps }).from(websiteAnalyses).limit(100);
  const gapCounts: Record<string, number> = {};
  for (const row of results) {
    if (Array.isArray(row.gaps)) {
      for (const gap of row.gaps) {
        gapCounts[gap] = (gapCounts[gap] || 0) + 1;
      }
    }
  }
  return Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([gap, count]) => ({ gap, count }));
}

// ===== SEARCH JOBS HELPERS =====

export async function createSearchJob(data: InsertSearchJob): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(searchJobs).values(data);
  return (result[0] as any).insertId;
}

export async function getSearchJobById(id: number): Promise<SearchJob | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(searchJobs).where(eq(searchJobs.id, id)).limit(1);
  return result[0];
}

export async function getAllSearchJobs(): Promise<SearchJob[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(searchJobs).orderBy(desc(searchJobs.createdAt));
}

export async function updateSearchJob(id: number, data: Partial<InsertSearchJob>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(searchJobs).set(data).where(eq(searchJobs.id, id));
}

export async function deleteSearchJob(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(searchJobs).where(eq(searchJobs.id, id));
}

export async function checkLeadDuplicate(phone: string, companyName: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const conditions = [];
  if (phone) conditions.push(eq(leads.verifiedPhone, phone));
  if (conditions.length === 0) return false;
  const result = await db.select({ id: leads.id }).from(leads).where(or(...conditions)).limit(1);
  return result.length > 0;
}

// ===== INSTAGRAM HELPERS =====
import {
  instagramSearches, InsertInstagramSearch, InstagramSearch,
  instagramAccounts, InsertInstagramAccount, InstagramAccount,
} from "../drizzle/schema";

export async function createInstagramSearch(data: InsertInstagramSearch): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(instagramSearches).values(data);
  return (result[0] as any).insertId;
}

export async function updateInstagramSearch(id: number, data: Partial<InstagramSearch>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(instagramSearches).set(data).where(eq(instagramSearches.id, id));
}

export async function getAllInstagramSearches(): Promise<InstagramSearch[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instagramSearches).orderBy(desc(instagramSearches.createdAt));
}

export async function getInstagramSearchById(id: number): Promise<InstagramSearch | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(instagramSearches).where(eq(instagramSearches.id, id)).limit(1);
  return result[0] || null;
}

export async function createInstagramAccounts(accounts: InsertInstagramAccount[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (accounts.length === 0) return;
  await db.insert(instagramAccounts).values(accounts);
}

export async function getInstagramAccountsBySearchId(searchId: number): Promise<InstagramAccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instagramAccounts).where(eq(instagramAccounts.searchId, searchId));
}

export async function markInstagramAccountAsLead(accountId: number, leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(instagramAccounts).set({ isAddedAsLead: true, leadId }).where(eq(instagramAccounts.id, accountId));
}
