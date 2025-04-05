import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Schedule cleanup tasks to run hourly
const crons = cronJobs();
crons.interval(
  "cleanup stale users",
  { hours: 1 },
  internal.cleanup.checkAndCleanupStaleUsers,
);

export default crons;
