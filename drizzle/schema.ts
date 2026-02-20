import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ===== ZONES TABLE =====
export const zones = mysqlTable("zones", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameEn: varchar("nameEn", { length: 100 }),
  region: varchar("region", { length: 100 }).notNull(), // e.g. الرياض, جدة, مكة...
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  leadsCount: int("leadsCount").default(0).notNull(),
  targetLeads: int("targetLeads").default(20).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Zone = typeof zones.$inferSelect;
export type InsertZone = typeof zones.$inferInsert;

// ===== LEADS TABLE =====
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 200 }).notNull(),
  businessType: varchar("businessType", { length: 100 }).notNull(), // ملحمة, أغنام, لحوم...
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }),
  zoneId: int("zoneId"),
  zoneName: varchar("zoneName", { length: 100 }),
  verifiedPhone: varchar("verifiedPhone", { length: 20 }),
  website: varchar("website", { length: 500 }),
  googleMapsUrl: varchar("googleMapsUrl", { length: 1000 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  twitterUrl: varchar("twitterUrl", { length: 500 }),
  snapchatUrl: varchar("snapchatUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  facebookUrl: varchar("facebookUrl", { length: 500 }),
  reviewCount: int("reviewCount").default(0),
  brandingQualityScore: float("brandingQualityScore"),
  seasonalReadinessScore: float("seasonalReadinessScore"),
  leadPriorityScore: float("leadPriorityScore"),
  biggestMarketingGap: text("biggestMarketingGap"),
  revenueOpportunity: text("revenueOpportunity"),
  suggestedSalesEntryAngle: text("suggestedSalesEntryAngle"),
  analysisStatus: mysqlEnum("analysisStatus", ["pending", "analyzing", "completed", "failed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ===== WEBSITE ANALYSIS TABLE =====
export const websiteAnalyses = mysqlTable("website_analyses", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  hasWebsite: boolean("hasWebsite").default(false),
  loadSpeedScore: float("loadSpeedScore"),       // 1-10
  mobileExperienceScore: float("mobileExperienceScore"), // 1-10
  seoScore: float("seoScore"),                   // 1-10
  contentQualityScore: float("contentQualityScore"), // 1-10
  designScore: float("designScore"),             // 1-10
  offerClarityScore: float("offerClarityScore"), // 1-10
  hasSeasonalPage: boolean("hasSeasonalPage").default(false),
  hasOnlineBooking: boolean("hasOnlineBooking").default(false),
  hasPaymentOptions: boolean("hasPaymentOptions").default(false),
  hasDeliveryInfo: boolean("hasDeliveryInfo").default(false),
  technicalGaps: json("technicalGaps").$type<string[]>(),
  contentGaps: json("contentGaps").$type<string[]>(),
  overallScore: float("overallScore"),           // 1-10
  summary: text("summary"),
  recommendations: json("recommendations").$type<string[]>(),
  rawAnalysis: text("rawAnalysis"),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type WebsiteAnalysis = typeof websiteAnalyses.$inferSelect;
export type InsertWebsiteAnalysis = typeof websiteAnalyses.$inferInsert;

// ===== SOCIAL MEDIA ANALYSIS TABLE =====
export const socialAnalyses = mysqlTable("social_analyses", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "twitter", "snapchat", "tiktok", "facebook"]).notNull(),
  profileUrl: varchar("profileUrl", { length: 500 }),
  hasAccount: boolean("hasAccount").default(false),
  postingFrequencyScore: float("postingFrequencyScore"), // 1-10
  engagementScore: float("engagementScore"),     // 1-10
  contentQualityScore: float("contentQualityScore"), // 1-10
  hasSeasonalContent: boolean("hasSeasonalContent").default(false),
  hasPricingContent: boolean("hasPricingContent").default(false),
  hasCallToAction: boolean("hasCallToAction").default(false),
  contentStrategyScore: float("contentStrategyScore"), // 1-10
  digitalPresenceScore: float("digitalPresenceScore"), // 1-10
  gaps: json("gaps").$type<string[]>(),
  overallScore: float("overallScore"),           // 1-10
  summary: text("summary"),
  recommendations: json("recommendations").$type<string[]>(),
  rawAnalysis: text("rawAnalysis"),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type SocialAnalysis = typeof socialAnalyses.$inferSelect;
export type InsertSocialAnalysis = typeof socialAnalyses.$inferInsert;
