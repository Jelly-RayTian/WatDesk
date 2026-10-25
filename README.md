# WatDesk

Independent bilingual academic workspace for University of Waterloo. Edge Manifest V3 extension with a side panel and full-page workspace.

## Install / 安装

1. Build, or use the delivered `extension` folder.
2. Open `edge://extensions`, enable Developer mode, choose **Load unpacked / 加载解压缩的扩展**, select that folder.
3. First launch opens platform setup. Connect Learn, Crowdmark and Odyssey; CS135 and Möbius are optional and disabled until selected. Review imported counts, then enter the workspace. The full-page button is visible at the top of setup and the side panel.
4. Pin WatDesk. Click its toolbar icon to open the side panel. Use **打开完整面板 / Open full workspace** for the full page.
5. Installation requests access to the three core sites: Learn, Crowdmark and Odyssey. First opening automatically opens and connects them in parallel. CS135, Möbius and school SSO helper permissions remain optional. Sign in on Learn, Crowdmark and Odyssey themselves, SSO entries are clicked automatically when possible; passwords and verification stay under your control. Sync resumes when you return to the platform. CS135 calendar is public.

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

Checking a task is personal bookkeeping; it does not submit anything to the university. Reminder delivery requires Edge to be running and Windows to allow notifications. Opening shows saved data immediately and checks for updates in the background with short freshness windows. Every 30 minutes while Edge runs, automatic sync reads only already-open, loaded source tabs; it never opens, activates, reloads discarded tabs, or navigates source pages. Closed platforms keep their saved data until you open their website or click Refresh. Crowdmark grade-page browsing runs only on manual refresh or initial setup. Manual refresh forces a new read and may open the source websites. Grade estimates follow manually entered weights and do not model drop rules or pass-the-final conditions. Platform APIs/page layouts may change. Course content and external resource titles retain their original language.

Data stays in this extension's local browser storage. No WatDesk server, analytics, password collection, or external font CDN. Source requests go to the corresponding university/Crowdmark service using the browser session. Backups contain your academic data and notes; keep them private. Removing the extension removes its local data: export a backup first.

## Develop

Node 22+ and pnpm: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm package`.

Production builds exclude `preview.html` and `tests/preview.ts`, which use clearly isolated development fixtures and no real login. Runtime assets are bundled locally. See `THIRD_PARTY_NOTICES.md` for the two MIT readers reused from WATnow; all WatDesk product UI, state, schedule parsers, calendar and packaging are independent.

## Learn availability / Learn 读取提示

Some courses restrict individual tools or grade endpoints. WatDesk displays the course, tool and HTTP status separately from network/server failures, and retains previously read records for unavailable sections. HTTP 403 can mean the course tool is disabled or the endpoint is restricted; HTTP 404 may mean no matching data or endpoint. Neither proves that an assignment is unsubmitted or a grade is unreleased. Check the original Learn page when in doubt.

部分课程会限制工具或成绩接口。WatDesk 会列出课程、工具及 HTTP 状态，保留无法刷新部分的旧记录；不会把接口不可用判定为未提交或未公布。自动更新会缓存近期检查结果，手动刷新仍会重试。

GitHub Actions runs type checking, tests and a production build. Its downloadable `WatDesk-extension` artifact can be extracted and loaded in Edge using the installation steps above.

## School sign-in helper / 学校登录自动继续

Enable **学校登录自动继续 / School sign-in helper** in Settings and grant the optional `adfs.uwaterloo.ca` permission. On the Waterloo HTTPS ADFS sign-in page, WatDesk clicks Next once if a Waterloo username is already filled. It never fills credentials, reads passwords, or advances password/MFA/error steps. Disable the helper in Settings at any time.

## 1.0.2 sync and grade labels

Crowdmark grade pages use existing same-origin navigation links where available. Current courses are read before archive, each page has a separate wait budget, and successfully read courses are saved immediately even if a later course fails. Silent archive checks are cached for one day; manual refresh bypasses the cache. Grade retries after failure wait five minutes during automatic refresh; manual refresh retries immediately.

Platform overall grades, category aggregates and class averages are labeled and excluded from equal-weight assessment statistics, trends and weight entry. Learn classification uses its [official grade object types](https://docs.valence.desire2learn.com/res/grade.html) when present, then common explicit titles. Unnamed aggregates without metadata cannot be safely inferred.

## 1.0.3

Platform refreshes run concurrently, with per-source deduplication and serialized state writes. A failed source does not block other sources. Overview course counts include open tasks and future exams; its upcoming list now includes Odyssey exam cards and supports course filtering.

## 1.0.4

Automatic sync no longer opens Learn, Crowdmark or Odyssey tabs. It only reads existing loaded pages, retains saved data when a platform is closed or signed out, and never navigates to login or Crowdmark grade pages. Returning from sign-in retries only that platform. Manual refresh and initial setup can still open source pages. CS135 uses a direct background fetch without opening a tab.

自动同步不再突然打开 Learn、Crowdmark 或 Odyssey。只读取已打开且加载完成的页面；网站关闭或登录过期时保留历史数据，不自动跳转登录或浏览 Crowdmark 成绩页。登录后仅重试对应平台。手动刷新及首次连接仍可打开平台页面；CS135 直接后台读取，无需打开标签页。

## 1.1.0

Learn now supplements Module Quiz deadlines from file-type Course Schedule topics. Möbius is an optional source with access limited to `https://uwmo.mobius.cloud/*`: enable it, then manually open an activity’s View Policies page from LEARN. WatDesk reads only settings metadata on already-loaded pages, never starts an attempt or requests an exception, and never navigates or opens Möbius even during manual refresh. Availability windows remain task deadlines; the per-attempt time limit is displayed separately. Only explicit submission/completion status counts as submitted; attempts used, content viewed and “results recorded” settings do not. Matching Learn/Möbius tasks merge into one calendar event and reminder while retaining the time limit. Previously seen settings remain saved when a different activity is read.

新增可选 Möbius 来源，读取你从 LEARN 手动打开的「查看设置」页；Course Schedule 补齐 Module 1–12 Quiz 日期。开放窗口与单次限时分别显示，与 Learn 相同任务合并，仅提醒一次。不会自动打开网页、开始测验、请求例外或提交答案。

## 1.1.1

CS135 tasks now read actual timestamped source-file records from an already-loaded Assignments → View Submissions page. The latest record marks that assignment as submitted, matched by assignment number and academic term. Basic-test results and marksheet links alone do not imply submission or a final grade. Without a readable page, saved submission confirmations are retained and unchecked tasks are labeled unknown. Opening the CS135 source explicitly goes to View Submissions; background refresh never opens or navigates tabs. The reader collects submission metadata only and never opens source files or submits work.

## 1.1.2

Allow the extension’s own full-page tab to request state from its worker, while keeping content-page messages isolated. Loading failures now show a diagnostic and the installed extension version, making a browser data refresh distinguishable from reloading the extension itself.

## 1.1.3

Skip frozen source tabs during quiet background reads; explicit refresh may activate a frozen source and manually opens CS135 View Submissions. Bound CS135/Möbius page collection to five seconds and passive source runs to 45 seconds. Once a read times out, late sign-in/page responses cannot resurrect its reading phase or overwrite a later sync. Timed-out and interrupted reads show actionable explanations while retaining saved data.

## 1.2.0 — quiet reads and configurable sync

Manual and automatic refresh no longer create, activate, reload or navigate source tabs. Learn and Crowdmark use their existing authenticated background readers; Odyssey and Learn schedules use a bundled, short-lived offscreen DOM parser. The parser closes after each operation, including failures. Existing user tabs are never closed. Login expiry is reported inside WatDesk; use Open website to sign in explicitly.

Automatic sync defaults to **6 hours**, including profiles upgrading from the old fixed 30-minute timer. Settings → Automatic sync offers 30 minutes, 1/2/6/12/24 hours or Manual only. Changing the interval updates the browser alarm; ordinary worker restarts preserve the next run. Opening the workspace reuses recent successful data for the selected interval; Refresh bypasses that cache. Scheduled runs do not skip a cycle merely because the previous read finished a few seconds after its alarm. Browser shutdown/sleep can delay alarms.

CS135 attempts a background metadata read, then uses already-loaded View Submissions pages if needed. If the server supplies only a JavaScript shell or the login expires, existing submission confirmations stay saved and unverified tasks remain unknown. Möbius still requires an already-loaded settings page. Crowdmark tasks refresh through its API; grades are checked on already-loaded course pages, with other saved grades retained and labeled accordingly. Quiet sync does not browse courses or archives to retrieve grades.

手动刷新与定时同步均不再弹出、激活或跳转平台标签页。临时后台解析页面用完即关闭，你自己打开的页面保持原样。默认每 6 小时同步，可在「设置 → 自动同步」调整；登录过期或部分信息无法静默核实时，保留历史结果并显示提示。
