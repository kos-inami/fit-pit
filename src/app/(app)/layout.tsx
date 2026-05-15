"use client";

import { SessionProvider } from "next-auth/react";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import { ProgramProvider } from "@/contexts/ProgramContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
        <ProgramProvider>
            {children}
            <BottomNav />
            <InstallPrompt />
        </ProgramProvider>
        </SessionProvider>
    );
}