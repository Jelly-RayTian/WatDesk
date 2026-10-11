# WatDesk

Independent bilingual academic workspace for University of Waterloo. Edge Manifest V3 extension with a side panel and full-page workspace.

## Install / 安装

1. Build, or use the delivered `extension` folder.
2. Open `edge://extensions`, enable Developer mode, choose **Load unpacked / 加载解压缩的扩展**, select that folder.
3. First launch opens platform setup. Connect Learn, Crowdmark and Odyssey; CS135 is optional and disabled until selected. Review imported counts, then enter the workspace. The full-page button is visible at the top of setup and the side panel.
4. Pin WatDesk. Click its toolbar icon to open the side panel. Use **打开完整面板 / Open full workspace** for the full page.
5. Connect each source and allow only its site access. Sign in on Learn, Crowdmark and Odyssey themselves, SSO entries are clicked automatically when possible; passwords and verification stay under your control. Sync resumes when you return to the platform. CS135 calendar is public.

## Features

- Learn deadlines, released grades and explicitly timed calendar exams; Crowdmark deadlines, submission state and historical grades.
- Odyssey assessment dates, duration, room and seat; unpublished times remain unknown.
- CS135 calendar deadlines (only with the website's explicit 9pm rule), quizzes/midterm, lecture-note and assignment links.
- Chinese/English, light/dark/system theme; month/week/next-seven-days calendar with course filters, exam markers and date-specific personal items.
- Personal tasks, checkmarks and notes; conservative cross-platform task merging with source links and an opt-out; platform submission and personal completion remain separate.
- Term selection, orientation-module hiding and course visibility controls; hidden courses are excluded from coursework views and reminders.
- Per-course grade trends, manual assessment weights, graded-weight averages and target-score estimates. Unreleased grades are not counted as zero.
- Exam countdowns and time conflicts; new exam time, room or seat changes trigger notifications and remain in the update history.
- Course-specific deadline/exam reminders, manually entered weekly classes, course muting, calendar ICS export (including the next 90 days of classes), full JSON backup/restore and a self-contained offline HTML viewer.
- Record-level verification times distinguish saved or retained data from freshly checked data. Learn skips hidden courses and reuses course reads for 10 minutes; manual refresh bypasses this cache. Failed reads retain the previous snapshot. Account name changes block replacement until source cache is cleared.

Checking a task is personal bookkeeping; it does not submit anything to the university. Reminder delivery requires Edge to be running and Windows to allow notifications. Opening shows saved data immediately and checks for updates in the background with short freshness windows. Sync also runs every 30 minutes while Edge runs; manual refresh forces a new read. Grade estimates follow manually entered weights and do not model drop rules or pass-the-final conditions. Platform APIs/page layouts may change. Course content and external resource titles retain their original language.

Data stays in this extension's local browser storage. No WatDesk server, analytics, password collection, or external font CDN. Source requests go to the corresponding university/Crowdmark service using the browser session. Backups contain your academic data and notes; keep them private. Removing the extension removes its local data: export a backup first.

## Develop

Node 22+ and pnpm: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`.

Production builds exclude `preview.html` and `tests/preview.ts`, which use clearly isolated development fixtures and no real login. Runtime assets are bundled locally. See `THIRD_PARTY_NOTICES.md` for the two MIT readers reused from WATnow; all WatDesk product UI, state, schedule parsers, calendar and packaging are independent.

## Learn availability / Learn 读取提示

Some courses restrict individual tools or grade endpoints. WatDesk displays the course, tool and HTTP status separately from network/server failures, and retains previously read records for unavailable sections. HTTP 403 means the account cannot access that endpoint; HTTP 404 may mean no matching data or endpoint. Neither proves that an assignment is unsubmitted or a grade is unreleased. Check the original Learn page when in doubt.

部分课程会限制工具或成绩接口。WatDesk 会列出课程、工具及 HTTP 状态，保留无法刷新部分的旧记录；不会把接口不可用判定为未提交或未公布。自动更新会缓存近期检查结果，手动刷新仍会重试。

GitHub Actions runs type checking, tests and a production build. Its downloadable `WatDesk-extension` artifact can be extracted and loaded in Edge using the installation steps above.
