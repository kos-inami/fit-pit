import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const { userId } = await req.json();
    const user = await db.user.findUnique({ where: { id: userId }, select: { geminiKey: true } });
    if (!user?.geminiKey) return NextResponse.json({ error: "No key" }, { status: 400 });

    try {
        const res  = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${user.geminiKey.trim()}`
        );
        const data = await res.json();
        const names = (data.models ?? []).map((m: { name: string }) => m.name);
        return NextResponse.json({ models: names });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}