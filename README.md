# WatDesk

**One calm desk for your Waterloo courses.** Deadlines, exams and grades from LEARN, Crowdmark and Odyssey in one Edge side panel, so you always know what is due next.

[**Download the latest version**](https://github.com/Jelly-RayTian/WatDesk/releases/latest) · Edge Add-ons: under review · [Report a problem](https://github.com/Jelly-RayTian/WatDesk/issues/new/choose) · [简体中文](README.zh-CN.md)

![WatDesk overview in the Liquid Glass style](docs/screenshots/overview-liquid-glass.jpg)

> Independent student project, not an official University of Waterloo product.

## What you get

- **One timeline** for assignments, quizzes and exams from LEARN, Crowdmark and Odyssey, grouped by day and filterable by course.
- **Two-week workload view** that shows which days are crowded before they arrive.
- **Exam page** with countdowns, room and seat, change alerts, and a course filter.
- **Grades** you can sort and estimate, with released scores kept separate from guesses.
- **Calendar, reminders and `.ics` export** so deadlines can live in your usual calendar.
- **Quiet sync**: reads in the background, never takes over your tabs, and keeps old data if a site is down.
- **English and 简体中文**, light and dark, and five looks including **Liquid Glass**.

## Install (about 3 minutes)

1. Download the ZIP from [Releases](https://github.com/Jelly-RayTian/WatDesk/releases/latest) and unzip it.
2. Open `edge://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the folder that contains `manifest.json`.
3. Pin WatDesk, click its icon to open the side panel, and connect LEARN, Crowdmark and Odyssey with your own accounts. Passwords and MFA stay on the original sites. You can start with one source and add the rest later.

**Updating:** export a backup in *Settings → My local data*, replace the files in your folder, then press **Reload** on the WatDesk card. Do not remove the extension; that deletes its local data.

## Courses it can read

| Source | What WatDesk reads |
|---|---|
| LEARN, Crowdmark, Odyssey | Deadlines, quizzes, released grades, submission status, exam time, room and seat |
| CS 135 (optional) | Course calendar, assignments, quizzes and submission records |
| CS 145, CS 240, CS 241 (optional) | Assignment deadlines and exam times from the course website |
| 22 more CS course sites (optional) | Link only, shown in *Course resources* |

Optional courses are off by default because not everyone takes them. Turn them on in *Settings → Sources → Add optional sources*. Dates read from a course website come with a "verify on the page" note, because those pages are written by hand and can change.

## Your data stays yours

- Academic data is stored in your own browser and is never uploaded to a WatDesk backend. No separate account is required.
- WatDesk never sees or stores your passwords, cookies or verification codes, and never submits anything for you.
- No ads. An anonymous "how many people use WatDesk" counter is available; it is **on by default and can be disabled in setup or Settings**, and the Settings page shows exactly what it sends.

Full details: [Privacy policy](PRIVACY.md).

## Questions

**Do I have to connect all three sites?** No. One is enough to start.

**Why does it open a tab sometimes?** If a page can only be read once rendered, WatDesk uses an inactive temporary tab and closes it afterwards.

**A date looks wrong.** Always check the original page. LEARN, Crowdmark and Odyssey can change what they publish; WatDesk keeps the last good data and tells you when a read failed.

**Can I use it on my phone?** It is an Edge desktop extension.

**Something broke.** [Open an issue](https://github.com/Jelly-RayTian/WatDesk/issues/new/choose). Please do not paste passwords, verification codes or private grades.

## More looks

<p>
<img src="docs/screenshots/overview-liquid-glass-dark.jpg" alt="Liquid Glass, dark" width="49%">
<img src="docs/screenshots/overview-forest.jpg" alt="Forest style" width="49%">
</p>

## For developers

Build, test and release notes are in [docs/DEVELOPING.md](docs/DEVELOPING.md). The long reference for every behaviour is [docs/GUIDE.md](docs/GUIDE.md). The optional usage counter's server lives in [stats-worker/](stats-worker/README.md).

WatDesk reuses two MIT-licensed readers from [WATnow](src/vendor/watnow/LICENSE); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
