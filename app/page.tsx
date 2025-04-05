"use client";

import { User } from "@/components/User";
import { Room } from "@/components/Room";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-center sm:justify-between items-center shadow-sm gap-1">
        <h2 className="font-semibold text-xl">Consensus</h2>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Anonymous Group Voting
        </div>
      </header>
      <main className="flex-1 w-full px-4 py-6 sm:py-8">
        <div className="max-w-md mx-auto space-y-8">
          <section className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold">Consensus</h1>
            <p className="text-base sm:text-lg text-muted-foreground px-2">
              Simple anonymous voting for groups
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-center">
              Your Profile
            </h2>
            <User />
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-center">
              Room Management
            </h2>
            <Room />
          </section>
        </div>
      </main>
      <footer className="py-4 sm:py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs sm:text-sm text-muted-foreground">
        Built with Convex and Next.js
      </footer>
    </div>
  );
}
