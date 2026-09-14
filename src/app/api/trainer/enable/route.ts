import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUniqueInviteCode } from "@/lib/inviteCode";

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.roles.includes("trainer")) {
        return NextResponse.json({ roles: user.roles, inviteCode: user.inviteCode });
    }

    const inviteCode = await createUniqueInviteCode(userId);
    const updated = await db.user.update({
        where: { id: userId },
        data:  { roles: { push: "trainer" } },
    });

    return NextResponse.json({ roles: updated.roles, inviteCode });
}
