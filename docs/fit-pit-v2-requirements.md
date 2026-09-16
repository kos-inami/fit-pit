# Fit Pit v2 — Requirements Specification

Multi-role restructure: admin / trainer / trainee.

---

## 1. Roles

Roles are a **set**, not a single value. One account can hold several.

| Role | Purpose |
|---|---|
| `trainee` | Default. Owns a training calendar, logs sessions and results. |
| `trainer` | Creates programs, assigns or publishes them, reviews client progress. |
| `admin` | Manages session types and system-level config. |

**Rules**

- Every account has `trainee` by default — a trainer who also trains needs their own calendar.
- `trainer` is self-selected at signup or enabled later in Account settings.
- `admin` is granted manually (DB / admin panel only).
- A user with both `trainer` and `trainee` sees a mode switcher in the UI, not two accounts.
- A `trainer` account may represent an individual coach **or a gym** running a catalogue of programs. No separate "organisation" entity — a gym is simply a trainer account.

---

## 2. Trainer ↔ Trainee relationship

### Connection flow

1. Trainer has a **single permanent** `inviteCode`, generated when the trainer role is enabled.
2. Trainee enters the code in Account → Connect Trainer.
3. Link created with `status: pending`.
4. Trainer approves → `status: active`.
5. Either side can end it → `status: ended`, `endedAt` set.

The trainee typing the code *is* their consent. The trainer's approval is the second gate. No revocable or limited-use codes in v2 — approval is the control point.

### Constraints

- A trainee has **at most one `active`** trainer at a time.
- Enforced in application logic, not a DB unique constraint — ended relationships stay in the table as history.
- A trainer has many trainees.
- Ending the relationship **does not delete data**. All sessions live on the trainee's days and remain theirs.
- After ending, the trainer loses read access immediately, and future program-generated sessions are removed (see §6.7).

### What the trainer can see

| Data | Visible to trainer |
|---|---|
| Sessions (plan + result) | Always, while active |
| Max records | Always, while active |
| Recovery log | **Only if trainee toggles on** |
| Post-workout feeling + comment | **Only if trainee toggles on** |
| Profile body stats | **Only if trainee toggles on** |

Default for all three toggles: **off**. The trainee turns them on deliberately.

---

## 3. Session ownership

The core change. Separate *whose calendar it is* from *who created it*.

```
Session {
  dayId         → whose calendar (the trainee)
  createdById   → who added it
  source        → "self" | "trainer"
  assignmentId  → nullable, links back to the program assignment
  isRestDay     → bool, default false
}
```

### Permissions by source

| Action | `source: self` | `source: trainer` |
|---|---|---|
| Edit plan | Trainee ✅ | Trainee ❌ · Trainer ✅ |
| Delete | Trainee ✅ | Trainee ✅ · Trainer ✅ |
| Log / edit result | Trainee ✅ | Trainee ✅ |
| Copy to another date | Trainee ✅ | Trainee ❌ · Trainer ✅ |
| Add own notes | Trainee ✅ | Trainee ✅ |

A trainee may delete a trainer-assigned session outright from their own
calendar — this only removes the `Session` row itself; the trainer's
`ProgramAssignment` record is unaffected.

A trainer-assigned session is **locked and not forkable**. The trainee cannot copy it into their own editable session — the program belongs to the trainer.

A trainee may always add their **own** sessions alongside assigned ones, on any date.

### UI treatment

Trainer-assigned sessions carry a visible marker (coach/gym name + program name) and hide the Edit Plan / Copy actions. Log Result and Delete stay open.

---

## 4. Rest days

A rest day is a **Session row with `isRestDay: true`**, not a separate entity.

This falls out of the requirement that both sides can leave notes on it. Modelling it as a Session means it inherits everything already built: it sits on the Day, it has a `notes` field for the trainee, and trainer feedback attaches by `sessionId` with no new table.

| Property | Behaviour |
|---|---|
| Session type | Not applicable — `type` is null or a reserved `rest` key |
| Plan UI | No sets, no rounds. Description / guidance text only. |
| Result UI | No result logging. Notes only. |
| Trainee note | ✅ Always, even on a trainer-created rest day |
| Trainer note | ✅ Via the standard feedback mechanism (§7) |
| Counts toward completion | ❌ Excluded from "all sessions done" logic |

### Who can create one

| Origin | Editable / deletable by |
|---|---|
| Trainee adds it to their own calendar | Trainee |
| Generated from a program's `ProgramDay.isRestDay` | Trainer only |

A trainee can mark any date as a rest day independently of any program. It appears in the Add Session flow as its own option rather than a session type, since it has no plan and no result.

A trainer-created rest day may carry guidance (mobility work, nutrition reminder) in its description.

---

## 5. Programs

A program is a **template**, not a calendar. It has no real dates until assigned or enrolled.

```
Program              trainerId, name, description, status, accessMode, createdAt
 └ ProgramWeek       weekNumber (1..n)
   └ ProgramDay      dayIndex (1..7 = Mon..Sun), isRestDay
     └ ProgramSession  type, name, desc, planSets, rounds, order
```

### Status lifecycle

| Status | Meaning |
|---|---|
| `draft` | Editable, not assignable, trainer-only |
| `published` | Assignable / enrollable |
| `archived` | Hidden from pickers, existing assignments unaffected |

### Access mode

Set per program by the trainer. This is the gym-vs-coach distinction.

| Mode | Who starts it | Use case |
|---|---|---|
| `assigned` | Trainer only — pushes it to a named trainee | 1-on-1 coaching, individualised block |
| `open` | Trainee self-enrols from the trainer's catalogue | Gym running WL / WOD / Strength tracks in parallel |

An `open` program is visible to **every active client of that trainer**. Trainees browse and enrol themselves.

### 5.1 Length and appending weeks

**No hard cap on total program length.** Instead the constraint sits on a single generate action, and long-running programs are built incrementally.

Two distinct trainer actions, with different consequences:

| Action | Effect on active assignments |
|---|---|
| **Edit** an existing week | None. Already-generated sessions are untouched. |
| **Append** a new week at the end | Active assignments extend forward — the new week generates for enrolled trainees. |

This is what makes a perpetual gym track work. A "Daily WOD" program is never finished; the coach appends next week each week, and everyone enrolled receives it. A finite 12-week block is simply a program nobody appends to.

Editing never rewrites history; appending only ever adds future days. Both rules hold at once.

**Practical guidance**

- Warn the trainer when a single assign action would generate more than ~12 weeks at once.
- Cap a single generate action at 26 weeks. Longer programs are still fine — they are assigned in parts, or extended by appending.
- Batch the session inserts in one transaction.

If generation volume ever becomes a real problem, the scaling path is to snapshot the program structure onto the assignment and generate a rolling window from the snapshot. That preserves copy-on-assign semantics without writing every row upfront. Not needed at current scale.

### 5.2 Duplication

A trainer can clone any program they own. The clone is created as `draft`, with a new name, and copies all weeks, days, rest-day flags and sessions. Assignments are never copied.

---

## 6. Assignment and enrolment

```
ProgramAssignment {
  programId
  traineeId
  startDate
  startWeek            → default 1
  endWeek              → nullable; null means "to the end, and extend on append"
  assignedById         → trainer (push) or trainee (self-enrol)
  previousAssignmentId → nullable; set when re-running the same program
  status               → active | completed | cancelled
  completedById        → nullable; who marked it complete
  assignedAt
  completedAt
}
```

### 6.1 Partial assignment

The trainer chooses the week range. Assigning weeks 3–6 of a ten-week program is valid; `startDate` maps to the first day of `startWeek`.

An assignment with `endWeek: null` stays open-ended and picks up appended weeks (§5.1). An assignment with an explicit `endWeek` does not.

### 6.2 Generation

On assign or enrol:

1. Map each `ProgramDay.dayIndex` within the week range to a real date from `startDate`.
2. Create a real `Session` on the trainee's `Day` for each `ProgramSession`.
3. Set `source: "trainer"`, `createdById: program.trainerId`, `assignmentId`.
4. Resolve percentages against **that trainee's** max records at this moment, freezing `maxWeight` into each SetLog — the pattern already used today.
5. Create rest-day Sessions where `ProgramDay.isRestDay` is set.

**Copy on generate, never live reference.** If the trainer later edits week 4 of the program, an athlete already mid-block does not have their plan silently rewritten.

### 6.3 Concurrent assignments

Multiple active assignments per trainee are **allowed**. A gym client may run WL and WOD tracks simultaneously; their sessions coexist on the same Day.

- Session ordering on a shared day follows `ProgramSession.order`, then assignment creation time.
- Each session displays its source program so the trainee can tell the tracks apart.
- No conflict blocking. Two programs scheduling the same day is a normal outcome, not an error.

### 6.4 Self-enrolment (open programs)

1. Trainee has an `active` link to the trainer.
2. Trainee browses that trainer's `open` + `published` programs — **name and description only**, no week-by-week preview.
3. Trainee picks a start date and enrols.
4. Sessions generate exactly as in §6.2, with `assignedById: traineeId`.

The trainee discovers the content as it unfolds on their calendar.

### 6.5 Completion

| Assignment origin | Who can mark it `completed` |
|---|---|
| Trainer-assigned | Trainer ✅ · Trainee ✅ |
| Self-enrolled | Trainee ✅ · Trainer ✅ |

A trainee can always finish their own enrolment. `completedById` records who closed it.

Completion is **always manual**. Re-assigning a program to the same client does not auto-close the earlier run — the trainer decides when the previous block is done. Two runs of the same program may legitimately overlap.

Completing an assignment stops future generation but deletes nothing.

### 6.6 Repeating a block

Who can re-run something follows ownership.

| Session origin | Who can re-run | Comparison visible to |
|---|---|---|
| Trainee's own session | Trainee — copy to a new date | Trainee |
| Trainer program / session | **Trainer only** — re-assign the program | Trainer **and** trainee |

A trainee cannot re-run a trainer's program themselves, because that would mean copying a program they don't own.

On re-assignment, `previousAssignmentId` links the new run to the old one.

**Comparison is session-by-session, matched on session name within the program.** Not a whole-block summary. For each named session — "Back Squat 5×3", "FRAN" — the view shows this run's result against the previous run's, so progression is visible per movement rather than as an aggregate.

Matching rules:

- Match on `ProgramSession.name` within the same `programId`.
- A renamed session in the program breaks the match; it shows as new with no prior comparison.
- Unmatched sessions on either side are listed but not paired.

For a trainee's own repeated session, comparison is by session name against their own history — the mechanism already used for weight suggestions.

### 6.7 Cancellation and un-enrolling

When an assignment is cancelled — by either side, or by the trainer relationship ending:

- **Future** generated sessions with no logged result are **deleted**.
- **Past** sessions and any session with a logged result are **kept**. They become read-only history and stay on the trainee's calendar.

The trainee never loses work they actually did.

---

## 7. Trainer feedback

A coach can respond to any session on an active client's calendar, including rest days.

```
SessionFeedback {
  sessionId
  trainerId
  body
  createdAt
  updatedAt
}
```

- One feedback thread per session; the trainer can edit their note.
- Applies to real sessions **and** rest-day sessions.
- Only possible on sessions belonging to an `active` client.
- The trainee sees it inline on the session card, visually distinct from their own notes.
- The trainee is **notified** when feedback is left.

### Notifications

A minimal in-app notification model is enough for v2.

```
Notification {
  userId
  type       → "feedback" | "assignment" | "connection_request" | "connection_accepted"
  refId      → sessionId / assignmentId / trainerClientId
  readAt     → nullable
  createdAt
}
```

Surface as an unread badge plus a simple list. No email or push in this phase.

---

## 8. Session types (admin-managed)

Currently a TypeScript constant. Moving to a table, with one important caveat: `useSets` / `useRounds` is not decoration — it decides which logging UI renders. An admin adding a type must pick a behavior.

```
SessionType {
  key        "wod" | "strength" | ...   (primary key, immutable)
  label      display name
  color      hex
  behavior   "sets" | "rounds" | "text"
  order      int
  active     bool
}
```

### Behavior mapping

| Behavior | Plan UI | Result UI | Types |
|---|---|---|---|
| `sets` | Set rows (kg / % / reps) | Set rows | Strength, WL, Accessories |
| `rounds` | Round blocks | Round blocks | WOD, Zone |
| `text` | Free description | Free text result | Run, Swim, Other |

### Launch set

WOD · Strength · WL · Zone · Run · Accessories · Swim · Other

### Rules

- `key` is immutable once created — existing sessions reference it.
- Types are deactivated, never deleted. Historic sessions must keep resolving.
- Frontend fetches the list once and caches it.
- Rest days are **not** a session type — they are a flag on Session (§4).

---

## 9. Feature requirements by role

### Trainee

- Sign up standalone; no trainer required.
- Add, edit, delete own sessions on any date.
- Add own rest-day markers on any date.
- Log results for any session, own or assigned.
- Copy and re-run their **own** sessions; compare against past results.
- Leave notes on rest days, including trainer-created ones.
- Log recovery (energy, sleep, sore areas, notes).
- Log post-workout feeling + comment.
- Maintain max records, including expected-max estimates.
- View performance and progression.
- Connect / disconnect a trainer via invite code.
- Browse and self-enrol in the trainer's `open` programs.
- Mark their own enrolment complete; cancel an enrolment.
- View session-by-session run comparison when a program is re-assigned.
- Read trainer feedback; receive notifications.
- Control three sharing toggles: recovery, feeling, body stats.

### Trainer

- Create, edit, publish, archive, clone programs.
- Build multi-week structures with per-day sessions and rest days.
- Append weeks to a published program; active open-ended assignments extend forward.
- Set each program's access mode (`assigned` or `open`).
- Assign a published program to a client, with an optional week range.
- Re-assign a program to the same client for a repeat block.
- Manually mark an assignment complete.
- View a client list with recent activity.
- View each client's sessions, results, max records, progression — **per-client only**, no cross-client aggregate.
- View recovery / feeling / body stats **only where shared**.
- Edit, remove or copy sessions they assigned.
- Leave feedback on a client's logged session or rest day.
- Approve or decline incoming connection requests.

### Admin

- Manage session types (create, edit, reorder, deactivate).
- View system-level user list.
- Grant or revoke the trainer role.

---

## 10. AI — deferred

**On hold for a later phase.** No LLM work in v2.

The algorithmic layer is worth building independently, since it is free, instant and needs no key:

| Feature | Approach |
|---|---|
| Weight suggestion from history | Last completed session of same name + linear progression |
| Estimated 1RM | Epley — already built |
| Deload flag | Recovery score below threshold → suggest −10% |
| Volume warnings | Rolling weekly sums |
| Frequency gaps | Days since last session of a type |

The existing per-user Gemini key feature stays as-is and is not expanded. Every path must work with no key configured.

---

## 11. Migration from current schema

Existing data is single-user. Nothing should break.

| Step | Action |
|---|---|
| 1 | Add `roles` to User, default `["trainee"]` |
| 2 | Add `createdById`, `source`, `assignmentId`, `isRestDay` to Session |
| 3 | Backfill: `source = "self"`, `createdById = day.userId`, `isRestDay = false` |
| 4 | Create `SessionType` table, seed from the existing constant |
| 5 | Add sharing toggles to User, default false |
| 6 | Add TrainerClient table + invite codes |
| 7 | Add Program / ProgramWeek / ProgramDay / ProgramSession |
| 8 | Add ProgramAssignment |
| 9 | Add SessionFeedback + Notification |
| 10 | Frontend reads session types from API instead of the constant |

Steps 1–5 are safe to ship before any trainer UI exists.

### Suggested build order

1. **Phase A** — roles, session ownership fields, rest days (incl. trainee-created), session types table.
2. **Phase B** — trainer role, invite codes, connection flow, client list, read-only client view.
3. **Phase C** — programs, assignment, generation, cloning, week appending.
4. **Phase D** — open programs and self-enrolment.
5. **Phase E** — feedback, notifications, run comparison.
6. **Phase F** — algorithmic suggestions.

Phase A ships with visible value on its own (trainee rest days) while laying the groundwork for everything after it.
