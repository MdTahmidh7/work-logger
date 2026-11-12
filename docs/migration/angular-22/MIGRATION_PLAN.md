# Angular 22 Migration Plan

## 1. Executive Summary
This document outlines the systematic, phased upgrade of **Personal Work Logger** from Angular 18.2.14 / CLI 18.2.21 to **Angular 22.2.6** (CLI 22.2.6, Material/CDK 22.2.7, TypeScript 6.0.3, Node.js 22.23.5).

## 2. Upgrade Principles
1. **Zero Regression**: Preserve 100% of existing business logic, authentication workflows, calculation formulas, and UI interactions.
2. **History Preservation**: All work conducted on `feature/angular-22-upgrade`. No historical commits modified.
3. **Controlled Modernization**: Transition deprecated Angular APIs to Angular 22 standards (Signal queries, zoneless change detection readiness, modern template control flow).
4. **Transparent Verification**: Independent validation at each stage (Compilation, Type-checking, Production build, Runtime regression testing).

## 3. Migration Roadmap & Phases

### Phase 1: Repository Inspection and Baseline Analysis (Completed)
- Document baseline versions (Angular 18.2.14, TypeScript 5.5.4, RxJS 7.8.2, Node.js 22.23.5).
- Verify baseline build (`ng build` succeeded without compilation errors).
- Create existing functionality inventory.

### Phase 2: Git Branch and History Preservation (Completed)
- Checked out dedicated branch: `feature/angular-22-upgrade` based on `main`.
- Clean working directory verified.

### Phase 3: Dependency Ecosystem Upgrade (In Progress)
- Target package matrix:
  - `@angular/*`: `^22.2.6`
  - `@angular/material` & `@angular/cdk`: `^22.2.7`
  - `@angular-devkit/build-angular` / `@angular/build`: `^22.2.6`
  - `zone.js`: `~0.16.3`
  - `typescript`: `~6.0.3`
  - `rxjs`: `~7.8.2`
  - Third-party packages: `@supabase/supabase-js`, `chart.js`, `date-fns`, `dexie`, `xlsx`, `sweetalert2`.

### Phase 4: Modernize Angular Code and Conventions
- Modernize view queries (`@ViewChild` -> `viewChild()`).
- Modernize component inputs and outputs (`@Input`/`@Output` -> `input()`/`output()`).
- Clean up legacy template artifacts (`dashboard.html`, `work-log-form.html`).
- Consolidate duplicated models (`attendance.model.ts`).
- Update Material 3 SCSS configuration and theming for Angular 22.
- Configure Zoneless change detection (`provideZonelessChangeDetection`).

### Phase 5: Preserve Existing Application Functionality
- Regression test all core workflows against the inventory.

### Phase 6: Testing, Quality Checks & Final Reporting
- Validate development and production builds.
- Ensure zero bundle or runtime regressions.
