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
    'Gömülü sistemler, uç cihazlarda yapay zeka ve full-stack geliştirmeyi bir araya getirerek uçtan uca ürün çıkarmayı hedefliyorum.',
  ].join('\n\n'),
  location: 'Samsun, Türkiye',
  socials: {
    github: 'https://github.com/abdulkadirelaldi',
    linkedin: 'https://www.linkedin.com/in/abdulkadirelaldi',
    email: 'elaldiabdulkadir1@gmail.com',
  },
} as const;

type Kategori =
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
    ],
  ],
  [
    'BACKEND',
    ['FastAPI', 'Flask', 'Node.js', 'Express', 'tRPC', 'Prisma', 'SQLAlchemy', 'ASP.NET Core'],
  ],
  ['DATABASE', ['PostgreSQL', 'MongoDB', 'SQLite', 'Redis']],
  ['FRONTEND', ['React', 'Next.js', 'HTML / CSS']],
  ['MOBILE', ['Mobil uygulama geliştirme']],
  ['TOOLING', ['Git / GitHub', 'Linux', 'systemd', 'GStreamer', 'WebSocket', 'Claude Code']],
];

/** Belgelerde seviye yok — sitede gösterilmiyor; panelde düzenlenebilir. */
const VARSAYILAN_SEVIYE = 80;

export const YETENEKLER = YETENEK_GRUPLARI.flatMap(([category, adlar]) =>
  adlar.map((name) => ({ name, category, level: VARSAYILAN_SEVIYE })),
).map((yetenek, i) => ({ ...yetenek, order: i + 1 }));

type Deneyim = {
  type: 'WORK' | 'EDUCATION' | 'AWARD';
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
      "11 kişilik yazılım ekibini 3 sezondur yönetiyorum; alt sistem gruplarını (sensörler, CAN, navigasyon, BMS, gerçek zamanlı kontrol, telemetri) ve Teknik Tasarım Raporu sürecini koordine ediyorum. İki Delta MS300 VFD'yi tek RS-485 hattında Modbus RTU ile süren STM32 firmware'ini geliştirdim.",
  },
  {
    type: 'WORK',
    organization: 'Adapha Yapay Zeka Ar-Ge ve Yazılım A.Ş. (Samsun Teknopark)',
    role: 'Stajyer',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    description:
      'JWC Hat İzleme Sistemi: Raspberry Pi 5 saha cihazı, GStreamer görüntü hattı, ARM üzerinde RapidOCR / ONNX Runtime ile 6 alanın tamamı sahada %99+ güvenle okundu; FastAPI tabanlı olay motoru ve OEE hesabı.',
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
    startDate: '2024-01-01',
    current: true,
    description:
      'Otonom sualtı aracının görev yazılımını geliştiren ekibi yönetiyorum. Jetson Nano, STM32 ve Arduino arasında seri haberleşme ile YOLO / TensorFlow tabanlı nesne tespiti.',
  },
  {
    type: 'WORK',
    organization: 'TesisBul.com',
    role: 'Kurucu',
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    description:
      "Tesisler için online rezervasyon platformunu sıfırdan geliştirdim. Yaklaşık 20 şehirde 100'den fazla işletmeye yönelik pazarlama ve saha çalışması yürüttüm.",
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
    description: 'Beklenen mezuniyet: Haziran 2027.',
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
    startDate: '2026-09-01',
    description: 'Spectraloop',
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
];

type Proje = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  stack: string[];
  liveUrl?: string;
  clientName?: string;
  featured: boolean;
};

export const PROJELER: Proje[] = [
  {
    slug: 'spectraloop-hyperloop',
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

| | |
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
    title: 'TesisBul.com — Online Rezervasyon Platformu',
    summary:
      "Tesisler için sıfırdan geliştirdiğim online rezervasyon platformu; yaklaşık 20 şehirde 100'den fazla işletmeye yönelik saha ve pazarlama çalışması.",
    tags: ['Girişim', 'Rezervasyon'],
    stack: [],
    featured: false,
    content: `## Girişim

Haziran 2024 – Şubat 2025 arasında kurucusu olduğum girişim. Tesisler için online rezervasyon platformunu sıfırdan geliştirdim.

## Saha

Yaklaşık 20 şehirde 100'den fazla işletmeye yönelik pazarlama ve saha çalışması yürüttüm.
`,
  },
];
