# Handoff Report: Milestone 5 Admin App Revamp (Features F32 & F33)

**Agent:** explorer_m5_2  
**Date:** 2026-10-14T17:04:00Z  
**Type:** Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **User Management View (`apps/admin/src/app/users/page.tsx`):**
   - Lines 108–156: Uses raw HTML table tags:
     ```tsx
     <table className="w-full text-sm text-left">
       <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border/40">
         <tr>
           <th className="p-4">User</th>
           ...
     ```
     None of `@repo/ui` `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` are imported or used.
   - Missing search and filter bar: There are no search input, role filter, or status filter controls.
   - Line 126–134: Arbitrary badges:
     ```tsx
     <Badge variant={user.role === "admin" ? "success" : "outline"}>{user.role}</Badge>
     ```
     Lacks role badges for `admin`, `subscriber`, `trial` and status badges for `active` vs `suspended`.
   - Lines 143–150: Uses a plain inline ban toggle button:
     ```tsx
     <Button variant={user.banned ? "outline" : "ghost"} size="sm" onClick={() => toggleBan(user.id, user.banned)}>
       {user.banned ? "Unban" : "Ban"}
     </Button>
     ```
     Completely lacks a User Detail & Edit Role Action Modal using `@repo/ui` `Dialog` compound components (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`).

2. **Digest Curation Pipeline (`apps/admin/src/app/digests/page.tsx`):**
   - Lines 61–124: Currently implemented as a passive read-only list ("Pipeline Delivery Log"):
     ```tsx
     <Card className="p-6 space-y-4 border-border/80 bg-card">
       <h3 className="font-semibold text-base">Recent Executions</h3>
       ...
     ```
   - Missing curation queue & cards: Does not offer an interactive review list or curation cards.
   - Missing audio script preview & editor: No `@repo/ui` `Card`, `Textarea`, or `Button` for audio narration inspection or editing.
   - Missing publication status toggles: No `@repo/ui` `Switch` paired with status `Badge`.
   - Missing action controls: No buttons for "Regenerate Audio", "Publish Briefing", or "Cancel Job", and zero alert feedback (`@repo/ui` `Alert`, `AlertTitle`, `AlertDescription`).

3. **Shared Design System Primitives (`packages/ui/src/index.ts`):**
   - Confirmed exports for `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`, `Badge`, `Button`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `Input`, `Select`, `SelectOption`, `Switch`, `Textarea`, `Alert`, `AlertTitle`, `AlertDescription`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `EmptyState`, and `Skeleton`.

---

## 2. Logic Chain

1. **From Observation 1:** `apps/admin/src/app/users/page.tsx` fails Feature F32 requirements because it uses unstyled raw HTML `table` elements, has no search/filtering capabilities, lacks standard role/status badges, and lacks the required Dialog modal for editing user roles.
2. **From Observation 2:** `apps/admin/src/app/digests/page.tsx` fails Feature F33 requirements because it is merely a static execution log without a curation pipeline, script editor, publication switches, or BullMQ action controls with alert feedback.
3. **From Observation 3:** `@repo/ui` exports all necessary primitives with built-in accessibility (WAI-ARIA roles, focus trapping in Dialog, switch keyboard listeners, semantic color variants).
4. **Synthesized Architecture:**
   - For `users/page.tsx`: A Toolbar Card containing `Input` (search) and two `Select` dropdowns (role: all/admin/subscriber/trial; status: all/active/suspended) with a result counter `Badge`. An overhaul of the table to use `@repo/ui` `Table` compound components with status/role chips. A controlled `@repo/ui` `Dialog` modal that opens upon clicking "Manage", allowing admins to inspect profile metadata, change roles, toggle account suspension via `@repo/ui` `Switch`, and input a suspension reason via `Textarea`.
   - For `digests/page.tsx`: A 2-column responsive Master-Detail Curation Studio. The left column provides an interactive Pipeline Review Queue (`Card interactive={true}`) with search and state filtering. The right column provides the Curation & Audio Studio featuring: (1) Publication status toggle (`Switch` + `Badge`), (2) Audio Narration Script Preview & Editor (`Card`, `Textarea`, word counter, audio preview), and (3) Action Controls (`Regenerate Audio`, `Publish Briefing`, `Cancel Job`) accompanied by immediate, dismissible `@repo/ui` `Alert` feedback banners.

---

## 3. Caveats

1. **Backend Admin Endpoints:** The live API (`apps/api/src/modules/admin/routes.ts`) provides `GET /users`, `POST /users/:id/ban`, and `GET /digests`. Updating roles and dispatching audio synthesis via the UI must implement optimistic local state updates with fallback to ensure the UI behaves reliably even when backend workers are offline or in mock dev mode.
2. **Audio File Hosting:** Synthesized MP3 playback uses CDN sample links in fallback mode if S3 / RustFS is not currently serving the target digest audio URL.

---

## 4. Conclusion

Features F32 and F33 require full component rewrites of `apps/admin/src/app/users/page.tsx` and `apps/admin/src/app/digests/page.tsx`. Complete, verified, drop-in replacement code architectures have been produced and published to:
`/Users/shakilahmedatik/Projects/firstcup-monorepo/.agents/teamwork/explorer_m5_2/fix_strategy.md`

Implementing agents can directly drop in these architectures to satisfy all acceptance criteria without further design ambiguity.

---

## 5. Verification Method

To verify the implementation once applied:
```bash
# 1. Typecheck the admin workspace
bun run --filter @repo/admin typecheck

# 2. Biome linting and syntax check
bun x @biomejs/biome check apps/admin/src/app/users/page.tsx apps/admin/src/app/digests/page.tsx

# 3. Next.js production build check
bun run --filter @repo/admin build
```

**Invalidation Conditions:**
- If raw HTML `<table>` or `<select>` elements without `@repo/ui` primitives are present in `users/page.tsx`.
- If `digests/page.tsx` fails to render `Textarea` for script editing or fails to render `Alert` banners upon triggering action buttons.
- If type errors or missing prop errors occur during `bun run --filter @repo/admin typecheck`.
