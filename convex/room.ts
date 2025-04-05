import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { SessionIdArg, vSessionId } from "convex-helpers/server/sessions";
import { sessionToUser } from "./user";
import { Id } from "./_generated/dataModel";

const randomCode = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // removed I, O, 1, 0 to avoid confusion
  let result = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
};

export const createRoom = mutation({
  args: {
    sessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    // Generate a unique code
    let code: string = randomCode();
    let isUnique = false;

    while (!isUnique) {
      // Check if a room with this code already exists
      const existingRoom = await ctx.db
        .query("rooms")
        .filter((q) => q.eq(q.field("code"), code))
        .first();

      if (existingRoom === null) {
        isUnique = true;
      } else {
        // Generate a new code if collision detected
        code = randomCode();
      }
    }

    const room = await ctx.db.insert("rooms", {
      code,
      lastUpdated: Date.now(),
    });

    await ctx.db.patch(user._id, {
      roomId: room,
      lastUpdated: Date.now(),
    });

    return code;
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    sessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();
    if (!room) {
      throw new Error("Room not found");
    }

    await ctx.db.patch(user._id, {
      roomId: room._id,
      lastUpdated: Date.now(),
    });

    return room.code;
  },
});

export const roomInfo = async (ctx: QueryCtx, roomId: Id<"rooms">) => {
  const room = await ctx.db.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  const usersInRoom = await ctx.db
    .query("users")
    .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
    .collect();

  const votes = usersInRoom
    .map((user) => (user.votedYes ? 1 : 0))
    .reduce<number>((a, b) => a + b, 0);

  // Return users without votedYes field for privacy
  const usersWithoutVotes = usersInRoom.map(({ votedYes, ...user }) => user);

  return {
    ...room,
    users: usersWithoutVotes,
    votes,
  };
};

export const deleteUserFromRoom = mutation({
  args: {
    sessionId: vSessionId,
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    const roomUsers = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", user?.roomId))
      .collect();

    // make sure that calling user is the host
    // the user to be deleted is not the host
    // the user to be deleted is in the room
    if (user._id !== roomUsers[0]._id) {
      throw new Error("You are not the host");
    }

    if (args.targetUserId === user._id) {
      throw new Error("You cannot delete yourself");
    }

    if (!roomUsers.some((u) => u._id === args.targetUserId)) {
      throw new Error("User not found in room");
    }

    await ctx.db.patch(args.targetUserId, {
      roomId: undefined,
      lastUpdated: Date.now(),
    });
  },
});

export const regenerateRoomCode = mutation({
  args: {
    sessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.roomId) {
      throw new Error("You are not in a room");
    }

    const room = await ctx.db.get(user.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const newCode = randomCode();
    await ctx.db.patch(room._id, {
      code: newCode,
      lastUpdated: Date.now(),
    });

    return newCode;
  },
});

export const leaveRoom = mutation({
  args: {
    sessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const user = await sessionToUser(ctx, args.sessionId);

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      roomId: undefined,
      lastUpdated: Date.now(),
    });

    // if there are no users in the room, delete the room
    const usersInRoom = await ctx.db
      .query("users")
      .withIndex("by_roomId", (q) => q.eq("roomId", user.roomId))
      .collect();
    if (usersInRoom.length === 0 && user.roomId) {
      await ctx.db.delete(user.roomId);
    }
  },
});
