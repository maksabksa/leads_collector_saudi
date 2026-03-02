import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  conversationLabels,
  conversationLabelAssignments,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const dbError = () =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

export const labelsRouter = router({
  // ===== CRUD Labels =====
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw dbError();
    return db.select().from(conversationLabels).orderBy(conversationLabels.name);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw dbError();
      const [result] = await db.insert(conversationLabels).values({
        name: input.name,
        color: input.color,
        description: input.description,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId, ...input };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw dbError();
      const { id, ...data } = input;
      await db
        .update(conversationLabels)
        .set(data)
        .where(eq(conversationLabels.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw dbError();
      await db
        .delete(conversationLabelAssignments)
        .where(eq(conversationLabelAssignments.labelId, input.id));
      await db
        .delete(conversationLabels)
        .where(eq(conversationLabels.id, input.id));
      return { success: true };
    }),

  // ===== Label Assignments =====
  getChatLabels: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw dbError();
      return db
        .select({
          id: conversationLabels.id,
          name: conversationLabels.name,
          color: conversationLabels.color,
        })
        .from(conversationLabelAssignments)
        .innerJoin(
          conversationLabels,
          eq(conversationLabelAssignments.labelId, conversationLabels.id)
        )
        .where(eq(conversationLabelAssignments.chatId, input.chatId));
    }),

  assignLabel: protectedProcedure
    .input(z.object({ chatId: z.number(), labelId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw dbError();
      const existing = await db
        .select()
        .from(conversationLabelAssignments)
        .where(
          and(
            eq(conversationLabelAssignments.chatId, input.chatId),
            eq(conversationLabelAssignments.labelId, input.labelId)
          )
        )
        .limit(1);
      if (existing.length > 0) return { success: true, alreadyExists: true };
      await db.insert(conversationLabelAssignments).values({
        chatId: input.chatId,
        labelId: input.labelId,
        assignedBy: ctx.user.id,
      });
      return { success: true };
    }),

  removeLabel: protectedProcedure
    .input(z.object({ chatId: z.number(), labelId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw dbError();
      await db
        .delete(conversationLabelAssignments)
        .where(
          and(
            eq(conversationLabelAssignments.chatId, input.chatId),
            eq(conversationLabelAssignments.labelId, input.labelId)
          )
        );
      return { success: true };
    }),

  getChatsByLabel: protectedProcedure
    .input(z.object({ labelId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw dbError();
      const rows = await db
        .select({ chatId: conversationLabelAssignments.chatId })
        .from(conversationLabelAssignments)
        .where(eq(conversationLabelAssignments.labelId, input.labelId));
      return rows.map((r) => r.chatId);
    }),
});
