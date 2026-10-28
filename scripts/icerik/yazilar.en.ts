/**
 * ENGLISH (en-US) TRANSLATION of `./yazilar.ts` — the blog posts.
 * Exports `YAZILAR` with the same shape so the loader can swap it in.
 *
 * RULES
 *   - `translationKey` of every post = the Turkish record's `slug` (ADR-046).
 *   - NO new claims: every number, measurement and decision comes from the
 *     Turkish source. Only the prose is translated; code and tables keep
 *     their structure.
 */

import type { Yazi } from './yazilar';

export const YAZILAR: Yazi[] = [
  {
    slug: 'choosing-an-ocr-engine-by-measuring',
    translationKey: 'ocr-motorunu-olcerek-secmek',
    title: 'Why I chose my OCR engine by measuring',
    excerpt:
      'To read the screen of a production machine with no data output, I compared three OCR options on accuracy, latency, and cost. The winner wasn\'t the most "powerful" one — it was the one that fit the field best.',
    tags: ['ai', 'ocr', 'embedded'],
    content: `## The problem: the data only lives on the screen

During my internship at Samsun Teknopark, the machines I worked with showed their production counters only on the operator screen. There was no PLC output, database, or report file; nobody knew how many minutes of downtime had occurred by the end of a shift.

The idea was simple: capture the screen, read the relevant fields with OCR, and turn the readings into events. The real decision was **which OCR engine** would run reliably in the field.

## Three candidates

- **Mistral OCR** — cloud-based.
- **PaddleOCR** — open source, runs locally.
- **RapidOCR** — runs the same models as PaddleOCR on top of ONNX Runtime.

## Why the cloud was ruled out

Cloud OCR was ruled out for three reasons: **latency**, **cost**, and **data privacy**. For a system doing several readings per second, sending every frame to the cloud is both slow and expensive — and a factory screen is data that shouldn't leave the premises.

## PaddleOCR or RapidOCR?

Since both use the same model, I didn't expect a difference in accuracy. The difference showed up in installation: the field device is a **Raspberry Pi 5**, which means ARM. RapidOCR (ONNX) installed cleanly on ARM, and that decided it.

I also measured model size: **the small model matched the medium model's accuracy and was 3.7× faster**. A bigger model bought nothing here.

## The right engine isn't enough: validation

No OCR reads every frame correctly. So I cross-checked the readings against each other: the quality rate shown on the screen is recomputed from the good/total unit counts and compared with the value that was read. **Readings that don't match are rejected.** Recording a wrong reading is worse than recording none at all.

## Results

| Validated | Result |
| --- | --- |
| Reading 6 fields | 6/6 correct, 99%+ confidence score |
| Stoppage detection | actual 90 s → measured 88 s |
| Outage resilience | 38 pending readings restored from disk |

The lesson: there is no such thing as "the best model" — only **the best model for this particular environment**, and the only way to find it is to measure.
`,
  },
  {
    slug: 'fitting-a-model-on-a-microcontroller',
    translationKey: 'mikrodenetleyiciye-sigan-model',
    title: 'Fitting a 1.1 KB model onto an STM32',
    excerpt:
      "For bearing fault detection, five models performed almost identically. The choice came down not to accuracy but to the microcontroller's memory: 289 parameters, ~1.1 KB in float32.",
    tags: ['tinyml', 'stm32', 'signal processing'],
    content: `## The goal

My project **Predictive-Edge** aims to detect bearing faults in industrial motors early and estimate their remaining useful life (RUL) — and to do it not in the cloud, but **on the microcontroller sitting next to the motor**.

## The features come from physics

Instead of feeding raw vibration straight into the model, I extracted physics-based features. An FFT is taken of the 1 kHz vibration signal, and **8 features**, including harmonic ratio, spectral entropy, RMS, and peak-to-peak value, are computed around the bearing's **outer-race fault frequency** (BPFO, 100 Hz in this setup) and its harmonics. Temperature and current are fed into the model as well.

Good features make a small model's job easier — and on an embedded target, that means everything.

## Five models, nearly the same score

I compared Logistic Regression, Random Forest, SVM, Gradient Boosting, and MLP. All of them landed around **F1 ≈ 0.99**. With accuracy no longer a differentiator, **memory and inference cost** decided the choice.

## Methodology

- **GridSearchCV** and **5-fold cross-validation**.
- The scaler sits **inside the Pipeline** — so no information from the training data leaks into the validation folds.
- For the MLP, the difference between (32, 16) and (16, 8) was within one standard deviation; I chose **(16, 8), which is 3× smaller**.

## By the numbers

| Metric | Value |
| --- | --- |
| Parameters | 289 |
| Model size (float32) | ~1.1 KB |
| With int8 quantization | 289 B |
| Target | STM32H7 (2 MB Flash) |

There's also a monitoring side: a Flask REST API and Chart.js show the health status and remaining useful life of a 200-motor fleet in a single dashboard.

## An honest limitation

The dataset is **synthetic**, generated from a physical fault model. Running the model on an actual STM32 board and validating it with real sensor data is in progress. The 0.99 F1 score should be read in that context.
`,
  },
  {
    slug: 'two-vfds-on-one-rs485-line',
    translationKey: 'tek-rs485-hattinda-iki-vfd',
    title: 'Two VFDs on one RS-485 line: driving a linear motor with Modbus RTU',
    excerpt:
      "Controlling the two Delta MS300 drives that power the Spectraloop pod's linear motor over a single RS-485 line, with an STM32 as the Modbus RTU master — and validating it in the field.",
    tags: ['embedded', 'modbus', 'teknofest'],
    content: `## Context

For three seasons I have led the software team of **Spectraloop**, which competes at TEKNOFEST Hyperloop. The pod is propelled by a linear motor, and the motor is powered by two **Delta MS300** variable-frequency drives (VFDs). My job was the firmware that controls these two drives reliably.

## Why Modbus RTU, and why a single line

Modbus RTU is a simple master/slave protocol widely used in industry between drives and PLCs. RS-485 is the noise-resistant differential line that carries it. Multiple devices can share a single RS-485 line, each identified by its own **slave address**.

The setup I built:

- The **STM32** is the line's **Modbus RTU master**.
- The two MS300s are **slave 1** and **slave 2** on the same line.
- Communication runs at **9600 baud, 8N1**.

## What gets controlled

The firmware sends the drives **forward / reverse / stop** control words and a frequency setpoint of **up to 150 Hz**. I wrote the code on an STM32F407 and later ported it to a Nucleo-F401RE.

## Validation in the field

Code that works on the bench does nothing in the field if the drive isn't configured correctly. I verified the VFD parameters — setting the frequency and run-command source to **RS-485**, and the **upper frequency limit** — by testing them one by one on site.

For testing and observation, I also added a **Python serial↔WebSocket bridge** and a live control panel: we can monitor the pod's drive and send commands from the browser.

## The rest of the pod

The motor drive is part of a larger architecture: the master and slave STM32s communicate over **CAN Bus**, and we used twisted-pair cabling and **120 Ω termination** to cope with high EMI. Position is cross-checked between the BNO055 IMU and dual optical sensors using hardware interrupts, and a hardware **Watchdog** completes the fail-safe design.

At the end of this work, our team took **1st place in Türkiye in the Technology Demonstration category** at TEKNOFEST 2026.
`,
  },
];
