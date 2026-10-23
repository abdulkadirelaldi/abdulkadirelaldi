/**
 * SİTENİN GERÇEK İÇERİĞİ — kaynak: Abdulkadir Elaldı CV (genel) ve Portfolyo
 * 2026 PDF'leri (kullanıcı, 2026-10-21). `scripts/icerik-yukle.ts` bunu
 * veritabanına yazar; sonrası panelden düzenlenir.
 *
 * KURALLAR
 *   - Belgelerde OLMAYAN hiçbir iddia yok. Belge yalnızca yıl veriyorsa ay
 *     Ocak (başlangıç) / Aralık (bitiş) yazıldı — panelde düzeltilebilir.
 *   - Telefon numarası BİLEREK yok: herkese açık sayfada istenmeyen arama ve
 *     toplayıcı botlar demek. İletişim e-posta, form ve LinkedIn üzerinden.
 *   - Yetenek seviyesi belgelerde yok; `level` sitede GÖSTERİLMİYOR (yalnızca
 *     panelde sıralama için) ve hepsi aynı değerle başlıyor.
 */

export const PROFIL = {
  headline: 'Gömülü Sistemler · Yapay Zeka · Full-Stack',
  subtitle:
    'Samsun Üniversitesi Yazılım Mühendisliği 4. sınıf · Spectraloop Hyperloop yazılım ekip lideri',
  bio: [
    'Donanımla yazılımın buluştuğu uçtan uca sistemler geliştiriyorum: STM32 tabanlı kontrol yazılımından sahada çalışan OCR sistemlerine ve mikrodenetleyicide çalışacak yapay zeka modellerine kadar.',
    "Üç sezondur TEKNOFEST Hyperloop'ta Spectraloop takımının 11 kişilik yazılım ekibini yönetiyorum. STM32 tabanlı kontrol yazılımı, CAN Bus ve Modbus RTU haberleşmesi ile fail-safe mimariler üzerinde çalışıyorum. Takımımla TEKNOFEST 2026 Hyperloop Geliştirme Yarışması'nda Teknoloji Gösterim kategorisinde Türkiye 1.liği, Performans ve Tanımlı Problem Çözme kategorilerinde 3.lük kazandık.",
    "Samsun Teknopark'taki stajımda veri çıkışı olmayan üretim makinelerinin ekranını OCR ile okuyan, sahada doğrulanmış bir hat izleme sistemi geliştirdim. Kıyı Medya'nın kurucu ortağı olarak ajansın yazılım birimini yönetiyor, kurumsal web sitelerini tasarımdan yayına uçtan uca geliştiriyorum.",
    'Son dönemde yapay zekanın güvenilirliği üzerine çalışıyorum: sözleşmelerdeki riskli maddeleri yalnızca birebir alıntıyla gösteren bir LLM sistemi (ToS Risk Guard) ve Türkçe komutla çalışan, her adımını kamerayla doğrulayan bir robot kol (Çoban) geliştirdim.',
    'Gömülü sistemler, uç cihazlarda yapay zeka ve full-stack geliştirmeyi bir araya getirerek uçtan uca ürün çıkarmayı hedefliyorum.',
  ].join('\n\n'),
  location: 'Samsun, Türkiye',
  /**
   * İKİ KİTLEYE: işveren (staj/iş, mezuniyet yılı) ve müşteri (projeler).
   * Yalnızca "yeni projelere açığım" işverene hiçbir şey söylemiyordu.
   */
  availability: 'Staj, iş ve projelere açığım · Mezuniyet 2028',
  socials: {
    github: 'https://github.com/abdulkadirelaldi',
    linkedin: 'https://www.linkedin.com/in/abdulkadirelaldi',
    email: 'elaldiabdulkadir1@gmail.com',
  },
} as const;

export type Kategori =
  'LANGUAGE' | 'EMBEDDED' | 'AI' | 'BACKEND' | 'DATABASE' | 'FRONTEND' | 'MOBILE' | 'TOOLING';

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
      'Kesmeler & Watchdog',
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
      'LLM entegrasyonu (Gemini, Anthropic)',
    ],
  ],
  [
    'BACKEND',
    ['FastAPI', 'Flask', 'Node.js', 'Express', 'tRPC', 'Prisma', 'SQLAlchemy', 'ASP.NET Core'],
  ],
  ['DATABASE', ['PostgreSQL', 'MongoDB', 'SQLite', 'Redis']],
  ['FRONTEND', ['React', 'Next.js', 'HTML / CSS']],
  ['MOBILE', ['Mobil uygulama geliştirme', 'React Native']],
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

/** Belgelerde seviye yok — sitede gösterilmiyor; panelde düzenlenebilir. */
const VARSAYILAN_SEVIYE = 80;

export const YETENEKLER = YETENEK_GRUPLARI.flatMap(([category, adlar]) =>
  adlar.map((name) => ({ name, category, level: VARSAYILAN_SEVIYE })),
).map((yetenek, i) => ({ ...yetenek, order: i + 1 }));

export type Deneyim = {
  type: 'WORK' | 'EDUCATION' | 'AWARD' | 'CERTIFICATE' | 'SPORT';
  organization: string;
  role: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
};

export const DENEYIMLER: Deneyim[] = [
  // ------------------------------------------------------------------ İŞ ---
  {
    type: 'WORK',
    organization: 'Spectraloop Teknoloji Takımı — TEKNOFEST Hyperloop',
    role: 'Yazılım Mimarı & Ekip Lideri',
    startDate: '2023-11-01',
    current: true,
    description:
      "11 kişilik yazılım ekibini 3 sezondur yönetiyorum; alt sistem gruplarını (sensörler, CAN, navigasyon, BMS, gerçek zamanlı kontrol, telemetri) ve Teknik Tasarım Raporu sürecini koordine ediyorum; rapor 2026'da 500 üzerinden 468,5 puanla 1. oldu. İki Delta MS300 VFD'yi tek RS-485 hattında Modbus RTU ile süren STM32 firmware'ini geliştirdim; itki ve fren sistemleri TÜBİTAK Gebze yerleşkesinde sahada test edildi.",
  },
  {
    type: 'WORK',
    organization: 'Adapha Yapay Zeka Ar-Ge ve Yazılım A.Ş. (Samsun Teknopark)',
    role: 'Stajyer',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description:
      'İki uçtan uca proje: (1) JWC Hat İzleme Sistemi — Raspberry Pi 5 saha cihazı, GStreamer görüntü hattı, ARM üzerinde RapidOCR / ONNX Runtime ile 6 alanın tamamı sahada %99+ güvenle okundu; FastAPI olay motoru, WebSocket ile React Native panellere anlık OEE. (2) Radar — işletme hesaplarını analiz edip raporlayan bulut tabanlı aday tarama ve denetim sistemi: async FastAPI, PostgreSQL, Redis, Playwright ve Next.js; deterministik kurallar iki kademeli LLM (Anthropic) ile destekleniyor.',
  },
  {
    type: 'WORK',
    organization: 'Kıyı Medya — 360° dijital ajans',
    role: 'Kurucu Ortak & Yazılım Birimi Sorumlusu',
    startDate: '2024-09-01',
    current: true,
    description:
      "Ajansın kuruluşunda ve yazılım biriminin yönetiminde yer alıyorum; 50'den fazla firmaya 500'den fazla proje teslim edildi. 5 kurumsal web sitesini uçtan uca geliştirdim, bir mobil uygulamanın geliştirme sürecini yürütüyorum.",
  },
  {
    type: 'WORK',
    organization: 'SEA STARS Takımı — TEKNOFEST İnsansız Sualtı Sistemleri',
    role: 'Yazılım Ekip Lideri',
    startDate: '2024-09-01',
    endDate: '2026-09-30',
    description:
      'Otonom sualtı aracının görev yazılımını geliştiren ekibi yönettim: Jetson Nano, STM32 ve Arduino arasında seri haberleşme, YOLO / TensorFlow tabanlı nesne tespiti. TEKNOFEST 2026 Kritik Tasarım Raporu aşaması 83,1 puanla tamamlandı.',
  },
  {
    type: 'WORK',
    organization: 'TesisBul.com',
    role: 'Kurucu & CEO',
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    description:
      "Halı saha gibi spor tesislerinin ön ödemeli ya da ödemesiz online rezervasyonunu sağlayan platformu sıfırdan geliştirdim; ürünün işleyişinden ve stratejik gelişiminden sorumluydum. Yaklaşık 20 şehirde 100'den fazla işletmeye yönelik pazarlama ve saha çalışması yürüttüm.",
  },
  {
    type: 'WORK',
    organization: 'Provezza Takımı — TEKNOFEST İnsansız Sualtı Sistemleri',
    role: 'Yazılım Ekip Lideri',
    startDate: '2021-01-01',
    endDate: '2021-12-31',
    description:
      'Lise döneminde otonom sualtı aracının yazılım ekibine liderlik ettim; Jetson Nano, Arduino, STM32 ve YOLO / TensorFlow ile TEKNOFEST finalisti olduk.',
  },
  // -------------------------------------------------------------- EĞİTİM ---
  {
    type: 'EDUCATION',
    organization: 'Samsun Üniversitesi',
    role: 'Yazılım Mühendisliği (Lisans) — 4. sınıf',
    startDate: '2023-10-01',
    current: true,
    description: 'Beklenen mezuniyet: Haziran 2028.',
  },
  {
    type: 'EDUCATION',
    organization: 'Atatürk Üniversitesi',
    role: 'Hukuk Fakültesi (Lisans)',
    startDate: '2022-01-01',
    endDate: '2023-12-31',
    description:
      "Ek Madde 1 kapsamında Samsun Üniversitesi Yazılım Mühendisliği'ne yatay geçiş yaptım.",
  },
  {
    type: 'EDUCATION',
    organization: 'Deneyap Teknoloji Atölyeleri',
    role: 'Mezun',
    startDate: '2019-01-01',
    endDate: '2022-12-31',
    description:
      'Robotik kodlama, mobil uygulama, nanoteknoloji ve malzeme bilimi, tasarım ve üretim.',
  },
  // ---------------------------------------------------------------- ÖDÜL ---
  {
    type: 'AWARD',
    role: 'Türkiye 1.liği',
    organization: 'TEKNOFEST 2026 Hyperloop Geliştirme Yarışması · Teknoloji Gösterim',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: 'Türkiye 3.lüğü',
    organization: 'TEKNOFEST 2026 Hyperloop Geliştirme Yarışması · Performans',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: 'Türkiye 3.lüğü',
    organization: 'TEKNOFEST 2026 Hyperloop Geliştirme Yarışması · Tanımlı Problem Çözme',
    startDate: '2026-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: 'TTR 1.liği',
    organization: 'TEKNOFEST 2026 Hyperloop · Performans Kategorisi Teknik Tasarım Raporu',
    startDate: '2026-06-01',
    description: 'Spectraloop · 468,5/500',
  },
  {
    type: 'AWARD',
    role: 'Mekanik Sistem Geliştirme Ödülü',
    organization: 'TEKNOFEST 2025 Hyperloop Geliştirme Yarışması · Finalist',
    startDate: '2025-09-01',
    description: 'Spectraloop',
  },
  {
    type: 'AWARD',
    role: 'Samsun 1.liği',
    organization: 'TUA Astro Hackathon · CubeSat',
    startDate: '2024-01-01',
    description: 'Takım Kaptanı',
  },
  {
    type: 'AWARD',
    role: '1.lik',
    organization: 'Deneyap Teknoloji Şenlikleri · Robotik Kodlama, Erzurum',
    startDate: '2021-01-01',
    description: 'Takım Kaptanı',
  },
  {
    type: 'AWARD',
    role: 'Finalist',
    organization: 'TEKNOFEST 2021 İnsansız Sualtı Sistemleri Yarışması',
    startDate: '2021-09-01',
    description: 'Provezza · Yazılım Ekip Lideri',
  },
  // ----------------------------------------------------------- SERTİFİKA ---
  // Kaynak: LinkedIn "Lisanslar ve sertifikalar" (2026-10-23) + TEI katılım
  // belgesi (LinkedIn gönderisi, Haziran 2026). Tarih = veriliş ayı.
  {
    type: 'CERTIFICATE',
    role: 'Teknofest Hyperloop Geliştirme Yarışması Finalist',
    organization: 'TEKNOFEST',
    startDate: '2025-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Asp.Net Core Web API Eğitimi',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'ASP.NET Core MVC Eğitimi',
    organization: 'BTK Akademi',
    startDate: '2025-01-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Web Servislerine Giriş Eğitimi',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Uygulamalarla Nesne Yönelimli Programlama Eğitimi',
    organization: 'BTK Akademi',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Girişimcilik Eğitimi',
    organization: 'KOSGEB',
    startDate: '2024-11-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Havacılık Motorları Okulu (6. Dönem)',
    organization: 'TEI — TUSAŞ Motor Sanayii',
    startDate: '2026-06-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Gönüllü Görevli Teşekkür Belgesi',
    organization: 'TEKNOFEST',
    startDate: '2023-04-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'İnsansız Sualtı Sistemleri Yarışması Katılım Belgesi',
    organization: 'TEKNOFEST',
    startDate: '2021-09-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Mobil Uygulama Eğitimi',
    organization: 'Deneyap Türkiye',
    startDate: '2022-05-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Nanoteknoloji ve Malzeme Bilimi Eğitimi',
    organization: 'Deneyap Türkiye',
    startDate: '2022-02-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Robotik Kodlama Eğitimi',
    organization: 'Deneyap Türkiye',
    startDate: '2019-12-01',
  },
  {
    type: 'CERTIFICATE',
    role: 'Tasarım ve Üretim Eğitimi',
    organization: 'Deneyap Türkiye',
    startDate: '2019-09-01',
  },
  // ---------------------------------------------------------------- SPOR ---
  // Kaynak: site sahibi (2026-10-23). Tek tarih = DERECE, aralık = TAKIM
  // (schema.prisma). Turnuva dönemi adın içinde; tarih yalnızca sıralama için.
  {
    type: 'SPORT',
    role: 'Şampiyon',
    organization: 'Erzurum İlkokullar Arası Spor Şenlikleri',
    startDate: '2013-01-01',
    description: 'Yakan top',
  },
  {
    type: 'SPORT',
    role: 'Madalya',
    organization: 'Erzurum',
    startDate: '2014-01-01',
    description: 'Artistik buz pateni',
  },
  {
    type: 'SPORT',
    role: 'Şampiyon',
    organization: 'Yıldızkent Minikler',
    startDate: '2015-01-01',
    description: 'Futbol',
  },
  {
    type: 'SPORT',
    role: '3.lük',
    organization: 'Ortaokullar Arası Turnuva',
    startDate: '2016-01-01',
    description: 'Masa tenisi',
  },
  {
    type: 'SPORT',
    role: 'Şampiyon',
    organization: 'Türkiye Tenis Federasyonu · Batman Doğu Ligi',
    startDate: '2018-01-01',
    description: 'Tenis',
  },
  {
    type: 'SPORT',
    role: '2.lik',
    organization: 'Liseler Arası Turnuva',
    startDate: '2019-01-01',
    description: 'Tenis',
  },
  {
    type: 'SPORT',
    role: '1.lik',
    organization: 'Samsun Üniversitesi · 2023–2024 Bahar Dönemi Turnuvası',
    startDate: '2024-03-01',
    description: 'Voleybol',
  },
  {
    type: 'SPORT',
    role: '1.lik',
    organization: 'Samsun Üniversitesi · 2024–2025 Güz Dönemi Turnuvası',
    startDate: '2024-10-01',
    description: 'Voleybol',
  },
  {
    type: 'SPORT',
    role: '3.lük (Kaptan)',
    organization: 'Samsun Üniversitesi · 2024–2025 Bahar Dönemi Turnuvası',
    startDate: '2025-03-01',
    description: 'Futbol',
  },
  {
    type: 'SPORT',
    role: '2.lik',
    organization: 'Samsun Üniversitesi · 2024–2025 Bahar Dönemi Turnuvası',
    startDate: '2025-03-02',
    description: 'Plaj voleybolu',
  },
  {
    type: 'SPORT',
    role: '1.lik',
    organization: 'Samsun Üniversitesi · 2025–2026 Güz Dönemi Turnuvası',
    startDate: '2025-10-01',
    description: 'Voleybol',
  },
  {
    type: 'SPORT',
    role: '1.lik',
    organization: 'Samsun Üniversitesi · 2025–2026 Bahar Dönemi Turnuvası',
    startDate: '2026-03-01',
    description: 'Voleybol',
  },
  {
    type: 'SPORT',
    role: 'Kaptan',
    organization: 'Erzurum Nevzat Karabağ Anadolu Lisesi Voleybol Takımı',
    startDate: '2019-09-01',
    endDate: '2020-06-30',
  },
  {
    type: 'SPORT',
    role: 'Oyuncu',
    organization: 'Atatürk Üniversitesi Hukuk Fakültesi Futbol Takımı',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
  {
    type: 'SPORT',
    role: 'Oyuncu',
    organization: 'Atatürk Üniversitesi Hukuk Fakültesi Voleybol Takımı',
    startDate: '2022-09-01',
    endDate: '2023-06-30',
  },
];

export type Proje = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  stack: string[];
  liveUrl?: string;
  clientName?: string;
  featured: boolean;
  /** Projenin dönemi — YALNIZCA belgede tarihi olanlarda; boşsa sitede tarih yok. */
  period?: string;
  /** Müşteriye teslim edilen ticari iş (detayın çağrısı Kıyı Medya). */
  commercial?: boolean;
  /**
   * ADR-046 — dil karşılığı anahtarı. Türkçede yazılmaz (slug kullanılır);
   * çevirilerde Türkçe kaydın slug'ı — dil seçici ve hreflang bununla eşler.
   */
  translationKey?: string;
};

export const PROJELER: Proje[] = [
  {
    slug: 'spectraloop-hyperloop',
    period: '2023 – sürüyor',
    title: 'Spectraloop — Hyperloop Kapsül Kontrol Yazılımı',
    summary:
      "TEKNOFEST Hyperloop kapsülünün STM32 tabanlı kontrol yazılımı: CAN Bus, Modbus RTU ile lineer motor sürüşü ve fail-safe mimari. 2026'da Teknoloji Gösterim kategorisinde Türkiye 1.liği.",
    tags: ['Gömülü', 'Ekip liderliği', 'TEKNOFEST'],
    stack: ['STM32', 'CAN Bus', 'Modbus RTU', 'RS-485', 'I²C', 'Watchdog', 'React', 'WebSocket'],
    featured: true,
    content: `## Problem

Lineer motorla itilen kapsülün yüksek EMI altında güvenilir haberleşmesi, konum ve hızını doğru bilmesi ve herhangi bir arızada güvenli duruma geçmesi gerekiyor.

## Benim katkım

- **Lineer motor sürüşü:** İki Delta MS300 VFD'yi tek RS-485 hattında **Modbus RTU** (9600 baud, 8N1, slave 1 ve 2) ile süren STM32 firmware'ini geliştirdim: ileri/geri/dur kontrol sözcükleri ve 150 Hz'e kadar frekans. Kodu STM32F407'den Nucleo-F401RE'ye taşıdım.
- **Saha doğrulaması:** VFD parametrelerini (frekans ve çalıştırma kaynağı RS-485, üst frekans sınırı) sahada test ederek doğruladım. Python seri↔WebSocket köprüsü ve canlı kontrol paneli ekledim.
- **Ekip yönetimi:** 11 kişilik ekibi 6 alt sistem grubuna ayırdım (sensörler, CAN, navigasyon, BMS, RTOS, telemetri) ve Teknik Tasarım Raporu sürecini koordine ettim.

## Ekip olarak geliştirdiklerimiz

- Master/Slave STM32 arasında **CAN Bus**; bükümlü çift kablo + 120 Ω sonlandırma ile EMI'ye dayanıklılık
- BNO055 IMU (I²C) + çift Omron optik sensör, donanım kesmeleriyle çapraz doğrulamalı konum
- Donanımsal **Watchdog** ile fail-safe; 144S batarya için 24 slave'li CAN tabanlı BMS
- React + Node.js + WebSocket yer istasyonu

## Sonuç — TEKNOFEST 2026

| Kategori | Derece |
| --- | --- |
| Teknoloji Gösterim | Türkiye 1.liği |
| Performans | Türkiye 3.lüğü |
| Tanımlı Problem Çözme | Türkiye 3.lüğü |
| Performans — Teknik Tasarım Raporu | 1.lik |
`,
  },
  {
    slug: 'jwc-hat-izleme',
    period: '2026',
    title: 'JWC Hat İzleme Sistemi — Ekrandan Üretim Verisi',
    summary:
      "Veri çıkışı olmayan üretim makinelerinin ekranını Raspberry Pi 5 üzerinde OCR ile okuyan, sahada doğrulanmış hat izleme sistemi: 6/6 alan %99+ güvenle, 90 sn'lik duruş 88 sn ölçüldü.",
    tags: ['Yapay zeka', 'OCR', 'Endüstri'],
    stack: [
      'Raspberry Pi 5',
      'GStreamer',
      'RapidOCR',
      'ONNX Runtime',
      'FastAPI',
      'SQLAlchemy',
      'WebSocket',
    ],
    clientName: 'Adapha Yapay Zeka Ar-Ge (Samsun Teknopark) — staj',
    featured: true,
    content: `## Problem

Fabrikadaki makineler üretim sayaçlarını yalnızca operatör ekranında gösteriyordu; PLC çıkışı, veritabanı veya rapor dosyası yoktu. Vardiya sonunda kaç dakika duruş yaşandığı bilinmiyordu.

## Çözüm

- **Saha cihazı:** HDMI → USB capture → Raspberry Pi 5. GStreamer \`tee\` ile görüntü ikiye ayrılıyor: bir kol operatör ekranına kesintisiz gidiyor, diğeri OCR'a. Ağa kare değil, yalnızca okunan değerler gidiyor (saniyede birkaç yüz bayt).
- **OCR motoru seçimi ölçümle:** Bulut OCR (Mistral) gecikme, maliyet ve veri gizliliği nedeniyle elendi. PaddleOCR ile RapidOCR aynı modeli kullanıyor; ARM'de sorunsuz kurulduğu için RapidOCR (ONNX) seçildi. *small* model, *medium* ile aynı doğrulukta ve 3,7 kat daha hızlı.
- **Olay motoru:** Durum makinesi ham okumaları olaya çeviriyor: duruş, model değişimi, sayaç sıfırlanması, kalite uyarısı, sinyal kaybı. Duruşlar sayacın son arttığı ana geriye dönük damgalanıyor; çıktılardan OEE hesaplanıyor.
- **Doğrulama:** Okunan kalite oranı sağlam/toplam hesabıyla karşılaştırılıyor; tutmayan okuma reddediliyor.

## Saha sonuçları

| Doğrulanan yetenek | Sonuç |
| --- | --- |
| 6 alanın OCR ile okunması | 6/6 doğru, güven skoru %99+ |
| Duruş tespiti | Gerçek 90 sn → ölçülen 88 sn |
| Kesinti dayanıklılığı | 38 bekleyen okuma diskten geri yüklendi |
| Model değişimi / sayaç sıfırlanması | Her iki yönde yakalandı |
`,
  },
  {
    slug: 'coban-robot-kol',
    period: '2026',
    title: 'Çoban — Türkçe Komutla Çalışan Robot Kol',
    summary:
      'Türkçe komutla çalışan, her adımı kamerayla doğrulayan kapalı döngü robot kol: Shepherd Robotics (YC F26) yaklaşımını Türk sanayisine uyarladım. Gerçek Gemini API ile 5 senaryo, 43 otomatik test.',
    tags: ['Fiziksel yapay zeka', 'Robotik', 'Gömülü'],
    stack: ['Python', 'Gemini API', 'Dijital ikiz (simülasyon)'],
    featured: true,
    content: `## Soru

Türkiye'deki bir KOBİ, robot programcısı olmadan bir robota "çatlak konnektörü hurdaya at" diyebilir mi? Çıkış noktası Y Combinator'ın Fall 2026 *Request for Startups* listesindeki "fiziksel dünya için yeni işletim sistemleri" çağrısı ve aynı dönem YC'ye kabul edilen Shepherd Robotics oldu. Çoban, bu yaklaşımın Türk sanayisine uyarlanmış bir klonu.

## Bileşenler

- **Kapalı döngü görev yürütme:** Gemini her adımda kameradan gelen yeni görüntüye bakarak sıradaki hareketi seçiyor ve bir önceki adımın gerçekten başarılı olup olmadığını kontrol ediyor.
- **Görme + dokunma füzyonu:** Görüntüden fark edilemeyen 1–2 cm'lik kaymaları gripper sensörü yakalıyor, sistem yeniden planlıyor.
- **Bitiş doğrulaması:** Model "bitti" dediğinde ayrı bir kalite kontrol adımı son görüntüyü sayıyor; eksik varsa görev devam ediyor.
- **Dijital ikiz:** Robot olmadan da aynı kodun çalıştığı simülasyon; Bursa'daki otomotiv tedarikçilerini örnek alan kablo demeti kitting ve çatlak parça kalite kontrol senaryoları.
- **KVKK uyumlu görüntü işleme:** Görüntü buluta gönderilmeden önce çalışanların yüzleri cihaz üzerinde bulanıklaştırılıyor.
- **Veri çarkı:** Her görev, ileride açık kaynak bir robot modelini eğitmek için veri seti olarak kaydediliyor.

## Gerçek Gemini ile sonuçlar

| Görev | Sonuç | Gösterdiği |
| --- | --- | --- |
| Kırmızı küpleri sarı kutuya koy | Tamamlandı (5 adım) | Çok adımlı planlama, her adımın görüntüyle doğrulanması |
| Çatlak konnektörü hurda kutusuna at | Tamamlandı (3 adım) | Görsel kalite kontrol |
| Mor küpü beyaz tepsiye koy | İmkânsız | Masada olmayan nesne için robotu hiç hareket ettirmeme |
| Aynı görev, %40 tutma hatasıyla | Tamamlandı (8 adım) | Sensör 2 kaymayı yakalıyor; erken "bitti" kararı reddediliyor |

Sistem 5 senaryoda gerçek Gemini API'siyle test edildi ve 43 otomatik testle doğrulandı.

## En çok öğreten kısım: hatalar

Model kayan bir parçayı fark etmedi, beyaz konnektörü siyah sandı, görev bitmeden "bitti" dedi. Her birini bir mühendislik çözümüyle kapattım. **Modelin "bitti" demesi, işin bittiği anlamına gelmiyor.**

## Hedef

Robot yoğunluğu dünya ortalamasının altında kalan Türk imalat sektörü için düşük maliyetli, Türkçe anlayan ve güvenilir bir otomasyon yaklaşımı.

*Rehberliği ve akademik katkıları için Dr. Öğr. Üyesi Nurettin Şenyer'e teşekkür ederim.*
`,
  },
  {
    slug: 'tos-risk-guard',
    period: '2026',
    title: 'ToS Risk Guard — Alıntı Kanıtlı Sözleşme Risk Analizi',
    summary:
      'Kullanım koşulları ve gizlilik politikalarındaki riskli maddeleri yalnızca birebir alıntıyla gösteren Chrome eklentisi: "yapay zekâya güvenmeyen bir yapay zekâ sistemi". 6 gerçek sözleşmede %95 kesinlik; 4 gizli prompt injection denemesinin 4\'ü yakalandı.',
    tags: ['Yapay zeka', 'LLM güvenliği', 'Chrome eklentisi'],
    stack: ['Chrome Extension (MV3)', 'Gemini API', 'JSON Schema', 'Cypress'],
    featured: true,
    content: `## Problem

"Kabul ediyorum" kutusunu işaretlemeden önce sözleşmeyi okuyan çok az. ToS Risk Guard; kullanım koşulları, gizlilik politikası veya abonelik şartları sayfası açıldığında metni yakalıyor ve riskli maddeleri sade Türkçeyle açıklıyor.

## Tasarım ilkesi: LLM'e güvenmeyen bir LLM sistemi

- **Her iddia alıntıyla:** Her riskli madde sözleşmeden birebir alıntıyla gösteriliyor. Alıntısı orijinal metinde bulunamayan iddia, kullanıcıya hiç gösterilmeden eleniyor.
- **Skoru kod hesaplıyor:** Risk skoru (0–100) LLM'den değil, yalnızca doğrulanmış maddelerden sabit ağırlıklarla hesaplanıyor.
- **Serbest metin yok:** LLM çıktısı JSON şemayla alınıp deterministik olarak yeniden doğrulanıyor.
- **Prompt injection ayıklanıyor:** Sayfaya gizlenmiş "yapay zekâya talimat" denemeleri LLM'e ulaşmadan ayıklanıyor ve kullanıcıya uyarı olarak gösteriliyor.
- **Emin değilse söylüyor:** Sistem emin olmadığında bunu gerekçeleriyle bildiriyor: "Düşük güven — sistem emin değil".

## Değerlendirme

6 gerçek sözleşme (Netflix, Spotify, YouTube, Zoom, GitHub, Dropbox) üzerinde mini değerlendirme:

| Ölçü | Sonuç |
| --- | --- |
| Kesinlik (precision) | %95 — gösterilen maddelerin %95'i doğru |
| Duyarlılık (recall) | %51 — maddelerin yaklaşık yarısı kaçırılıyor |
| Daha güçlü modelle duyarlılık | %62, ama analiz 10–60 kat yavaş |
| Gizli prompt injection | 4 denemenin 4'ü yakalandı, skor manipüle edilemedi |

Kaçırılan ve yanlış alarm veren her maddeyi depoda tek tek listeledim; sistemin zayıf yanlarını da görünür kılmak istedim.

## Kullanılanlar

Chrome Extension (Manifest V3), Gemini API, Alibaba'nın açık kaynak page-agent kütüphanesi (yalnızca okuma amaçlı, en az yetki ilkesiyle), JSON şema doğrulama, Cypress ile uçtan uca test ve demo kaydı.

> Uygulama hukuki tavsiye vermez; yalnızca bir ön okuma aracıdır.

*Yönlendirmeleri için Dr. Öğr. Üyesi Nurettin Şenyer'e teşekkür ederim.*
`,
  },
  {
    slug: 'predictive-edge',
    title: 'Predictive-Edge — Mikrodenetleyicide Kestirimci Bakım',
    summary:
      "Endüstriyel motorlarda rulman arızasını önceden tespit eden ve kalan ömrü (RUL) kestiren TinyML sistemi: STM32H7'ye sığan 289 parametrelik (~1,1 KB) model. Bitirme projesi.",
    tags: ['TinyML', 'Sinyal işleme', 'Bitirme projesi'],
    stack: ['Python', 'NumPy', 'scikit-learn', 'STM32H7', 'Flask', 'Chart.js'],
    featured: true,
    content: `## Yaklaşım

- **Fiziğe dayalı özellikler:** 1 kHz titreşim sinyalinin FFT'si alınıyor. Rulman dış bilezik arıza frekansı (BPFO = 100 Hz) ve harmonikleri üzerinden harmonik oran, spektral entropi, RMS ve tepe-tepe değer dahil 8 özellik çıkarılıyor; sıcaklık ve akım da modele katılıyor.
- **Model seçimi gömülü kısıta göre:** Lojistik Regresyon, Random Forest, SVM, Gradient Boosting ve MLP neredeyse aynı başarıyı verdi (F1 ≈ 0,99). Seçimi bellek ve çıkarım maliyeti belirledi.
- **Metodoloji:** GridSearchCV ve 5 katlı çapraz doğrulama. Ölçekleyici Pipeline içinde, böylece veri sızıntısı yok. (32,16) ile (16,8) arasındaki fark standart sapmanın altında kaldığı için 3 kat küçük olan (16,8) seçildi.
- **Gömülü hedef:** 289 parametre ≈ 1,1 KB (float32) — STM32H7'nin 2 MB Flash'ının çok küçük bir kısmı; int8 nicemlemeyle 289 B'a iniyor.
- **İzleme paneli:** Flask REST API + Chart.js ile 200 motorluk filonun sağlık durumu ve kalan ömrü.

## Sayılar

| Ölçü | Değer |
| --- | --- |
| F1 (sentetik veri) | 0,99 |
| Parametre | 289 |
| Model boyutu | ~1,1 KB (float32) · 289 B (int8) |

## Sınırlılık ve sonraki adım

Veri seti fiziksel arıza modeline dayalı sentetik veridir. Modelin gerçek STM32 kartında çalıştırılması ve gerçek sensör verisiyle doğrulanması devam ediyor.
`,
  },
  {
    slug: 'iscev-is-yonetim-platformu',
    title: 'İSÇEV — Kurumsal İş Yönetim Platformu',
    summary:
      'Next.js, tRPC ve Prisma ile geliştirilen kurumsal iş yönetim platformu: RBAC, değiştirilemez denetim izi, AES-256-GCM alan şifreleme ve BullMQ kuyrukları.',
    tags: ['Full-stack', 'Kurumsal'],
    stack: ['Next.js', 'TypeScript', 'tRPC', 'Prisma', 'PostgreSQL', 'Redis', 'BullMQ'],
    featured: true,
    content: `## Kapsam

Kurumsal iş süreçlerini tek panelde toplayan web platformu. Next.js, TypeScript, tRPC ve Prisma (PostgreSQL, Redis) ile geliştiriliyor.

## Güvenlik

- Rol tabanlı erişim kontrolü (**RBAC**)
- **Değiştirilemez denetim izi**
- **AES-256-GCM** ile alan şifreleme

## Altyapı

- BullMQ tabanlı e-posta bildirim kuyrukları

## Geliştirme süreci

Geliştirme, çoklu yapay zeka ajanlarının orkestrasyonuna dayalı bir iş akışıyla yürütülüyor.
`,
  },
  {
    slug: 'kiyi-medya-kurumsal-site',
    commercial: true,
    title: 'Kıyı Medya — Kurumsal Site',
    summary:
      'Kurucu ortağı olduğum 360° dijital ajansın kurumsal sitesi — tasarımdan yayına uçtan uca.',
    tags: ['Kurumsal site', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://kiyimedya.com',
    clientName: 'Kıyı Medya',
    featured: false,
    content: `## Kıyı Medya

Kuruluşunda ve yazılım biriminin yönetiminde yer aldığım 360° dijital ajans. 50'den fazla firmaya 500'den fazla proje teslim edildi.

Ajansın kurumsal sitesini tasarımdan yayına uçtan uca geliştirdim.
`,
  },
  {
    slug: 'iscev-aritma-kurumsal-site',
    commercial: true,
    title: 'İSÇEV Arıtma — Kurumsal Site',
    summary:
      'Arıtma ve çevre teknolojileri firması için kurumsal web sitesi — Kıyı Medya bünyesinde.',
    tags: ['Kurumsal site', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://iscevaritma.com.tr',
    clientName: 'İSÇEV Arıtma',
    featured: false,
    content: `## Proje

Endüstriyel atıksu arıtma ve çevre teknolojileri alanında çalışan firma için kurumsal web sitesi. Kıyı Medya bünyesinde, tasarımdan yayına uçtan uca geliştirildi.
`,
  },
  {
    slug: 'askar-medikal-kurumsal-site',
    commercial: true,
    title: 'Askar Medikal — Kurumsal Site',
    summary: 'Tıbbi cihaz tedarikçisi için kurumsal web sitesi — Kıyı Medya bünyesinde.',
    tags: ['Kurumsal site', 'Kıyı Medya'],
    stack: [],
    liveUrl: 'https://askarmedikal.com',
    clientName: 'Askar Medikal',
    featured: false,
    content: `## Proje

Tıbbi cihaz tedarikçisi için kurumsal web sitesi. Kıyı Medya bünyesinde, tasarımdan yayına uçtan uca geliştirildi.
`,
  },
  {
    slug: 'tesisbul',
    period: '2024 – 2025',
    title: 'TesisBul.com — Spor Tesisi Rezervasyon Platformu',
    summary:
      "Halı saha gibi spor tesislerini online ve ön ödemeli rezerve etmeyi sağlayan, sıfırdan geliştirdiğim platform; yaklaşık 20 şehirde 100'den fazla işletmeye yönelik saha ve pazarlama çalışması.",
    tags: ['Girişim', 'Rezervasyon'],
    stack: [],
    featured: false,
    content: `## Girişim

Haziran 2024 – Şubat 2025 arasında kurucusu ve CEO'su olduğum girişim. Kullanıcıların halı saha gibi spor tesislerini hızlı ve güvenli biçimde, tesise gitmeden önce ön ödemeyle ya da ödemesiz rezerve edebildiği platformu sıfırdan geliştirdim; ürünün işleyişinden ve stratejik gelişiminden sorumluydum.

## Saha

Yaklaşık 20 şehirde 100'den fazla işletmeye yönelik pazarlama ve saha çalışması yürüttüm.
`,
  },
];

/**
 * HİZMETLER — Kıyı Medya üzerinden yürüyen ticari işler (CTA boş → Kıyı Medya).
 * Her başlık belgelerdeki GERÇEK bir işe dayanıyor: 5 kurumsal site
 * (kiyimedya.com, iscevaritma.com.tr, askarmedikal.com…), İSÇEV ve TesisBul
 * platformları, yürütülen mobil uygulama. Gömülü/yapay zeka işleri ticari hizmet
 * olarak listelenmedi — belgelerde öyle bir teklif yok.
 */
export const HIZMETLER = [
  {
    title: 'Kurumsal web sitesi',
    description:
      'Tasarımdan yayına uçtan uca: hızlı, arama motoru dostu ve içeriği panelden yönetilen kurumsal siteler. Kıyı Medya ile 5 kurumsal site bu şekilde teslim edildi.',
  },
  {
    title: 'Web uygulaması ve yönetim paneli',
    description:
      'Rol tabanlı yetki, denetim izi ve iş akışlarıyla kurumsal platformlar; rezervasyon ve iş yönetimi gibi işe özel uygulamalar. Next.js, TypeScript ve PostgreSQL ile.',
  },
  {
    title: 'Mobil uygulama',
    description:
      'Fikirden mağazaya mobil uygulama geliştirme süreci — gereksinim, tasarım, geliştirme ve yayın. Kıyı Medya bünyesinde yürütülüyor.',
  },
];
