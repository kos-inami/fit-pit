import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const { userId } = await req.json();

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
        where:  { id: userId },
        select: { geminiKey: true },
    });

    if (!user?.geminiKey) {
        return NextResponse.json({ error: "No API key saved" }, { status: 400 });
    }

    try {
        const genAI = new GoogleGenerativeAI(user.geminiKey.trim());
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Reply with just the word: OK");
        const text   = result.response.text().trim();

        if (text) {
        return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: "Empty response from Gemini" }, { status: 500 });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Gemini test error:", msg);

        if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
        }
        if (msg.includes("quota") || msg.includes("429")) {
        return NextResponse.json({ error: "Rate limit hit — key works but quota exceeded" }, { status: 429 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}