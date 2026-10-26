# WatDesk UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the approved warm-paper academic workspace across six existing pages and the Edge side panel.
**Architecture:** Preserve the state/reader layer. Extract overview presentation and toolbar controls from App, centralize date grouping in a pure overview model, and replace stacked visual overrides with one coherent stylesheet plus focused component rules.
**Tech Stack:** Existing React, TypeScript, Vite, Phosphor, bundled Figtree, native CSS.
**Spec:** docs/superpowers/specs/2026-10-26-watdesk-ui-redesign-design.md (approved by user 2026-10-26).

## Global Constraints
- Preserve stored data, completion marks, source toggles, six-hour sync, reminders and import/export semantics.
- No new external fonts, CDN, permissions, framework or platform; no reader/SSO changes in this redesign.
- Warm white, deep ink, restrained gold; 8–12px radii, thin dividers, limited shadow; full dark mode.
- Verify Chinese/English and 360/400/440px side panels plus 1024/1280/1440px desktop; keyboard focus, labels and reduced motion remain available.
- Distinguish timed exams, quiz availability, date-only items, unknown submission status and retained data.

## Review Focus
- Today's exam with no task deadlines must still be prominent (Task 1 tests).
- More than eight upcoming records / a later course must remain discoverable, including show-more and course filter (Task 1 tests).
- Date-only / midnight-crossing campus dates must group correctly without invented times (Task 1 tests).
- Narrow side panel with long bilingual titles and grade history must not overflow or hide actions (Task 3 browser matrix).
- A menu opened by keyboard must close via Escape/outside click without losing access to its actions (Task 2 tests).

### Task 1: Date-first overview
**Files:** Create `src/core/overview.ts`, `src/ui/Overview.tsx`; modify `src/ui/App.tsx`; tests `tests/overview-model.test.ts`, `tests/overview-redesign.test.tsx`.
**Interfaces:** `buildOverview(entries:Entry[],state:AppState,now:number)` produces todayTasks, todayExams, future, overdue, undated, groups and course counts. `Overview` consumes state/entries/now/course/setCourse, existing task/exam render callbacks, source/resource nodes and navigation callbacks.
- [x] Write failing tests for today's exam, complete future grouping beyond eight items, date-only groups, course filtering and show-more.
- [x] Run named tests; expect the new model/module or expected overview structure to fail.
- [x] Implement the pure model and extract the overview, preserving task editing/completion and exam links.
- [x] Run overview tests plus existing overview-exams/quiz-exams tests; expect pass.
- [x] Commit the independently working overview.

### Task 2: Navigation, source feedback and settings structure
**Files:** Create `src/ui/WorkspaceToolbar.tsx`; modify `src/ui/App.tsx`, `src/ui/SourceStatus.tsx`; test `tests/workspace-toolbar.test.tsx`, `tests/sync-progress-ui.test.tsx`.
**Interfaces:** Toolbar consumes localized callbacks for refresh/add/full/language/theme. Existing `SourcePanel` and `BackgroundSync` APIs remain compatible.
- [x] Write failing keyboard-menu and disabled-optional-source collapse tests.
- [x] Run named tests and observe failures.
- [x] Implement compact high-frequency toolbar, a native disclosure menu with Escape/outside close, source summaries and grouped settings. Preserve all existing actions and error diagnostics.
- [x] Run toolbar, sync-progress, onboarding and related UI tests; expect pass.
- [x] Commit.

### Task 3: Unified visual system for six pages
**Files:** Replace `src/ui/styles.css`; remove `src/ui/polish.css` import and obsolete file; adjust `src/ui/main.tsx` and small presentation markup in Grades/Calendar/AcademicTools if needed. Extend `tests/preview.ts` with a representative public synthetic showcase.
**Interfaces:** Existing functional component class names remain; new Overview/Toolbar classes receive the same tokens. No changes to source reads or persistence.
- [x] Implement one token set, typography, controls, desktop/side navigation, overview timeline, task/exam rows, grade tables, calendar, settings, dialogs and connection flow.
- [x] CSS-only visual work uses browser verification rather than implementation-mirroring unit tests.
- [x] Run typecheck/test/build; expect zero failures and successful bundles.
- [x] Start Vite and use CUA for screenshot/DOM checks of six pages, both locales/themes, representative errors/empty/reading states and requested widths. Inspect long titles, overflow and keyboard controls; fix observed issues.
- [x] Commit.

### Task 4: Review, package and verify
**Files:** Update version/README, approved spec status and plan completion; package final output under the existing outputs directory.
- [x] Run complete tests, typecheck and build. Create whole-branch review package and obtain one fresh-context review; fix material findings with focused regression tests.
- [x] Verify ZIP root manifest, file integrity and original vendor hashes; preserve a backup and the existing unpacked installation path.
- [x] Open a working browser preview as a deliverable. Update the existing draft PR without merging or publishing a store release.
- [x] Verify loaded browser version and live records separately from local/CI checks; accurately report anything requiring user reload.
