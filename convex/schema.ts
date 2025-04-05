import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vSessionId } from "convex-helpers/server/sessions";
// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  rooms: defineTable({
    code: v.string(),

    lastUpdated: v.number(),
  }),
  users: defineTable({
    sessionId: vSessionId,
    name: v.string(),
    roomId: v.optional(v.id("rooms")),
    votedYes: v.boolean(),

    lastUpdated: v.number(),
  }),
});
