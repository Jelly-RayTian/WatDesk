# WatDesk Privacy Policy / 隐私政策

Effective date: October 29, 2026. Applies to WatDesk for Microsoft Edge, version 1.9.0 and later unless updated here.

WatDesk is an independent project maintained by Jelly-RayTian. It is not an official University of Waterloo product. Project and privacy contact: https://github.com/Jelly-RayTian/WatDesk/issues . Do not include private academic records, passwords or verification codes in a public issue.

## Information accessed and purpose

With the browser permissions you grant, WatDesk accesses supported University of Waterloo LEARN, Crowdmark and Odyssey pages or APIs to organize your enrolled courses, deadlines, quizzes, exams, released grades and submission metadata. This can include course names and identifiers, assessment titles and links, dates, scores, submission status, exam room/seat information, and account names or identifiers displayed by those services. Account identifiers help prevent records from different signed-in accounts being combined. Relevant page content is read and parsed for these features; WatDesk does not collect general browsing history.

Optional CS135 access reads the public course schedule and submission metadata available to your authorized account. Optional Möbius access reads already-open activity settings pages, such as published availability, duration and explicit completion information. The optional Waterloo sign-in helper checks an already-entered university username and may advance the username-only Next step. It does not read password or verification-code values or complete those steps. WatDesk does not start quizzes, request exceptions, upload answers or submit coursework.

You may also enter personal items, class schedules, notes, completion marks, reminder preferences and grade-estimation weights. These are used only for the features you select. Synchronization times, source status and error details support freshness information and troubleshooting.

## Storage and transmission

Academic records, settings, account identifiers, notes and source status are kept in this Microsoft Edge profile's local extension storage. WatDesk does not operate a backend for academic data, and does not upload those records to its developer, analytics, advertising or AI services. There are no advertising trackers in the extension, and only the limited anonymous usage count described below.

To retrieve information, your browser sends HTTPS requests directly to the relevant school or Crowdmark service, using your existing signed-in browser session. WatDesk does not collect or store your passwords, raw session cookies, access tokens or verification codes. The source services receive those requests and apply their own privacy policies. When needed for reading, WatDesk may open inactive temporary source tabs and closes its owned tabs after use; a login challenge may require you to interact with the source site. Optional hosts are accessed after you grant the relevant permission.

The permissions for storage, scheduled alarms, notifications, the side panel, script execution on supported sites and an offscreen local HTML parser serve the academic workspace. Scripts and fonts are bundled with the extension rather than downloaded for remote execution.

## Anonymous usage count (can be disabled)

On by default when you first open WatDesk, with a notice and a control on the setup page and in **Settings → Anonymous usage count**. Opening the workspace sends at most one request per day containing exactly two fields: a random install ID generated on your device and the WatDesk version number (the Settings page shows the exact payload). It never includes courses, grades, deadlines, notes, account names, browsing history or any school data. The counting server is operated by the developer using Cloudflare Workers and KV at `https://watdesk-stats.guojelly123.workers.dev/ping`. It records that this ID was active that day, sets the date itself, and keeps IDs for at most 400 days; it is used only to estimate how many people use WatDesk. The application does not store IP addresses; Cloudflare processes network connection information to provide the service under its privacy policy: https://www.cloudflare.com/privacypolicy/ . Turning the option off stops all requests and deletes the ID from your device; existing server records expire within the retention period. A previous choice to disable counting is preserved after updates.

## Sharing, exports and notifications

WatDesk does not sell personal information or share academic records with data brokers. No developer-side human review of your local academic data occurs through the extension. If you voluntarily send a support report, the information you provide is received by the support platform you choose.

JSON backups, CSV grades, ICS calendars and offline HTML exports are files you explicitly create on your computer. They may contain private academic information and notes. You decide whether to share or import those files elsewhere. Removing records from WatDesk does not delete copies you previously exported or imported into another app. Reminders may display course or assessment information in Microsoft Edge or operating-system notifications; control reminders and notification visibility in the extension and operating-system settings.

## Control and retention

You can adjust the synchronization interval, including manual-only mode, hide or mute courses, delete personal items, hide individual synced items from the calendar and restore them later, disable optional sources and the optional sign-in helper, manage reminders, clear individual source records or local data through Settings, and revoke site permissions in Microsoft Edge. Hidden courses are retained locally and can be shown again. Failed source reads may retain the last successful snapshot rather than silently deleting it. Local information remains until replaced through synchronization or explicitly removed. Uninstalling the extension removes its extension-local data; source-platform records and your previously exported files are unaffected.

If a source account changes, WatDesk may stop replacement until that source's saved data is cleared. Sign out of school platforms through those platforms; removing WatDesk is not a platform sign-out operation.

## Updates and contact

This policy will be updated when data handling changes. The effective date above identifies the current text. Questions can be raised through the project issue tracker without posting private academic details.

---

## 中文说明

WatDesk 是由 Jelly-RayTian 维护的独立 Edge 扩展，非滑铁卢大学官方产品。为整理你的课程、截止事项、测验、考试、成绩与提交状态，扩展会在授权范围内读取 LEARN、Crowdmark、Odyssey，以及你选择启用的 CS135 或 Möbius。相关记录可能包含平台显示的账号名称或标识、课程与考核信息、成绩、考试教室和座位。账号标识用于防止混合不同账号的数据，不采集一般浏览历史。

课程数据、个人事项、备注、完成标记、提醒设置和来源状态保存在当前 Edge 配置文件的本地扩展存储中。WatDesk 没有接收这些学业数据的开发者后台，不向广告、统计或 AI 服务上传这些记录。为同步，浏览器使用现有登录状态直接通过 HTTPS 访问对应学校或 Crowdmark 服务；平台按自身隐私政策处理请求。扩展不收集或保存密码、原始会话 Cookie、访问令牌或验证码。可选学校登录辅助只检查已输入的大学用户名并推进用户名步骤，不读取或处理密码和验证码。

你主动导出的 JSON、CSV、ICS 或离线 HTML 文件可能包含私人学业信息和备注，是否分享或导入其他软件由你决定。通知可能显示课程或考核信息，可以在扩展与系统设置中关闭或调整。你可以修改同步间隔、隐藏或静音课程、停用可选来源与登录辅助、清理来源记录或本地数据，并在 Edge 中撤销权限。隐藏和同步失败时保留的记录仍在本地，直到被更新或清除。卸载扩展会移除扩展本地数据，但不删除平台原始记录和已导出文件。

“匿名使用统计”默认开启，首次使用界面和设置页均说明用途并提供关闭开关。打开 WatDesk 时，每天最多向开发者托管在 Cloudflare Workers 和 KV 的 `https://watdesk-stats.guojelly123.workers.dev/ping` 发送一次随机安装编号和扩展版本号，服务器记录当天活跃状态，最多保留 400 天。不发送课程、成绩、截止日期、账号或浏览记录。应用不保存 IP 地址；Cloudflare 为提供服务会处理网络连接信息，适用其隐私政策 https://www.cloudflare.com/privacypolicy/ 。关闭后停止发送并删除本地随机编号，服务器已有记录到期清除。更新扩展会保留已关闭统计的选择。

隐私问题可通过 https://github.com/Jelly-RayTian/WatDesk/issues 联系；请勿在公开问题中提交真实成绩单、密码、验证码等私人内容。
