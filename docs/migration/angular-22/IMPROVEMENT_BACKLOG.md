# Improvement Backlog

| ID | Module / Area | Limitation | Proposed Improvement | Benefit | Priority | Complexity |
|---|---|---|---|---|---|---|
| IMP-001 | Change Detection | Relies on Zone.js runtime monkey-patching | Enable Angular Zoneless Change Detection (`provideZonelessChangeDetection`) | Smaller bundle size, faster initial load, native modern reactivity | High | Medium |
| IMP-002 | Component Queries | `WeekendProgressComponent` uses legacy `@ViewChild` decorator | Modernize to signal-based `viewChild()` | Full signal reactivity and consistency | Medium | Low |
| IMP-003 | Component Inputs/Outputs | `WorkLogListComponent` and cards use legacy or mixed inputs | Modernize all component bindings to signal `input()` and `output()` | Modern typing, reactivity, and performance | Medium | Low |
| IMP-004 | Testing Suite | Karma / Jasmine test runner configuration | Migrate to Vitest runner supported natively in modern Angular | Blazing-fast test runs and modern test ergonomics | Low | Medium |
| IMP-005 | Model Architecture | `Attendance` and `MonthlyStatistics` declared in multiple directories | Consolidate models into single source of truth in `core/models` | Clean code, DRY, prevents desync | Medium | Low |
