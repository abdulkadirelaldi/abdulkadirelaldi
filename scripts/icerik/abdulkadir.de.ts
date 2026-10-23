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
  headline: 'Embedded-Systeme · Künstliche Intelligenz · Full-Stack',
  subtitle:
    'Software Engineering an der Universität Samsun, 4. Studienjahr · Leiter des Softwareteams von Spectraloop Hyperloop',
  bio: [
    'Ich entwickle End-to-End-Systeme an der Schnittstelle von Hardware und Software: von STM32-basierter Steuerungssoftware über OCR-Systeme im Praxiseinsatz bis hin zu KI-Modellen, die auf Mikrocontrollern laufen.',
    'Seit drei Saisons leite ich beim TEKNOFEST Hyperloop das 11-köpfige Softwareteam von Spectraloop. Ich arbeite an STM32-basierter Steuerungssoftware, CAN-Bus- und Modbus-RTU-Kommunikation sowie an Fail-safe-Architekturen. Mit meinem Team habe ich beim TEKNOFEST 2026 Hyperloop-Entwicklungswettbewerb in der Kategorie Technologiedemonstration den 1. Platz in der Türkei sowie in den Kategorien Performance und Lösung definierter Problemstellungen jeweils den 3. Platz belegt.',
    'Während meines Praktikums im Samsun Teknopark habe ich ein im Feld validiertes Linienüberwachungssystem entwickelt, das die Bildschirme von Produktionsmaschinen ohne Datenschnittstelle per OCR ausliest. Als Mitgründer von Kıyı Medya leite ich die Softwareabteilung der Agentur und entwickle Unternehmenswebsites durchgängig – vom Design bis zum Go-live.',
    'In letzter Zeit beschäftige ich mich mit der Zuverlässigkeit von KI: Ich habe ein LLM-System entwickelt, das riskante Klauseln in Verträgen ausschließlich mit wörtlichen Zitaten belegt (ToS Risk Guard), sowie einen Roboterarm, der auf türkische Befehle hin arbeitet und jeden seiner Schritte per Kamera überprüft (Çoban).',
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
    [
      'Git / GitHub',
      'Linux',
      'systemd',
      'GStreamer',
      'WebSocket',
      'Playwright',
      'Cypress',
      'Chrome Extension (MV3)',
      'Claude Code',
    ],
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
      'Seit 3 Saisons leite ich das 11-köpfige Softwareteam; ich koordiniere die Subsystemgruppen (Sensorik, CAN, Navigation, BMS, Echtzeitsteuerung, Telemetrie) und den Prozess rund um den technischen Designbericht; der Bericht belegte 2026 mit 468,5 von 500 Punkten den 1. Platz. Ich habe die STM32-Firmware entwickelt, die zwei Delta-MS300-Frequenzumrichter (VFD) über eine einzige RS-485-Leitung per Modbus RTU ansteuert; die Antriebs- und Bremssysteme wurden auf dem TÜBİTAK-Campus Gebze im Feld getestet.',
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
      'Ich bin an der Gründung der Agentur und an der Leitung ihrer Softwareabteilung beteiligt; für mehr als 50 Unternehmen wurden über 500 Projekte umgesetzt. Ich habe 5 Unternehmenswebsites durchgängig entwickelt und leite die Entwicklung einer mobilen App.',
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
    description: 'Völkerball',
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
- **Teamführung:** Ich habe das 11-köpfige Team in 6 Subsystemgruppen aufgeteilt (Sensorik, CAN, Navigation, BMS, RTOS, Telemetrie) und den Prozess rund um den technischen Designbericht koordiniert.

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
    translationKey: 'coban-robot-kol',
    period: '2026',
    slug: 'coban-roboterarm',
    title: 'Çoban – Roboterarm, gesteuert über türkische Befehle',
    summary:
      'Roboterarm mit geschlossenem Regelkreis, der auf türkische Befehle hin arbeitet und jeden Schritt per Kamera überprüft: Ich habe den Ansatz von Shepherd Robotics (YC F26) auf die türkische Industrie übertragen. 5 Szenarien mit der echten Gemini API, 43 automatisierte Tests.',
    tags: ['Physische KI', 'Robotik', 'Embedded Systems'],
    stack: ['Python', 'Gemini API', 'Digitaler Zwilling (Simulation)'],
    featured: true,
    content: `## Die Frage

Kann ein KMU in der Türkei einem Roboter ohne Roboterprogrammierer sagen: „Wirf den gerissenen Steckverbinder in den Schrott“? Ausgangspunkt waren der Aufruf nach „neuen Betriebssystemen für die physische Welt“ in der *Request for Startups*-Liste von Y Combinator für Fall 2026 und Shepherd Robotics, das im selben Zeitraum bei YC aufgenommen wurde. Çoban ist ein Klon dieses Ansatzes, angepasst an die türkische Industrie.

## Komponenten

- **Aufgabenausführung im geschlossenen Regelkreis:** Gemini betrachtet bei jedem Schritt das neue Kamerabild, wählt die nächste Bewegung und prüft, ob der vorherige Schritt tatsächlich erfolgreich war.
- **Fusion von Sehen und Tasten:** Verschiebungen von 1–2 cm, die im Bild nicht erkennbar sind, erfasst der Greifersensor; das System plant daraufhin neu.
- **Abschlussprüfung:** Meldet das Modell „fertig“, zählt ein separater Qualitätskontrollschritt die Objekte im letzten Bild; fehlt etwas, wird die Aufgabe fortgesetzt.
- **Digitaler Zwilling:** Eine Simulation, in der derselbe Code auch ohne Roboter läuft; Szenarien für Kabelbaum-Kitting und die Qualitätskontrolle gerissener Teile nach dem Vorbild von Automobilzulieferern in Bursa.
- **KVKK-konforme Bildverarbeitung:** Bevor ein Bild in die Cloud gesendet wird, werden die Gesichter der Beschäftigten direkt auf dem Gerät unkenntlich gemacht.
- **Daten-Flywheel:** Jede Aufgabe wird als Datensatz gespeichert, um künftig ein Open-Source-Robotermodell zu trainieren.

## Ergebnisse mit der echten Gemini API

| Aufgabe | Ergebnis | Zeigt |
| --- | --- | --- |
| Rote Würfel in die gelbe Kiste legen | Abgeschlossen (5 Schritte) | Mehrstufige Planung, bildbasierte Prüfung jedes Schritts |
| Gerissenen Steckverbinder in die Schrottkiste werfen | Abgeschlossen (3 Schritte) | Visuelle Qualitätskontrolle |
| Lila Würfel auf das weiße Tablett legen | Unmöglich | Roboter wird bei einem nicht vorhandenen Objekt gar nicht erst bewegt |
| Dieselbe Aufgabe mit 40 % Greiffehlern | Abgeschlossen (8 Schritte) | Sensor erfasst 2 Verschiebungen; verfrühtes „fertig“ wird abgelehnt |

Das System wurde in 5 Szenarien mit der echten Gemini API getestet und mit 43 automatisierten Tests verifiziert.

## Am lehrreichsten: die Fehler

Das Modell bemerkte ein verrutschendes Teil nicht, hielt einen weißen Steckverbinder für schwarz und meldete „fertig“, bevor die Aufgabe erledigt war. Jeden dieser Fehler habe ich mit einer technischen Lösung behoben. **Wenn das Modell „fertig“ sagt, heißt das nicht, dass die Arbeit erledigt ist.**

## Ziel

Ein kostengünstiger, zuverlässiger Automatisierungsansatz, der Türkisch versteht – für die türkische Fertigungsindustrie, deren Roboterdichte unter dem weltweiten Durchschnitt liegt.

*Für die Betreuung und die wissenschaftlichen Beiträge danke ich Dr. Nurettin Şenyer.*
`,
  },
  {
    translationKey: 'tos-risk-guard',
    period: '2026',
    slug: 'tos-risk-guard',
    title: 'ToS Risk Guard – Risikoanalyse von Verträgen mit Zitatbeleg',
    summary:
      'Chrome-Erweiterung, die riskante Klauseln in Nutzungsbedingungen und Datenschutzerklärungen ausschließlich mit wörtlichen Zitaten aufzeigt: „ein KI-System, das der KI nicht vertraut“. 95 % Präzision bei 6 realen Verträgen; 4 von 4 versteckten Prompt-Injection-Versuchen erkannt.',
    tags: ['KI', 'LLM-Sicherheit', 'Chrome-Erweiterung'],
    stack: ['Chrome Extension (MV3)', 'Gemini API', 'JSON Schema', 'Cypress'],
    featured: true,
    content: `## Problem

Kaum jemand liest einen Vertrag, bevor er das Kästchen „Ich stimme zu“ anklickt. ToS Risk Guard erfasst den Text, sobald eine Seite mit Nutzungsbedingungen, einer Datenschutzerklärung oder Abonnementbedingungen geöffnet wird, und erklärt riskante Klauseln in einfachem Türkisch.

## Designprinzip: ein LLM-System, das dem LLM nicht vertraut

- **Jede Aussage mit Zitat:** Jede riskante Klausel wird mit einem wörtlichen Zitat aus dem Vertrag belegt. Aussagen, deren Zitat sich im Originaltext nicht findet, werden aussortiert, ohne dem Nutzer je angezeigt zu werden.
- **Der Score kommt aus dem Code:** Der Risiko-Score (0–100) stammt nicht vom LLM, sondern wird ausschließlich aus verifizierten Klauseln mit festen Gewichten berechnet.
- **Kein Freitext:** Die LLM-Ausgabe wird über ein JSON-Schema abgefragt und anschließend deterministisch erneut validiert.
- **Prompt Injection wird herausgefiltert:** Auf der Seite versteckte „Anweisungen an die KI“ werden entfernt, bevor sie das LLM erreichen, und dem Nutzer als Warnung angezeigt.
- **Unsicherheit wird benannt:** Ist sich das System nicht sicher, teilt es dies mit Begründung mit: „Geringe Konfidenz – das System ist sich nicht sicher“.

## Evaluation

Mini-Evaluation an 6 realen Verträgen (Netflix, Spotify, YouTube, Zoom, GitHub, Dropbox):

| Kennzahl | Ergebnis |
| --- | --- |
| Präzision (Precision) | 95 % – 95 % der angezeigten Klauseln sind korrekt |
| Trefferquote (Recall) | 51 % – etwa die Hälfte der Klauseln wird übersehen |
| Trefferquote mit stärkerem Modell | 62 %, aber die Analyse ist 10- bis 60-mal langsamer |
| Versteckte Prompt Injection | 4 von 4 Versuchen erkannt, der Score ließ sich nicht manipulieren |

Jede übersehene Klausel und jeden Fehlalarm habe ich im Repository einzeln aufgeführt; auch die Schwächen des Systems sollten sichtbar sein.

## Eingesetzte Technik

Chrome Extension (Manifest V3), Gemini API, die Open-Source-Bibliothek page-agent von Alibaba (nur lesend, nach dem Prinzip der minimalen Rechte), Validierung per JSON-Schema, End-to-End-Tests und Demo-Aufzeichnung mit Cypress.

> Die Anwendung bietet keine Rechtsberatung; sie ist lediglich ein Werkzeug zur ersten Durchsicht.

*Für die Anregungen danke ich Dr. Nurettin Şenyer.*
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
    translationKey: 'iscev-is-yonetim-platformu',
    slug: 'iscev-unternehmensplattform',
    title: 'İSÇEV – Plattform für Geschäftsprozesse im Unternehmen',
    summary:
      'Mit Next.js, tRPC und Prisma entwickelte Plattform für Geschäftsprozesse im Unternehmen: RBAC, unveränderlicher Audit-Trail, Feldverschlüsselung mit AES-256-GCM und BullMQ-Queues.',
    tags: ['Full-Stack', 'Unternehmenssoftware'],
    stack: ['Next.js', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ'],
    featured: true,
    content: `## Umfang

Webplattform, die betriebliche Geschäftsprozesse in einem zentralen Dashboard bündelt. Entwickelt mit Next.js, TypeScript, tRPC und Prisma (PostgreSQL, Redis).

## Sicherheit

- Rollenbasierte Zugriffskontrolle (**RBAC**)
- **Unveränderlicher Audit-Trail**
- Feldverschlüsselung mit **AES-256-GCM**

## Infrastruktur

- E-Mail-Benachrichtigungs-Queues auf Basis von BullMQ

## Entwicklungsprozess

Die Entwicklung erfolgt in einem Workflow, der auf der Orchestrierung mehrerer KI-Agenten basiert.
`,
  },
  {
    translationKey: 'kiyi-medya-kurumsal-site',
    commercial: true,
    slug: 'kiyi-medya-unternehmenswebsite',
    title: 'Kıyı Medya – Unternehmenswebsite',
    summary:
      'Unternehmenswebsite der 360°-Digitalagentur, die ich mitgegründet habe – durchgängig vom Design bis zum Go-live.',
    tags: ['Unternehmenswebsite', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://kiyimedya.com',
    clientName: 'Kıyı Medya',
    featured: false,
    content: `## Kıyı Medya

Eine 360°-Digitalagentur, an deren Gründung und an der Leitung deren Softwareabteilung ich beteiligt bin. Für mehr als 50 Unternehmen wurden über 500 Projekte umgesetzt.

Die Unternehmenswebsite der Agentur habe ich durchgängig vom Design bis zum Go-live entwickelt.
`,
  },
  {
    translationKey: 'iscev-aritma-kurumsal-site',
    commercial: true,
    slug: 'iscev-aritma-unternehmenswebsite',
    title: 'İSÇEV Arıtma – Unternehmenswebsite',
    summary:
      'Unternehmenswebsite für ein Unternehmen der Abwasserbehandlung und Umwelttechnik – umgesetzt bei Kıyı Medya.',
    tags: ['Unternehmenswebsite', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://iscevaritma.com.tr',
    clientName: 'İSÇEV Arıtma',
    featured: false,
    content: `## Projekt

Unternehmenswebsite für ein Unternehmen, das in der industriellen Abwasserbehandlung und Umwelttechnik tätig ist. Bei Kıyı Medya durchgängig vom Design bis zum Go-live entwickelt.
`,
  },
  {
    translationKey: 'askar-medikal-kurumsal-site',
    commercial: true,
    slug: 'askar-medikal-unternehmenswebsite',
    title: 'Askar Medikal – Unternehmenswebsite',
    summary:
      'Unternehmenswebsite für einen Lieferanten von Medizinprodukten – umgesetzt bei Kıyı Medya.',
    tags: ['Unternehmenswebsite', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://askarmedikal.com',
    clientName: 'Askar Medikal',
    featured: false,
    content: `## Projekt

Unternehmenswebsite für einen Lieferanten von Medizinprodukten. Bei Kıyı Medya durchgängig vom Design bis zum Go-live entwickelt.
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
      'Vom Design bis zum Go-live aus einer Hand: schnelle, suchmaschinenfreundliche Unternehmenswebsites, deren Inhalte über ein Admin-Panel gepflegt werden. Mit Kıyı Medya wurden auf diese Weise 5 Unternehmenswebsites ausgeliefert.',
  },
  {
    title: 'Webanwendung und Admin-Panel',
    description:
      'Unternehmensplattformen mit rollenbasierten Berechtigungen, Audit-Trail und Workflows; maßgeschneiderte Anwendungen etwa für Buchungen oder Geschäftsprozessmanagement. Mit Next.js, TypeScript und PostgreSQL.',
  },
  {
    title: 'Mobile App',
    description:
      'Mobile-App-Entwicklung von der Idee bis in den Store – Anforderungen, Design, Entwicklung und Veröffentlichung. Umgesetzt bei Kıyı Medya.',
  },
];
