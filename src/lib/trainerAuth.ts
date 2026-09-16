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

/**
 * The single place that decides whether a trainer may read/write a program.
 * Every route under /api/programs/[id]/** must call this before touching
 * anything — never trust a client-supplied id for this decision.
 */
export async function getOwnedProgram(trainerId: string, programId: string) {
    const program = await db.program.findUnique({ where: { id: programId } });
    return program && program.trainerId === trainerId ? program : null;
}

/**
 * Verifies a ProgramDay actually belongs to the given program — the program
 * ownership check alone isn't enough, since a dayId/sessionId in the URL
 * could point at a *different* program the trainer doesn't necessarily own
 * the parent of. Every route that takes both a programId and a nested
 * day/session id must call the matching one of these before touching it.
 */
export async function getOwnedProgramWeek(programId: string, weekId: string) {
    const week = await db.programWeek.findUnique({ where: { id: weekId } });
    return week && week.programId === programId ? week : null;
}

export async function getOwnedProgramDay(programId: string, dayId: string) {
    const day = await db.programDay.findUnique({
        where:   { id: dayId },
        include: { week: true },
    });
    return day && day.week.programId === programId ? day : null;
}

export async function getOwnedProgramSession(programId: string, sessionId: string) {
    const programSession = await db.programSession.findUnique({
        where:   { id: sessionId },
        include: { day: { include: { week: true } } },
    });
    return programSession && programSession.day.week.programId === programId ? programSession : null;
}

/**
 * The single place that decides whether a trainer may read/write a library
 * session. Every route under /api/library/[id]/** must call this before
 * touching anything — never trust a client-supplied id for this decision.
 */
export async function getOwnedLibrarySession(trainerId: string, id: string) {
    const librarySession = await db.librarySession.findUnique({ where: { id } });
    return librarySession && librarySession.trainerId === trainerId ? librarySession : null;
}
