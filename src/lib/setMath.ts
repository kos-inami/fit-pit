// Shared between the interactive planner (SetLogger) and server-side program
// generation — both must compute weight-from-percentage identically, or a
// trainer-assigned session would show a different number than the trainee
// would get planning the same set themselves.
export function calcFromPercent(pct: number, max: number): number {
    return Math.round((max * pct / 100) / 2.5) * 2.5;
}
