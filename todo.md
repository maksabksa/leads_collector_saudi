# منصة تحليل التسويق الرقمي - Leads Collector Saudi

## قاعدة البيانات والـ Backend
- [x] تصميم schema: جداول leads, zones, website_analyses, social_analyses
- [x] تطبيق migration SQL
- [x] كتابة DB helpers في server/db.ts
- [x] إنشاء tRPC routers: leads, zones, analysis, export

## واجهة المستخدم
- [x] تصميم CSS variables والثيم الاحترافي (dark elegant) مع خط IBM Plex Arabic
- [x] بناء Layout مع sidebar عربي RTL
- [x] صفحة لوحة التحكم الرئيسية (Dashboard) مع إحصائيات وتقدم الهدف
- [x] صفحة إدارة المناطق الجغرافية (Zones) - 22 منطقة تلقائية
- [x] صفحة قائمة Leads مع فلترة وبحث وتصدير
- [x] نموذج إدخال Lead جديد (Add Lead Form) مع تحقق
- [x] صفحة تفاصيل Lead مع التحليلات الكاملة

## محللات التسويق الرقمي
- [x] محلل المواقع الإلكترونية (Website Analyzer) مع LLM
- [x] محلل السوشيال ميديا (Social Media Analyzer) مع LLM
- [x] نظام تقييم الثغرات التسويقية
- [x] توليد زاوية الدخول البيعية (Sales Entry Angle)
- [x] تقرير شامل بالذكاء الاصطناعي (Full Report)

## التقارير والتصدير
- [x] تقرير تفصيلي لكل Lead
- [x] تصدير CSV مع فلترة
- [ ] تصدير Excel (مستقبلي)
- [ ] تصدير PDF (مستقبلي)

## الاختبارات
- [x] Vitest tests للـ routers الرئيسية (6 اختبارات تمر)
- [x] التحقق من صحة البيانات في النماذج

## نظام البحث اليدوي التفاعلي (جديد)
- [x] صفحة البحث: حقل نوع النشاط + المدينة + زر بحث
- [x] Backend: Google Places Text Search API proxy في tRPC
- [x] Backend: Google Places Details API لجلب الهاتف والموقع والتفاصيل
- [x] عرض نتائج البحث في بطاقات مع الاسم والهاتف والعنوان والتقييم
- [x] زر "أضف كـ Lead" في كل بطاقة نتيجة مع إضافة فورية للقاعدة
- [x] منع التكرار: تنبيه إذا كان العميل موجود مسبقاً
- [x] إضافة صفحة البحث للـ sidebar
