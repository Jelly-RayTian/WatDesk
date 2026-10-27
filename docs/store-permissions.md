# WatDesk 1.4.0 — Edge Add-ons permission justifications

Single purpose: organize a Waterloo student's own coursework, exams and grades from sites they are already signed in to. All data stays in local extension storage; there is no WatDesk server, analytics or remote code.

| Permission | Why it is needed |
| --- | --- |
| `storage` | Saves tasks, exams, grades, notes and settings locally in the Edge profile. |
| `alarms` | Schedules periodic sync and deadline/exam reminders. |
| `notifications` | Shows deadline and exam reminders the user enables. |
| `sidePanel` | Opens the compact workspace beside the page. |
| `scripting` | Runs read-only page readers on LEARN, Crowdmark and (optionally) Möbius pages the user granted. Never submits coursework or starts quizzes. |
| `offscreen` | Parses fetched HTML and Course Schedule PDFs locally, because the service worker has no DOM. |
| Host `learn.uwaterloo.ca`, `app.crowdmark.com`, `odyssey.uwaterloo.ca` | Reads the user's own deadlines, exams and released grades from these services. |
| Optional hosts `student.cs.uwaterloo.ca`, `adfs.uwaterloo.ca`, `uwmo.mobius.cloud` | Requested only when the user turns on CS 135, the username-only sign-in helper, or Möbius. The helper never reads passwords or verification codes. |

Extension-page CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; connect-src 'self'` (no remote scripts, fonts or connections from extension pages).
Icons: 16, 32, 48 and 128 px are bundled. The store listing also needs a separate 300x300 logo and 1280x800 screenshots, which are not part of the package.
