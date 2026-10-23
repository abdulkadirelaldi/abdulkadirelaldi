/**
 * ADR-046 — ARAYÜZ SÖZLÜĞÜ, KAYNAK DİL (Türkçe).
 *
 * Sitedeki her görünür metin, ekran okuyucu etiketi ve meta açıklaması burada.
 * `Sozluk` tipi bu nesneden TÜRETİLİYOR; `en.ts` ve `de.ts` ona uymak zorunda —
 * bir dilde eksik anahtar derlemeyi düşürür.
 *
 * İÇERİK (profil, proje, yazı…) BURADA DEĞİL: o veritabanında, dile göre
 * ayrı kayıtlarda (ADR-019/046). Burası yalnızca arayüzün kendi metni.
 *
 * Değişken içeren metinler fonksiyon: dilbilgisi dile göre değişiyor
 * (Türkçe "3 yazı", Almanca "3 Beiträge" — sıra ve çoğul kuralı farklı).
 */
import { HATA_METNI } from '../hata-metni';

export const tr = {
  site: {
    unvan: 'Yazılım Mühendisi',
    aciklama: 'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum.',
    anaSayfaAciklama:
      'Web uygulamaları ve dijital ürünler tasarlıyor, uçtan uca geliştiriyorum. Projeler, hizmetler ve iletişim.',
    icerigeGec: 'İçeriğe geç',
    terminalKullanici: 'abdulkadir@site',
  },
  sayfaAdi: {
    anasayfa: 'Ana sayfa',
    hakkimda: 'Hakkımda',
    projeler: 'Projeler',
    blog: 'Blog',
    hizmetler: 'Hizmetler',
    iletisim: 'İletişim',
    cv: 'CV',
  },
  nav: {
    anaMenu: 'Ana menü',
    anaSayfa: 'Ana sayfa',
    menu: 'Menü',
    kapat: 'Kapat',
    menuyuAc: 'Menüyü aç',
    menuyuKapat: 'Menüyü kapat',
    cta: 'Birlikte çalışalım',
    dilSecici: 'Dil seçimi',
  },
  altBilgi: {
    menu: 'Alt bilgi menüsü',
    sayfalar: 'Sayfalar',
    sosyal: 'Sosyal',
    iletisim: 'İletişim',
    kiyiOnce: 'Ticari işler',
    // `kiyiSonra` kendi baştaki boşluğunu taşıyor: İngilizcede bağlantıdan sonra
    // doğrudan nokta geliyor ("…through Kıyı Medya."), araya boşluk girmemeli.
    kiyiSonra: ' üzerinden yürür.',
    yigin: 'Next.js · TypeScript · PostgreSQL ile elle yazıldı.',
  },
  hero: {
    dosya: 'ben.ts',
    kodDegisken: 'ben',
    kodOdak: 'odak',
    kodSimdi: 'şimdi',
    kodKonum: 'konum',
    kodSaat: 'saat',
    pencereEtiket: 'Kısa künye',
    projeler: 'Projeler',
    cta: 'Benimle çalış',
  },
  seritler: {
    ekipler: 'Birlikte çalıştığım ekipler',
    teknolojiler: 'Kullandığım teknolojiler',
  },
  hakkimdaBolum: {
    baslik: 'Hakkımda',
    devam: 'Hikâyemin devamı',
    yilDeneyim: 'yıl deneyim',
    yayinlananProje: 'yayınlanan proje',
  },
  basarilar: { baslik: 'Başarılar' },
  hizmetlerBolum: {
    baslik: 'Hizmetler',
    kiyiOnce: 'Ticari işler',
    kiyiSonra: ' üzerinden yürüyor — teklif, sözleşme ve faturalandırma orada.',
    tumu: 'Tüm ayrıntılar →',
  },
  projelerBolum: {
    baslik: 'Projeler',
    tumu: 'Tüm projeler',
    incele: 'İncele',
    inceleEtiket: (baslik: string) => `${baslik} projesini incele`,
    kunyeEtiket: (baslik: string) => `${baslik} künyesi`,
    kodDegisken: 'proje',
    kodYigin: 'yığın',
    kodEtiketler: 'etiketler',
    kodDonem: 'dönem',
  },
  yeteneklerBolum: {
    baslik: 'Neyle çalışıyorum',
    sira1: 'Yetenekler — birinci sıra',
    sira2: 'Yetenekler — ikinci sıra',
  },
  iletisimBolum: {
    baslikUst: 'Hadi',
    baslikAlt: 'konuşalım',
    giris:
      'Bir fikrin, bir işin ya da bir sorun mu var? Kısaca yaz, birlikte netleştirelim. Genelde bir gün içinde dönüyorum.',
    konum: 'Konum:',
    durum: 'Durum:',
    sosyalHesaplar: 'Sosyal hesaplar',
  },
  form: {
    ad: 'Ad Soyad',
    eposta: 'E-posta',
    telefon: 'Telefon',
    konu: 'Konu',
    mesaj: 'Mesaj',
    istegeBagli: '(isteğe bağlı)',
    mesajYerTutucu: 'Ne yapmak istediğini kısaca anlat — en iyisi birkaç cümle.',
    tuzak: 'Web siteniz (doldurmayın)',
    gonder: 'Mesajı gönder',
    gonderiliyor: 'Gönderiliyor…',
    yukleniyor: 'Form yükleniyor',
    basari:
      'Mesajın bana ulaştı. Genelde bir gün içinde dönüyorum — yanıtı yazdığın e-posta adresine göndereceğim.',
    agHatasi:
      'Mesaj gönderilemedi — bağlantı kurulamadı. Yazdıkların duruyor, tekrar deneyebilirsin.',
    // Form bir İSTEMCİ bileşeni ve sunucudan fonksiyon prop'u alamaz: değişkenli
    // metinler `{eposta}` / `{n}` yer tutuculu düz metin.
    agHatasiEposta:
      'Mesaj gönderilemedi — bağlantı kurulamadı. Yazdıkların duruyor, tekrar deneyebilirsin ya da doğrudan {eposta} adresine yazabilirsin.',
    genelHata: 'Mesaj gönderilemedi. Yazdıkların duruyor, birazdan tekrar deneyebilirsin.',
    cokFazla: 'Kısa sürede çok fazla mesaj gönderildi.',
    biraz: 'Biraz sonra tekrar dener misin?',
    saat1: 'Yaklaşık {n} saat sonra tekrar deneyebilirsin.',
    saatN: 'Yaklaşık {n} saat sonra tekrar deneyebilirsin.',
    dakika1: 'Yaklaşık {n} dakika sonra tekrar deneyebilirsin.',
    dakikaN: 'Yaklaşık {n} dakika sonra tekrar deneyebilirsin.',
    hata: {
      ad: 'Adınızı girin.',
      eposta: 'Geçerli bir e-posta adresi girin.',
      telefon: 'Telefon numarası geçersiz.',
      konu: 'Konu en fazla 255 karakter olabilir.',
      mesajKisa: 'Mesajınız en az 10 karakter olmalıdır.',
      mesajUzun: 'Mesajınız en fazla 5000 karakter olabilir.',
      alan: 'Bu alanı kontrol edin.',
    },
  },
  sayfaBaslik: {
    projeler: {
      baslik: 'Projeler',
      metaAciklama:
        'Ürettiğim işler: kurumsal siteler, web uygulamaları ve paneller. Etikete ve kullanılan teknolojiye göre süzebilirsin.',
      aciklama:
        'Kurumsal siteler, web uygulamaları ve paneller. Etikete veya kullanılan teknolojiye göre süzebilirsin.',
    },
    blog: {
      baslik: 'Blog',
      metaAciklama:
        'Yazılım, gömülü sistemler ve yapay zeka üzerine teknik yazılar — bir işi yaparken ölçtüklerim ve öğrendiklerim.',
      aciklama:
        'Yazılım, web performansı ve ürün geliştirme üzerine yazdıklarım. Çoğu, bir işi yaparken not aldığım şeyler.',
    },
    hakkimda: {
      metaBaslik: 'Hakkımda',
      metaAciklama:
        'Kim olduğum, nasıl çalıştığım ve bugüne kadar nerelerde bulunduğum — deneyim ve eğitim geçmişiyle birlikte.',
    },
    hizmetler: {
      baslik: 'Hizmetler',
      metaAciklama:
        'Kurumsal web sitesi, web uygulaması ve mobil uygulama. Ticari işler Kıyı Medya üzerinden yürüyor.',
      aciklama:
        'İşin tasarımından veritabanına, dağıtımından bakımına kadar uçtan uca kuruyorum. Aşağıdaki başlıklardan biri sana uyuyorsa konuşalım.',
    },
    iletisim: {
      baslik: 'İletişim',
      metaAciklama:
        'Bir fikrin varsa yaz: e-posta, sosyal hesaplar veya iletişim formu. Genelde bir gün içinde dönüyorum.',
      aciklama:
        'Bir fikrin, bir işin ya da bir sorun mu var? Formu doldur ya da doğrudan e-posta at.',
    },
    cv: {
      metaBaslik: 'CV',
      metaAciklama: 'Yazdırılabilir tek sayfalık özgeçmiş: deneyim, eğitim ve yetenekler.',
    },
  },
  liste: {
    tumu: 'Tümü',
    etiket: 'etiket',
    teknoloji: 'teknoloji',
    projeSayisi: (n: number, suzulmus: boolean) => `${n} proje${suzulmus ? ' (süzülmüş)' : ''}`,
    yaziSayisi: (n: number, suzulmus: boolean) => `${n} yazı${suzulmus ? ' (süzülmüş)' : ''}`,
    bosSuzgecProje: 'Bu süzgece uyan proje yok',
    bosSuzgecProjeAciklama:
      'Seçtiğin etiket ve teknoloji birleşimiyle eşleşen bir iş bulunmuyor. Süzgeci temizleyip tümüne bakabilirsin.',
    suzgeciTemizle: 'Süzgeci temizle',
    bosProje: 'Vitrin hazırlanıyor',
    bosProjeAciklama:
      'İlk projeler çok yakında burada olacak. Bu arada nasıl çalıştığımı konuşalım.',
    banaYaz: 'Bana yaz',
    bosSuzgecYazi: 'Bu etikette yazı yok',
    bosSuzgecYaziAciklama:
      'Seçtiğin etiketle eşleşen bir yazı bulunmuyor. Etiketi kaldırıp tümüne bakabilirsin.',
    tumYazilar: 'Tüm yazılar',
    bosYazi: 'İlk yazı yolda',
    bosYaziAciklama:
      'Buraya yazılım ve ürün geliştirme notlarımı yazacağım. Bu arada projelere göz atabilirsin.',
    projelereBak: 'Projelere bak',
    dkOkuma: (n: number) => `${n} dk okuma`,
  },
  proje: {
    geri: 'cd ../projeler',
    musteri: 'Müşteri',
    donem: 'Dönem',
    yigin: 'Yığın',
    canliSite: 'Canlı site',
    kaynakKodu: 'Kaynak kodu',
    mimari: 'Mimari',
    gorseller: 'Görseller',
    gorselEtiket: (baslik: string, n: number) => `${baslik} — görsel ${n}`,
    benzer: 'Benzer bir iş mi?',
    kiyiOnce: 'Ticari işler',
    kiyiSonra: ' üzerinden yürüyor; teklif ve sözleşme orada.',
    kiyiIlerle: 'Kıyı Medya ile ilerle',
    konusalim: 'Bu proje hakkında konuşalım',
    konusalimAciklama:
      "Ayrıntıları, kodu ya da ekipteki rolümü merak ediyorsan yaz. CV'mde tüm deneyimim tek sayfada.",
    banaYaz: 'Bana yaz',
    cvGor: "CV'yi gör",
    kaldirildi: 'Bu proje kaldırıldı',
    kaldirildiAciklama:
      'Bu sayfa bir zamanlar vardı ama içerik kalıcı olarak kaldırıldı. Adres doğru — dönecek bir şey yok.',
    tumProjeler: 'Tüm projeler',
    kapakYok: (baslik: string) => `${baslik} — kapak görseli henüz eklenmedi`,
  },
  yazi: {
    geri: 'cd ../blog',
    icindekiler: 'İçindekiler',
    kaldirildi: 'Bu yazı kaldırıldı',
    kaldirildiAciklama:
      'Bu adres bir zamanlar bir yazıya çıkıyordu ama içerik kalıcı olarak kaldırıldı. Adres doğru — dönecek bir şey yok.',
    gosterilemedi: 'Bu içerik görüntülenemedi',
    gosterilemediAciklama:
      'Adres doğru — metnin biçimlendirmesinde bir sorun var ve bu yüzden çizilemiyor. Sorun kaydedildi; düzeltildiğinde sayfa kendiliğinden düzelecek.',
  },
  hakkimdaSayfa: {
    kisaca: '01 — Kısaca ben',
    oduller: 'Ödüller',
    deneyim: 'Deneyim',
    egitim: 'Eğitim',
    sertifikalar: 'Sertifikalar',
    spor: 'Spor',
    sporDereceler: 'Dereceler',
    sporTakimlar: 'Takımlar',
    ozgecmis: 'Özgeçmiş',
    devamEdiyor: 'Devam ediyor',
    bosDeneyim: 'Deneyim kayıtları hazırlanıyor',
    bosDeneyimAciklama:
      'Çalışma geçmişimi buraya ekleyeceğim. Ne yaptığımı şimdiden konuşabiliriz.',
    bosEgitim: 'Eğitim bilgisi henüz eklenmedi',
    bosEgitimAciklama: 'Panelden eklendiğinde bu bölüm otomatik dolar.',
  },
  cvIndir: {
    baslik: 'Özgeçmiş',
    hazir: 'PDF olarak indir; aynı içeriğin yazdırılabilir sürümü de var.',
    hazirDegil:
      'PDF indirme henüz hazır değil. Aynı bilgilerin tamamı yazdırılabilir CV sayfasında duruyor.',
    indir: 'PDF indir',
    yakinda: 'PDF yakında',
    sayfayiAc: 'CV sayfasını aç',
  },
  hizmetlerSayfa: {
    ekipler: 'Birlikte çalıştığım ekipler',
    kiyiBaslik: 'Ticari işler Kıyı Medya üzerinden',
    kiyiAciklama:
      'Teklif, sözleşme ve faturalandırma Kıyı Medya çatısı altında yürüyor. Aklındaki iş ticari bir işse oradan başlamak en hızlısı; kişisel bir soru ya da fikir alışverişiyse doğrudan bana yazabilirsin.',
    kiyiGit: "Kıyı Medya'ya git",
    banaYaz: 'Bana yaz',
    bos: 'Hizmet listesi hazırlanıyor',
    bosAciklama: 'Ne yaptığımı buradan anlatacağım. Aklındaki işi şimdiden konuşabiliriz.',
  },
  cvSayfa: {
    ozet: 'Özet',
    oduller: 'Ödüller ve başarılar',
    deneyim: 'Deneyim',
    egitim: 'Eğitim',
    sertifikalar: 'Sertifikalar',
    spor: 'Spor',
    yetenekler: 'Yetenekler',
    yazdir: 'Yazdır',
    bos: 'CV içeriği hazırlanıyor',
    bosAciklama: 'Deneyim ve yetenek kayıtları girildiğinde bu sayfa kendiliğinden dolacak.',
    hakkimdaGit: 'Hakkımda sayfasına git',
  },
  bulunamadi: {
    metaBaslik: 'Sayfa bulunamadı',
    baslik: 'Bu yol bir yere çıkmıyor',
    komut: 'cd aradığın-sayfa',
    cikti: 'bash: cd: böyle bir dosya ya da dizin yok',
    aciklama:
      'Adres yanlış yazılmış ya da sayfa taşınmış olabilir. Aşağıdakilerden biriyle devam edebilirsin.',
  },
  hata: HATA_METNI.tr,
  kategori: {
    LANGUAGE: 'Diller',
    EMBEDDED: 'Gömülü sistemler',
    AI: 'Yapay zeka / görü',
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    DATABASE: 'Veritabanı',
    DEVOPS: 'Altyapı',
    MOBILE: 'Mobil',
    DESIGN: 'Tasarım',
    TOOLING: 'Araçlar',
    SOFT_SKILL: 'Çalışma biçimi',
    OTHER: 'Diğer',
  },
};

type Genislet<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends (...a: infer A) => infer R
      ? (...a: A) => R
      : { readonly [K in keyof T]: Genislet<T[K]> };

/** Her dilin sözlüğünün uyması gereken şekil — Türkçe kaynaktan türetilir. */
export type Sozluk = Genislet<typeof tr>;
