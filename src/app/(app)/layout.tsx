"use client";

import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/ui/BottomNav";
import { ProgramProvider } from "@/contexts/ProgramContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
        <ProgramProvider>
            {children}
            <BottomNav />
        </ProgramProvider>
        </SessionProvider>
    );
}