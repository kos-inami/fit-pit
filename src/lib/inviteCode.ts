import { randomBytes } from "crypto";
import { db } from "@/lib/db";

// unambiguous alphabet — no 0/O or 1/I
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return code;
}

export async function createUniqueInviteCode(userId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateInviteCode();
        try {
            await db.user.update({ where: { id: userId }, data: { inviteCode: code } });
            return code;
        } catch (err) {
            const isUniqueViolation =
                typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
            if (!isUniqueViolation || attempt === 4) throw err;
        }
    }
    throw new Error("Failed to generate a unique invite code");
}
