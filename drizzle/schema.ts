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
  region: varchar("region", { length: 100 }).notNull(),
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
  businessType: varchar("businessType", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).default("السعودية").notNull(),
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
  sourceJobId: int("sourceJobId"),   // رابط بمهمة البحث التي أنشأت هذا الـ Lead
  socialSince: varchar("socialSince", { length: 20 }),  // تاريخ الظهور على السوشيال ميديا (مثال: 2019، 2020-05)
  hasWhatsapp: mysqlEnum("hasWhatsapp", ["unknown", "yes", "no"]).default("unknown").notNull(),
  whatsappCheckedAt: timestamp("whatsappCheckedAt"),
  lastWhatsappSentAt: timestamp("lastWhatsappSentAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ===== SEARCH JOBS TABLE (محرك البحث الخلفي) =====
export const searchJobs = mysqlTable("search_jobs", {
  id: int("id").autoincrement().primaryKey(),
  // إعدادات المهمة
  jobName: varchar("jobName", { length: 200 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  businessType: varchar("businessType", { length: 200 }).notNull(),
  searchKeywords: json("searchKeywords").$type<string[]>(),  // كلمات البحث المتعددة
  targetCount: int("targetCount").default(50).notNull(),
  // حالة المهمة
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "failed"]).default("pending").notNull(),
  // تقدم المهمة
  totalSearched: int("totalSearched").default(0).notNull(),
  totalFound: int("totalFound").default(0).notNull(),
  totalDuplicates: int("totalDuplicates").default(0).notNull(),
  totalAdded: int("totalAdded").default(0).notNull(),
  currentKeyword: varchar("currentKeyword", { length: 200 }),
  currentPage: int("currentPage").default(0).notNull(),
  nextPageToken: text("nextPageToken"),
  // سجل العمليات
  log: json("log").$type<Array<{ time: string; message: string; type: "info" | "success" | "warning" | "error" }>>(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SearchJob = typeof searchJobs.$inferSelect;
export type InsertSearchJob = typeof searchJobs.$inferInsert;

// ===== WEBSITE ANALYSIS TABLE =====
export const websiteAnalyses = mysqlTable("website_analyses", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  hasWebsite: boolean("hasWebsite").default(false),
  loadSpeedScore: float("loadSpeedScore"),
  mobileExperienceScore: float("mobileExperienceScore"),
  seoScore: float("seoScore"),
  contentQualityScore: float("contentQualityScore"),
  designScore: float("designScore"),
  offerClarityScore: float("offerClarityScore"),
  hasSeasonalPage: boolean("hasSeasonalPage").default(false),
  hasOnlineBooking: boolean("hasOnlineBooking").default(false),
  hasPaymentOptions: boolean("hasPaymentOptions").default(false),
  hasDeliveryInfo: boolean("hasDeliveryInfo").default(false),
  technicalGaps: json("technicalGaps").$type<string[]>(),
  contentGaps: json("contentGaps").$type<string[]>(),
  overallScore: float("overallScore"),
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
  postingFrequencyScore: float("postingFrequencyScore"),
  engagementScore: float("engagementScore"),
  contentQualityScore: float("contentQualityScore"),
  hasSeasonalContent: boolean("hasSeasonalContent").default(false),
  hasPricingContent: boolean("hasPricingContent").default(false),
  hasCallToAction: boolean("hasCallToAction").default(false),
  contentStrategyScore: float("contentStrategyScore"),
  digitalPresenceScore: float("digitalPresenceScore"),
  gaps: json("gaps").$type<string[]>(),
  overallScore: float("overallScore"),
  summary: text("summary"),
  recommendations: json("recommendations").$type<string[]>(),
  rawAnalysis: text("rawAnalysis"),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type SocialAnalysis = typeof socialAnalyses.$inferSelect;
export type InsertSocialAnalysis = typeof socialAnalyses.$inferInsert;

// ===== WHATSAPP MESSAGES TABLE =====
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  messageType: mysqlEnum("messageType", ["individual", "bulk"]).default("individual").notNull(),
  bulkJobId: varchar("bulkJobId", { length: 64 }),  // معرف دفعة الإرسال المجمع
  status: mysqlEnum("status", ["sent", "pending", "failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ===== WHATSAPP TEMPLATES TABLE =====
export const whatsappTemplates = mysqlTable("whatsapp_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  content: text("content").notNull(),
  tone: mysqlEnum("tone", ["formal", "friendly", "direct"]).default("friendly").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = typeof whatsappTemplates.$inferInsert;

// ===== INSTAGRAM SEARCHES TABLE =====
export const instagramSearches = mysqlTable("instagram_searches", {
  id: int("id").autoincrement().primaryKey(),
  hashtag: varchar("hashtag", { length: 100 }).notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "running", "done", "error"]).default("pending").notNull(),
  errorMsg: text("errorMsg"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InstagramSearch = typeof instagramSearches.$inferSelect;
export type InsertInstagramSearch = typeof instagramSearches.$inferInsert;

// ===== INSTAGRAM ACCOUNTS TABLE =====
export const instagramAccounts = mysqlTable("instagram_accounts", {
  id: int("id").autoincrement().primaryKey(),
  searchId: int("searchId").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  fullName: varchar("fullName", { length: 200 }),
  bio: text("bio"),
  website: varchar("website", { length: 500 }),
  followersCount: int("followersCount").default(0),
  followingCount: int("followingCount").default(0),
  postsCount: int("postsCount").default(0),
  profilePicUrl: text("profilePicUrl"),
  isBusinessAccount: boolean("isBusinessAccount").default(false),
  businessCategory: varchar("businessCategory", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 200 }),
  city: varchar("city", { length: 100 }),
  isAddedAsLead: boolean("isAddedAsLead").default(false),
  leadId: int("leadId"),
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
});
export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InsertInstagramAccount = typeof instagramAccounts.$inferInsert;

// ===== USER INVITATIONS TABLE =====
export const userInvitations = mysqlTable("user_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  invitedBy: int("invitedBy").notNull(), // userId of the admin who invited
  token: varchar("token", { length: 128 }).notNull().unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  permissions: json("permissions").$type<string[]>(), // ['leads.view', 'leads.add', 'whatsapp.send', 'search.use']
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  acceptedBy: int("acceptedBy"), // userId who accepted
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ===== USER PERMISSIONS TABLE =====
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  permissions: json("permissions").$type<string[]>().notNull(), // ['leads.view', 'leads.add', 'whatsapp.send', 'search.use', 'analytics.view']
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

// ===== WHATSAPP SETTINGS TABLE =====
export const whatsappSettings = mysqlTable("whatsapp_settings", {
  id: int("id").autoincrement().primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull().unique(), // 'default' or custom account name
  accountLabel: varchar("accountLabel", { length: 100 }).notNull(),
  messageDelay: int("messageDelay").default(10000).notNull(), // ms between messages
  notificationThreshold: int("notificationThreshold").default(50).notNull(), // notify after X messages
  messagesSentToday: int("messagesSentToday").default(0).notNull(),
  totalMessagesSent: int("totalMessagesSent").default(0).notNull(),
  autoReplyEnabled: boolean("autoReplyEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappSettings = typeof whatsappSettings.$inferSelect;
export type InsertWhatsappSettings = typeof whatsappSettings.$inferInsert;

// ===== WHATSAPP AUTO REPLY RULES TABLE =====
export const autoReplyRules = mysqlTable("auto_reply_rules", {
  id: int("id").autoincrement().primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull().default("default"),
  triggerKeywords: json("triggerKeywords").$type<string[]>().notNull(), // keywords that trigger this rule
  replyTemplate: text("replyTemplate").notNull(), // template for the reply
  useAI: boolean("useAI").default(false).notNull(), // use AI to generate contextual reply
  aiContext: text("aiContext"), // context/instructions for AI reply generation
  isActive: boolean("isActive").default(true).notNull(),
  matchCount: int("matchCount").default(0).notNull(), // how many times this rule was triggered
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutoReplyRule = typeof autoReplyRules.$inferSelect;
export type InsertAutoReplyRule = typeof autoReplyRules.$inferInsert;

// ===== AI SETTINGS TABLE =====
export const aiSettings = mysqlTable("ai_settings", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["openai", "builtin"]).default("builtin").notNull(),
  openaiApiKey: text("openaiApiKey"), // encrypted API key
  openaiAssistantId: varchar("openaiAssistantId", { length: 100 }), // OpenAI Assistant ID
  openaiModel: varchar("openaiModel", { length: 50 }).default("gpt-4o-mini").notNull(),
  systemPrompt: text("systemPrompt"), // global system prompt for all AI replies
  businessContext: text("businessContext"), // business description for AI
  globalAutoReplyEnabled: boolean("globalAutoReplyEnabled").default(false).notNull(), // master switch
  temperature: float("temperature").default(0.7).notNull(),
  maxTokens: int("maxTokens").default(500).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AiSettings = typeof aiSettings.$inferSelect;
export type InsertAiSettings = typeof aiSettings.$inferInsert;

// ===== WHATSAPP CHATS TABLE =====
export const whatsappChats = mysqlTable("whatsapp_chats", {
  id: int("id").autoincrement().primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull().default("default"),
  phone: varchar("phone", { length: 30 }).notNull(),
  contactName: varchar("contactName", { length: 200 }),
  leadId: int("leadId"), // linked lead if any
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt"),
  unreadCount: int("unreadCount").default(0).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  aiAutoReplyEnabled: boolean("aiAutoReplyEnabled").default(true).notNull(), // per-chat AI control
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappChat = typeof whatsappChats.$inferSelect;
export type InsertWhatsappChat = typeof whatsappChats.$inferInsert;

// ===== WHATSAPP CHAT MESSAGES TABLE =====
export const whatsappChatMessages = mysqlTable("whatsapp_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  accountId: varchar("accountId", { length: 64 }).notNull().default("default"),
  direction: mysqlEnum("direction", ["outgoing", "incoming"]).notNull(),
  message: text("message").notNull(),
  isAutoReply: boolean("isAutoReply").default(false).notNull(),
  status: mysqlEnum("status", ["sent", "delivered", "read", "failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type WhatsappChatMessage = typeof whatsappChatMessages.$inferSelect;
export type InsertWhatsappChatMessage = typeof whatsappChatMessages.$inferInsert;
