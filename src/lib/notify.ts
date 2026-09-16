import { db } from "@/lib/db";
import { NotificationType } from "@/types";

export async function notify(userId: string, type: NotificationType, refId: string) {
    await db.notification.create({ data: { userId, type, refId } });
}
