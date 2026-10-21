import type { ReactNode } from 'react';

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
    <div className="border-line bg-surface overflow-x-auto rounded-[1.5rem] border p-4 md:p-6">
      <svg
        role="img"
        aria-labelledby={`${id}-baslik ${id}-aciklama`}
        viewBox={`0 0 ${genislik} ${yukseklik}`}
        className="font-display h-auto w-full min-w-[640px]"
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

function Spectraloop() {
  return (
    <Sema
      id="sema-spectraloop"
      baslik="Spectraloop kapsül yazılım mimarisi"
      aciklama="Sensörler (BNO055 IMU I²C üzerinden, Omron optik sensörler donanım kesmesiyle) Master STM32'ye bağlı; Master karar, fail-safe ve Watchdog'dan sorumlu ve telemetriyi React, Node.js ve WebSocket yer istasyonuna gönderiyor. Master; Slave STM32, Motor STM32 ve BMS Master (STM32F411, 24 slave, 144S Li-ion) ile CAN Bus üzerinden haberleşiyor. Motor STM32, RS-485 hattında Modbus RTU master olarak iki Delta MS300 VFD'yi (slave 1 ve 2) sürüyor; VFD'ler lineer motoru 150 Hz'e kadar çalıştırıyor."
      genislik={900}
      yukseklik={430}
    >
      <KutuCiz x={20} y={20} w={220} h={64} baslik="Sensörler" alt="BNO055 (I²C) · Omron (EXTI)" />
      <KutuCiz
        x={330}
        y={20}
        w={240}
        h={64}
        baslik="Master STM32"
        alt="karar · fail-safe · Watchdog"
        vurgu
      />
      <KutuCiz
        x={660}
        y={20}
        w={220}
        h={64}
        baslik="Yer İstasyonu"
        alt="React · Node.js · WebSocket"
      />
      <Ok d="M240 52 H324" />
      <Ok d="M570 52 H654" etiket="telemetri" ex={612} ey={44} />

      {/* CAN hattı */}
      <path d="M40 160 H860" stroke="var(--warning)" strokeWidth={4} />
      <text x={868} y={164} fontSize={13} fontWeight={700} fill="var(--warning)">
        CAN
      </text>
      <path d="M450 84 V160" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M130 160 V200" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M450 160 V200" stroke="var(--warning)" strokeWidth={2.5} />
      <path d="M770 160 V200" stroke="var(--warning)" strokeWidth={2.5} />

      <KutuCiz x={20} y={200} w={220} h={64} baslik="Slave STM32" alt="alt sistem kontrolü" />
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
        Lineer motor
      </text>
      <text x={780} y={382} fontSize={11} fill="var(--text-muted)">
        150 Hz'e kadar
      </text>
    </Sema>
  );
}

function Jwc() {
  const adimlar: [string, string][] = [
    ['HDMI', 'USB capture'],
    ['GStreamer', 'tee: ekran + OCR'],
    ['ROI + OCR', 'RapidOCR / ONNX'],
    ['Doğrulama', 'çapraz kontrol'],
    ['FastAPI', 'olay · OEE · WS'],
  ];
  return (
    <Sema
      id="sema-jwc"
      baslik="JWC hat izleme veri hattı"
      aciklama="Makine panosunun HDMI görüntüsü USB yakalama kartıyla Raspberry Pi 5'e geliyor. GStreamer tee görüntüyü ikiye ayırıyor: bir kol operatör ekranına, diğeri OCR'a gidiyor. Tanımlı okuma bölgeleri RapidOCR (ONNX Runtime) ile okunuyor, okumalar çapraz kontrolle doğrulanıyor ve FastAPI merkez servisinde olaylara, OEE hesabına ve WebSocket canlı yayınına dönüşüyor."
      genislik={900}
      yukseklik={170}
    >
      {adimlar.map(([baslik, alt], i) => (
        <g key={baslik}>
          <KutuCiz
            x={10 + i * 178}
            y={40}
            w={150}
            h={70}
            baslik={baslik}
            alt={alt}
            vurgu={i === adimlar.length - 1}
          />
          {i < adimlar.length - 1 && <Ok d={`M${160 + i * 178} 75 H${182 + i * 178}`} />}
        </g>
      ))}
      <text x={450} y={150} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        Ağa kare değil, yalnızca okunan değerler gidiyor — saniyede birkaç yüz bayt
      </text>
    </Sema>
  );
}

function PredictiveEdge() {
  const adimlar: [string, string][] = [
    ['Titreşim', '1 kHz sinyal'],
    ['FFT', 'BPFO = 100 Hz'],
    ['8 özellik', 'RMS · entropi · …'],
    ['MLP (16, 8)', '289 parametre'],
    ['STM32H7', '~1,1 KB · int8 289 B'],
  ];
  return (
    <Sema
      id="sema-predictive-edge"
      baslik="Predictive-Edge işlem hattı"
      aciklama="1 kHz titreşim sinyalinin FFT'si alınıyor; rulman dış bilezik arıza frekansı (BPFO, 100 Hz) ve harmonikleri üzerinden RMS ve spektral entropi dahil 8 özellik çıkarılıyor. Özellikler 289 parametrelik (16, 8) MLP'ye giriyor; model float32'de yaklaşık 1,1 KB, int8 nicemlemeyle 289 bayt ve STM32H7 hedefleniyor. Flask ve Chart.js paneli 200 motorluk filonun sağlığını ve kalan ömrünü gösteriyor."
      genislik={900}
      yukseklik={170}
    >
      {adimlar.map(([baslik, alt], i) => (
        <g key={baslik}>
          <KutuCiz
            x={10 + i * 178}
            y={40}
            w={150}
            h={70}
            baslik={baslik}
            alt={alt}
            vurgu={i === adimlar.length - 1}
          />
          {i < adimlar.length - 1 && <Ok d={`M${160 + i * 178} 75 H${182 + i * 178}`} />}
        </g>
      ))}
      <text x={450} y={150} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
        İzleme: Flask REST + Chart.js — 200 motorluk filo, sağlık ve kalan ömür (RUL)
      </text>
    </Sema>
  );
}

/** Slug → şema. Yeni şema buraya bir satır; proje sayfası kendiliğinden gösterir. */
export const PROJE_SEMALARI: Record<string, () => ReactNode> = {
  'spectraloop-hyperloop': Spectraloop,
  'jwc-hat-izleme': Jwc,
  'predictive-edge': PredictiveEdge,
};
