# Known Issues Register

| Issue ID | Feature / File | Description | Severity | Existed Pre-Upgrade? | Blocks Upgrade? | Recommended Action |
|---|---|---|---|---|---|---|
| ISS-001 | Build / `sweetalert2` | CommonJS module warning during bundle optimization | Resolved | Yes | No | Configured `allowedCommonJsDependencies` in `angular.json` |
| ISS-002 | `dashboard.html` & `work-log-form.html` | Orphaned legacy template files not referenced by components | Resolved | Yes | No | Removed unused files in refactor commit |
| ISS-003 | `attendance-filters.component.ts` | Type mismatch for `DateFilterType` parameter in `getDateRange` | Resolved | Yes | No | Added explicit `DateFilterType` typing to filters array and select handler |
| ISS-004 | Headless Browser in CLI Container | Karma unit test execution requires headless Chrome which is not packaged in container environment | Low | N/A | No | Run tests using headless Chrome on host or configure Vitest runner |
