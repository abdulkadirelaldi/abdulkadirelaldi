/**
 * BLOG YAZILARI — kaynak: Portfolyo 2026 PDF'i (kullanıcı, 2026-10-21).
 *
 * Her sayı, ölçüm ve karar portfolyodan; yeni bir iddia YOK. Kavram
 * açıklamaları (Modbus RTU nedir, BPFO nedir) genel bilgi. Yazılar yayında
 * başlıyor; panelden düzenlenebilir ya da taslağa çekilebilir.
 */

type Yazi = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  content: string;
};

export const YAZILAR: Yazi[] = [
  {
    slug: 'ocr-motorunu-olcerek-secmek',
    title: 'OCR motorunu neden ölçerek seçtim',
    excerpt:
      'Veri çıkışı olmayan bir üretim makinesinin ekranını okumak için üç OCR seçeneğini doğruluk, gecikme ve maliyetle karşılaştırdım. Kazanan, en "güçlü" olan değil, sahaya en iyi oturan oldu.',
    tags: ['yapay zeka', 'ocr', 'gömülü'],
    content: `## Problem: veri yalnızca ekranda

Samsun Teknopark'taki stajımda karşılaştığım makineler üretim sayaçlarını yalnızca operatör ekranında gösteriyordu. PLC çıkışı, veritabanı ya da rapor dosyası yoktu; vardiya sonunda kaç dakika duruş yaşandığını kimse bilmiyordu.

Çözüm fikri basitti: ekranın görüntüsünü yakala, okunması gereken alanları OCR ile oku, okumaları olaylara çevir. Asıl karar, **hangi OCR motorunun** sahada güvenilir çalışacağıydı.

## Üç aday

- **Mistral OCR** — bulut tabanlı.
- **PaddleOCR** — açık kaynak, yerelde çalışıyor.
- **RapidOCR** — PaddleOCR ile aynı modelleri ONNX Runtime üzerinde çalıştırıyor.

## Bulut neden elendi

Bulut OCR üç sebeple elendi: **gecikme**, **maliyet** ve **veri gizliliği**. Saniyede birkaç okuma yapan bir sistemde her kareyi buluta göndermek hem yavaş hem pahalı; üstelik fabrika ekranı dışarıya çıkmaması gereken bir veri.

## PaddleOCR mı, RapidOCR mı?

İkisi aynı modeli kullandığı için doğruluk farkı beklemiyordum. Fark kurulumda çıktı: saha cihazı bir **Raspberry Pi 5**, yani ARM. RapidOCR (ONNX) ARM'de sorunsuz kuruldu; seçim buna göre yapıldı.

Model boyutunu da ölçtüm: **small model, medium ile aynı doğrulukta ve 3,7 kat daha hızlı** çıktı. Daha büyük model burada hiçbir şey kazandırmıyordu.

## Doğru motor yetmez: doğrulama

Hiçbir OCR her kareyi doğru okumaz. Bu yüzden okumaları birbirine karşı denetledim: ekrandaki kalite oranı, sağlam/toplam ürün sayısından yeniden hesaplanıp okunan değerle karşılaştırılıyor. **Tutmayan okuma reddediliyor.** Hatalı bir okumayı kaydetmek, hiç okumamaktan daha kötü.

## Sonuç

| Doğrulanan | Sonuç |
| --- | --- |
| 6 alanın okunması | 6/6 doğru, güven skoru %99+ |
| Duruş tespiti | gerçek 90 sn → ölçülen 88 sn |
| Kesinti dayanıklılığı | 38 bekleyen okuma diskten geri yüklendi |

Ders: "en iyi model" diye bir şey yok, **bu sahaya en uygun model** var — ve onu ancak ölçerek bulursun.
`,
  },
  {
    slug: 'mikrodenetleyiciye-sigan-model',
    title: "1,1 KB'lık bir modeli STM32'ye sığdırmak",
    excerpt:
      "Rulman arızası tespitinde beş model neredeyse aynı başarıyı verdi. Seçimi doğruluk değil, mikrodenetleyicinin belleği belirledi: 289 parametre, float32'de ~1,1 KB.",
    tags: ['tinyml', 'stm32', 'sinyal işleme'],
    content: `## Hedef

Bitirme projem **Predictive-Edge**, endüstriyel motorlarda rulman arızasını önceden tespit edip kalan kullanım ömrünü (RUL) kestirmeyi amaçlıyor — ve bunu bulutta değil, **motorun yanındaki mikrodenetleyicide** yapmayı.

## Özellikler fizikten geliyor

Ham titreşimi doğrudan modele vermek yerine fiziğe dayalı özellikler çıkardım. 1 kHz titreşim sinyalinin FFT'si alınıyor; rulmanın **dış bilezik arıza frekansı** (BPFO, bu kurguda 100 Hz) ve harmonikleri üzerinden harmonik oran, spektral entropi, RMS ve tepe-tepe değer dahil **8 özellik** hesaplanıyor. Sıcaklık ve akım da modele katılıyor.

İyi özellikler, küçük bir modelin işini kolaylaştırıyor — gömülü hedefte bu her şey demek.

## Beş model, neredeyse aynı skor

Lojistik Regresyon, Random Forest, SVM, Gradient Boosting ve MLP'yi karşılaştırdım. Hepsi **F1 ≈ 0,99** civarındaydı. Doğruluk ayırt edici olmayınca seçimi **bellek ve çıkarım maliyeti** belirledi.

## Metodoloji

- **GridSearchCV** ve **5 katlı çapraz doğrulama**.
- Ölçekleyici **Pipeline içinde** — böylece doğrulama katlarına eğitim verisinden bilgi sızmıyor.
- MLP'de (32, 16) ile (16, 8) arasındaki fark standart sapmanın altında kaldı; **3 kat küçük olan (16, 8)** seçildi.

## Sayılar

| Ölçü | Değer |
| --- | --- |
| Parametre | 289 |
| Model boyutu (float32) | ~1,1 KB |
| int8 nicemlemeyle | 289 B |
| Hedef | STM32H7 (2 MB Flash) |

Bir de izleme tarafı var: Flask REST API ve Chart.js ile 200 motorluk bir filonun sağlık durumu ve kalan ömrü tek panelde.

## Dürüst sınırlılık

Veri seti, fiziksel arıza modeline dayalı **sentetik** veri. Modelin gerçek STM32 kartında çalıştırılması ve gerçek sensör verisiyle doğrulanması devam ediyor. 0,99'luk F1'i bu bağlamla birlikte okumak gerekiyor.
`,
  },
  {
    slug: 'tek-rs485-hattinda-iki-vfd',
    title: 'Tek RS-485 hattında iki VFD: Modbus RTU ile lineer motor sürüşü',
    excerpt:
      'Spectraloop kapsülünün lineer motorunu süren iki Delta MS300 sürücüyü tek bir RS-485 hattı üzerinden, STM32 ile Modbus RTU master olarak kontrol etmek — ve bunu sahada doğrulamak.',
    tags: ['gömülü', 'modbus', 'teknofest'],
    content: `## Bağlam

TEKNOFEST Hyperloop'ta yarışan **Spectraloop** takımının yazılım ekibini üç sezondur yönetiyorum. Kapsül bir lineer motorla itiliyor; motoru iki **Delta MS300** frekans sürücüsü (VFD) besliyor. Benim işim, bu iki sürücüyü güvenilir biçimde kontrol eden firmware'di.

## Neden Modbus RTU, neden tek hat

Modbus RTU, endüstride sürücüler ve PLC'ler arasında yaygın, basit bir master/slave protokolü. RS-485 ise onu taşıyan, gürültüye dayanıklı diferansiyel bir hat. Tek bir RS-485 hattına birden fazla cihaz bağlanabiliyor; her cihaz kendi **slave adresiyle** ayırt ediliyor.

Kurduğum yapı:

- **STM32**, hattın **Modbus RTU master**'ı.
- İki MS300, aynı hatta **slave 1** ve **slave 2**.
- Haberleşme **9600 baud, 8N1**.

## Ne kontrol ediliyor

Firmware sürücülere **ileri / geri / dur** kontrol sözcüklerini ve **150 Hz'e kadar** frekans değerini gönderiyor. Kodu STM32F407'de yazdım, sonra Nucleo-F401RE'ye taşıdım.

## Sahada doğrulama

Masa başında çalışan kod, sürücü doğru yapılandırılmamışsa sahada hiçbir şey yapmaz. VFD parametrelerini — frekans ve çalıştırma kaynağının **RS-485** olarak ayarlanması, **üst frekans sınırı** — sahada tek tek test ederek doğruladım.

Test ve gözlem için bir de **Python seri↔WebSocket köprüsü** ile canlı kontrol paneli ekledim: kapsülün sürüşünü tarayıcıdan izleyip komut verebiliyoruz.

## Kapsülün geri kalanı

Motor sürüşü daha büyük bir mimarinin parçası: Master/Slave STM32'ler **CAN Bus** üzerinden haberleşiyor; yüksek EMI'ye karşı bükümlü çift kablo ve **120 Ω sonlandırma** kullandık. Konum, BNO055 IMU ile çift optik sensörün donanım kesmeleriyle çapraz doğrulanıyor; donanımsal **Watchdog** fail-safe yapıyı tamamlıyor.

Bu çalışmanın sonunda takımla TEKNOFEST 2026'da **Teknoloji Gösterim kategorisinde Türkiye 1.liği** aldık.
`,
  },
];
