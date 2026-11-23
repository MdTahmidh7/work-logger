# Lunch Token Reservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Lunch Token Reservation feature (Short Name registration, working-day date selection, independent token counters, irreversible confirmation workflow, and Supabase integration) in the Personal Work Logger application.

**Architecture:** Following the existing Clean Architecture pattern: Supabase tables with RLS for persistence, a `LunchTokenRepository` for database communication, a `LunchTokenService` providing reactive Angular signals and business rule validation (Bangladesh working week Sun–Thu), decomposed into focused presentation components under `src/app/features/lunch-token/`, and integrated with the main application routing and navigation header.

**Tech Stack:** Angular 18 (Standalone components, Signals, inject() API), Supabase JS client, Angular Material, date-fns, SweetAlert2, SCSS with CSS variables for light/dark theme.

**Spec:** [`docs/superpowers/specs/2026-11-23-lunch-token-reservation-design.md`](file:///home/abdullahat/Desktop/Agent%20WorkShop/work-logger/docs/superpowers/specs/2026-11-23-lunch-token-reservation-design.md)

---

## Global Constraints

- Working days are strictly **Sunday through Thursday**. Friday and Saturday are non-working days and must never be selectable.
- Dates must be represented as Bangladesh local calendar dates in `yyyy-MM-dd` format.
- Short Name must be trimmed, case-insensitively unique globally across all users, and permanently set (registered once).
- Token count per date must be a positive integer $\ge 1$ (default: 1).
- Duplicate reservations for the same user and date are strictly forbidden.
- Submitted reservations are irreversible and cannot be edited or deleted via UI.
- All UI components must support both light and dark themes using CSS variables from `src/styles.scss`.
- Existing Work Log, Attendance, and Authentication features must remain completely unaffected.

---

## Review Focus

1. **Case-Insensitive Short Name Collision:** User attempts to register "tahmid" when "Tahmid" already exists; must be cleanly rejected with a clear message.
2. **Weekend Date Attempt:** Attempting to select Friday or Saturday via manual input or picker must be blocked.
3. **Past Date Selection:** Attempting to reserve tokens for dates before today must be prohibited.
4. **Already Reserved Date Handling:** If a user already reserved tokens for a date, that date must be flagged as "Already Reserved" and disabled from new submission.
5. **Concurrent / Rapid Submission:** Rapid double-clicking on the confirmation button must not trigger duplicate database insertions.

---

## Tasks

### Task 1: Supabase Database Migration Script

**Files:**
- Modify: `supabase-migration.sql`

**Interfaces:**
- Produces: Tables `lunch_token_users` and `lunch_token_reservations` with constraints and RLS policies.

- [ ] **Step 1: Append Lunch Token tables, constraints, and RLS to `supabase-migration.sql`**
  Add `lunch_token_users` and `lunch_token_reservations` tables, unique constraints (`user_id`, `normalized_short_name`, `uq_user_reservation_date`), foreign keys, check constraints (`token_count > 0`), indexes, and RLS policies allowing authenticated users to read all reservations/users, insert their own, and forbidding updates/deletes on reservations.
- [ ] **Step 2: Verify SQL syntax and consistency**
  Inspect `supabase-migration.sql` ensuring valid PostgreSQL syntax and matching types (`bigserial`, `uuid`, `text`, `date`, `integer`).
- [ ] **Step 3: Commit migration script changes**
  ```bash
  git add supabase-migration.sql
  git commit -m "feat(db): add lunch token tables and rls policies to migration script"
  ```

---

### Task 2: Data Models & Core Repository Layer

**Files:**
- Create: `src/app/core/models/lunch-token.model.ts`
- Create: `src/app/core/repositories/lunch-token.repository.ts`
- Modify: `src/app/core/repositories/index.ts`

**Interfaces:**
- Produces:
  - `LunchTokenUser`, `LunchTokenReservation`, `SelectedDateToken` interfaces.
  - `LunchTokenRepository` class with methods:
    - `getUserProfile(userId: string): Promise<LunchTokenUser | null>`
    - `isShortNameAvailable(normalizedName: string): Promise<boolean>`
    - `registerShortName(shortName: string): Promise<LunchTokenUser>`
    - `getExistingReservations(userId: number, dates: string[]): Promise<LunchTokenReservation[]>`
    - `createReservations(lunchTokenUserId: number, reservations: { date: string, count: number }[]): Promise<void>`

- [ ] **Step 1: Create TypeScript data models**
  Create `src/app/core/models/lunch-token.model.ts` containing `LunchTokenUser`, `LunchTokenReservation`, and `SelectedDateToken`.
- [ ] **Step 2: Implement `LunchTokenRepository`**
  Create `src/app/core/repositories/lunch-token.repository.ts` injecting `SupabaseService`, mapping rows between Postgres snake_case and TypeScript camelCase, enforcing user authentication checks, and handling Supabase queries.
- [ ] **Step 3: Export from repository index**
  Update `src/app/core/repositories/index.ts` to export `LunchTokenRepository`.
- [ ] **Step 4: Commit repository layer**
  ```bash
  git add src/app/core/models/lunch-token.model.ts src/app/core/repositories/lunch-token.repository.ts src/app/core/repositories/index.ts
  git commit -m "feat(lunch-token): add data models and repository layer"
  ```

---

### Task 3: Feature Domain Service with Calendar & Business Logic

**Files:**
- Create: `src/app/features/lunch-token/services/lunch-token.service.ts`

**Interfaces:**
- Consumes: `LunchTokenRepository`, `SupabaseService`, `NotificationService`.
- Produces:
  - `LunchTokenService` with Angular Signals:
    - `currentUserProfile = signal<LunchTokenUser | null>(null)`
    - `selectedDateTokens = signal<SelectedDateToken[]>([])`
    - `totalTokens = computed(() => number)`
    - `loading = signal<boolean>(false)`
    - `submitting = signal<boolean>(false)`
  - Methods:
    - `loadUserProfile(): Promise<LunchTokenUser | null>`
    - `registerShortName(name: string): Promise<LunchTokenUser>`
    - `isWorkingDay(date: Date | string): boolean`
    - `getWorkingDaysOfWeek(referenceDate: Date): SelectedDateToken[]`
    - `toggleDateSelection(dateStr: string): void`
    - `selectAllWorkingDays(referenceDate: Date): void`
    - `incrementToken(dateStr: string): void`
    - `decrementToken(dateStr: string): void`
    - `clearSelection(): void`
    - `submitReservations(): Promise<boolean>`

- [ ] **Step 1: Implement `LunchTokenService`**
  Implement calendar helpers (identifying Sun–Thu, blocking Fri–Sat, formatting `yyyy-MM-dd`), signal-based selection state, token increment/decrement logic (min 1), and verification against already-booked dates.
- [ ] **Step 2: Verify logic and edge cases**
  Ensure Friday (day 5) and Saturday (day 6) are rejected, normalized names are lowercased and trimmed, and total tokens compute correctly.
- [ ] **Step 3: Commit service implementation**
  ```bash
  git add src/app/features/lunch-token/services/lunch-token.service.ts
  git commit -m "feat(lunch-token): add lunch token feature service"
  ```

---

### Task 4: Navigation Header & Routing Configuration

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/shared/components/header.component.html`
- Modify: `src/app/shared/components/header.component.scss` (if needed for icon alignment)

**Interfaces:**
- Produces:
  - `/lunch-token` route guarded with `authGuard`.
  - Desktop nav link "Lunch Token" with icon `lunch_dining`.
  - Mobile drawer nav link "Lunch Token" with icon `lunch_dining`.

- [ ] **Step 1: Add route to `app.routes.ts`**
  Add path `lunch-token` with lazy-loaded `LunchTokenComponent` and `canActivate: [authGuard]`.
- [ ] **Step 2: Update Header component navigation**
  Add the "Lunch Token" navigation item to desktop menu and mobile menu with routerLink `/lunch-token` and active class styling.
- [ ] **Step 3: Commit routing and navigation updates**
  ```bash
  git add src/app/app.routes.ts src/app/shared/components/header.component.html
  git commit -m "feat(lunch-token): add route and header navigation link"
  ```

---

### Task 5: Short Name Card Component

**Files:**
- Create: `src/app/features/lunch-token/components/short-name-card/short-name-card.component.ts`
- Create: `src/app/features/lunch-token/components/short-name-card/short-name-card.component.html`
- Create: `src/app/features/lunch-token/components/short-name-card/short-name-card.component.scss`

**Interfaces:**
- Consumes: `LunchTokenService`.
- Produces: Standalone component displaying either:
  - Registered Short Name badge with verified user status.
  - Or an interactive 1-time registration form with input, live trimmed length check, availability check button, and clear explanation.

- [ ] **Step 1: Implement `ShortNameCardComponent` logic and template**
  Create the reactive inputs, trimmed string sanitization, registration action, loading spinners, and error alerts.
- [ ] **Step 2: Style component for light and dark theme**
  Use CSS variables (`--pwl-surface`, `--pwl-primary`, `--pwl-border`, `--pwl-text-primary`) for seamless theme consistency.
- [ ] **Step 3: Commit short name card component**
  ```bash
  git add src/app/features/lunch-token/components/short-name-card/
  git commit -m "feat(lunch-token): implement short name card component"
  ```

---

### Task 6: Date Selection & Token Counter Components

**Files:**
- Create: `src/app/features/lunch-token/components/date-selection-card/date-selection-card.component.ts`
- Create: `src/app/features/lunch-token/components/date-selection-card/date-selection-card.component.html`
- Create: `src/app/features/lunch-token/components/date-selection-card/date-selection-card.component.scss`
- Create: `src/app/features/lunch-token/components/token-counter-card/token-counter-card.component.ts`
- Create: `src/app/features/lunch-token/components/token-counter-card/token-counter-card.component.html`
- Create: `src/app/features/lunch-token/components/token-counter-card/token-counter-card.component.scss`

**Interfaces:**
- Consumes: `LunchTokenService`.
- Produces:
  - `DateSelectionCardComponent`:
    - Week selector ("This Week" / "Next Week").
    - "Select All Working Days" button.
    - 5 weekday chips (Sun, Mon, Tue, Wed, Thu) with active toggle states.
    - Custom date picker (MatDatepicker) with Fri/Sat & past dates disabled.
  - `TokenCounterCardComponent`:
    - Clean list/table of chosen dates showing Day, Date, and `[ − ] [ count ] [ + ]` controls.
    - "Already Reserved" indicator for dates that are already booked.

- [ ] **Step 1: Implement `DateSelectionCardComponent`**
  Build the week-switcher, weekday chips, "All Working Days" shortcut, and custom date picker with weekend filters.
- [ ] **Step 2: Implement `TokenCounterCardComponent`**
  Build the table/card layout displaying selected dates, day name, increment/decrement buttons (disabled at min 1), and remove date button.
- [ ] **Step 3: Style both components for responsive mobile & desktop views**
  Ensure cards wrap smoothly, touch targets for `+`/`-` buttons are $\ge 40\text{px}$, and theme variables are applied.
- [ ] **Step 4: Commit date selection and token counter components**
  ```bash
  git add src/app/features/lunch-token/components/date-selection-card/ src/app/features/lunch-token/components/token-counter-card/
  git commit -m "feat(lunch-token): add date selection and token counter components"
  ```

---

### Task 7: Reservation Summary Card & Confirmation Workflow

**Files:**
- Create: `src/app/features/lunch-token/components/reservation-summary-card/reservation-summary-card.component.ts`
- Create: `src/app/features/lunch-token/components/reservation-summary-card/reservation-summary-card.component.html`
- Create: `src/app/features/lunch-token/components/reservation-summary-card/reservation-summary-card.component.scss`

**Interfaces:**
- Consumes: `LunchTokenService`, SweetAlert2.
- Produces: Standalone summary card displaying:
  - User's Short Name.
  - Selected reservation dates count.
  - Total token count (large prominent metric).
  - Submit button triggering the SweetAlert2 irreversible confirmation modal.

- [ ] **Step 1: Implement summary details and dynamic count tracking**
  Display summary metrics reactive to `service.totalTokens()` and `service.selectedDateTokens()`.
- [ ] **Step 2: Implement SweetAlert2 irreversible confirmation modal**
  Create confirmation popup displaying:
  - User's Short Name
  - HTML table of dates, day names, and token counts
  - Total tokens
  - Warning banner: *"Please verify your reservation carefully. Once confirmed, these reservations cannot be edited or updated."*
  - Buttons: `Confirm & Submit` / `Cancel`
  - Prevents double clicks while `submitting()` is true.
- [ ] **Step 3: Commit summary card component**
  ```bash
  git add src/app/features/lunch-token/components/reservation-summary-card/
  git commit -m "feat(lunch-token): add reservation summary card and confirmation modal"
  ```

---

### Task 8: Main Container Page Assembly & Polish

**Files:**
- Create: `src/app/features/lunch-token/lunch-token.component.ts`
- Create: `src/app/features/lunch-token/lunch-token.component.html`
- Create: `src/app/features/lunch-token/lunch-token.component.scss`

**Interfaces:**
- Consumes: All sub-components created in Tasks 5, 6, 7 and `LunchTokenService`.
- Produces: The primary `/lunch-token` route component.

- [ ] **Step 1: Implement container layout**
  Assemble `ShortNameCardComponent`, `DateSelectionCardComponent`, `TokenCounterCardComponent`, and `ReservationSummaryCardComponent` in an ergonomic 2-column desktop / 1-column mobile grid.
- [ ] **Step 2: Add loading states and empty state placeholders**
  When no dates are selected, show a helpful illustration or instruction prompt guiding the user to select working days.
- [ ] **Step 3: Verify light and dark mode styling**
  Check contrast, border colors, badge colors, and hover states across light and dark themes.
- [ ] **Step 4: Commit container page**
  ```bash
  git add src/app/features/lunch-token/lunch-token.component.*
  git commit -m "feat(lunch-token): assemble main lunch token reservation page"
  ```

---

### Task 9: End-to-End Verification & Sanity Check

- [ ] **Step 1: Verify TypeScript compilation & absence of errors**
  Inspect all imports, Angular 18 standalone component dependencies, signal reactivity, and ensure zero missing symbols.
- [ ] **Step 2: Review all constraints against the design spec**
  Confirm:
  - Only Sun–Thu can be booked.
  - Fri/Sat are blocked.
  - Short Name is unique & case-insensitive.
  - Per-date token counts min 1.
  - Confirmation modal has explicit permanence warning.
  - Existing Work Log, Attendance, and Auth features are intact.
- [ ] **Step 3: Final branch commit and summary**
  ```bash
  git status
  ```
