# Execution ledger: WatDesk-开发计划.md

Ruling: 用户在 2026-10-10 允许参考和复用部分代码，取代先前绝不复用限制；产品仍为独立仓库与全新 UI。实际复用必须记录许可与文件，不能隐去署名。
Ruling: 新项目不存在共享主分支，使用独立仓库 feature/initial 分支，不另建多余 worktree。
Ruling: Windows 原生环境手动维护本 ledger 和测试日志，不依赖 bash sdd 工具。
Pre-flight: 任务 1 类型和 i18n 被任务 2-5 共用；统一由 src/domain.ts 和 src/i18n.ts 导出。
Pre-flight: 任务 2 AdapterResult 被任务 3 sync 消费；只有成功快照允许更新记录。
Pre-flight: 任务 3 AppState 被任务 4/5 消费；任务 4 时间工具与导出逻辑由页面和后台共用。
任务 1：进行中。先写语言行为测试，再实现独立扩展外壳。

Ruling: 采用 Entry 联合记录和共享工具模块，替代计划中的多个薄模块；减少重复接口，代价是页面模块较集中。
任务 1-5：已实现并通过类型检查、24项测试和浏览器开发预览交互检查；真实扩展验证不据此标记完成。
Final: fixed Learn partial read retention, clear/restore sync fencing, account overlay cleanup, linked target disappearance, zero-minute reminders, invalid backup dates. Regression tests observed failing then passing; final suite 24/24.
Final: Crowdmark now receives Learn course context and maps matched course IDs back to codes. Real endpoint validation still pending.
Final: minor (deferred): five-minute reminder catch-up window; detailed before/after change notification.
任务 6：用户确认已加载插件。浏览器工具禁止 edge://extensions，用户手动安装和刷新；真实扩展消息与平台同步待用户打开完整面板后验证。

2026-10-10 用户要求首屏连接四个平台，并指出旧UI塑料感和衔接问题。
改为连接四来源→同步内容确认→工作台的显式三步流程；窄侧栏顶部始终可达完整页入口。统一纸白、暖灰、墨黑、少量金色，减少圆角卡片和大块绿色。
新增重启提醒只补最近档，重复offset去重；测试先失败后通过。
类型检查与28项测试通过；浏览器开发预览验证四连接进度、确认页、中英文、工作台切换和390px无横向溢出。生产平台同步仍待用户刷新新版后验证。


## 0.3.0 — 2026-10-10
Crowdmark rendered-page reader with stable-row readiness, prior-ID reuse, course-term gradebook, CSV and light palette. 35 tests/typecheck/build passed. Official DOM inspected; real extension refresh awaiting user reload; CSV browser-download check timed out. Desktop folder updated.


## 0.3.1 — sync reliability
User reported recurrent frame removal and persisted CS135 busy state after one success. API-first Crowdmark based on attributed WATnow transport, bounded frame retry, public worker CS135 HTML reader, recovery after worker restart, refresh on opening. 42 tests/typecheck/build passed; production user reload verification pending.


## 0.3.2
Removed DOM account gate that blocked upstream API reads. Restored byte-identical WATnow Crowdmark reader + bridge; ported optional registration/message relay, commits connection before supplemental grades. Typecheck and 44 tests passed; real extension verification pending.
