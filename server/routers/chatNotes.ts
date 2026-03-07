/**
 * chatNotes.ts — ملاحظات داخلية للمحادثات (لا يراها العميل)
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { chatInternalNotes } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const chatNotesRouter = router({
  // جلب ملاحظات محادثة
  list: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(chatInternalNotes)
        .where(eq(chatInternalNotes.chatId, input.chatId))
        .orderBy(desc(chatInternalNotes.isPinned), desc(chatInternalNotes.createdAt));
    }),

  // إضافة ملاحظة
  add: protectedProcedure
    .input(z.object({
      chatId: z.number(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const result = await db.insert(chatInternalNotes).values({
        chatId: input.chatId,
        authorId: ctx.user.id,
        authorName: ctx.user.name || ctx.user.email || "مستخدم",
        content: input.content,
      });
      return { id: (result as any).insertId };
    }),

  // تثبيت / إلغاء تثبيت ملاحظة
  togglePin: protectedProcedure
    .input(z.object({ noteId: z.number(), pinned: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .update(chatInternalNotes)
        .set({ isPinned: input.pinned })
        .where(eq(chatInternalNotes.id, input.noteId));
      return { success: true };
    }),

  // حذف ملاحظة
  delete: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db
        .delete(chatInternalNotes)
        .where(
          and(
            eq(chatInternalNotes.id, input.noteId),
            eq(chatInternalNotes.authorId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
