/**
 * ÇİZİM GÜCÜ TESPİTİ — BULGU-018 / §5.2.5'in genişletilmesi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * WebGL, GPU yoksa YAZILIM RASTERLEYİCİDE (SwiftShader / llvmpipe) koşar.
 * Bağlam açılır, shader derlenir, kareler üretilir — hepsi CPU'da. Güvenlik'in
 * CI ölçümü: masaüstü performansı 100 → 60, `bootup-time` 40.8 saniye ve
 * tamamı Aurora'nın `ogl` parçasında, TBT 80 ms → 9.990 ms. LCP 0.6 saniyeydi;
 * yani sorun boyama değil, ANA İŞ PARÇACIĞININ tıkanması.
 *
 * Bu bir CI artefaktı değil: GPU hızlandırması olmayan gerçek kullanıcılar
 * (eski dizüstüler, sanal masaüstleri, uzak masaüstü oturumları, bazı Linux
 * yapılandırmaları) aynı şeyi yaşar. §5.2 mobili "kısıtlı yol" sayıp Aurora'yı
 * hiç yüklemiyor; yazılım rasterleyici de aynı sınıf — cihaz efektin bedelini
 * ödeyemiyor. §5.2.7'nin "efekt okunabilirliğin önüne geçmez" kuralı burada
 * kullanılabilirliğe uzanıyor: 10 saniyelik TBT sayfayı fiilen donduruyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ SİNYAL — İKİSİ DE ÖLÇÜLDÜ (T-020c)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sistem Chrome'u ile, GPU'lu ve `--disable-gpu` ile aynı makinede:
 *
 *   | Sinyal                              | GPU                  | Yazılım    |
 *   | ----------------------------------- | -------------------- | ---------- |
 *   | `failIfMajorPerformanceCaveat:true` | bağlam VERİLDİ 5.3ms | REDDEDİLDİ |
 *   | `UNMASKED_RENDERER_WEBGL`           | "ANGLE (Apple…M2…)"  | "…SwiftShader…" |
 *
 * 1. BİRİNCİL: `failIfMajorPerformanceCaveat`. Standart bir bayrak — tarayıcı
 *    bağlamın yavaş olacağını biliyorsa `null` döner. Parmak izi eklentisine
 *    ihtiyaç duymaz, yani `privacy.resistFingerprinting` gibi ayarlardan
 *    etkilenmez.
 * 2. İKİNCİL: rasterleyici dizesi. Bazı ortamlar bayrağı ONURLANDIRMAYIP yine
 *    de yazılım bağlamı verir (llvmpipe'lı bazı Linux yapılandırmaları);
 *    dize eşleşmesi o boşluğu kapatır. `WEBGL_debug_renderer_info` her yerde
 *    yok — yoksa bu sinyal atlanır, birincil karar geçerli kalır.
 *
 * YANLIŞ POZİTİF MALİYETİ: kullanıcı statik gradyan görür (T-020b'de aydınlık
 * temada zaten verilen karar) — kayıp küçük.
 * YANLIŞ NEGATİF MALİYETİ: sayfa on saniye donar — kayıp büyük.
 * Bu yüzden WebGL HİÇ AÇILAMIYORSA da 'yazilim' deniyor: bağlam alınamayan bir
 * yerde Aurora zaten çizemez, `ogl` parçasını indirmenin anlamı yok.
 *
 * MALİYET: bir kez, 1–5 ms (ölçüldü). Sonda `loseContext()` ile sonda bağlamı
 * bırakılıyor; iki geçici bağlam ardında kalmıyor.
 */

/** Yazılım rasterleyicilerin bilinen imzaları (küçük harfe çevrilmiş dizede aranır). */
const YAZILIM_IMZALARI = [
  'swiftshader',
  'llvmpipe',
  'software',
  'basic render', // Windows "Microsoft Basic Render Driver"
  'mesa offscreen',
  'softpipe',
] as const;

export type CizimGucu = 'donanim' | 'yazilim' | 'bilinmiyor';

/**
 * Tarayıcının WebGL'i donanımda mı yazılımda mı koştuğunu ölçer.
 *
 * Sunucuda çağrılamaz — `window` yoksa 'bilinmiyor' döner ve çağıran taraf
 * temkinli davranır (Aurora yüklenmez).
 */
export function cizimGucunuOlc(): CizimGucu {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'bilinmiyor';

  try {
    const tuval = document.createElement('canvas');
    tuval.width = 1;
    tuval.height = 1;

    /* 1) Birincil sinyal — tarayıcı "bu bağlam yavaş olur" diyorsa null döner. */
    const secenekler: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true };
    const hizli =
      tuval.getContext('webgl2', secenekler) ?? tuval.getContext('webgl', secenekler);

    if (!hizli) {
      /*
       * Bağlam reddedildi. İKİ İHTİMAL var ve ikisi de aynı sonuca çıkıyor:
       * (a) yazılım rasterleyici, (b) WebGL hiç yok. Aurora ikisinde de
       * çizemez ya da çizerken sayfayı dondurur.
       */
      return 'yazilim';
    }

    /* 2) İkincil sinyal — bayrağı onurlandırmayan ortamlar için dize kontrolü. */
    const eklenti = hizli.getExtension('WEBGL_debug_renderer_info');
    const rasterleyici = eklenti
      ? String(hizli.getParameter(eklenti.UNMASKED_RENDERER_WEBGL)).toLowerCase()
      : '';

    hizli.getExtension('WEBGL_lose_context')?.loseContext();

    if (rasterleyici && YAZILIM_IMZALARI.some((imza) => rasterleyici.includes(imza))) {
      return 'yazilim';
    }

    return 'donanim';
  } catch {
    /* Bağlam oluşturma fırlattı (kilitli ortam, bellek). Efekt riski alınmaz. */
    return 'yazilim';
  }
}
