# Fit Pit

CrossFit training tracker PWA. Mobile-first, dark theme.

## Stack

- Next.js 16.2.6 (Turbopack) · TypeScript · Tailwind
- Prisma 6.19.3 + PostgreSQL
- NextAuth v5 (beta), JWT strategy
- Deployed on AWS EC2 behind Nginx + PM2 + Cloudflare

## Commands

```bash
npx tsc --noEmit          # ALWAYS run before committing
npx prisma db push        # schema changes — we do NOT use migrations
npm run dev
```

Deploy (run on the server, not locally):

```bash
cd ~/fit-pit && git stash && git pull && ./node_modules/.bin/prisma db push && npm run build && pm2 restart fit-pit --update-env
```

## Hard rules

**Schema changes use `prisma db push`, never `prisma migrate`.** After editing
`prisma/schema.prisma`, run `npx prisma db push` locally, and remind me to run it
on the server too — the build fails otherwise with "Unknown argument".

**Never call setState synchronously inside a `useEffect` body.** React 19 lints
this as `react-hooks/set-state-in-effect`. Wrap it:

```tsx
useEffect(() => {
  const id = setTimeout(() => { setThing(value); }, 0);
  return () => clearTimeout(id);
}, [dep]);
```

**No `any`.** `@typescript-eslint/no-explicit-any` is enforced. Define explicit
DB response interfaces instead.

**No nested `<button>`.** Causes a hydration error. Use a `div` with `onClick`
for the outer element when it contains an inner button.

**Dates are local, never UTC.** Parse date strings as `new Date(str + "T00:00:00")`.
Use `getTodayString()` / `getLocalDateString()` from `src/lib/utils.ts`. Never
`new Date(dateStr)` on its own — it parses as UTC and shifts the day.

**Runtime dates, not build-time.** Anything involving "today" in a statically
rendered component must compute the date at click/render time (`useRouter` +
`getTodayString()`), not in a module-level constant.

## Styling conventions

Use CSS variables, never hardcoded colors:

| Var | Use |
|---|---|
| `--bg` `--s1` `--s2` `--s3` | Surfaces, dark to light |
| `--br` `--br2` | Borders |
| `--tx` `--mu` `--mu2` | Text, muted, less muted |
| `--acc` | Accent (yellow) |
| `--grn` `--red` `--org` | Success / danger / warning |

Fonts:

- `'Bebas Neue', sans-serif` — headings, numbers, buttons
- `'DM Mono', monospace` — labels, metadata, small uppercase text
- `'DM Sans', sans-serif` — body and inputs

Spacing uses arbitrary Tailwind values (`p-[0.5rem]`, `mb-[1rem]`). Keep it
consistent with surrounding code rather than switching to scale classes.

## Architecture notes

- `src/contexts/ProgramContext.tsx` holds all day/session state and syncs to the DB.
  Optimistic update first, then the fetch.
- Session data splits into **plan** (`planSets`, `rounds`) and **result**
  (`sets`, `resultRounds`). Both JSON except `sets`, which is a real relation.
- `SetLog.maxWeight` is the reference max **frozen at plan time**. Never recompute
  it from the current max record.
- Client components using `useSearchParams` must be wrapped in `<Suspense>`.

## Working style

- Read `docs/v2-requirements.md` before any v2 structural work.
- When I ask for a change to an existing component, give me the **whole file**
  unless the change is genuinely one or two lines.
- Run `npx tsc --noEmit` and fix errors before telling me you're done.
- Don't add features I didn't ask for.
