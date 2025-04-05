import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { mutation, query, QueryCtx } from "./_generated/server";
import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { roomInfo } from "./room";

export const createUser = mutation({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    if (args.sessionId == null || args.sessionId.length === 0) {
      throw new Error("Session ID is required");
    }

    const name = uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
    });

    const userId = await ctx.db.insert("users", {
      sessionId: args.sessionId,
      name,
      lastUpdated: Date.now(),
      votedYes: false,
    });
  },
});

export const sessionToUser = async (ctx: QueryCtx, sessionId: string) => {
  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("sessionId"), sessionId))
    .first();
};

export const getUserAndRoom = query({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    // Get user by session ID
    const user = await sessionToUser(ctx, args.sessionId);

    // If no user found, return null for both user and room
    if (!user) {
      return { user: null, room: null };
    }

    // If user has no room, return user but null for room
    if (!user.roomId) {
      return { user, room: null };
    }

    // Get the room by ID
    const room = await roomInfo(ctx, user.roomId);

    // Verify room exists - this should only happen in case of data corruption
    if (!room) {
      throw new Error("Room not found");
    }

    // Return both user and room
    return { user, room };
  },
});

export const changeName = mutation({
  args: {
    ...SessionIdArg,
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      name: args.name,
      lastUpdated: Date.now(),
    });
  },
});

export const vote = mutation({
  args: {
    ...SessionIdArg,
    votedYes: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      votedYes: args.votedYes,
      lastUpdated: Date.now(),
    });
  },
});

export const deleteUser = mutation({
  args: {
    ...SessionIdArg,
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.delete(user._id);
  },
});
