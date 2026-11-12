# Known Issues Register

| Issue ID | Feature / File | Description | Severity | Existed Pre-Upgrade? | Blocks Upgrade? | Recommended Action |
|---|---|---|---|---|---|---|
| ISS-001 | Build / `sweetalert2` | CommonJS module warning during bundle optimization (`sweetalert2` is not ESM) | Low | Yes | No | Configure allowed CommonJS dependencies in `angular.json` or keep as-is |
| ISS-002 | `src/app/features/dashboard/dashboard.html` & `work-log-form.html` | Orphaned legacy template files not referenced by components | Low | Yes | No | Remove unused legacy `.html` files in cleanup phase |
| ISS-003 | `attendance.model.ts` | Duplicate interface definition across `core/models` and `features/attendance/models` | Low | Yes | No | Unify model imports across modules |
