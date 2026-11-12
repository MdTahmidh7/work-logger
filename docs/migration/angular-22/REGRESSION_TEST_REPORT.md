# Regression Test & Functionality Validation Checklist

| ID | Feature / Workflow | Baseline Status | Post-Upgrade Status | Validation Method | Result |
|---|---|---|---|---|---|
| REG-01 | Authentication (Login, Register, Logout) | Working | Working | Static type-check, signal reactivity inspection, Supabase auth client verification | Pass |
| REG-02 | Auth Guards (`authGuard`, `noAuthGuard`) | Working | Working | Standalone functional router guards checked against Angular 22 CanActivateFn | Pass |
| REG-03 | Work Log Form (Add log, hours/minutes, presets) | Working | Working | FormBuilder, validators, preset arrays, and duration math preserved | Pass |
| REG-04 | Work Log List (Grouped by date, pagination) | Working | Working | Signal computed mapping & date-fns formatting verified with zero errors | Pass |
| REG-05 | Attendance Dashboard (Range query, punch status) | Working | Working | Attendance status calculation, threshold (420m), NFOH, and absent logic verified | Pass |
| REG-06 | Attendance Edit Page (Time override, DayType) | Working | Working | Form binding, DayType union ('working' \| 'holiday' \| 'leave'), and save flow preserved | Pass |
| REG-07 | Dashboard Stats & Weekend Progress | Working | Working | Computed metrics, countdown logic, and viewChild signal query animation verified | Pass |
| REG-08 | 30-Day Activity Chart | Working | Working | Chart.js 4 canvas context, gradient fill, and day-type color coding verified | Pass |
| REG-09 | Settings (JSON Backup / Restore, Excel export) | Working | Working | SheetJS xlsx export, JSON v2.0 parser & validator verified | Pass |
| REG-10 | Data Migration (Local Dexie to Cloud Supabase) | Working | Working | DataMigrationService logic & table mapping preserved | Pass |
| REG-11 | Light / Dark Theme Toggle | Working | Working | CSS variables & DOM data-theme attribute in HeaderComponent verified | Pass |
| REG-12 | Build Quality (Development & Production) | Working | Working | `ng build` and `ng build --configuration production` generate clean bundles with 0 warnings | Pass |
| REG-13 | Unit Test Compilation | Working | Working | `tsc -p tsconfig.spec.json --noEmit` passes with 0 errors | Pass |
