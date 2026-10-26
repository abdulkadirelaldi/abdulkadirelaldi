/**
 * SİTENİN GERÇEK İÇERİĞİ — Almanca (de-DE) çevirisi: `./abdulkadir.ts`.
 *
 * KURALLAR
 *   - Aynı adlar, aynı biçim; yükleyici Türkçenin yerine koyabilsin.
 *   - `translationKey` = Türkçe kaydın `slug`'ı (dil seçici ve hreflang eşlemesi).
 *   - Yeni iddia, sayı ya da olgu YOK — her değer Türkçe kaynaktan.
 */

import { PROFIL as PROFIL_TR, type Deneyim, type Kategori, type Proje } from './abdulkadir';

export const PROFIL = {
  headline: 'Embedded-Software · Edge-KI · Full-Stack',
  subtitle:
    'Software Engineering an der Universität Samsun · Leiter des Softwareteams von Spectraloop Hyperloop · Mitgründer von Kıyı Medya',
  bio: [
    'Ich entwickle End-to-End-Systeme an der Schnittstelle von Hardware und Software: von STM32-basierter Steuerungssoftware über OCR-Systeme im Praxiseinsatz bis hin zu KI-Modellen, die auf Mikrocontrollern laufen.',
    'Seit drei Saisons leite ich beim TEKNOFEST Hyperloop das Softwareteam von Spectraloop. Ich arbeite an STM32-basierter Steuerungssoftware, CAN-Bus- und Modbus-RTU-Kommunikation sowie an Fail-safe-Architekturen. Mit meinem Team habe ich beim TEKNOFEST 2026 Hyperloop-Entwicklungswettbewerb in der Kategorie Technologiedemonstration den 1. Platz in der Türkei sowie in den Kategorien Performance und Lösung definierter Problemstellungen jeweils den 3. Platz belegt.',
    'Während meines Praktikums im Samsun Teknopark habe ich ein im Feld validiertes Linienüberwachungssystem entwickelt, das die Bildschirme von Produktionsmaschinen ohne Datenschnittstelle per OCR ausliest. Als Mitgründer von Kıyı Medya leite ich die Softwareabteilung der Agentur und entwickle Unternehmenswebsites durchgängig – vom Design bis zum Go-live.',
    'Mein Ziel ist es, Embedded-Systeme, KI auf Edge-Geräten und Full-Stack-Entwicklung zu verbinden und so Produkte von Anfang bis Ende zu realisieren.',
  ].join('\n\n'),
  location: 'Samsun, Türkei',
  availability: 'Offen für Praktika, Stellen und Projekte · Abschluss 2028',
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
      'LLM-Integration (Gemini, Anthropic)',
    ],
  ],
  [
    'BACKEND',
    ['FastAPI', 'Flask', 'Node.js', 'Express', 'tRPC', 'Prisma', 'SQLAlchemy', 'ASP.NET Core'],
  ],
  ['DATABASE', ['PostgreSQL', 'MongoDB', 'SQLite', 'Redis']],
  ['FRONTEND', ['React', 'Next.js', 'HTML / CSS']],
  ['MOBILE', ['Mobile-App-Entwicklung', 'React Native']],
  [
    'TOOLING',
    ['Git / GitHub', 'Linux', 'systemd', 'GStreamer', 'WebSocket', 'Playwright', 'Claude Code'],
  ],
];

/** Türkçedeki ile aynı — sitede gösterilmiyor. */
const VARSAYILAN_SEVIYE = 80;

export const YETENEKLER = YETENEK_GRUPLARI.flatMap(([category, adlar]) =>
  adlar.map((name) => ({ name, category, level: VARSAYILAN_SEVIYE })),
).map((yetenek, i) => ({ ...yetenek, order: i + 1 }));

export const DENEYIMLER: Deneyim[] = [
  // ------------------------------------------------------------------ İŞ ---
  {
    type: 'WORK',
    organization: 'Spectraloop Technologieteam – TEKNOFEST Hyperloop',
    role: 'Softwarearchitekt & Teamleiter',
    startDate: '2023-11-01',
    current: true,
    description:
      'Seit 3 Saisons leite ich das Softwareteam; ich koordiniere die Subsystemgruppen (Sensorik, CAN, Navigation, BMS, Echtzeitsteuerung, Telemetrie) und den Prozess rund um den technischen Designbericht; der Bericht belegte 2026 mit 468,5 von 500 Punkten den 1. Platz. Ich habe die STM32-Firmware entwickelt, die zwei Delta-MS300-Frequenzumrichter (VFD) über eine einzige RS-485-Leitung per Modbus RTU ansteuert; die Antriebs- und Bremssysteme wurden auf dem TÜBİTAK-Campus Gebze im Feld getestet.',
  },
  {
    type: 'WORK',
    organization: 'Adapha Yapay Zeka Ar-Ge ve Yazılım A.Ş. (Samsun Teknopark)',
    role: 'Praktikant',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description:
      'Zwei End-to-End-Projekte: (1) JWC-Linienüberwachungssystem – Raspberry Pi 5 als Feldgerät, GStreamer-Videopipeline, alle 6 Felder mit RapidOCR / ONNX Runtime auf ARM im Feld mit 99 %+ Konfidenz ausgelesen; FastAPI-Event-Engine, OEE in Echtzeit per WebSocket auf React-Native-Dashboards. (2) Radar – cloudbasiertes System für Lead-Screening und Audits, das Unternehmenskonten analysiert und darüber Berichte erstellt: asynchrones FastAPI, PostgreSQL, Redis, Playwright und Next.js; deterministische Regeln werden durch ein zweistufiges LLM-Verfahren (Anthropic) ergänzt.',
  },
  {
    type: 'WORK',
    organization: 'Kıyı Medya – 360°-Digitalagentur',
    role: 'Mitgründer & Leiter der Softwareabteilung',
    startDate: '2024-09-01',
    current: true,
    description:
      'Ich bin an der Gründung der Agentur und an der Leitung ihrer Softwareabteilung beteiligt; für mehr als 50 Unternehmen wurden über 500 Projekte umgesetzt. Ich habe die Unternehmenswebsites der Agentur durchgängig entwickelt (İSÇEV Arıtma, Aşkar Medikal, Costman, İlkadım Hörgeräte, CRP Project und weitere) und leite die Entwicklung einer mobilen App.',
  },
  {
    type: 'WORK',
    organization: 'SEA STARS Team – TEKNOFEST Unbemannte Unterwassersysteme',
    role: 'Leiter des Softwareteams',
    startDate: '2024-09-01',
    endDate: '2026-09-30',
    description:
      'Ich leitete das Team, das die Missionssoftware des autonomen Unterwasserfahrzeugs entwickelte: serielle Kommunikation zwischen Jetson Nano, STM32 und Arduino sowie Objekterkennung auf Basis von YOLO / TensorFlow. Die Phase „Kritischer Designbericht“ beim TEKNOFEST 2026 wurde mit 83,1 Punkten abgeschlossen.',
  },
  {
    type: 'WORK',
    organization: 'TesisBul.com',
    role: 'Gründer & CEO',
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    description:
      'Ich habe von Grund auf eine Plattform entwickelt, über die Sportanlagen wie Kunstrasen-Fußballplätze online gebucht werden können – mit oder ohne Vorauszahlung; ich war für den Betrieb und die strategische Weiterentwicklung des Produkts verantwortlich. In rund 20 Städten habe ich Marketing- und Vor-Ort-Arbeit mit Fokus auf über 100 Betriebe durchgeführt.',
  },
  {
    type: 'WORK',
    organization: 'Provezza Team – TEKNOFEST Unbemannte Unterwassersysteme',
    role: 'Leiter des Softwareteams',
    startDate: '2021-01-01',
    endDate: '2021-12-31',
    description:
      'Während meiner Schulzeit leitete ich das Softwareteam eines autonomen Unterwasserfahrzeugs; mit Jetson Nano, Arduino, STM32 und YOLO / TensorFlow erreichten wir das Finale des TEKNOFEST.',
  },
  // -------------------------------------------------------------- EĞİTİM ---
  {
    type: 'EDUCATION',
    organization: 'Universität Samsun',
    role: 'Software Engineering (Bachelor) – 4. Studienjahr',
    startDate: '2023-10-01',
    current: true,
    description: 'Voraussichtlicher Abschluss: Juni 2028.',
  },
  {
    type: 'EDUCATION',
    organization: 'Atatürk-Universität',
    role: 'Rechtswissenschaftliche Fakultät (Bachelor)',
    startDate: '2022-01-01',
    endDate: '2023-12-31',
    description:
      'Über die Sonderregelung „Zusatzartikel 1“ bin ich in den Studiengang Software Engineering der Universität Samsun gewechselt.',
  },
  {
    type: 'EDUCATION',
    organization: 'Deneyap Technologiewerkstätten',
    role: 'Absolvent',
    startDate: '2019-01-01',
    endDate: '2022-12-31',
    description:
      'Robotik und Programmierung, Mobile-App-Entwicklung, Nanotechnologie und Materialwissenschaft, Design und Fertigung.',
  },
  // ---------------------------------------------------------------- ÖDÜL ---
  {
    type: 'AWARD',
    role: '1. Platz in der Türkei',
    organization: 'TEKNOFEST 2026 Hyperloop-Entwicklungswettbewerb · Technologiedemonstration',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '3. Platz in der Türkei',
    organization: 'TEKNOFEST 2026 Hyperloop-Entwicklungswettbewerb · Performance',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '3. Platz in der Türkei',
    organization:
      'TEKNOFEST 2026 Hyperloop-Entwicklungswettbewerb · Lösung definierter Problemstellungen',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '1. Platz – Technischer Designbericht',
    organization: 'TEKNOFEST 2026 Hyperloop · Technischer Designbericht, Kategorie Performance',
    startDate: '2026-06-01',
    description: 'Spectraloop · 468,5/500',
  },
  {
    type: 'AWARD',
    role: 'Preis für die Entwicklung mechanischer Systeme',
    organization: 'TEKNOFEST 2025 Hyperloop-Entwicklungswettbewerb · Finalist',
    startDate: '2025-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: '1. Platz in Samsun',
    organization: 'TUA Astro Hackathon · CubeSat',
    startDate: '2024-01-01',
    description: 'Teamkapitän',
  },
  {
    type: 'AWARD',
    role: '1. Platz',
    organization: 'Deneyap Technologiefestival · Robotik und Programmierung, Erzurum',
    startDate: '2021-01-01',
    description: 'Teamkapitän',
  },
  {
    type: 'AWARD',
    role: 'Finalist',
    organization: 'TEKNOFEST 2021 Wettbewerb Unbemannte Unterwassersysteme',
    startDate: '2021-09-01',
    description: 'Provezza · Leiter des Softwareteams',
  },
  // ----------------------------------------------------------- SERTİFİKA ---
  {
    type: 'CERTIFICATE',
    role: 'Finalist im TEKNOFEST Hyperloop-Entwicklungswettbewerb',
    organization: 'TEKNOFEST',
    startDate: '2025-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung ASP.NET Core Web API',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung ASP.NET Core MVC',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Einführung in Webservices',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Objektorientierte Programmierung mit Anwendungen',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Gründerschulung',
    organization: 'KOSGEB',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schule für Luftfahrttriebwerke (6. Jahrgang)',
    organization: 'TEI – TUSAŞ Engine Industries',
    startDate: '2026-06-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Dankesurkunde für ehrenamtliche Mitarbeit',
    organization: 'TEKNOFEST',
    startDate: '2023-04-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Teilnahmeurkunde – Wettbewerb Unbemannte Unterwassersysteme',
    organization: 'TEKNOFEST',
    startDate: '2021-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung Mobile-App-Entwicklung',
    organization: 'Deneyap Türkiye',
    startDate: '2022-05-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung Nanotechnologie und Materialwissenschaft',
    organization: 'Deneyap Türkiye',
    startDate: '2022-02-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung Robotik-Programmierung',
    organization: 'Deneyap Türkiye',
    startDate: '2019-12-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Schulung Design und Fertigung',
    organization: 'Deneyap Türkiye',
    startDate: '2019-09-01',
  },
  // ---------------------------------------------------------------- SPORT ---
  // Quelle: Seiteninhaber (2026-10-23). Einzeldatum = PLATZIERUNG, Zeitraum = MANNSCHAFT.
  {
    type: 'SPORT',
    role: 'Meister',
    organization: 'Sportfest der Grundschulen in Erzurum',
    startDate: '2013-01-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: 'Medaille',
    organization: 'Erzurum',
    startDate: '2014-01-01',
    description: 'Eiskunstlauf',
  },
  {
    type: 'SPORT',
    role: 'Meister',
    organization: 'Yıldızkent, Altersklasse Minis',
    startDate: '2015-01-01',
    description: 'Fußball',
  },
  {
    type: 'SPORT',
    role: '3. Platz',
    organization: 'Turnier der Mittelschulen',
    startDate: '2016-01-01',
    description: 'Tischtennis',
  },
  {
    type: 'SPORT',
    role: 'Meister',
    organization: 'Türkischer Tennisverband · Ostliga Batman',
    startDate: '2018-01-01',
    description: 'Tennis',
  },
  {
    type: 'SPORT',
    role: '2. Platz',
    organization: 'Turnier der Gymnasien',
    startDate: '2019-01-01',
    description: 'Tennis',
  },
  {
    type: 'SPORT',
    role: '1. Platz',
    organization: 'Universität Samsun · Turnier im Sommersemester 2023/24',
    startDate: '2024-03-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '1. Platz',
    organization: 'Universität Samsun · Turnier im Wintersemester 2024/25',
    startDate: '2024-10-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '3. Platz (Kapitän)',
    organization: 'Universität Samsun · Turnier im Sommersemester 2024/25',
    startDate: '2025-03-01',
    description: 'Fußball',
  },
  {
    type: 'SPORT',
    role: '2. Platz',
    organization: 'Universität Samsun · Turnier im Sommersemester 2024/25',
    startDate: '2025-03-02',
    description: 'Beachvolleyball',
  },
  {
    type: 'SPORT',
    role: '1. Platz',
    organization: 'Universität Samsun · Turnier im Wintersemester 2025/26',
    startDate: '2025-10-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: '1. Platz',
    organization: 'Universität Samsun · Turnier im Sommersemester 2025/26',
    startDate: '2026-03-01',
    description: 'Volleyball',
  },
  {
    type: 'SPORT',
    role: 'Kapitän',
    organization: 'Volleyballmannschaft des Nevzat-Karabağ-Anadolu-Gymnasiums Erzurum',
    startDate: '2019-09-01',
    endDate: '2020-06-30',
  },
  {
    type: 'SPORT',
    role: 'Spieler',
    organization: 'Fußballmannschaft der Juristischen Fakultät, Atatürk-Universität',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
  {
    type: 'SPORT',
    role: 'Spieler',
    organization: 'Volleyballmannschaft der Juristischen Fakultät, Atatürk-Universität',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Eislaufverein Altın Patenler Erzurum',
    startDate: '2011-01-01',
    endDate: '2014-12-31',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Fußballverein Harb-İş Erzurum',
    startDate: '2012-01-01',
    endDate: '2012-12-31',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Fußballverein Olimpik Adımlar Erzurum',
    startDate: '2013-01-01',
    endDate: '2013-12-31',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Sportverein TRT Erzurum',
    startDate: '2014-01-01',
    endDate: '2017-12-31',
    description: 'Fußball',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Tennisverein Gençlik ve Spor Erzurum',
    startDate: '2016-01-01',
    endDate: '2019-12-31',
  },
  {
    type: 'SPORT',
    role: 'Spieler',
    organization: 'Futsalmannschaft der Saltukbey-Mittelschule Erzurum',
    startDate: '2016-01-01',
    endDate: '2016-12-31',
  },
  {
    type: 'SPORT',
    role: 'Sportler',
    organization: 'Volleyballverein Gençlik ve Spor Erzurum',
    startDate: '2018-01-01',
    endDate: '2020-12-31',
  },
  {
    type: 'SPORT',
    role: 'Spieler',
    organization:
      'Volleyballmannschaft der Fakultät für Ingenieurwissenschaften, Universität Samsun',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
  {
    type: 'SPORT',
    role: 'Spieler',
    organization: 'Fußballmannschaft Software Engineering, Universität Samsun',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
];

export const PROJELER: Proje[] = [
  {
    translationKey: 'spectraloop-hyperloop',
    period: '2023 – heute',
    slug: 'spectraloop-hyperloop-steuerungssoftware',
    title: 'Spectraloop – Steuerungssoftware für die Hyperloop-Kapsel',
    summary:
      'STM32-basierte Steuerungssoftware der TEKNOFEST-Hyperloop-Kapsel: CAN Bus, Linearmotorsteuerung per Modbus RTU und Fail-safe-Architektur. 2026 der 1. Platz in der Türkei in der Kategorie Technologiedemonstration.',
    tags: ['Embedded Systems', 'Teamleitung', 'TEKNOFEST'],
    stack: ['STM32', 'CAN Bus', 'Modbus RTU', 'RS-485', 'I²C', 'Watchdog', 'React', 'WebSocket'],
    featured: true,
    content: `## Problem

Die von einem Linearmotor angetriebene Kapsel muss unter hoher EMI zuverlässig kommunizieren, ihre Position und Geschwindigkeit genau kennen und bei jedem Fehler in einen sicheren Zustand übergehen.

## Mein Beitrag

- **Linearmotorsteuerung:** Ich habe die STM32-Firmware entwickelt, die zwei Delta-MS300-Frequenzumrichter (VFD) über eine einzige RS-485-Leitung per **Modbus RTU** (9600 Baud, 8N1, Slave 1 und 2) ansteuert: Steuerwörter für Vorwärts/Rückwärts/Stopp und Frequenzen bis 150 Hz. Den Code habe ich vom STM32F407 auf das Nucleo-F401RE portiert.
- **Validierung vor Ort:** Die VFD-Parameter (Frequenz- und Startquelle RS-485, obere Frequenzgrenze) habe ich vor Ort getestet und verifiziert. Außerdem habe ich eine Python-Brücke Seriell↔WebSocket und ein Live-Steuerungspanel ergänzt.
- **Teamführung:** Ich habe das Softwareteam in 6 Subsystemgruppen aufgeteilt (Sensorik, CAN, Navigation, BMS, RTOS, Telemetrie) und den Prozess rund um den technischen Designbericht koordiniert.

## Was wir im Team entwickelt haben

- **CAN Bus** zwischen Master- und Slave-STM32; EMI-Robustheit durch verdrillte Zweidrahtleitung + 120-Ω-Abschluss
- BNO055-IMU (I²C) + zwei optische Omron-Sensoren, Position per Hardware-Interrupts kreuzvalidiert
- Fail-safe durch Hardware-**Watchdog**; CAN-basiertes BMS mit 24 Slaves für die 144S-Batterie
- Bodenstation mit React + Node.js + WebSocket

## Ergebnis – TEKNOFEST 2026

| Kategorie | Platzierung |
| --- | --- |
| Technologiedemonstration | 1. Platz in der Türkei |
| Performance | 3. Platz in der Türkei |
| Lösung definierter Problemstellungen | 3. Platz in der Türkei |
| Performance – Technischer Designbericht | 1. Platz |
`,
  },
  {
    translationKey: 'jwc-hat-izleme',
    period: '2026',
    slug: 'jwc-linienueberwachung',
    title: 'JWC-Linienüberwachungssystem – Produktionsdaten vom Bildschirm',
    summary:
      'Im Feld validiertes Linienüberwachungssystem, das auf einem Raspberry Pi 5 die Bildschirme von Produktionsmaschinen ohne Datenschnittstelle per OCR ausliest: 6/6 Felder mit 99 %+ Konfidenz, ein Stillstand von 90 s wurde mit 88 s gemessen.',
    tags: ['KI', 'OCR', 'Industrie'],
    stack: [
      'Raspberry Pi 5',
      'GStreamer',
      'RapidOCR',
      'ONNX Runtime',
      'FastAPI',
      'SQLAlchemy',
      'WebSocket',
    ],
    clientName: 'Adapha Yapay Zeka Ar-Ge (Samsun Teknopark) – Praktikum',
    featured: true,
    content: `## Problem

Die Maschinen in der Fabrik zeigten ihre Produktionszähler nur auf dem Bedienerbildschirm an; es gab weder einen SPS-Ausgang noch eine Datenbank oder Berichtsdatei. Wie viele Minuten Stillstand eine Schicht hatte, war am Ende unbekannt.

## Lösung

- **Feldgerät:** HDMI → USB-Capture → Raspberry Pi 5. Mit GStreamer \`tee\` wird das Bild aufgeteilt: Ein Zweig läuft unterbrechungsfrei zum Bedienerbildschirm, der andere zur OCR. Über das Netzwerk gehen keine Frames, sondern nur die ausgelesenen Werte (einige Hundert Byte pro Sekunde).
- **OCR-Engine per Messung gewählt:** Cloud-OCR (Mistral) schied wegen Latenz, Kosten und Datenschutz aus. PaddleOCR und RapidOCR nutzen dasselbe Modell; RapidOCR (ONNX) wurde gewählt, weil es sich auf ARM problemlos installieren ließ. Das *small*-Modell erreicht dieselbe Genauigkeit wie *medium* und ist 3,7-mal schneller.
- **Event-Engine:** Ein Zustandsautomat übersetzt Rohwerte in Ereignisse: Stillstand, Modellwechsel, Zählerrücksetzung, Qualitätswarnung, Signalverlust. Stillstände werden rückwirkend auf den Zeitpunkt datiert, an dem der Zähler zuletzt gestiegen ist; aus den Ergebnissen wird die OEE berechnet.
- **Validierung:** Die ausgelesene Qualitätsquote wird mit der Berechnung Gutteile/Gesamt abgeglichen; nicht stimmige Werte werden verworfen.

## Ergebnisse im Feld

| Validierte Fähigkeit | Ergebnis |
| --- | --- |
| Auslesen von 6 Feldern per OCR | 6/6 korrekt, Konfidenz 99 %+ |
| Stillstandserkennung | Real 90 s → gemessen 88 s |
| Ausfallsicherheit | 38 ausstehende Messwerte vom Datenträger wiederhergestellt |
| Modellwechsel / Zählerrücksetzung | In beide Richtungen erkannt |
`,
  },
  {
    translationKey: 'predictive-edge',
    slug: 'predictive-edge-vorausschauende-wartung',
    title: 'Predictive-Edge – Vorausschauende Wartung auf dem Mikrocontroller',
    summary:
      'TinyML-System, das Lagerschäden an Industriemotoren frühzeitig erkennt und die Restlebensdauer (RUL) schätzt: ein Modell mit 289 Parametern (~1,1 KB), das auf einen STM32H7 passt. Abschlussarbeit.',
    tags: ['TinyML', 'Signalverarbeitung', 'Abschlussarbeit'],
    stack: ['Python', 'NumPy', 'scikit-learn', 'STM32H7', 'Flask', 'Chart.js'],
    featured: true,
    content: `## Ansatz

- **Physikbasierte Merkmale:** Vom 1-kHz-Vibrationssignal wird eine FFT berechnet. Über die Außenring-Schadensfrequenz des Lagers (BPFO = 100 Hz) und ihre Harmonischen werden 8 Merkmale extrahiert, darunter Harmonischenverhältnis, spektrale Entropie, RMS und Spitze-Spitze-Wert; Temperatur und Strom fließen ebenfalls ins Modell ein.
- **Modellwahl nach Embedded-Randbedingungen:** Logistische Regression, Random Forest, SVM, Gradient Boosting und MLP lieferten nahezu dieselbe Güte (F1 ≈ 0,99). Den Ausschlag gaben Speicherbedarf und Inferenzkosten.
- **Methodik:** GridSearchCV und 5-fache Kreuzvalidierung. Der Scaler sitzt in der Pipeline, sodass kein Data Leakage entsteht. Da der Unterschied zwischen (32,16) und (16,8) unterhalb der Standardabweichung lag, wurde das dreimal kleinere (16,8) gewählt.
- **Embedded-Ziel:** 289 Parameter ≈ 1,1 KB (float32) – ein sehr kleiner Teil der 2 MB Flash des STM32H7; mit int8-Quantisierung sind es 289 B.
- **Monitoring-Dashboard:** Gesundheitszustand und Restlebensdauer einer Flotte von 200 Motoren mit Flask-REST-API + Chart.js.

## Kennzahlen

| Kennzahl | Wert |
| --- | --- |
| F1 (synthetische Daten) | 0,99 |
| Parameter | 289 |
| Modellgröße | ~1,1 KB (float32) · 289 B (int8) |

## Einschränkungen und nächster Schritt

Der Datensatz besteht aus synthetischen Daten auf Basis eines physikalischen Fehlermodells. Die Ausführung des Modells auf einer echten STM32-Platine und die Validierung mit realen Sensordaten laufen noch.
`,
  },
  {
    slug: 'iscev-unternehmensplattform',
    translationKey: 'iscev-is-yonetim-platformu',
    period: '2026',
    title: 'İSÇEV – Plattform für Unternehmensmanagement',
    summary:
      'Eine von Grund auf entwickelte Managementplattform, die Angebote, Projekte, Einkauf, Außendienst, Finanzen, Buchhaltung und Service eines Wasseraufbereitungsunternehmens in einem einzigen Panel zusammenführt. 43 Datenmodelle, 245 automatisierte Tests.',
    tags: ['Full-Stack', 'Unternehmenssoftware', 'Sicherheit'],
    stack: ['Next.js', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ', 'Auth.js'],
    featured: true,
    content: `## Problem

Ein Unternehmen, das Wasseraufbereitungsanlagen projektbezogen errichtet und Einkauf, Service und Wartung betreibt, verwaltete seine Prozesse in verstreuten Werkzeugen. Ziel war es, jeden Schritt – vom Angebot bis zur Projektübergabe – in einem einzigen, prüfbaren System abzubilden.

## Arbeitsablauf

Kontakt (Kunde / Lieferant) → Angebot mit Revisionen → „In Projekt umwandeln“ → Arbeitsplan und Phasen → Bedarfsliste → Einkauf (Vergleich von Lieferantenangeboten) → Raten und Zahlungseingänge → Finanzen und Buchhaltung → Projektabschluss mit der Lieferrechnung.

## Module

- **Kontakte:** Kunden- und Lieferantenkarten, Kontoauszüge, Massenimport aus Excel
- **Angebote:** Revisionsverlauf, Mehrwertsteueroptionen, Mehrwährungspreise zum Kurs der türkischen Zentralbank, druckbare Ausgabe
- **Projekte:** Arbeitsplan, Bedarfsliste, Einkauf, Raten und Gewinn / Verlust je Projekt
- **Aufgaben:** Kanban-Ansicht, Zuweisung, Zeiterfassung und Aufgabenkalender
- **Finanzen:** Kasse, Bankkonten, Kredite und Kreditkarten, Budgetplan im Vergleich zum Ist
- **Buchhaltung:** Rechnungen, Quittungen, wiederkehrende Rechnungen und Buchungen
- **Service und Wartung:** Serviceverträge, Besuche und Wartungspläne
- **Kundenportal:** ein Link, über den Kunden ihr Projekt ohne Anmeldung verfolgen können
- **Benachrichtigungen:** in der App, Web Push (PWA) und E-Mail; Live-Stream und tägliche Erinnerungen

## Sicherheit und Datenintegrität

- Berechtigungsbasierte Rollenverwaltung (**RBAC**) und **Zwei-Faktor-Authentifizierung mit TOTP**
- **AES-256-GCM**-Verschlüsselung sensibler Felder auf Anwendungsebene
- **Unveränderliches Audit-Log**, durch Datenbank-Trigger erzwungen; jede Geldbuchung wird protokolliert
- **Row Level Security**, Rate Limiting, CSRF-Schutz und Schemavalidierung jeder Eingabe
- Verlustfreie Geldberechnung auf den Cent genau; Anonymisierung von Nutzern für den Datenschutz (KVKK)

## Zahlen

| Kennzahl | Wert |
| --- | --- |
| Datenmodelle | 43 |
| Seiten | 46 |
| Automatisierte Tests | 245 (Unit, Integration, Playwright End-to-End) |
| Datenbankmigrationen | 55 |

Bei jeder Änderung führt die CI-Pipeline Lint, Typprüfung, Unit- und Integrationstests, eine Prüfung auf Migrationsdrift und einen Produktions-Build aus.
`,
  },
  {
    slug: 'kiyi-medya-webprojekte',
    translationKey: 'kiyi-medya-web-projeleri',
    commercial: true,
    title: 'Kıyı Medya — Unternehmenswebsites',
    summary:
      'Zehn Unternehmenswebsites, die ich in der Softwareabteilung der von mir mitgegründeten Agentur Kıyı Medya vom Design bis zum Go-live umgesetzt habe: Wasseraufbereitung, Gesundheit, Beratung und Industrie.',
    tags: ['Unternehmenswebsite', 'Kıyı Medya'],
    stack: ['Next.js', 'React', 'Vite'],
    liveUrl: 'https://kiyimedya.com',
    featured: false,
    content: `## Umfang

Als Leiter der Softwareabteilung von Kıyı Medya habe ich Unternehmenswebsites für Kundenmarken durchgängig umgesetzt: Anforderungen, Oberfläche, Entwicklung, Suchmaschinen-Einrichtung und Go-live.

## Websites

| Marke | Adresse |
|---|---|
| Kıyı Medya | [kiyimedya.com](https://kiyimedya.com) |
| İSÇEV Arıtma | [iscevaritma.com.tr](https://iscevaritma.com.tr) |
| Aşkar Medikal | [askarmedikal.com](https://askarmedikal.com) |
| Costman | [mrcostman.com](https://mrcostman.com) |
| İlkadım İşitme Cihazları | [ilkadimisitmecihazlari.com](https://ilkadimisitmecihazlari.com) |
| CRP Project | [crpproject.com](https://crpproject.com) |
| Spectraloop | [spectraloop.com.tr](https://spectraloop.com.tr) |
| DNA Çevre ve Arıtma | neue Version in Arbeit |
| Yay Grup Su Arıtma | neue Version in Arbeit |
| Yay Grup Metal İşleme | neue Version in Arbeit |
`,
  },
  {
    translationKey: 'tesisbul',
    period: '2024 – 2025',
    slug: 'tesisbul-buchungsplattform',
    title: 'TesisBul.com – Buchungsplattform für Sportanlagen',
    summary:
      'Eine von mir von Grund auf entwickelte Plattform, über die Sportanlagen wie Kunstrasen-Fußballplätze online und mit Vorauszahlung gebucht werden können; Marketing- und Vor-Ort-Arbeit mit Fokus auf über 100 Betriebe in rund 20 Städten.',
    tags: ['Start-up', 'Online-Buchung'],
    stack: [],
    featured: false,
    content: `## Start-up

Ein Start-up, das ich von Juni 2024 bis Februar 2025 als Gründer und CEO geführt habe. Ich habe von Grund auf die Plattform entwickelt, über die Nutzer Sportanlagen wie Kunstrasen-Fußballplätze schnell und sicher buchen können, noch bevor sie vor Ort sind – mit Vorauszahlung oder ohne Bezahlung im Voraus; ich war für den Betrieb und die strategische Weiterentwicklung des Produkts verantwortlich.

## Vor Ort

In rund 20 Städten habe ich Marketing- und Vor-Ort-Arbeit mit Fokus auf über 100 Betriebe durchgeführt.
`,
  },
];

/** HİZMETLER — Türkçedeki ile aynı sıra ve sayı; CTA boş → Kıyı Medya. */
export const HIZMETLER = [
  {
    title: 'Unternehmenswebsite',
    description:
      'Vom Design bis zum Go-live aus einer Hand: schnelle, suchmaschinenfreundliche Unternehmenswebsites, deren Inhalte über ein Admin-Panel gepflegt werden. Websites für Marken wie İSÇEV Arıtma, Aşkar Medikal, Costman und İlkadım Hörgeräte wurden mit Kıyı Medya auf diese Weise umgesetzt.',
  },
  {
    title: 'Webanwendung und Admin-Panel',
    description:
      'Unternehmensplattformen mit rollenbasierten Berechtigungen, Audit-Trail und Workflows; maßgeschneiderte Anwendungen etwa für Buchungen oder Geschäftsprozessmanagement. Mit Next.js, TypeScript und PostgreSQL.',
  },
  {
    title: 'Embedded-Systeme und Firmware',
    description:
      'STM32-basierte Firmware, Sensorintegration und Kommunikation über CAN-Bus / Modbus RTU / RS-485; Feldgeräte für Bildverarbeitung und Datenerfassung auf Raspberry Pi und Jetson. Die Steuerungssoftware der Hyperloop-Kapsel und das Linienüberwachungssystem für die Produktion entstanden auf diese Weise.',
  },
  {
    title: 'Mobile App',
    description:
      'Mobile-App-Entwicklung von der Idee bis in den Store – Anforderungen, Design, Entwicklung und Veröffentlichung. Umgesetzt bei Kıyı Medya.',
  },
];
