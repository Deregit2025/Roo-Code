# Intent Map

This document maps each intent to its specification, current status, files changed, and trace entries.
It is machine-managed by the orchestration pipeline and updated after each `postToolUse` cycle.

---

## Index

| Intent ID | Title                    | Category | Status        | Spec Reference           |
|-----------|--------------------------|----------|---------------|--------------------------|
| INT-001   | Create User API          | Feature  | IN_PROGRESS   | .specify/user_api.md     |
| INT-002   | Implement Login Flow     | Feature  | PENDING       | .specify/auth.md         |
| INT-003   | Refactor UI Components   | Refactor | COMPLETED     | .specify/ui.md           |

---

## INT-001 — Create User API

**Status:** `IN_PROGRESS`  
**Spec:** [user_api.md](.specify/user_api.md)  
**Owned Scope:** `src/auth/**`, `src/middleware/**`

### Files Changed

| File | Mutation Classes | Lines | Req References |
|------|-----------------|-------|----------------|
| `src/auth/userController.ts`       | ADD_FUNCTION, ADD_EXPORT, ADD_IMPORT | 1–55  | REQ-001, REQ-002 |
| `src/middleware/validateRequest.ts` | MODIFY_FUNCTION, ADD_TYPE            | 12–35 | REQ-003          |
| `src/auth/passwordHash.ts`          | ADD_FUNCTION, ADD_IMPORT             | 1–22  | REQ-004          |

### Trace References

| Trace ID                                     | Timestamp                | Event                                  |
|----------------------------------------------|--------------------------|----------------------------------------|
| `a1b2c3d4-0001-4e5f-8a9b-c0d1e2f3a4b5`       | 2026-02-20T16:00:00.000Z | Session prompt loaded (INT-001 context)|
| `a1b2c3d4-0002-4e5f-8a9b-c0d1e2f3a4b5`       | 2026-02-20T16:05:22.000Z | Created `userController.ts`            |
| `a1b2c3d4-0003-4e5f-8a9b-c0d1e2f3a4b5`       | 2026-02-20T16:12:47.000Z | Modified `validateRequest.ts`          |
| `a1b2c3d4-0004-4e5f-8a9b-c0d1e2f3a4b5`       | 2026-02-20T16:18:05.000Z | Created `passwordHash.ts` (approved)   |
| `a1b2c3d4-0005-4e5f-8a9b-c0d1e2f3a4b5`       | 2026-02-20T16:25:33.000Z | Final revision — criteria satisfied    |

### Acceptance Criteria

- [x] `POST /users` returns 201 with user object
- [x] Input validation rejects empty email with 400
- [x] Password hashed with bcrypt before storage
- [ ] Unit tests cover happy path and edge cases *(pending)*

---

## INT-002 — Implement Login Flow

**Status:** `PENDING`  
**Spec:** [auth.md](.specify/auth.md)  
**Owned Scope:** `src/auth/login/**`, `src/auth/jwt/**`

### Files Changed

*No changes yet — intent not yet started.*

### Acceptance Criteria

- [ ] `POST /login` returns signed JWT on success
- [ ] Returns 401 for invalid credentials
- [ ] JWT expires after 24 hours
- [ ] Refresh token stored in HttpOnly cookie

---

## INT-003 — Refactor UI Components

**Status:** `COMPLETED`  
**Spec:** [ui.md](.specify/ui.md)  
**Owned Scope:** `src/ui/**`, `webview-ui/src/components/**`

### Files Changed

| File | Mutation Classes | Lines | Notes |
|------|-----------------|-------|-------|
| `webview-ui/src/components/Button.tsx`   | REFACTOR_BLOCK  | 1–40  | Replaced inline styles with design tokens |
| `webview-ui/src/components/Modal.tsx`    | MODIFY_FUNCTION | 8–62  | Extracted shared layout into `useModalLayout` hook |
| `webview-ui/src/components/Sidebar.tsx`  | MODIFY_CLASS    | 1–88  | Migrated to CSS variables for color theming |

### Acceptance Criteria

- [x] All components use shared design tokens
- [x] No inline styles remain in any component
- [x] Storybook stories updated for all changed components
