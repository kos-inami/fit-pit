import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await db.notification.updateMany({
        where: { userId, readAt: null },
        data:  { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
}
