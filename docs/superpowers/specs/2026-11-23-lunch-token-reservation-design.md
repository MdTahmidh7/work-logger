# Lunch Token Reservation System - Design Specification

**Date:** 2026-11-23  
**Status:** Approved  
**Author:** Antigravity (Senior Angular Developer, UI/UX Designer, Database Architect)

---

## 1. Executive Summary & Objective

The **Lunch Token Reservation** system allows authenticated employees using the **Personal Work Logger** application to reserve daily lunch tokens for working days (Sunday through Thursday). It introduces a persistent unique user "Short Name" per account, multi-date & work-week selection mechanics, independent per-day token quantities, irreversibility confirmation, and a database layer built on PostgreSQL (Supabase) with strict Row Level Security.

The feature is planned in two main stages:
1. **Stage 1: Token Reservation Feature** (User Short Name registration, working day date/week selection, per-date token counting, irreversible confirmation modal, Supabase database migration, and reservation persistence).
2. **Stage 2: Reservation History Feature** (Global daily aggregated history table, date range filters, short name search/filtering, and server-side pagination).

---

## 2. Business Rules & Constraints

1. **Work Week & Calendar**:
   - **Working Days:** Sunday, Monday, Tuesday, Wednesday, Thursday.
   - **Weekend Days:** Friday and Saturday. Normal lunch token reservations are strictly prohibited on Fridays and Saturdays.
   - **Date Semantics:** Dates must use local Bangladesh date representation (`yyyy-MM-dd`) to eliminate UTC boundary shifts.
2. **User Identity (Short Name)**:
   - Every user must register a unique Short Name before creating reservations.
   - Short Name is required, trimmed of leading/trailing whitespace, and case-insensitively unique across the organization.
   - A user can only register their Short Name once; it cannot be modified after creation.
3. **Reservation & Tokens**:
   - Default token count per selected date: **1**.
   - Minimum token count per date: **1** (positive integer only).
   - Each date has an independent count adjusted via `+` and `−` buttons.
   - Duplicate reservations for the same user (Short Name) and date are strictly rejected by both UI validation and database constraints.
4. **Irreversibility & Confirmation**:
   - Reservations are finalized upon submission. They cannot be edited or deleted through the UI.
   - A mandatory confirmation dialog (SweetAlert2) must summarize: Short Name, selected dates, day names, per-date token count, total tokens, and an explicit warning about permanence.
5. **Security & Access Control**:
   - Only authenticated users can access the system.
   - Users can only insert reservations for their own registered `lunch_token_user_id`.
   - All authenticated users can read reservations for collective visibility and shared office tallying.

---

## 3. Database Architecture (Supabase PostgreSQL)

### 3.1 Tables & Schema

```sql
-- 1. lunch_token_users
CREATE TABLE IF NOT EXISTS lunch_token_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  normalized_short_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast normalized search
CREATE INDEX IF NOT EXISTS idx_lunch_token_users_normalized ON lunch_token_users(normalized_short_name);
CREATE INDEX IF NOT EXISTS idx_lunch_token_users_user_id ON lunch_token_users(user_id);

-- 2. lunch_token_reservations
CREATE TABLE IF NOT EXISTS lunch_token_reservations (
  id BIGSERIAL PRIMARY KEY,
  lunch_token_user_id BIGINT REFERENCES lunch_token_users(id) ON DELETE CASCADE NOT NULL,
  reservation_date DATE NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 1 CHECK (token_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_reservation_date UNIQUE(lunch_token_user_id, reservation_date)
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_lunch_token_reservations_date ON lunch_token_reservations(reservation_date DESC);
CREATE INDEX IF NOT EXISTS idx_lunch_token_reservations_user_id ON lunch_token_reservations(lunch_token_user_id);
```

### 3.2 Row Level Security (RLS) Policies

```sql
ALTER TABLE lunch_token_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_token_reservations ENABLE ROW LEVEL SECURITY;

-- lunch_token_users policies:
-- Anyone authenticated can view short names (needed to display owner names in history & check duplicates)
CREATE POLICY "Authenticated users can view short names"
  ON lunch_token_users FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own record
CREATE POLICY "Users can insert their own short name"
  ON lunch_token_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- lunch_token_reservations policies:
-- Anyone authenticated can view all reservations (shared office tally)
CREATE POLICY "Authenticated users can view all reservations"
  ON lunch_token_reservations FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert reservations only if the lunch_token_user_id belongs to them
CREATE POLICY "Users can insert their own reservations"
  ON lunch_token_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lunch_token_users
      WHERE lunch_token_users.id = lunch_token_reservations.lunch_token_user_id
        AND lunch_token_users.user_id = auth.uid()
    )
  );

-- Strictly no UPDATE or DELETE policies for lunch_token_reservations
```

---

## 4. Frontend Component & Service Architecture

### 4.1 Routing & Navigation
- Path: `/lunch-token` (guarded with `authGuard`).
- Header: Add **Lunch Token** item with icon `lunch_dining` (or `restaurant`) in desktop navigation bar and mobile dropdown drawer.

### 4.2 Data Models (`src/app/core/models/lunch-token.model.ts`)
```typescript
export interface LunchTokenUser {
  id: number;
  userId: string;
  shortName: string;
  normalizedShortName: string;
  createdAt: string;
  updatedAt: string;
}

export interface LunchTokenReservation {
  id: number;
  lunchTokenUserId: number;
  reservationDate: string; // 'yyyy-MM-dd'
  tokenCount: number;
  createdAt: string;
  shortName?: string; // Joined from user
}

export interface SelectedDateToken {
  date: string; // 'yyyy-MM-dd'
  dayName: string; // 'Sunday', 'Monday', etc.
  dayShort: string; // 'Sun', 'Mon'
  count: number;
  alreadyReserved?: boolean;
}
```

### 4.3 Repository & Service Layer
- **`LunchTokenRepository`** (`src/app/core/repositories/lunch-token.repository.ts`):
  - `getCurrentUserShortName()`: Fetches `lunch_token_users` row for current `auth.uid()`.
  - `checkShortNameExists(normalized: string)`: Checks if a normalized short name is taken.
  - `registerShortName(shortName: string)`: Inserts a new row for `auth.uid()`.
  - `getExistingReservations(lunchTokenUserId: number, dates: string[])`: Returns existing reservations for duplicate checks.
  - `insertReservations(lunchTokenUserId: number, items: { date: string, count: number }[])`: Batch inserts reservations.
  - `getReservationsHistory(options)`: (Used in Stage 2) for paginated/filtered queries.
- **`LunchTokenService`** (`src/app/features/lunch-token/services/lunch-token.service.ts`):
  - Reactive signals for `currentUserProfile`, `loading`, `submitting`.
  - Date helpers for generating working days of current week, next week, or custom date ranges.
  - Validation routines for short name uniqueness, working day verification, and duplicate date exclusion.

### 4.4 UI Decomposition (`src/app/features/lunch-token/`)
```
src/app/features/lunch-token/
├── lunch-token.component.ts               # Container page holding sub-components
├── lunch-token.component.html
├── lunch-token.component.scss
├── services/
│   └── lunch-token.service.ts
├── components/
│   ├── short-name-section/               # Short name display or 1-time registration form
│   ├── day-selection-card/               # Single date, week chips, all working days toggle
│   ├── token-counter-card/               # List of selected dates with +/- counters
│   └── reservation-summary-card/         # Summary count & Submit button with confirmation
```

---

## 5. User Interaction & Workflow

1. **Short Name Initialization**:
   - If user does not have a registered Short Name, prominent onboarding prompt displayed.
   - Input field with real-time validation: length, whitespace trimmed, case-insensitive availability check against Supabase.
   - "Register Short Name" button locks in identity and persists to Supabase.
   - Once registered, the user's Short Name is displayed as a verified badge.
2. **Date Selection**:
   - User can choose dates using:
     - **Quick Week Selector**: "This Week" (Sun–Thu) or "Next Week" (Sun–Thu).
     - **"All Working Days" Shortcut**: Automatically selects all 5 working days of the chosen week.
     - **Individual Working Day Chips**: Sun, Mon, Tue, Wed, Thu.
     - **Custom Date Picker**: MatDatepicker configured with `dateFilter` disabling Friday (`0 === 5`) and Saturday (`0 === 6`), and past dates.
3. **Token Count Adjustment**:
   - Each selected date appears in an active card/table.
   - Controls: `[ − ]  [ 1 ]  [ + ]`. Minus is disabled at 1.
   - If a date is already reserved in the database for this user, a badge `Already Reserved` is shown and the date cannot be re-submitted.
4. **Summary & Confirmation**:
   - Dynamic summary box displaying: Short Name, list of dates with day names, token counts, and Total Tokens.
   - "Submit Reservation" opens SweetAlert2 modal:
     - Title: "Confirm Lunch Token Reservation"
     - List: Date | Day | Tokens
     - Total count highlighted
     - Warning: "Reservations cannot be edited, changed, or deleted once submitted."
     - Actions: `Confirm & Submit` / `Cancel`.
5. **Persistence & Feedback**:
   - Submits records in a single batch to `lunch_token_reservations`.
   - On success, displays success notification and clears selection (or loads updated reservation states).

---

## 6. Verification & Testing Checklist

- [ ] Short Name registration requires non-empty, trimmed string.
- [ ] Duplicate Short Names (e.g. "Tahmid" vs "tahmid") are rejected by database and UI.
- [ ] Non-working days (Friday and Saturday) cannot be selected.
- [ ] Single date selection works.
- [ ] Multiple individual date selection works.
- [ ] "All Working Days" selects Sunday through Thursday of the active week.
- [ ] Default count is 1; `+` and `−` update values; cannot go below 1.
- [ ] Already reserved dates for the user are flagged and blocked from duplicate submission.
- [ ] SweetAlert2 confirmation shows all items, total count, and warning.
- [ ] Submitting persists records to Supabase with correct `lunch_token_user_id`.
- [ ] UI is fully responsive and supports both light and dark themes.
- [ ] Existing Work Log and Attendance features remain 100% operational.
