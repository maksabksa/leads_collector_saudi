import {
  int,
  bigint,
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
  defaultWhatsappAccountId: varchar("defaultWhatsappAccountId", { length: 64 }), // حساب واتساب الافتراضي للموظف
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
  // ===== التصنيف الإلزامي =====
  stage: mysqlEnum("stage", ["new", "contacted", "interested", "price_offer", "meeting", "won", "lost"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  nextStep: text("next_step"),
  nextFollowup: bigint("next_followup", { mode: "number" }),
  ownerUserId: int("owner_user_id"),
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
  // إعدادات التصعيد البشري
  escalationEnabled: boolean("escalationEnabled").default(false).notNull(), // تفعيل التصعيد عند عجز AI
  escalationPhone: varchar("escalationPhone", { length: 50 }), // رقم واتساب للتصعيد
  escalationMessage: text("escalationMessage"), // رسالة التصعيد للعميل
  escalationKeywords: json("escalationKeywords").$type<string[]>().default([]), // كلمات تُفعّل التصعيد الفوري
  // الكلمات المفتاحية لبناء المحادثة
  conversationKeywords: json("conversationKeywords").$type<{keyword: string, response: string, isActive: boolean}[]>().default([]),
  temperature: float("temperature").default(0.7).notNull(),
  maxTokens: int("maxTokens").default(500).notNull(),
  // تحكم في أسلوب التحليل
  analysisStyle: varchar("analysisStyle", { length: 50 }).default("balanced"), // balanced | aggressive | conservative | detailed
  analysisPrompt: text("analysisPrompt"), // برومبت مخصص لتحليل العملاء
  // صيغة الرسائل
  messageTemplate: text("messageTemplate"), // قالب الرسالة الافتراضي
  brandTone: varchar("brandTone", { length: 50 }).default("professional"), // professional | friendly | formal | casual
  // هوية البلد
  countryContext: varchar("countryContext", { length: 50 }).default("saudi"), // saudi | gulf | arabic | international
  dialect: varchar("dialect", { length: 50 }).default("gulf"), // gulf | egyptian | levantine | msa
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
  mediaUrl: text("mediaUrl"),       // URL للصورة أو الملف
  mediaType: varchar("mediaType", { length: 50 }), // image/video/audio/document
  mediaFilename: varchar("mediaFilename", { length: 255 }), // اسم الملف
  isAutoReply: boolean("isAutoReply").default(false).notNull(),
  status: mysqlEnum("status", ["sent", "delivered", "read", "failed"]).default("sent").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type WhatsappChatMessage = typeof whatsappChatMessages.$inferSelect;
export type InsertWhatsappChatMessage = typeof whatsappChatMessages.$inferInsert;

// ===== WHATSAPP ACCOUNTS TABLE (multi-account with roles) =====
export const whatsappAccounts = mysqlTable("whatsapp_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: varchar("accountId", { length: 64 }).notNull().unique(), // unique identifier
  label: varchar("label", { length: 100 }).notNull(), // display name e.g. "واتساب 1 - إرسال جماعي"
  phoneNumber: varchar("phoneNumber", { length: 30 }).notNull(), // the WhatsApp number
  // Role: bulk_sender = إرسال جماعي, human_handoff = تحويل للموظف, both = كلاهما
  role: mysqlEnum("role", ["bulk_sender", "human_handoff", "both"]).default("bulk_sender").notNull(),
  assignedEmployee: varchar("assignedEmployee", { length: 100 }), // employee name for human_handoff
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(), // for ordering in UI
  // نوع الحساب: collection=تجميع, sales=سيلز, analysis=تحليل, followup=متابعة
  accountType: mysqlEnum("account_type", ["collection", "sales", "analysis", "followup"]).default("collection").notNull(),
  notes: text("notes"), // optional notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type InsertWhatsappAccount = typeof whatsappAccounts.$inferInsert;

// ===== INTEREST ALERTS TABLE =====
// When a customer shows interest, an alert is created and can be transferred to a human agent
export const interestAlerts = mysqlTable("interest_alerts", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId"), // linked chat if any
  leadId: int("leadId"), // linked lead if any
  phone: varchar("phone", { length: 30 }).notNull(), // customer phone
  contactName: varchar("contactName", { length: 200 }), // customer name
  triggerMessage: text("triggerMessage"), // the message that triggered the alert
  interestScore: int("interestScore").default(0).notNull(), // 0-100 interest level
  detectedKeywords: json("detectedKeywords").$type<string[]>().default([]), // keywords found
  // Status: pending = انتظار, transferred = تم التحويل, dismissed = تم الرفض
  status: mysqlEnum("status", ["pending", "transferred", "dismissed"]).default("pending").notNull(),
  handoffAccountId: varchar("handoffAccountId", { length: 64 }), // which account to transfer to
  handoffPhone: varchar("handoffPhone", { length: 30 }), // employee phone number
  transferredAt: timestamp("transferredAt"),
  transferredBy: varchar("transferredBy", { length: 100 }), // who transferred
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InterestAlert = typeof interestAlerts.$inferSelect;
export type InsertInterestAlert = typeof interestAlerts.$inferInsert;

// ===== INTEREST KEYWORDS TABLE =====
// Custom keywords to detect customer interest (managed by admin)
export const interestKeywords = mysqlTable("interest_keywords", {
  id: int("id").autoincrement().primaryKey(),
  keyword: varchar("keyword", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).default("general").notNull(), // general, price, buy, contact
  weight: int("weight").default(20).notNull(), // contribution to interest score (0-100)
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(), // system default, cannot delete
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InterestKeyword = typeof interestKeywords.$inferSelect;
export type InsertInterestKeyword = typeof interestKeywords.$inferInsert;

// ===== AI TRAINING EXAMPLES TABLE =====
// Examples of interested/not-interested messages to improve AI detection
export const aiTrainingExamples = mysqlTable("ai_training_examples", {
  id: int("id").autoincrement().primaryKey(),
  message: text("message").notNull(),
  label: mysqlEnum("label", ["interested", "not_interested"]).notNull(),
  notes: varchar("notes", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiTrainingExample = typeof aiTrainingExamples.$inferSelect;
export type InsertAiTrainingExample = typeof aiTrainingExamples.$inferInsert;

// ===== SEGMENTS TABLE =====
// Customer segments for targeted messaging with optimal send times
export const segments = mysqlTable("segments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }).default("#3b82f6").notNull(), // hex color for UI
  // Optimal send times: JSON array of { day: 0-6, hour: 0-23 }
  optimalSendTimes: json("optimalSendTimes").$type<{ day: number; hour: number; label: string }[]>().default([]),
  // Auto-filter criteria: JSON object for automatic lead assignment
  filterCriteria: json("filterCriteria").$type<{
    cities?: string[];
    sources?: string[];
    statuses?: string[];
    minInterestScore?: number;
    hasWhatsapp?: boolean;
    country?: string;
  }>().default({}),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Segment = typeof segments.$inferSelect;
export type InsertSegment = typeof segments.$inferInsert;

// ===== LEAD SEGMENTS TABLE =====
// Many-to-many: leads ↔ segments
export const leadSegments = mysqlTable("lead_segments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  segmentId: int("segmentId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  addedBy: varchar("addedBy", { length: 100 }), // user who added
});
export type LeadSegment = typeof leadSegments.$inferSelect;
export type InsertLeadSegment = typeof leadSegments.$inferInsert;

// ===== DATA SETTINGS TABLE =====
// Customizable dropdown options for business types, cities, and other fields
export const dataSettings = mysqlTable("data_settings", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // "businessType" | "city" | "district" | "source" | "tag"
  value: varchar("value", { length: 200 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  parentValue: varchar("parentValue", { length: 200 }), // for hierarchical data (e.g., city → district)
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DataSetting = typeof dataSettings.$inferSelect;
export type InsertDataSetting = typeof dataSettings.$inferInsert;

// ===== RAG KNOWLEDGE BASE TABLES =====
// قاعدة المعرفة للذكاء الاصطناعي - RAG (Retrieval Augmented Generation)

export const ragDocuments = mysqlTable("rag_documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).default("general").notNull(),
  // نوع المستند: text (نص مباشر), faq (سؤال وجواب), product (منتج/خدمة), policy (سياسة), example (مثال رد)
  docType: mysqlEnum("docType", ["text", "faq", "product", "policy", "example", "tone"]).default("text").notNull(),
  content: text("content").notNull(),
  // عدد مرات الاستخدام في الردود
  usageCount: int("usageCount").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: varchar("createdBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RagDocument = typeof ragDocuments.$inferSelect;
export type InsertRagDocument = typeof ragDocuments.$inferInsert;

// أجزاء المستندات المقسّمة للبحث الدلالي
export const ragChunks = mysqlTable("rag_chunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  chunkIndex: int("chunkIndex").default(0).notNull(),
  content: text("content").notNull(),
  // embedding كـ JSON array من الأرقام (vector)
  embedding: json("embedding").$type<number[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RagChunk = typeof ragChunks.$inferSelect;
export type InsertRagChunk = typeof ragChunks.$inferInsert;

// سجل محادثات التدريب - أمثلة ردود احترافية
export const ragConversationExamples = mysqlTable("rag_conversation_examples", {
  id: int("id").autoincrement().primaryKey(),
  customerMessage: text("customerMessage").notNull(),
  idealResponse: text("idealResponse").notNull(),
  context: varchar("context", { length: 200 }),
  // أسلوب الرد: formal (رسمي), friendly (ودي), direct (مباشر), persuasive (مقنع)
  tone: mysqlEnum("tone", ["formal", "friendly", "direct", "persuasive"]).default("friendly").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  rating: int("rating").default(5), // تقييم جودة المثال 1-5
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RagConversationExample = typeof ragConversationExamples.$inferSelect;
export type InsertRagConversationExample = typeof ragConversationExamples.$inferInsert;

// إعدادات شخصية AI (هوية، أسلوب، قواعد)
export const aiPersonality = mysqlTable("ai_personality", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).default("مساعد المبيعات").notNull(),
  role: varchar("role", { length: 200 }).default("مساعد مبيعات احترافي").notNull(),
  businessContext: text("businessContext"), // وصف النشاط التجاري
  defaultTone: mysqlEnum("defaultTone", ["formal", "friendly", "direct", "persuasive"]).default("friendly").notNull(),
  language: varchar("language", { length: 20 }).default("ar").notNull(),
  systemPrompt: text("systemPrompt"), // prompt مخصص كامل
  rules: json("rules").$type<string[]>().default([]), // قواعد يجب الالتزام بها
  forbiddenTopics: json("forbiddenTopics").$type<string[]>().default([]), // مواضيع محظورة
  greetingMessage: text("greetingMessage"), // رسالة ترحيب افتراضية
  closingMessage: text("closingMessage"), // رسالة إنهاء محادثة
  isActive: boolean("isActive").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AiPersonality = typeof aiPersonality.$inferSelect;
export type InsertAiPersonality = typeof aiPersonality.$inferInsert;
