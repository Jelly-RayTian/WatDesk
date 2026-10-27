# Third-party notices

WatDesk is an independent application. The two platform reader modules below are reused under the MIT License from EricJujianZou/watnow, commit 5b9f419de70fb52c61e082124cfa03d3f2532014:

- src/vendor/watnow/data/live-source.js
- src/vendor/watnow/data/crowdmark-source.js
- src/vendor/watnow/content/crowdmark-bridge.js

The original license is preserved at src/vendor/watnow/LICENSE. The schools.js shim in that directory is written for WatDesk and restricts the reader to Waterloo. These readers are research-derived integrations with undocumented platform behavior; no claim of official affiliation is made.

WatDesk UI, core data model, storage, calendar, reminders, Odyssey and CS135 parsers are independently implemented. Standard npm dependencies retain their own licenses. Design guidance: taste-skill (local installation) and emilkowalski/skills, https://github.com/emilkowalski/skills .

0.3.2 restores crowdmark-source.js byte-for-byte from the referenced upstream revision and adds its unmodified crowdmark-bridge.js. Optional script registration and tab relay in crowdmark-bridge.ts follow upstream background.js. WatDesk adapts returned records to its own data model. Historical rendered-score enrichment runs after the upstream connection result.

Figtree font: Copyright 2022 The Figtree Project Authors. SIL Open Font License 1.1; see fonts/OFL.txt in the extension. Distributed unchanged, sourced from WATnow's bundled font files.

## PDF.js

PDF text extraction uses Mozilla PDF.js (`pdfjs-dist` 6.4.299), licensed under Apache-2.0. The library and matching worker are bundled locally; the package includes `PDFjs-LICENSE.txt`. Source: https://github.com/mozilla/pdf.js .
