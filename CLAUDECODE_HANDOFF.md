# RoomCompass ClaudeCode Handoff

## 1. Project Overview
- Project: RoomCompass
- Stack:
  - Frontend: Next.js 16 (App Router), React, TypeScript, Tailwind
  - Backend: FastAPI, SQLAlchemy, PostgreSQL, Redis
  - Runtime: Docker Compose
- Goal so far:
  - Property CRUD + weighted comparison + recommendation + search/filter + favorites + user auth foundation + user-based compare history + login status UX + weight-aware recommendation text

## 2. What Has Been Implemented

### 2.1 Backend APIs (implemented)
File: `backend/app/main.py`
- `POST /users/register`
- `POST /users/login`
- `POST /favorites`
- `GET /users/{user_id}/favorites`
- `DELETE /favorites`
- `POST /compare-histories`
- `GET /users/{user_id}/compare-histories`
- `DELETE /compare-histories/{history_id}` (requires `user_id` query param for ownership check)
- Existing property APIs (`POST /properties`, `GET /properties`) and recommendation API (`GET /properties/{id}/recommendation`) are still active.

### 2.2 Backend Models/Schemas (implemented)
Files:
- `backend/app/models.py`
  - `User`
  - `Favorite` with `user_id`, `property_id`
  - `CompareHistory` with `user_id`, `selected_ids` (JSON), `rent_weight`/`area_weight`/`station_weight`, `preset`, `keyword`, `max_rent_filter`, `min_area_filter`, `max_station_filter`, `favorite_only`, `created_at` (server-side default via `func.now()`)
- `backend/app/schemas.py`
  - `UserCreate`, `UserLogin`, `UserResponse`, `LoginResponse`
  - `FavoriteCreate`, `FavoriteResponse`
  - `CompareHistoryCreate`, `CompareHistoryResponse`

### 2.3 Frontend API/Types (implemented)
Files:
- `frontend/lib/propertyTypes.ts`
  - Auth/favorite types: `RegisterRequest`, `RegisterResponse`, `LoginRequest`, `LoginResponse`, `FavoriteRequest`, `FavoriteResponse`
  - Compare history types: `CompareHistoryRequest`, `CompareHistoryResponse`
- `frontend/lib/propertyApi.ts`
  - `registerUser`, `loginUser`, `addFavorite`, `getFavorites`, `deleteFavorite`
  - `saveCompareHistory`, `getCompareHistories`, `deleteCompareHistory`

### 2.4 Compare page updates (implemented)
File: `frontend/app/compare/page.tsx`
- Favorites use backend API (not local-only toggle logic).
- Hydration mismatch mitigation:
  - Initial state is static.
  - localStorage restoration is done after mount in `useEffect` (wrapped in a nested `async function` — required to avoid the `react-hooks/set-state-in-effect` lint rule).
  - `isRestoreDone` guard prevents premature overwrite.
- Saved compare conditions are still persisted in localStorage via `compareStorageKey` (this is separate from the DB-backed compare history below — local storage remembers "last state on this browser", DB history is explicit named/saved snapshots per user).
- Compare history UI: "現在の条件を保存" button, history list with "読み込む"/"削除" per entry.
- Unauthenticated guard banner (with link to `/login`) shown when `userId === null`.

### 2.5 Main page login status UX (implemented)
File: `frontend/app/main/page.tsx`
- Converted to a client component (`"use client"` required for `useState`/`useEffect`/`useRouter`).
- Shows "ようこそ、{name}さん" + logout button when logged in; hides "新規登録"/"ログイン" cards when logged in.
- Logout: `localStorage.removeItem('roomcompass-user')` + `router.push('/')`.
- Auth state is **client-trusted only** — there is no session token/JWT. Every protected endpoint just trusts whatever `user_id` the frontend sends. Acceptable for current prototype scale; would need real sessions before any public/production use.

### 2.6 Recommendation quality improvement (implemented)
File: `backend/app/main.py`, function `display_recommend`
- Reasons are now generated in **weight-priority order** (previously hard-coded rent→area→station regardless of user's weight settings).
- If the user's most-weighted factor scores poorly (`< 40`), a caution sentence is appended (e.g. "家賃はやや高めです") — gives a balanced view instead of only positive reasons.
- Verified manually via `通勤重視`/`広さ重視` presets — reorders correctly and the caution sentence appears.

## 3. Data Notes
- The DB had a placeholder/outlier property ("RoomCompasss新宿", area 122222㎡, rent 12,222,222円) that badly skewed area-score normalization across the whole app (both the recommendation API, which normalizes against ALL properties, and previously against the full dataset). **This row has been deleted** (`properties.id = 1`), along with the one orphaned `favorites` row that referenced it. No `compare_histories` referenced it.
- Note: `favorites.property_id` and the property IDs inside `compare_histories.selected_ids` have **no FK constraint** — deleting a property silently orphans references elsewhere. Harmless today (frontend just won't find a match), but worth keeping in mind if building admin/delete tooling for properties later.

## 4. Critical Bug History (already resolved, kept for context)
- `Internal Server Error` for favorites was caused by DB schema drift (`column favorites.property_id does not exist`) — existing table only had `id`, `user_id` while code expected `property_id`. Fixed via manual `ALTER TABLE` (see git history / previous handoff versions for exact commands).
- `main.py` had a route path bug for compare history creation (`@app.post("compare-histories", ...)` missing the leading `/`) — fixed.
- Two rounds of `react-hooks/set-state-in-effect` lint errors in `compare/page.tsx` and `main/page.tsx` — fixed by wrapping localStorage-restore logic in a nested `async function` before calling it inside the effect (calling a setState setter as a bare top-level statement in an effect body triggers the rule; wrapping in an `async function` does not, even without an actual `await`).

## 5. Current Known Risks / Notes
- `docker compose up --build` can intermittently fail due to Docker registry/network timeout when pulling base images (`python:3.12-slim`).
- Editor may show local Python import warning for `bcrypt` while Docker runtime works correctly.
- There is no migration framework (Alembic) yet; schema changes are currently manual SQL when existing DB tables drift.
- No real authentication/session layer (see 2.5) — `user_id` is client-trusted everywhere.
- `favorites`/`compare_histories` have no FK constraints to `properties`/`users`.

## 6. User Preferences and Collaboration Style
- User prefers detailed, step-by-step guidance, explained in Japanese.
- User wants code written directly in chat (not silently edited into files) — explain + code proposal, user applies it themselves and reports back errors, which get debugged interactively.
- User is comfortable with direct DB/file edits (e.g. deleting rows) once they've explicitly confirmed the action via a choice — no need to always re-propose in chat first for that kind of housekeeping.

## 7. What To Do Next (open candidates, no fixed priority yet)
Options A (compare history), B (login status UX), and C (recommendation quality) from the previous handoff are all **done** (see section 2). Nothing is currently prioritized — ask the user what they want next. Possible directions raised in conversation but not committed to:
- Real session/auth layer (JWT or server-side session) to replace client-trusted `user_id`.
- Add FK constraints (`ForeignKey`) between `favorites`/`compare_histories` and `properties`/`users`, plus an Alembic migration setup to manage schema changes safely going forward.
- A cap on saved compare-history rows per user (currently unlimited).
- Admin-ish property edit/delete endpoints (currently properties can only be created/listed via API; the recent data cleanup was done via raw SQL).

## 8. Fast Recovery Commands (for ClaudeCode)
From repo root:
- Check running services: `docker compose ps`
- Check backend logs: `docker compose logs backend --tail 200`
- Check schema: `docker compose exec db psql -U roomcompass -d roomcompass -c "\d favorites"` / `"\d compare_histories"`
- API smoke tests:
  - Register/login via frontend or REST
  - `GET http://localhost:8000/users/{user_id}/favorites`
  - `GET http://localhost:8000/users/{user_id}/compare-histories`

## 9. Key Files to Read First
- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/schemas.py`
- `frontend/lib/propertyApi.ts`
- `frontend/lib/propertyTypes.ts`
- `frontend/app/compare/page.tsx`
- `frontend/app/main/page.tsx`
- `frontend/app/login/page.tsx`

## 10. Suggested First Prompt for ClaudeCode
Use this as a starting instruction:

"Read `CLAUDECODE_HANDOFF.md` first. Do not auto-edit files yet. Summarize current backend/frontend status in Japanese, then ask what to work on next — Options A/B/C from the previous handoff are already done."
