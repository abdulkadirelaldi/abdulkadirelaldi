/**
 * BLOG YAZILARI — Almanca (de-DE) çevirisi: `./yazilar.ts`.
 *
 * `translationKey` = Türkçe yazının `slug`'ı. Her sayı, ölçüm ve karar
 * Türkçe kaynaktan; yeni bir iddia YOK.
 */

import type { Yazi } from './yazilar';

export const YAZILAR: Yazi[] = [
  {
    translationKey: 'ocr-motorunu-olcerek-secmek',
    slug: 'ocr-engine-durch-messen-auswaehlen',
    title: 'Warum ich die OCR-Engine durch Messen ausgewählt habe',
    excerpt:
      'Um den Bildschirm einer Produktionsmaschine ohne Datenschnittstelle auszulesen, habe ich drei OCR-Optionen nach Genauigkeit, Latenz und Kosten verglichen. Gewonnen hat nicht die „stärkste“, sondern die, die am besten zum Einsatzort passt.',
    tags: ['KI', 'OCR', 'Embedded Systems'],
    content: `## Das Problem: Die Daten gibt es nur auf dem Bildschirm

Die Maschinen, mit denen ich während meines Praktikums im Samsun Teknopark zu tun hatte, zeigten ihre Produktionszähler nur auf dem Bedienerbildschirm an. Es gab weder einen SPS-Ausgang noch eine Datenbank oder Berichtsdatei; wie viele Minuten Stillstand eine Schicht hatte, wusste am Ende niemand.

Die Lösungsidee war einfach: das Bildschirmbild erfassen, die relevanten Felder per OCR auslesen und die Messwerte in Ereignisse übersetzen. Die eigentliche Entscheidung war, **welche OCR-Engine** im Feld zuverlässig funktionieren würde.

## Drei Kandidaten

- **Mistral OCR** – cloudbasiert.
- **PaddleOCR** – Open Source, läuft lokal.
- **RapidOCR** – führt dieselben Modelle wie PaddleOCR auf ONNX Runtime aus.

## Warum die Cloud ausschied

Cloud-OCR schied aus drei Gründen aus: **Latenz**, **Kosten** und **Datenschutz**. Bei einem System, das mehrere Messungen pro Sekunde durchführt, ist es langsam und teuer, jedes Frame in die Cloud zu schicken – und der Fabrikbildschirm zeigt obendrein Daten, die das Werk nicht verlassen sollten.

## PaddleOCR oder RapidOCR?

Da beide dasselbe Modell verwenden, erwartete ich keinen Unterschied in der Genauigkeit. Der Unterschied zeigte sich bei der Installation: Das Feldgerät ist ein **Raspberry Pi 5**, also ARM. RapidOCR (ONNX) ließ sich auf ARM problemlos installieren – danach fiel die Wahl.

Auch die Modellgröße habe ich gemessen: **Das small-Modell erreichte dieselbe Genauigkeit wie medium und war 3,7-mal schneller.** Ein größeres Modell hätte hier nichts gebracht.

## Die richtige Engine reicht nicht: Validierung

Keine OCR liest jedes Frame korrekt. Deshalb habe ich die Messwerte gegeneinander geprüft: Die auf dem Bildschirm angezeigte Qualitätsquote wird aus der Zahl der Gutteile und der Gesamtstückzahl neu berechnet und mit dem ausgelesenen Wert verglichen. **Werte, die nicht übereinstimmen, werden verworfen.** Einen fehlerhaften Wert zu speichern ist schlimmer, als gar keinen zu lesen.

## Ergebnis

| Validiert | Ergebnis |
| --- | --- |
| Auslesen von 6 Feldern | 6/6 korrekt, Konfidenz 99 %+ |
| Stillstandserkennung | real 90 s → gemessen 88 s |
| Ausfallsicherheit | 38 ausstehende Messwerte vom Datenträger wiederhergestellt |

Die Lehre: Es gibt nicht „das beste Modell“, sondern **das Modell, das am besten zu diesem Einsatzort passt** – und das findet man nur durch Messen.
`,
  },
  {
    translationKey: 'mikrodenetleyiciye-sigan-model',
    slug: 'ki-modell-auf-dem-mikrocontroller',
    title: 'Ein 1,1-KB-Modell auf einem STM32 unterbringen',
    excerpt:
      'Bei der Erkennung von Lagerschäden lieferten fünf Modelle nahezu dieselbe Güte. Den Ausschlag gab nicht die Genauigkeit, sondern der Speicher des Mikrocontrollers: 289 Parameter, ~1,1 KB in float32.',
    tags: ['TinyML', 'STM32', 'Signalverarbeitung'],
    content: `## Das Ziel

Meine Abschlussarbeit **Predictive-Edge** soll Lagerschäden an Industriemotoren frühzeitig erkennen und die Restlebensdauer (RUL) schätzen – und zwar nicht in der Cloud, sondern **auf dem Mikrocontroller direkt am Motor**.

## Die Merkmale kommen aus der Physik

Statt die rohen Vibrationsdaten direkt ins Modell zu geben, habe ich physikbasierte Merkmale extrahiert. Vom 1-kHz-Vibrationssignal wird eine FFT berechnet; über die **Außenring-Schadensfrequenz** des Lagers (BPFO, in diesem Aufbau 100 Hz) und ihre Harmonischen werden **8 Merkmale** bestimmt, darunter Harmonischenverhältnis, spektrale Entropie, RMS und Spitze-Spitze-Wert. Temperatur und Strom fließen ebenfalls ins Modell ein.

Gute Merkmale erleichtern einem kleinen Modell die Arbeit – und auf einem Embedded-Ziel ist genau das entscheidend.

## Fünf Modelle, fast derselbe Score

Ich habe Logistische Regression, Random Forest, SVM, Gradient Boosting und MLP verglichen. Alle lagen bei etwa **F1 ≈ 0,99**. Da die Genauigkeit kein Unterscheidungsmerkmal war, entschieden **Speicherbedarf und Inferenzkosten**.

## Methodik

- **GridSearchCV** und **5-fache Kreuzvalidierung**.
- Der Scaler sitzt **in der Pipeline** – so fließen keine Informationen aus den Trainingsdaten in die Validierungs-Folds.
- Beim MLP lag der Unterschied zwischen (32, 16) und (16, 8) unterhalb der Standardabweichung; gewählt wurde **das dreimal kleinere (16, 8)**.

## Kennzahlen

| Kennzahl | Wert |
| --- | --- |
| Parameter | 289 |
| Modellgröße (float32) | ~1,1 KB |
| Mit int8-Quantisierung | 289 B |
| Ziel | STM32H7 (2 MB Flash) |

Dazu kommt die Monitoring-Seite: Gesundheitszustand und Restlebensdauer einer Flotte von 200 Motoren in einem Dashboard, umgesetzt mit Flask-REST-API und Chart.js.

## Ehrliche Einschränkung

Der Datensatz besteht aus **synthetischen** Daten auf Basis eines physikalischen Fehlermodells. Die Ausführung des Modells auf einer echten STM32-Platine und die Validierung mit realen Sensordaten laufen noch. Den F1-Wert von 0,99 sollte man vor diesem Hintergrund lesen.
`,
  },
  {
    translationKey: 'tek-rs485-hattinda-iki-vfd',
    slug: 'zwei-vfds-an-einer-rs485-leitung',
    title: 'Zwei VFDs an einer RS-485-Leitung: Linearmotorsteuerung mit Modbus RTU',
    excerpt:
      'Zwei Delta-MS300-Umrichter, die den Linearmotor der Spectraloop-Kapsel antreiben, über eine einzige RS-485-Leitung mit einem STM32 als Modbus-RTU-Master steuern – und das vor Ort validieren.',
    tags: ['Embedded Systems', 'Modbus', 'TEKNOFEST'],
    content: `## Kontext

Seit drei Saisons leite ich das Softwareteam von **Spectraloop**, das beim TEKNOFEST Hyperloop antritt. Die Kapsel wird von einem Linearmotor angetrieben; gespeist wird der Motor von zwei **Delta-MS300**-Frequenzumrichtern (VFD). Meine Aufgabe war die Firmware, die diese beiden Umrichter zuverlässig steuert.

## Warum Modbus RTU, warum eine einzige Leitung

Modbus RTU ist ein in der Industrie verbreitetes, einfaches Master/Slave-Protokoll zwischen Antrieben und SPSen. RS-485 ist die störfeste differenzielle Leitung, über die es übertragen wird. An eine einzige RS-485-Leitung lassen sich mehrere Geräte anschließen; jedes wird über seine eigene **Slave-Adresse** angesprochen.

Mein Aufbau:

- Der **STM32** ist der **Modbus-RTU-Master** der Leitung.
- Die beiden MS300 hängen als **Slave 1** und **Slave 2** an derselben Leitung.
- Kommuniziert wird mit **9600 Baud, 8N1**.

## Was gesteuert wird

Die Firmware sendet den Umrichtern die Steuerwörter **Vorwärts / Rückwärts / Stopp** sowie Frequenzwerte **bis 150 Hz**. Den Code habe ich auf dem STM32F407 geschrieben und anschließend auf das Nucleo-F401RE portiert.

## Validierung vor Ort

Code, der am Schreibtisch funktioniert, bewirkt vor Ort nichts, wenn der Umrichter falsch konfiguriert ist. Die VFD-Parameter – Frequenz- und Startquelle auf **RS-485** gesetzt, **obere Frequenzgrenze** – habe ich vor Ort einzeln getestet und verifiziert.

Für Tests und Beobachtung habe ich außerdem eine **Python-Brücke Seriell↔WebSocket** mit Live-Steuerungspanel ergänzt: So können wir die Fahrt der Kapsel im Browser verfolgen und Befehle senden.

## Der Rest der Kapsel

Die Motorsteuerung ist Teil einer größeren Architektur: Die Master- und Slave-STM32 kommunizieren über **CAN Bus**; gegen die hohe EMI setzen wir verdrillte Zweidrahtleitungen und einen **120-Ω-Abschluss** ein. Die Position wird zwischen der BNO055-IMU und zwei optischen Sensoren per Hardware-Interrupts kreuzvalidiert; ein Hardware-**Watchdog** vervollständigt die Fail-safe-Architektur.

Am Ende dieser Arbeit belegten wir als Team beim TEKNOFEST 2026 den **1. Platz in der Türkei in der Kategorie Technologiedemonstration**.
`,
  },
];
