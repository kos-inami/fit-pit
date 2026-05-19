import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    try {
        const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id:                 true,
            name:               true,
            email:              true,
            primaryGoal:        true,
            levelCrossFit:      true,
            levelWorkout:       true,
            levelWeightLifting: true,
            levelCardio:        true,
            levelRunning:       true,
            weight:             true,
            height:             true,
            age:                true,
            geminiKey:          true,
        },
        });
        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const body = await req.json();
    const {
        userId, primaryGoal, levelCrossFit, levelWorkout,
        levelWeightLifting, levelCardio, levelRunning,
        weight, height, age, geminiKey,
    } = body;

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    try {
        const user = await db.user.update({
        where: { id: userId },
        data: {
            primaryGoal:        primaryGoal        ?? null,
            levelCrossFit:      levelCrossFit      ?? null,
            levelWorkout:       levelWorkout       ?? null,
            levelWeightLifting: levelWeightLifting ?? null,
            levelCardio:        levelCardio        ?? null,
            levelRunning:       levelRunning       ?? null,
            weight:             weight  ? parseFloat(weight)  : null,
            height:             height  ? parseFloat(height)  : null,
            age:                age     ? parseInt(age)       : null,
            geminiKey: geminiKey !== undefined ? geminiKey : undefined,
        },
        select: {
            id: true, name: true, email: true,
            primaryGoal: true, levelCrossFit: true,
            levelWorkout: true, levelWeightLifting: true,
            levelCardio: true, levelRunning: true,
            weight: true, height: true, age: true, geminiKey: true,
        },
        });
        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}