import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Define how long a user can be inactive before being considered "stale" (12 hours)
const STALE_USER_THRESHOLD_MS = 12 * 60 * 60 * 1000;

// This action is scheduled to run every hour
export const checkAndCleanupStaleUsers = internalAction({
  handler: async (ctx) => {
    // Call the internal mutation to perform the actual cleanup
    await ctx.runMutation(internal.cleanup.cleanupStaleUsers);
  },
});

// This internal mutation does the actual work of finding and removing stale users
export const cleanupStaleUsers = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const staleThreshold = now - STALE_USER_THRESHOLD_MS;

    // Find all users that haven't been active in the specified time period (12 hours)
    const staleUsers = await ctx.db
      .query("users")
      .filter((q) => q.lt(q.field("lastUpdated"), staleThreshold))
      .collect();

    console.log(`Found ${staleUsers.length} stale users to clean up`);

    // Keep track of rooms that might need cleanup
    const roomsToCheck = new Set<Id<"rooms">>();

    // Delete each stale user
    for (const user of staleUsers) {
      // If the user is in a room, we'll need to check if it should be deleted
      if (user.roomId) {
        roomsToCheck.add(user.roomId);
      }
      await ctx.db.delete(user._id);
    }

    // Clean up empty rooms
    for (const roomId of roomsToCheck) {
      const usersInRoom = await ctx.db
        .query("users")
        .withIndex("by_roomId", (q) => q.eq("roomId", roomId))
        .first();

      // If no users are in this room anymore, delete it
      if (!usersInRoom) {
        await ctx.db.delete(roomId);
      }
    }

    return {
      staleUsersRemoved: staleUsers.length,
    };
  },
});
