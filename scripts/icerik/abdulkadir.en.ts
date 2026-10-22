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
    '4th-year Software Engineering student at Samsun University · Software team lead at Spectraloop Hyperloop',
  bio: [
    'I build end-to-end systems where hardware meets software: from STM32-based control software to OCR systems running in the field and AI models designed to run on microcontrollers.',
    'For three seasons I have led the 11-person software team of Spectraloop at TEKNOFEST Hyperloop. I work on STM32-based control software, CAN Bus and Modbus RTU communication, and fail-safe architectures. At the TEKNOFEST 2026 Hyperloop Development Competition, my team and I took 1st place in Türkiye in the Technology Demonstration category and 3rd place in both the Performance and Defined Problem Solving categories.',
    "During my internship at Samsun Teknopark, I built a field-validated line monitoring system that uses OCR to read the screens of production machines with no data output. As a co-founder of Kıyı Medya, I run the agency's software unit and build corporate websites end to end, from design to launch.",
    'My goal is to ship end-to-end products by bringing together embedded systems, edge AI, and full-stack development.',
  ].join('\n\n'),
  location: 'Samsun, Türkiye',
  availability: 'Open to internships, roles and projects · Graduating 2027',
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
    ],
  ],
  [
    'BACKEND',
    ['FastAPI', 'Flask', 'Node.js', 'Express', 'tRPC', 'Prisma', 'SQLAlchemy', 'ASP.NET Core'],
  ],
  ['DATABASE', ['PostgreSQL', 'MongoDB', 'SQLite', 'Redis']],
  ['FRONTEND', ['React', 'Next.js', 'HTML / CSS']],
  ['MOBILE', ['Mobile app development']],
  ['TOOLING', ['Git / GitHub', 'Linux', 'systemd', 'GStreamer', 'WebSocket', 'Claude Code']],
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
      'I have led the 11-person software team for 3 seasons, coordinating the subsystem groups (sensors, CAN, navigation, BMS, real-time control, telemetry) and the Technical Design Report process. I developed the STM32 firmware that drives two Delta MS300 VFDs over Modbus RTU on a single RS-485 line.',
  },
  {
    type: 'WORK',
    organization: 'Adapha Yapay Zeka Ar-Ge ve Yazılım A.Ş. (Samsun Teknopark)',
    role: 'Intern',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description:
      'JWC Line Monitoring System: a Raspberry Pi 5 field device and a GStreamer video pipeline, with RapidOCR / ONNX Runtime on ARM reading all 6 fields in the field at 99%+ confidence; a FastAPI-based event engine and OEE calculation.',
  },
  {
    type: 'WORK',
    organization: 'Kıyı Medya — 360° digital agency',
    role: 'Co-Founder & Head of Software',
    startDate: '2024-09-01',
    current: true,
    description:
      'I was part of founding the agency and run its software unit; the agency has delivered more than 500 projects to more than 50 companies. I built 5 corporate websites end to end and am leading the development of a mobile app.',
  },
  {
    type: 'WORK',
    organization: 'SEA STARS Team — TEKNOFEST Unmanned Underwater Systems',
    role: 'Software Team Lead',
    startDate: '2024-01-01',
    current: true,
    description:
      'I lead the team developing the mission software for an autonomous underwater vehicle: serial communication between Jetson Nano, STM32, and Arduino, plus YOLO / TensorFlow-based object detection.',
  },
  {
    type: 'WORK',
    organization: 'TesisBul.com',
    role: 'Founder',
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    description:
      'I built an online booking platform for venues and facilities from scratch, and ran marketing and field outreach targeting more than 100 businesses in about 20 cities.',
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
    description: 'Expected graduation: June 2027.',
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
    startDate: '2026-09-01',
    description: 'Spectraloop',
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
- **Team management:** I split the 11-person team into 6 subsystem groups (sensors, CAN, navigation, BMS, RTOS, telemetry) and coordinated the Technical Design Report process.

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
    title: 'İSÇEV — Enterprise Business Management Platform',
    summary:
      'An enterprise business management platform built with Next.js, tRPC, and Prisma: RBAC, an immutable audit trail, AES-256-GCM field encryption, and BullMQ queues.',
    tags: ['Full-stack', 'Enterprise'],
    stack: ['Next.js', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ'],
    featured: true,
    content: `## Scope

A web platform that brings an organization's business processes together in a single dashboard. Built with Next.js, TypeScript, tRPC, and Prisma (PostgreSQL, Redis).

## Security

- Role-based access control (**RBAC**)
- **Immutable audit trail**
- Field-level encryption with **AES-256-GCM**

## Infrastructure

- BullMQ-based email notification queues

## Development process

Development runs on a workflow built around orchestrating multiple AI agents.
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
    stack: [],
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
    stack: [],
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
    stack: [],
    liveUrl: 'https://askarmedikal.com',
    clientName: 'Askar Medikal',
    featured: false,
    content: `## Project

A corporate website for a medical device supplier. Built end to end, from design to launch, through Kıyı Medya.
`,
  },
  {
    slug: 'tesisbul',
    translationKey: 'tesisbul',
    period: '2024 – 2025',
    title: 'TesisBul.com — Online Booking Platform',
    summary:
      'An online booking platform for venues and facilities that I built from scratch, backed by field and marketing outreach to more than 100 businesses in about 20 cities.',
    tags: ['Startup', 'Booking'],
    stack: [],
    featured: false,
    content: `## The startup

A startup I founded and ran from June 2024 to February 2025. I built its online booking platform for venues and facilities from scratch.

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
      'End to end, from design to launch: fast, search-engine-friendly corporate websites with content managed from an admin panel. Five corporate websites have been delivered this way with Kıyı Medya.',
  },
  {
    title: 'Web application & admin panel',
    description:
      'Enterprise platforms with role-based permissions, audit trails, and workflows, plus purpose-built applications such as booking and business management systems. Built with Next.js, TypeScript, and PostgreSQL.',
  },
  {
    title: 'Mobile app',
    description:
      'The full mobile app development process, from idea to app store — requirements, design, development, and release. Delivered through Kıyı Medya.',
  },
];
