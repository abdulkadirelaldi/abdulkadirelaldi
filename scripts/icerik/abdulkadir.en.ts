/**
 * ENGLISH (en-US) TRANSLATION of `./abdulkadir.ts` — the site's real content.
 * Exports the same names with the same shapes so the loader can swap them in.
 *
 * RULES
 *   - `translationKey` of every project = the Turkish record's `slug` (ADR-046);
 *     the language switcher and hreflang pair records through it.
 *   - NO new claims: every number, date, ranking, team size and name is taken
 *     verbatim from the Turkish source. Only the prose is translated.
 *   - Technology and proper names (Spectraloop, Kıyı Medya, İSÇEV, TesisBul,
 *     company legal names) stay as they are; `stack`, `liveUrl`, `clientName`
 *     and `featured` are identical to the Turkish records.
 */

import { PROFIL as PROFIL_TR, type Deneyim, type Kategori, type Proje } from './abdulkadir';

export const PROFIL = {
  headline: 'Embedded Systems · AI · Full-Stack',
  subtitle:
    'Software Engineering at Samsun University · Software team lead at Spectraloop Hyperloop · Co-founder of Kıyı Medya',
  bio: [
    'I build end-to-end systems where hardware meets software: from STM32-based control software to OCR systems running in the field and AI models designed to run on microcontrollers.',
    'For three seasons I have led the software team of Spectraloop at TEKNOFEST Hyperloop. I work on STM32-based control software, CAN Bus and Modbus RTU communication, and fail-safe architectures. At the TEKNOFEST 2026 Hyperloop Development Competition, my team and I took 1st place in Türkiye in the Technology Demonstration category and 3rd place in both the Performance and Defined Problem Solving categories.',
    "During my internship at Samsun Teknopark, I built a field-validated line monitoring system that uses OCR to read the screens of production machines with no data output. As a co-founder of Kıyı Medya, I run the agency's software unit and build corporate websites end to end, from design to launch.",
    'My goal is to ship end-to-end products by bringing together embedded systems, edge AI, and full-stack development.',
  ].join('\n\n'),
  location: 'Samsun, Türkiye',
  availability: 'Open to internships, roles and projects · Graduating 2028',
  socials: PROFIL_TR.socials,
} as const;

const YETENEK_GRUPLARI: [Kategori, string[]][] = [
  ['LANGUAGE', ['C', 'C++', 'Python', 'TypeScript', 'JavaScript', 'C#']],
  [
    'EMBEDDED',
    [
      'STM32 (HAL)',
      'Raspberry Pi 5',
      'Jetson Nano',
      'Arduino',
      'CAN Bus',
      'Modbus RTU / RS-485',
      'UART',
      'I²C',
      'Interrupts & Watchdog',
    ],
  ],
  [
    'AI',
    [
      'OCR (RapidOCR / PaddleOCR)',
      'OpenCV',
      'YOLO',
      'TensorFlow',
      'scikit-learn',
      'ONNX Runtime',
      'TinyML',
      'LLM integration (Gemini, Anthropic)',
    ],
  ],
  [
    'BACKEND',
    ['FastAPI', 'Flask', 'Node.js', 'Express', 'tRPC', 'Prisma', 'SQLAlchemy', 'ASP.NET Core'],
  ],
  ['DATABASE', ['PostgreSQL', 'MongoDB', 'SQLite', 'Redis']],
  ['FRONTEND', ['React', 'Next.js', 'HTML / CSS']],
  ['MOBILE', ['Mobile app development', 'React Native']],
  [
    'TOOLING',
    ['Git / GitHub', 'Linux', 'systemd', 'GStreamer', 'WebSocket', 'Playwright', 'Claude Code'],
  ],
];

/** No levels in the source documents — not shown on the site; editable in the panel. */
const VARSAYILAN_SEVIYE = 80;

export const YETENEKLER = YETENEK_GRUPLARI.flatMap(([category, adlar]) =>
  adlar.map((name) => ({ name, category, level: VARSAYILAN_SEVIYE })),
).map((yetenek, i) => ({ ...yetenek, order: i + 1 }));

export const DENEYIMLER: Deneyim[] = [
  // ---------------------------------------------------------------- WORK ---
  {
    type: 'WORK',
    organization: 'Spectraloop Technology Team — TEKNOFEST Hyperloop',
    role: 'Software Architect & Team Lead',
    startDate: '2023-11-01',
    current: true,
    description:
      'I have led the software team for 3 seasons, coordinating the subsystem groups (sensors, CAN, navigation, BMS, real-time control, telemetry) and the Technical Design Report process; in 2026 the report placed 1st with a score of 468.5 out of 500. I developed the STM32 firmware that drives two Delta MS300 VFDs over Modbus RTU on a single RS-485 line; the propulsion and braking systems were field-tested at the TÜBİTAK Gebze campus.',
  },
  {
    type: 'WORK',
    organization: 'Adapha Yapay Zeka Ar-Ge ve Yazılım A.Ş. (Samsun Teknopark)',
    role: 'Intern',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description:
      'Two end-to-end projects: (1) JWC Line Monitoring System — a Raspberry Pi 5 field device and a GStreamer video pipeline, with RapidOCR / ONNX Runtime on ARM reading all 6 fields in the field at 99%+ confidence; a FastAPI event engine and real-time OEE pushed over WebSocket to React Native dashboards. (2) Radar — a cloud-based lead screening and audit system that analyzes and reports on business accounts: async FastAPI, PostgreSQL, Redis, Playwright, and Next.js, with deterministic rules backed by a two-stage LLM (Anthropic).',
  },
  {
    type: 'WORK',
    organization: 'Kıyı Medya — 360° digital agency',
    role: 'Co-Founder & Head of Software',
    startDate: '2024-09-01',
    current: true,
    description:
      "I was part of founding the agency and run its software unit; the agency has delivered more than 500 projects to more than 50 companies. I built the agency's corporate websites end to end (İSÇEV Arıtma, Aşkar Medikal, Costman, İlkadım Hearing Aids, CRP Project and others) and am leading the development of a mobile app.",
  },
  {
    type: 'WORK',
    organization: 'SEA STARS Team — TEKNOFEST Unmanned Underwater Systems',
    role: 'Software Team Lead',
    startDate: '2024-09-01',
    endDate: '2026-09-30',
    description:
      'I led the team developing the mission software for an autonomous underwater vehicle: serial communication between Jetson Nano, STM32, and Arduino, plus YOLO / TensorFlow-based object detection. The TEKNOFEST 2026 Critical Design Report stage was completed with a score of 83.1.',
  },
  {
    type: 'WORK',
    organization: 'TesisBul.com',
    role: 'Founder & CEO',
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    description:
      'I built from scratch a platform for booking sports facilities such as artificial-turf football pitches online, with or without prepayment, and was responsible for how the product operated and its strategic development. I ran marketing and field outreach targeting more than 100 businesses in about 20 cities.',
  },
  {
    type: 'WORK',
    organization: 'Provezza Team — TEKNOFEST Unmanned Underwater Systems',
    role: 'Software Team Lead',
    startDate: '2021-01-01',
    endDate: '2021-12-31',
    description:
      'In high school, I led the software team of an autonomous underwater vehicle; using Jetson Nano, Arduino, STM32, and YOLO / TensorFlow, we became TEKNOFEST finalists.',
  },
  // ----------------------------------------------------------- EDUCATION ---
  {
    type: 'EDUCATION',
    organization: 'Samsun University',
    role: 'B.S. in Software Engineering — 4th year',
    startDate: '2023-10-01',
    current: true,
    description: 'Expected graduation: June 2028.',
  },
  {
    type: 'EDUCATION',
    organization: 'Atatürk University',
    role: 'Faculty of Law (Undergraduate)',
    startDate: '2022-01-01',
    endDate: '2023-12-31',
    description:
      'Transferred to Software Engineering at Samsun University under the Additional Article 1 transfer provision.',
  },
  {
    type: 'EDUCATION',
    organization: 'Deneyap Technology Workshops',
    role: 'Graduate',
    startDate: '2019-01-01',
    endDate: '2022-12-31',
    description:
      'Robotic coding, mobile apps, nanotechnology and materials science, and design and manufacturing.',
  },
  // -------------------------------------------------------------- AWARDS ---
  {
    type: 'AWARD',
    role: '1st place in Türkiye',
    organization: 'TEKNOFEST 2026 Hyperloop Development Competition · Technology Demonstration',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '3rd place in Türkiye',
    organization: 'TEKNOFEST 2026 Hyperloop Development Competition · Performance',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '3rd place in Türkiye',
    organization: 'TEKNOFEST 2026 Hyperloop Development Competition · Defined Problem Solving',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '1st place, Technical Design Report',
    organization: 'TEKNOFEST 2026 Hyperloop · Performance Category Technical Design Report',
    startDate: '2026-06-01',
    description: 'Spectraloop · 468.5/500',
  },
  {
    type: 'AWARD',
    role: 'Mechanical System Development Award',
    organization: 'TEKNOFEST 2025 Hyperloop Development Competition · Finalist',
    startDate: '2025-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '1st place in Samsun',
    organization: 'TUA Astro Hackathon · CubeSat',
    startDate: '2024-01-01',
    description: 'Team Captain',
  },
  {
    type: 'AWARD',
    role: '1st place',
    organization: 'Deneyap Technology Festival · Robotic Coding, Erzurum',
    startDate: '2021-01-01',
    description: 'Team Captain',
  },
  {
    type: 'AWARD',
    role: 'Finalist',
    organization: 'TEKNOFEST 2021 Unmanned Underwater Systems Competition',
    startDate: '2021-09-01',
    description: 'Provezza · Software Team Lead',
  },
  // --------------------------------------------------------- CERTIFICATES ---
  // Source: LinkedIn "Licenses & certifications" (2026-10-23) + TEI certificate
  // of participation (LinkedIn post, June 2026). Date = month issued.
  {
    type: 'CERTIFICATE',
    role: 'TEKNOFEST Hyperloop Development Competition Finalist',
    organization: 'TEKNOFEST',
    startDate: '2025-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'ASP.NET Core Web API Training',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'ASP.NET Core MVC Training',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Introduction to Web Services Training',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Object-Oriented Programming with Applications Training',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Entrepreneurship Training',
    organization: 'KOSGEB',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Aviation Engines School (6th Cohort)',
    organization: 'TEI — TUSAŞ Engine Industries',
    startDate: '2026-06-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Volunteer Staff Certificate of Appreciation',
    organization: 'TEKNOFEST',
    startDate: '2023-04-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Unmanned Underwater Systems Competition Participation Certificate',
    organization: 'TEKNOFEST',
    startDate: '2021-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Mobile App Development Training',
    organization: 'Deneyap Türkiye',
    startDate: '2022-05-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Nanotechnology and Materials Science Training',
    organization: 'Deneyap Türkiye',
    startDate: '2022-02-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Robotic Coding Training',
    organization: 'Deneyap Türkiye',
    startDate: '2019-12-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Design and Manufacturing Training',
    organization: 'Deneyap Türkiye',
    startDate: '2019-09-01',
  },
  // -------------------------------------------------------------- SPORTS ---
  // Source: site owner (2026-10-23). Single date = RESULT, range = TEAM.
  {
    type: 'SPORT',
    role: 'Champion',
    organization: 'Erzurum Inter-Primary School Sports Festival',
    startDate: '2013-01-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: 'Medal',
    organization: 'Erzurum',
    startDate: '2014-01-01',
    description: 'Figure skating',
  },
  {
    type: 'SPORT',
    role: 'Champion',
    organization: 'Yıldızkent, youth category',
    startDate: '2015-01-01',
    description: 'Football',
  },
  {
    type: 'SPORT',
    role: '3rd place',
    organization: 'Inter-Middle School Tournament',
    startDate: '2016-01-01',
    description: 'Table tennis',
  },
  {
    type: 'SPORT',
    role: 'Champion',
    organization: 'Turkish Tennis Federation · Batman Eastern League',
    startDate: '2018-01-01',
    description: 'Tennis',
  },
  {
    type: 'SPORT',
    role: '2nd place',
    organization: 'Inter-High School Tournament',
    startDate: '2019-01-01',
    description: 'Tennis',
  },
  {
    type: 'SPORT',
    role: '1st place',
    organization: 'Samsun University · 2023–2024 Spring Semester Tournament',
    startDate: '2024-03-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '1st place',
    organization: 'Samsun University · 2024–2025 Fall Semester Tournament',
    startDate: '2024-10-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '3rd place (Captain)',
    organization: 'Samsun University · 2024–2025 Spring Semester Tournament',
    startDate: '2025-03-01',
    description: 'Football',
  },
  {
    type: 'SPORT',
    role: '2nd place',
    organization: 'Samsun University · 2024–2025 Spring Semester Tournament',
    startDate: '2025-03-02',
    description: 'Beach volleyball',
  },
  {
    type: 'SPORT',
    role: '1st place',
    organization: 'Samsun University · 2025–2026 Fall Semester Tournament',
    startDate: '2025-10-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '1st place',
    organization: 'Samsun University · 2025–2026 Spring Semester Tournament',
    startDate: '2026-03-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: 'Captain',
    organization: 'Erzurum Nevzat Karabağ Anatolian High School Volleyball Team',
    startDate: '2019-09-01',
    endDate: '2020-06-30',
  },
  {
    type: 'SPORT',
    role: 'Player',
    organization: 'Atatürk University Faculty of Law Football Team',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
  {
    type: 'SPORT',
    role: 'Player',
    organization: 'Atatürk University Faculty of Law Volleyball Team',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum Altın Patenler Skating Club',
    startDate: '2011-01-01',
    endDate: '2014-12-31',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum Harb-İş Football Club',
    startDate: '2012-01-01',
    endDate: '2012-12-31',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum Olimpik Adımlar Football Club',
    startDate: '2013-01-01',
    endDate: '2013-12-31',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum TRT Sports Club',
    startDate: '2014-01-01',
    endDate: '2017-12-31',
    description: 'Football',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum Gençlik ve Spor Tennis Club',
    startDate: '2016-01-01',
    endDate: '2019-12-31',
  },
  {
    type: 'SPORT',
    role: 'Player',
    organization: 'Erzurum Saltukbey Middle School Futsal Team',
    startDate: '2016-01-01',
    endDate: '2016-12-31',
  },
  {
    type: 'SPORT',
    role: 'Athlete',
    organization: 'Erzurum Gençlik ve Spor Volleyball Club',
    startDate: '2018-01-01',
    endDate: '2020-12-31',
  },
  {
    type: 'SPORT',
    role: 'Player',
    organization: 'Samsun University Faculty of Engineering Volleyball Team',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
  {
    type: 'SPORT',
    role: 'Player',
    organization: 'Samsun University Software Engineering Football Team',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
];

export const PROJELER: Proje[] = [
  {
    slug: 'spectraloop-hyperloop',
    translationKey: 'spectraloop-hyperloop',
    period: '2023 – present',
    title: 'Spectraloop — Hyperloop Pod Control Software',
    summary:
      'STM32-based control software for a TEKNOFEST Hyperloop pod: CAN Bus, linear motor drive over Modbus RTU, and a fail-safe architecture. 1st place in Türkiye in the Technology Demonstration category in 2026.',
    tags: ['Embedded', 'Team leadership', 'TEKNOFEST'],
    stack: ['STM32', 'CAN Bus', 'Modbus RTU', 'RS-485', 'I²C', 'Watchdog', 'React', 'WebSocket'],
    featured: true,
    content: `## Problem

A pod propelled by a linear motor has to communicate reliably under heavy EMI, know its position and speed accurately, and fall back to a safe state on any fault.

## My contribution

- **Linear motor drive:** I developed the STM32 firmware that drives two Delta MS300 VFDs over **Modbus RTU** on a single RS-485 line (9600 baud, 8N1, slaves 1 and 2): forward/reverse/stop control words and frequencies up to 150 Hz. I ported the code from the STM32F407 to the Nucleo-F401RE.
- **Field validation:** I verified the VFD parameters (frequency and run-command source set to RS-485, upper frequency limit) through on-site testing. I added a Python serial↔WebSocket bridge and a live control panel.
- **Team management:** I split the software team into 6 subsystem groups (sensors, CAN, navigation, BMS, RTOS, telemetry) and coordinated the Technical Design Report process.

## What we built as a team

- **CAN Bus** between master and slave STM32s; twisted-pair cabling + 120 Ω termination for EMI resilience
- BNO055 IMU (I²C) + dual Omron optical sensors, with position cross-checked via hardware interrupts
- Fail-safe behavior with a hardware **Watchdog**; a CAN-based BMS with 24 slaves for the 144S battery
- React + Node.js + WebSocket ground station

## Results — TEKNOFEST 2026

| Category | Ranking |
| --- | --- |
| Technology Demonstration | 1st place in Türkiye |
| Performance | 3rd place in Türkiye |
| Defined Problem Solving | 3rd place in Türkiye |
| Performance — Technical Design Report | 1st place |
`,
  },
  {
    slug: 'jwc-line-monitoring',
    translationKey: 'jwc-hat-izleme',
    period: '2026',
    title: 'JWC Line Monitoring System — Production Data from the Screen',
    summary:
      'A field-validated line monitoring system that uses OCR on a Raspberry Pi 5 to read the screens of production machines with no data output: 6/6 fields at 99%+ confidence, and a 90-second stoppage measured at 88 seconds.',
    tags: ['AI', 'OCR', 'Industrial'],
    stack: [
      'Raspberry Pi 5',
      'GStreamer',
      'RapidOCR',
      'ONNX Runtime',
      'FastAPI',
      'SQLAlchemy',
      'WebSocket',
    ],
    clientName: 'Adapha Yapay Zeka Ar-Ge (Samsun Teknopark) — internship',
    featured: true,
    content: `## Problem

The factory's machines showed their production counters only on the operator screen; there was no PLC output, database, or report file. Nobody knew how many minutes of downtime had occurred by the end of a shift.

## Solution

- **Field device:** HDMI → USB capture → Raspberry Pi 5. A GStreamer \`tee\` splits the video in two: one branch goes uninterrupted to the operator screen, the other to OCR. Only the extracted values go over the network, not frames (a few hundred bytes per second).
- **OCR engine chosen by measurement:** Cloud OCR (Mistral) was ruled out due to latency, cost, and data privacy. PaddleOCR and RapidOCR use the same model; RapidOCR (ONNX) was chosen because it installed cleanly on ARM. The *small* model matches the *medium* model's accuracy and is 3.7× faster.
- **Event engine:** A state machine turns raw readings into events: stoppage, model changeover, counter reset, quality alert, and signal loss. Stoppages are backdated to the moment the counter last incremented, and OEE is calculated from the output.
- **Validation:** The quality rate read from the screen is checked against the good/total calculation; readings that don't match are rejected.

## Field results

| Validated capability | Result |
| --- | --- |
| OCR reading of 6 fields | 6/6 correct, 99%+ confidence score |
| Stoppage detection | Actual 90 s → measured 88 s |
| Outage resilience | 38 pending readings restored from disk |
| Model changeover / counter reset | Caught in both directions |
`,
  },
  {
    slug: 'predictive-edge',
    translationKey: 'predictive-edge',
    title: 'Predictive-Edge — Predictive Maintenance on a Microcontroller',
    summary:
      'A TinyML system that detects bearing faults in industrial motors early and estimates remaining useful life (RUL): a 289-parameter (~1.1 KB) model that fits on an STM32H7. Capstone project.',
    tags: ['TinyML', 'Signal processing', 'Capstone project'],
    stack: ['Python', 'NumPy', 'scikit-learn', 'STM32H7', 'Flask', 'Chart.js'],
    featured: true,
    content: `## Approach

- **Physics-based features:** An FFT is taken of the 1 kHz vibration signal. Eight features, including harmonic ratio, spectral entropy, RMS, and peak-to-peak value, are extracted around the bearing outer-race fault frequency (BPFO = 100 Hz) and its harmonics; temperature and current are fed into the model as well.
- **Model chosen by embedded constraints:** Logistic Regression, Random Forest, SVM, Gradient Boosting, and MLP performed almost identically (F1 ≈ 0.99). Memory and inference cost decided the choice.
- **Methodology:** GridSearchCV and 5-fold cross-validation. The scaler lives inside the Pipeline, so there is no data leakage. Since the difference between (32,16) and (16,8) was within one standard deviation, the 3× smaller (16,8) was chosen.
- **Embedded target:** 289 parameters ≈ 1.1 KB (float32) — a tiny fraction of the STM32H7's 2 MB of Flash; int8 quantization brings it down to 289 B.
- **Monitoring dashboard:** Health status and remaining useful life for a fleet of 200 motors, via a Flask REST API + Chart.js.

## By the numbers

| Metric | Value |
| --- | --- |
| F1 (synthetic data) | 0.99 |
| Parameters | 289 |
| Model size | ~1.1 KB (float32) · 289 B (int8) |

## Limitations and next steps

The dataset is synthetic, generated from a physical fault model. Running the model on an actual STM32 board and validating it with real sensor data is in progress.
`,
  },
  {
    slug: 'iscev-business-management-platform',
    translationKey: 'iscev-is-yonetim-platformu',
    period: '2026',
    title: 'İSÇEV — Enterprise Business Management Platform',
    summary:
      "A management platform I built from scratch that brings a water treatment company's quotes, projects, purchasing, field work, finance, accounting and service processes into a single panel. 43 data models, 245 automated tests.",
    tags: ['Full-stack', 'Enterprise software', 'Security'],
    stack: ['Next.js', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ', 'Auth.js'],
    featured: true,
    content: `## Problem

A company that builds water treatment plants on a project basis and runs purchasing, service and maintenance was managing its processes across scattered tools. The goal was to manage every step — from the quote to project handover — in a single, auditable system.

## Workflow

Account (customer / supplier) → revisioned quote → "Convert to project" → work plan and phases → requirements list → purchasing (supplier quote comparison) → instalments and collections → finance and accounting → closing the project with the delivery invoice.

## Modules

- **Accounts:** customer and supplier records, account statements, bulk import from Excel
- **Quotes:** revision history, VAT options, multi-currency pricing at the Central Bank of Türkiye rate, printable output
- **Projects:** work plan, requirements list, purchasing, instalments and per-project profit / loss
- **Work:** Kanban board, assignment, time tracking and a work calendar
- **Finance:** cash, bank accounts, loans and credit cards, budget plan vs. actuals
- **Accounting:** invoices, receipts, recurring invoices and ledger entries
- **Service & maintenance:** service contracts, visits and maintenance plans
- **Customer portal:** a link that lets customers follow their project without logging in
- **Notifications:** in-app, Web Push (PWA) and email; live stream and daily reminders

## Security and data integrity

- Permission-based role management (**RBAC**) and **TOTP two-factor authentication**
- **AES-256-GCM** encryption of sensitive fields at the application layer
- An **immutable audit log** enforced by database triggers; every money transaction is audited
- **Row Level Security**, rate limiting, CSRF protection and schema validation on every input
- Lossless money arithmetic at cent precision; user anonymisation for data protection (KVKK)

## Numbers

| Measure | Value |
| --- | --- |
| Data models | 43 |
| Pages | 46 |
| Automated tests | 245 (unit, integration, Playwright end-to-end) |
| Database migrations | 55 |

On every change, the CI pipeline runs lint, type checking, unit and integration tests, a migration drift check and a production build.
`,
  },
  {
    slug: 'kiyi-medya-corporate-website',
    translationKey: 'kiyi-medya-kurumsal-site',
    commercial: true,
    title: 'Kıyı Medya — Corporate Website',
    summary:
      'The corporate website of the 360° digital agency I co-founded — built end to end, from design to launch.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['React'],
    liveUrl: 'https://kiyimedya.com',
    clientName: 'Kıyı Medya',
    featured: false,
    content: `## Kıyı Medya

A 360° digital agency that I helped found and whose software unit I run. The agency has delivered more than 500 projects to more than 50 companies.

I built the agency's corporate website end to end, from design to launch.
`,
  },
  {
    slug: 'iscev-aritma-corporate-website',
    translationKey: 'iscev-aritma-kurumsal-site',
    commercial: true,
    title: 'İSÇEV Arıtma — Corporate Website',
    summary:
      'A corporate website for a water treatment and environmental technology company — delivered through Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Vite'],
    liveUrl: 'https://iscevaritma.com.tr',
    clientName: 'İSÇEV Arıtma',
    featured: false,
    content: `## Project

A corporate website for a company working in industrial wastewater treatment and environmental technology. Built end to end, from design to launch, through Kıyı Medya.
`,
  },
  {
    slug: 'askar-medikal-corporate-website',
    translationKey: 'askar-medikal-kurumsal-site',
    commercial: true,
    title: 'Askar Medikal — Corporate Website',
    summary: 'A corporate website for a medical device supplier — delivered through Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Next.js'],
    liveUrl: 'https://askarmedikal.com',
    clientName: 'Askar Medikal',
    featured: false,
    content: `## Project

A corporate website for a medical device supplier. Built end to end, from design to launch, through Kıyı Medya.
`,
  },
  {
    slug: 'costman-corporate-website',
    translationKey: 'costman-kurumsal-site',
    commercial: true,
    title: 'Costman — Corporate Website',
    summary:
      'Corporate website for a brand that provides cost consulting to restaurants, cafés and bars — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Vite'],
    liveUrl: 'https://mrcostman.com',
    clientName: 'Costman',
    featured: false,
    content: `## Project

Corporate website for a brand that provides cost consulting to restaurants, cafés and bars. Built end to end at Kıyı Medya, from design to launch.
`,
  },
  {
    slug: 'ilkadim-hearing-aids-website',
    translationKey: 'ilkadim-isitme-cihazlari-site',
    commercial: true,
    title: 'İlkadım Hearing Aids — Corporate Website',
    summary: 'Corporate website for a hearing aid centre — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Vite'],
    liveUrl: 'https://ilkadimisitmecihazlari.com',
    clientName: 'İlkadım İşitme Cihazları',
    featured: false,
    content: `## Project

Corporate website for a hearing aid centre. Built end to end at Kıyı Medya, from design to launch.
`,
  },
  {
    slug: 'crp-project-corporate-website',
    translationKey: 'crp-project-kurumsal-site',
    commercial: true,
    title: 'CRP Project — Corporate Website',
    summary:
      'Corporate website for a café and restaurant management consulting brand — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Vite'],
    liveUrl: 'https://crpproject.com',
    clientName: 'CRP Project',
    featured: false,
    content: `## Project

Corporate website for a café and restaurant management consulting brand. Built end to end at Kıyı Medya, from design to launch.
`,
  },
  {
    slug: 'spectraloop-team-website',
    translationKey: 'spectraloop-tanitim-sitesi',
    commercial: true,
    title: 'Spectraloop — Team Website',
    summary: 'Website for the Spectraloop student technology team — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: ['Next.js'],
    liveUrl: 'https://spectraloop.com.tr',
    clientName: 'Spectraloop',
    featured: false,
    content: `## Project

Website for the student technology team Spectraloop. Built end to end at Kıyı Medya, from design to launch.
`,
  },
  {
    slug: 'dna-environment-treatment-website',
    translationKey: 'dna-cevre-aritma-site',
    commercial: true,
    title: 'DNA Çevre ve Arıtma — Corporate Website',
    summary:
      'Redesigned corporate website for an Ankara-based water treatment company — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: [],
    clientName: 'DNA Çevre ve Arıtma',
    featured: false,
    content: `## Project

Redesigned corporate website for an Ankara-based water treatment company. Built at Kıyı Medya.
`,
  },
  {
    slug: 'yay-grup-water-treatment-website',
    translationKey: 'yay-grup-su-aritma-site',
    commercial: true,
    title: 'Yay Grup Water Treatment — Corporate Website',
    summary: 'Corporate website for a water and wastewater treatment brand — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: [],
    clientName: 'Yay Grup',
    featured: false,
    content: `## Project

Corporate website for a water and wastewater treatment brand. Built at Kıyı Medya.
`,
  },
  {
    slug: 'yay-grup-metal-processing-website',
    translationKey: 'yay-grup-metal-isleme-site',
    commercial: true,
    title: 'Yay Grup Metal Processing — Corporate Website',
    summary:
      'Corporate website for a laser cutting and sheet metal processing brand — built at Kıyı Medya.',
    tags: ['Corporate website', 'Kıyı Medya'],
    stack: [],
    clientName: 'Yay Grup',
    featured: false,
    content: `## Project

Corporate website for a laser cutting and sheet metal processing brand. Built at Kıyı Medya.
`,
  },
  {
    slug: 'tesisbul',
    translationKey: 'tesisbul',
    period: '2024 – 2025',
    title: 'TesisBul.com — Sports Facility Booking Platform',
    summary:
      'A platform I built from scratch for booking sports facilities such as artificial-turf football pitches online with prepayment, backed by field and marketing outreach to more than 100 businesses in about 20 cities.',
    tags: ['Startup', 'Booking'],
    stack: [],
    featured: false,
    content: `## The startup

A startup I founded and led as CEO from June 2024 to February 2025. I built from scratch a platform where users could book sports facilities such as artificial-turf football pitches quickly and securely before heading there, with or without prepayment, and I was responsible for how the product operated and its strategic development.

## In the field

I ran marketing and field outreach targeting more than 100 businesses in about 20 cities.
`,
  },
];

/**
 * SERVICES — commercial work delivered through Kıyı Medya (empty CTA → Kıyı Medya).
 * Same order and count as the Turkish `HIZMETLER`; every item is backed by real
 * work in the source documents.
 */
export const HIZMETLER = [
  {
    title: 'Corporate website',
    description:
      'End to end, from design to launch: fast, search-engine-friendly corporate websites with content managed from an admin panel. Websites for brands such as İSÇEV Arıtma, Aşkar Medikal, Costman and İlkadım Hearing Aids have been delivered this way with Kıyı Medya.',
  },
  {
    title: 'Web application & admin panel',
    description:
      'Enterprise platforms with role-based permissions, audit trails, and workflows, plus purpose-built applications such as booking and business management systems. Built with Next.js, TypeScript, and PostgreSQL.',
  },
  {
    title: 'Embedded systems & firmware',
    description:
      'STM32-based firmware, sensor integration and CAN Bus / Modbus RTU / RS-485 communication; field devices for image processing and data acquisition on Raspberry Pi and Jetson. The Hyperloop pod control software and the production line monitoring system were built this way.',
  },
  {
    title: 'Mobile app',
    description:
      'The full mobile app development process, from idea to app store — requirements, design, development, and release. Delivered through Kıyı Medya.',
  },
];
