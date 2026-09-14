import { db } from "@/lib/db";

/**
 * The single place that decides whether a trainer may read a trainee's data.
 * Every route that returns another user's data must call this — never trust
 * a client-supplied id or the JWT's cached roles for this decision.
 */
export async function getActiveClientLink(trainerId: string, traineeId: string) {
    return db.trainerClient.findUnique({
        where: { trainerId_traineeId: { trainerId, traineeId } },
    }).then(link => (link && link.status === "active" ? link : null));
}
