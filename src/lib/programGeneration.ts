import { Prisma } from "@prisma/client";
import { addDaysToDateString } from "@/lib/utils";
import { calcFromPercent } from "@/lib/setMath";
import { SESSION_TYPE_META, SessionType, TemplateSetLog } from "@/types";

type TxClient = Prisma.TransactionClient;

/**
 * The trainee's current best actual (non-expected) MaxRecord weight per
 * movement — one query, reduced the same way AddSessionSheet.tsx reduces
 * its `actualMap` client-side (skip falsy/<=0 weight, keep the max seen).
 * Generation must use the exact same reduction or a trainer-assigned
 * session would resolve to a different weight than the trainee would get
 * planning the same set themselves.
 */
export async function buildMaxRecordMap(tx: TxClient, traineeId: string): Promise<Map<string, number>> {
    const records = await tx.maxRecord.findMany({
        where: { userId: traineeId, isExpected: false },
    });
    const map = new Map<string, number>();
    for (const r of records) {
        if (!r.weight || r.weight <= 0) continue;
        const existing = map.get(r.movement);
        if (!existing || r.weight > existing) map.set(r.movement, r.weight);
    }
    return map;
}

interface GenerateParams {
    tx:           TxClient;
    programId:    string;
    trainerId:    string; // createdById for generated sessions
    traineeId:    string;
    assignmentId: string;
    startDate:    string; // assignment.startDate
    startWeek:    number; // assignment.startWeek
    fromWeek:     number; // inclusive, in the program's own weekNumber space
    toWeek:       number; // inclusive
    maxRecordMap: Map<string, number>;
}

/** Copies ProgramSessions in [fromWeek, toWeek] into real Sessions on the trainee's real Days. */
export async function generateForWeekRange(params: GenerateParams): Promise<number> {
    const {
        tx, programId, trainerId, traineeId, assignmentId,
        startDate, startWeek, fromWeek, toWeek, maxRecordMap,
    } = params;

    const weeks = await tx.programWeek.findMany({
        where:   { programId, weekNumber: { gte: fromWeek, lte: toWeek } },
        include: {
            days: {
                include: { sessions: { orderBy: { order: "asc" } } },
                orderBy: { dayIndex: "asc" },
            },
        },
        orderBy: { weekNumber: "asc" },
    });
    if (weeks.length === 0) return 0;

    // real calendar date per ProgramDay
    const dateByProgramDay = new Map<string, string>();
    const neededDates = new Set<string>();
    for (const week of weeks) {
        const weekOffset = week.weekNumber - startWeek;
        for (const day of week.days) {
            const date = addDaysToDateString(startDate, weekOffset * 7 + (day.dayIndex - 1));
            dateByProgramDay.set(day.id, date);
            neededDates.add(date);
        }
    }

    // ensure real Day rows exist — createMany+skipDuplicates, then one fetch,
    // instead of N sequential upserts
    await tx.day.createMany({
        data: [...neededDates].map(date => ({ userId: traineeId, date })),
        skipDuplicates: true,
    });
    const realDays = await tx.day.findMany({
        where:  { userId: traineeId, date: { in: [...neededDates] } },
        select: { id: true, date: true },
    });
    const dayIdByDate = new Map(realDays.map(d => [d.date, d.id]));

    const sessionRows: Prisma.SessionCreateManyInput[] = [];

    for (const week of weeks) {
        for (const day of week.days) {
            const date = dateByProgramDay.get(day.id)!;
            const realDayId = dayIdByDate.get(date)!;

            if (day.isRestDay) {
                sessionRows.push({
                    dayId:       realDayId,
                    type:        "rest",
                    name:        "Rest Day",
                    order:       0,
                    isRestDay:   true,
                    source:      "trainer",
                    createdById: trainerId,
                    assignmentId,
                });
                continue;
            }

            for (const ps of day.sessions) {
                const meta = SESSION_TYPE_META[ps.type as SessionType] as
                    typeof SESSION_TYPE_META[SessionType] | undefined;

                let planSets: string | null = null;
                if (meta?.useSets && ps.planSets) {
                    const template = JSON.parse(ps.planSets) as TemplateSetLog[];
                    const maxWeight = ps.referenceMovement
                        ? maxRecordMap.get(ps.referenceMovement) ?? null
                        : null;
                    const resolved = template.map(t => ({
                        setNumber:  t.setNumber,
                        percentage: t.percentage,
                        weight:     t.percentage != null && maxWeight != null
                            ? calcFromPercent(t.percentage, maxWeight)
                            : null,
                        maxWeight,
                        reps:  t.reps,
                        notes: t.notes ?? "",
                    }));
                    planSets = JSON.stringify(resolved);
                }

                sessionRows.push({
                    dayId:       realDayId,
                    type:        ps.type,
                    name:        ps.name,
                    desc:        ps.desc,
                    planSets,
                    rounds:      ps.rounds,
                    order:       ps.order,
                    isRestDay:   false,
                    source:      "trainer",
                    createdById: trainerId,
                    assignmentId,
                });
            }
        }
    }

    if (sessionRows.length > 0) {
        await tx.session.createMany({ data: sessionRows });
    }
    return sessionRows.length;
}
