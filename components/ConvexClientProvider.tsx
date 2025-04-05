"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { SessionProvider } from "convex-helpers/react/sessions";
import { useLocalStorage } from "usehooks-ts";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider
        useStorage={useLocalStorage}
        storageKey="err53/consensus"
      >
        {children}
      </SessionProvider>
    </ConvexProvider>
  );
}
