import type { ReactNode } from 'react';

import type { Dil } from '@/i18n/diller';

/**
 * PROJE MİMARİ ŞEMALARI — proje detay sayfasında "Mimari" bölümü.
 *
 * NEDEN İÇERİKTE DEĞİL, KODDA: MDX gövdesi `rehype-sanitize` ile temizleniyor ve
 * JSX/SVG düğümleri BİLEREK düşüyor (mdx.tsx, §8.9). Şemayı görsel dosya olarak
 * yüklemek de olmuyor: SVG yüklemesi ADR-043 ile kapalı, PNG ise metni
 * aranamaz ve temada bulanık yapardı. Şemalar kaynak kodu gibi gözden geçirilen,
 * token renkli, erişilebilir SVG'ler — slug ile eşleşiyor.
 *
 * İÇERİK KAYNAĞI: Portfolyo 2026 PDF'indeki şemalar (kullanıcı, 2026-10-21);
 * kutular ve etiketler oradakiyle aynı, yeni iddia yok.
 *
 * ERİŞİLEBİLİRLİK: her şema `role="img"` + `<title>`/`<desc>`; `desc` akışı
 * düz cümleyle anlatıyor — ekran okuyucu kutuları tek tek okumak zorunda kalmaz.
 */

type Kutu = {
  x: number;
  y: number;
  w: number;
  h: number;
  baslik: string;
  alt?: string;
  vurgu?: boolean;
};

function KutuCiz({ x, y, w, h, baslik, alt, vurgu }: Kutu) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={14}
        fill={vurgu ? 'var(--accent)' : 'var(--bg-elevated)'}
        stroke={vurgu ? 'none' : 'var(--border-hover)'}
      />
      <text
        x={x + w / 2}
        y={alt ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize={15}
        fontWeight={700}
        fill={vurgu ? 'var(--vurgu-uzeri)' : 'var(--text-primary)'}
      >
        {baslik}
      </text>
      {alt && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 16}
          textAnchor="middle"
          fontSize={11.5}
          fill={vurgu ? 'var(--vurgu-uzeri)' : 'var(--text-muted)'}
          fillOpacity={vurgu ? 0.85 : 1}
        >
          {alt}
        </text>
      )}
    </g>
  );
}

function Ok({ d, etiket, ex, ey }: { d: string; etiket?: string; ex?: number; ey?: number }) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="var(--accent-soft)"
        strokeWidth={2}
        markerEnd="url(#ok-ucu)"
      />
      {etiket && ex !== undefined && ey !== undefined && (
        <text x={ex} y={ey} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
          {etiket}
        </text>
      )}
    </g>
  );
}

function Sema({
  id,
  baslik,
  aciklama,
  genislik,
  yukseklik,
  children,
}: {
  id: string;
  baslik: string;
  aciklama: string;
  genislik: number;
  yukseklik: number;
  children: ReactNode;
}) {
  return (
    // Dar ekranda şema yatay kayar; küçültülseydi 11 px'lik etiketler okunmazdı.
    <div className="border-line bg-surface rounded-card overflow-x-auto border p-4 md:p-6">
      <svg
        role="img"
        aria-labelledby={`${id}-baslik ${id}-aciklama`}
        viewBox={`0 0 ${genislik} ${yukseklik}`}
        className="h-auto w-full min-w-[640px]"
      >
        <title id={`${id}-baslik`}>{baslik}</title>
        <desc id={`${id}-aciklama`}>{aciklama}</desc>
        <defs>
          <marker
            id="ok-ucu"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 10 5 0 10Z" fill="var(--accent-soft)" />
          </marker>
        </defs>
        {children}
      </svg>
    </div>
  );
}

/* ===========================================================================
 * METİNLER — ADR-046. Teknik adlar (STM32, CAN, FastAPI…) çevrilmiyor; yalnızca
 * açıklayıcı etiketler ve ekran okuyucu açıklaması.
 * ======================================================================== */

const SPECTRALOOP = {
  tr: {
    baslik: 'Spectraloop kapsül yazılım mimarisi',
    aciklama:
      "Sensörler (BNO055 IMU I²C üzerinden, Omron optik sensörler donanım kesmesiyle) Master STM32'ye bağlı; Master karar, fail-safe ve Watchdog'dan sorumlu ve telemetriyi React, Node.js ve WebSocket yer istasyonuna gönderiyor. Master; Slave STM32, Motor STM32 ve BMS Master (STM32F411, 24 slave, 144S Li-ion) ile CAN Bus üzerinden haberleşiyor. Motor STM32, RS-485 hattında Modbus RTU master olarak iki Delta MS300 VFD'yi (slave 1 ve 2) sürüyor; VFD'ler lineer motoru 150 Hz'e kadar çalıştırıyor.",
    sensorler: 'Sensörler',
    master: 'karar · fail-safe · Watchdog',
    yer: 'Yer İstasyonu',
    telemetri: 'telemetri',
    slave: 'alt sistem kontrolü',
    motor: 'Lineer motor',
    hiz: "150 Hz'e kadar",
  },
  en: {
    baslik: 'Spectraloop pod software architecture',
    aciklama:
      'Sensors (BNO055 IMU over I²C, Omron optical sensors via hardware interrupts) connect to the master STM32, which handles decisions, fail-safe logic and the watchdog and sends telemetry to a React, Node.js and WebSocket ground station. The master talks to a slave STM32, the motor STM32 and the BMS master (STM32F411, 24 slaves, 144S Li-ion) over CAN bus. The motor STM32 acts as Modbus RTU master on an RS-485 line and drives two Delta MS300 VFDs (slaves 1 and 2), which run the linear motor at up to 150 Hz.',
    sensorler: 'Sensors',
    master: 'decisions · fail-safe · watchdog',
    yer: 'Ground station',
    telemetri: 'telemetry',
    slave: 'subsystem control',
    motor: 'Linear motor',
    hiz: 'up to 150 Hz',
  },
  de: {
    baslik: 'Software-Architektur der Spectraloop-Kapsel',
    aciklama:
      'Die Sensoren (BNO055-IMU über I²C, optische Omron-Sensoren über Hardware-Interrupts) sind an den Master-STM32 angebunden, der Entscheidungen, Fail-Safe-Logik und Watchdog übernimmt und Telemetriedaten an eine Bodenstation mit React, Node.js und WebSocket sendet. Der Master kommuniziert über CAN-Bus mit einem Slave-STM32, dem Motor-STM32 und dem BMS-Master (STM32F411, 24 Slaves, 144S-Li-Ionen). Der Motor-STM32 steuert als Modbus-RTU-Master über eine RS-485-Leitung zwei Delta-MS300-Frequenzumrichter (Slave 1 und 2), die den Linearmotor mit bis zu 150 Hz betreiben.',
    sensorler: 'Sensoren',
    master: 'Entscheidung · Fail-Safe · Watchdog',
    yer: 'Bodenstation',
    telemetri: 'Telemetrie',
    slave: 'Subsystemsteuerung',
    motor: 'Linearmotor',
    hiz: 'bis 150 Hz',
  },
} satisfies Record<Dil, Record<string, string>>;

const JWC = {
  tr: {
    baslik: 'JWC hat izleme veri hattı',
    aciklama:
      "Makine panosunun HDMI görüntüsü USB yakalama kartıyla Raspberry Pi 5'e geliyor. GStreamer tee görüntüyü ikiye ayırıyor: bir kol operatör ekranına, diğeri OCR'a gidiyor. Tanımlı okuma bölgeleri RapidOCR (ONNX Runtime) ile okunuyor, okumalar çapraz kontrolle doğrulanıyor ve FastAPI merkez servisinde olaylara, OEE hesabına ve WebSocket canlı yayınına dönüşüyor.",
    adimlar: [
      ['HDMI', 'USB capture'],
      ['GStreamer', 'tee: ekran + OCR'],
      ['ROI + OCR', 'RapidOCR / ONNX'],
      ['Doğrulama', 'çapraz kontrol'],
      ['FastAPI', 'olay · OEE · WS'],
    ],
    not: 'Ağa kare değil, yalnızca okunan değerler gidiyor — saniyede birkaç yüz bayt',
  },
  en: {
    baslik: 'JWC line monitoring data pipeline',
    aciklama:
      "The machine panel's HDMI output reaches a Raspberry Pi 5 through a USB capture card. A GStreamer tee splits the video: one branch goes to the operator display, the other to OCR. The defined reading regions are read with RapidOCR (ONNX Runtime), the readings are cross-checked, and the central FastAPI service turns them into events, OEE figures and a WebSocket live feed.",
    adimlar: [
      ['HDMI', 'USB capture'],
      ['GStreamer', 'tee: display + OCR'],
      ['ROI + OCR', 'RapidOCR / ONNX'],
      ['Validation', 'cross-check'],
      ['FastAPI', 'events · OEE · WS'],
    ],
    not: 'Only the read values go over the network, not frames — a few hundred bytes per second',
  },
  de: {
    baslik: 'Datenpipeline der JWC-Linienüberwachung',
    aciklama:
      'Das HDMI-Signal des Maschinenpanels gelangt über eine USB-Capture-Karte zu einem Raspberry Pi 5. Ein GStreamer-tee teilt das Bild: Ein Zweig geht zum Bedienerbildschirm, der andere zur OCR. Die definierten Lesebereiche werden mit RapidOCR (ONNX Runtime) gelesen, die Werte gegeneinander plausibilisiert und im zentralen FastAPI-Dienst in Ereignisse, OEE-Kennzahlen und einen WebSocket-Livestream umgewandelt.',
    adimlar: [
      ['HDMI', 'USB-Capture'],
      ['GStreamer', 'tee: Bildschirm + OCR'],
      ['ROI + OCR', 'RapidOCR / ONNX'],
      ['Validierung', 'Plausibilitätsprüfung'],
      ['FastAPI', 'Ereignisse · OEE · WS'],
    ],
    not: 'Über das Netz gehen nur die gelesenen Werte, keine Bilder – wenige hundert Byte pro Sekunde',
  },
} satisfies Record<
  Dil,
  { baslik: string; aciklama: string; adimlar: [string, string][]; not: string }
>;

const PREDICTIVE = {
  tr: {
    baslik: 'Predictive-Edge işlem hattı',
    aciklama:
      "1 kHz titreşim sinyalinin FFT'si alınıyor; rulman dış bilezik arıza frekansı (BPFO, 100 Hz) ve harmonikleri üzerinden RMS ve spektral entropi dahil 8 özellik çıkarılıyor. Özellikler 289 parametrelik (16, 8) MLP'ye giriyor; model float32'de yaklaşık 1,1 KB, int8 nicemlemeyle 289 bayt ve STM32H7 hedefleniyor. Flask ve Chart.js paneli 200 motorluk filonun sağlığını ve kalan ömrünü gösteriyor.",
    adimlar: [
      ['Titreşim', '1 kHz sinyal'],
      ['FFT', 'BPFO = 100 Hz'],
      ['8 özellik', 'RMS · entropi · …'],
      ['MLP (16, 8)', '289 parametre'],
      ['STM32H7', '~1,1 KB · int8 289 B'],
    ],
    not: 'İzleme: Flask REST + Chart.js — 200 motorluk filo, sağlık ve kalan ömür (RUL)',
  },
  en: {
    baslik: 'Predictive-Edge processing pipeline',
    aciklama:
      'The FFT of a 1 kHz vibration signal is computed; 8 features, including RMS and spectral entropy, are extracted around the bearing outer-race fault frequency (BPFO, 100 Hz) and its harmonics. The features feed a (16, 8) MLP with 289 parameters; the model is about 1.1 KB in float32 and 289 bytes with int8 quantization, targeting an STM32H7. A Flask and Chart.js dashboard shows the health and remaining useful life of a 200-motor fleet.',
    adimlar: [
      ['Vibration', '1 kHz signal'],
      ['FFT', 'BPFO = 100 Hz'],
      ['8 features', 'RMS · entropy · …'],
      ['MLP (16, 8)', '289 parameters'],
      ['STM32H7', '~1.1 KB · int8 289 B'],
    ],
    not: 'Monitoring: Flask REST + Chart.js — a 200-motor fleet, health and remaining useful life (RUL)',
  },
  de: {
    baslik: 'Verarbeitungspipeline von Predictive-Edge',
    aciklama:
      'Aus einem 1-kHz-Vibrationssignal wird die FFT berechnet; anhand der Außenring-Schadensfrequenz des Lagers (BPFO, 100 Hz) und ihrer Harmonischen werden 8 Merkmale extrahiert, darunter RMS und spektrale Entropie. Die Merkmale gehen in ein (16, 8)-MLP mit 289 Parametern; das Modell umfasst in float32 etwa 1,1 KB, mit int8-Quantisierung 289 Byte, Zielplattform ist ein STM32H7. Ein Dashboard mit Flask und Chart.js zeigt Zustand und Restlebensdauer einer Flotte von 200 Motoren.',
    adimlar: [
      ['Vibration', '1-kHz-Signal'],
      ['FFT', 'BPFO = 100 Hz'],
      ['8 Merkmale', 'RMS · Entropie · …'],
      ['MLP (16, 8)', '289 Parameter'],
      ['STM32H7', '~1,1 KB · int8 289 B'],
    ],
    not: 'Überwachung: Flask REST + Chart.js – Flotte von 200 Motoren, Zustand und Restlebensdauer (RUL)',
  },
} satisfies Record<
  Dil,
  { baslik: string; aciklama: string; adimlar: [string, string][]; not: string }
>;

function Spectraloop({ dil }: { dil: Dil }) {
  const m = SPECTRALOOP[dil];
  return (
    <Sema
      id="sema-spectraloop"
      baslik={m.baslik}
      aciklama={m.aciklama}
      genislik={900}
      yukseklik={430}
    >
      <KutuCiz
        x={20}
        y={20}
        w={220}
        h={64}
        baslik={m.sensorler}
        alt="BNO055 (I²C) · Omron (EXTI)"
      />
      <KutuCiz x={330} y={20} w={240} h={64} baslik="Master STM32" alt={m.master} vurgu />
      <KutuCiz x={660} y={20} w={220} h={64} baslik={m.yer} alt="React · Node.js · WebSocket" />
      <Ok d="M240 52 H324" />
      <Ok d="M570 52 H654" etiket={m.telemetri} ex={612} ey={44} />

      {/* CAN hattı */}
      <path d="M40 160 H860" stroke="var(--warning)" strokeWidth={4} />
      <text x={868} y={164} fontSize={13} fontWeight={700} fill="var(--warning)">
        CAN
      </text>
      <path d="M450 84 V160" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M130 160 V200" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M450 160 V200" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M770 160 V200" stroke="var(--warning)" strokeWidth={2.5} />

      <KutuCiz x={20} y={200} w={220} h={64} baslik="Slave STM32" alt={m.slave} />
      <KutuCiz x={340} y={200} w={220} h={64} baslik="Motor STM32" alt="Modbus RTU master" vurgu />
      <KutuCiz
        x={660}
        y={200}
        w={220}
        h={64}
        baslik="BMS Master (F411)"
        alt="24 slave · 144S Li-ion"
      />

      {/* RS-485 */}
      <path
        d="M450 264 V300 M300 300 H600 M300 300 V336 M600 300 V336"
        stroke="var(--text-muted)"
        strokeWidth={2}
        fill="none"
      />
      <text x={462} y={292} fontSize={11} fill="var(--text-muted)">
        RS-485
      </text>
      <KutuCiz x={200} y={336} w={200} h={64} baslik="MS300 VFD #1" alt="slave 1" />
      <KutuCiz x={500} y={336} w={200} h={64} baslik="MS300 VFD #2" alt="slave 2" />
      <Ok d="M700 368 H770" />
      <text x={780} y={364} fontSize={13} fontWeight={700} fill="var(--text-primary)">
        {m.motor}
      </text>
      <text x={780} y={382} fontSize={11} fill="var(--text-muted)">
        {m.hiz}
      </text>
    </Sema>
  );
}

/** Beş adımlı, soldan sağa akış şeması (JWC, Predictive-Edge). */
function Akis({
  id,
  m,
}: {
  id: string;
  m: { baslik: string; aciklama: string; adimlar: [string, string][]; not: string };
}) {
  return (
    <Sema id={id} baslik={m.baslik} aciklama={m.aciklama} genislik={900} yukseklik={170}>
      {m.adimlar.map(([baslik, alt], i) => (
        <g key={baslik}>
          <KutuCiz
            x={10 + i * 178}
            y={40}
            w={150}
            h={70}
            baslik={baslik}
            alt={alt}
            vurgu={i === m.adimlar.length - 1}
          />
          {i < m.adimlar.length - 1 && <Ok d={`M${160 + i * 178} 75 H${182 + i * 178}`} />}
        </g>
      ))}
      <text x={450} y={150} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        {m.not}
      </text>
    </Sema>
  );
}

/**
 * Çeviri anahtarı → şema. Anahtar dilden bağımsız (ADR-046): İngilizce ya da
 * Almanca kaydın slug'ı farklı olsa da aynı şema bulunur.
 */
export const PROJE_SEMALARI: Record<string, (p: { dil: Dil }) => ReactNode> = {
  'spectraloop-hyperloop': Spectraloop,
  'jwc-hat-izleme': ({ dil }) => <Akis id="sema-jwc" m={JWC[dil]} />,
  'predictive-edge': ({ dil }) => <Akis id="sema-predictive-edge" m={PREDICTIVE[dil]} />,
};
