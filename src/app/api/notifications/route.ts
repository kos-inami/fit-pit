import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
        db.notification.findMany({
            where:   { userId },
            orderBy: { createdAt: "desc" },
            take:    50,
        }),
        db.notification.count({ where: { userId, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
}
