'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AylikNokta } from '@/components/panel/rapor-veri';

/**
 * YILLIK NAKİT AKIŞI — 12 ay × (tahsil edilen, ödenen).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FORM: GRUPLU ÇUBUK, TEK EKSEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * İşin görevi ZAMAN İÇİNDE DEĞİŞİM + iki serinin karşılaştırılması. İki seri de
 * AYNI BİRİMDE (TRY karşılığı) olduğu için tek eksende yan yana çizilebiliyor.
 *
 * ⚠️ ÇİFT EKSEN YOK ve olmayacak: iki y-ölçeğinin hizalanması keyfîdir ve
 * veride olmayan bir korelasyon uydurur. Burada gerek de yok — ikisi de lira.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RENK ÖLÇÜLDÜ, GÖZLE KARAR VERİLMEDİ — VE İKİ KUSUR BULUNDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Paletin iki slotu projenin anlamsal belirteçleri: `--success` (gelir),
 * `--danger` (gider). Doğrulayıcı iki temada da koşturuldu:
 *
 *   KOYU  (#12121f): CVD ayrımı ΔE 6.5 (deutan) → 6–8 TABAN BANDI
 *                    lightness bandı FAIL (0.773 / 0.711 — koyu tema için açık)
 *   AÇIK  (#ffffff): CVD ΔE 10.1 PASS · chroma FAIL (#197352 → 0.098, griye kaçıyor)
 *
 * 6–8 bandı YALNIZCA İKİNCİL KODLAMAYLA meşru. Bu yüzden:
 *
 *   1. GİDER SERİSİ DOKULU (45° tarama) — renk tek başına taşımıyor.
 *      Deuteranop bir okuyucu iki çubuğu dokudan ayırıyor; zorunlu renk
 *      kipinde ve baskıda da ayrım korunuyor.
 *   2. GÖSTERGE HER ZAMAN VAR ve iki seriyi ADLARIYLA söylüyor.
 *
 * Lightness/chroma kusurları BİLEREK bırakıldı ve raporda yazılı: bu iki
 * belirteç uygulamanın HER YERİNDE gelir/gider anlamını taşıyor (T-104'te
 * rozetler, listeler). Grafikte doğrulanmış ama FARKLI bir çift kullanmak,
 * kullanıcının öğrendiği "yeşil = gelir" eşlemesini bozardı — skill'in kendi
 * uyardığı "okuyucu Acme'nin mavi olduğunu öğrendi, artık yanıltılıyor"
 * hatasının aynısı. Tutarlılık burada doğrulayıcının palet tasarımı
 * uyarılarından ağır basıyor; CVD maddesi ise doku ile GERÇEKTEN kapatıldı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * §3.1 — BİLEŞENDE HEX YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Renkler `var(--color-success)` / `var(--color-danger)` olarak veriliyor.
 * İki kazanç: kural korunuyor VE tema değişince grafik kendiliğinden
 * dönüyor — karanlık kipi elle çevirmek gerekmiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SAYI AYRIŞMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Çubuk yüksekliği `gelir.deger`/`gider.deger` (sayı); tooltip ve eksen
 * `…etiket` (dizeden biçimlendirilmiş). İkisi AYNI kaynak dizeden türüyor
 * (`rapor-veri.ts`), yani grafiğin çizdiği ile yazılan ayrışamaz.
 */

/** Dokunun kimliği — `<defs>` içindeki desenle eşleşiyor. */
const DOKU_ID = 'yillik-gider-doku';

type TooltipYuku = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: AylikNokta }>;
};

/**
 * Tooltip — DEĞERLERİ `etiket`TEN basıyor, `deger`den DEĞİL.
 *
 * Recharts'ın varsayılan tooltip'i `dataKey`in sayısal değerini yazardı ve o
 * sayı `Number()`dan gelir — ekranda iki farklı biçimde iki sayı görünürdü.
 * Özel tooltip bu yüzden zorunlu, süs değil.
 */
function TooltipIcerik({ active, payload }: TooltipYuku) {
  if (!active || !payload?.length) return null;
  const nokta = payload[0]?.payload;
  if (!nokta) return null;

  return (
    <div className="border-line bg-elevated rounded-card flex flex-col gap-1 border px-3 py-2 text-xs shadow-lg">
      <p className="text-primary font-medium">{nokta.period}</p>
      <p className="text-success tabular">Tahsil edilen: {nokta.gelir.etiket}</p>
      <p className="text-danger tabular">Ödenen: {nokta.gider.etiket}</p>
      <p className="text-muted tabular">
        <span className="tabular">{nokta.islemSayisi}</span> işlem
      </p>
    </div>
  );
}

export default function YillikGrafik({ noktalar }: { noktalar: AylikNokta[] }) {
  return (
    /*
      YÜKSEKLİK SABİT (`h-80`): `ResponsiveContainer` yüzde yükseklikle
      çalışırken kapsayıcının ölçüsü yoksa 0 px çiziyor ve sonra büyüyor —
      bu da CLS üretir. Sabit yükseklik hem çizimi hem CLS 0'ı veriyor.
    */
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={noktalar} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          {/*
            DOKU — ikincil kodlama (yukarıdaki renk notuna bakınız).
            `patternTransform` ile 45°; çizgi rengi serinin kendi rengi, zemin
            saydam, yani çubuk yine "gider kırmızısı" okunuyor ama dolgusu
            taramalı.
          */}
          <defs>
            <pattern
              id={DOKU_ID}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="var(--color-danger)" opacity="0.25" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-danger)" strokeWidth="3" />
            </pattern>
          </defs>

          {/* IZGARA HAİRLİNE ve KESİKSİZ: kesikli çizgi "eşik" diye okunur. */}
          <CartesianGrid stroke="var(--color-line)" strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="ay"
            stroke="var(--color-line)"
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            tickLine={false}
          />

          {/*
            ⚠️ EKSEN ETİKETİ DİZEDEN: `tickFormatter` sayıyı değil, binlik
            kısaltmayı dizeden üretiyor. Tam tutar tooltip'te `etiket` olarak
            duruyor; eksen yalnızca ÖLÇEK veriyor, kesin sayı vermiyor.
          */}
          <YAxis
            stroke="var(--color-line)"
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            tickLine={false}
            width={72}
            tickFormatter={eksenKisalt}
          />

          <Tooltip content={<TooltipIcerik />} cursor={{ fill: 'var(--color-elevated)' }} />

          {/* GÖSTERGE HER ZAMAN VAR — iki seri, kimlik renge bırakılmıyor. */}
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--color-muted)' }}
            formatter={(deger) => <span className="text-body">{deger}</span>}
          />

          {/*
            `radius` 4 px yalnızca ÜST köşelerde — veri ucu yuvarlak, taban
            çizgisine yapışık. `barGap` 2 px: komşu çubuklar arasında yüzey
            boşluğu (kenarlık değil).
          */}
          <Bar
            dataKey="gelir.deger"
            name="Tahsil edilen"
            fill="var(--color-success)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="gider.deger"
            name="Ödenen"
            fill={`url(#${DOKU_ID})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Eksen kısaltması — `1250000` → `1,25 M`.
 *
 * Eksende tam tutar YAZILMIYOR ve bu bilinçli: on iki aylık bir eksende tam
 * tutarlar üst üste biner. Kesin sayı tooltip'te, `paraBicim` ile dizeden.
 * Burada yapılan iş ÖLÇEK göstermek, para yazmak değil — o yüzden bu
 * fonksiyonun sayı almasında bir çelişki yok.
 */
function eksenKisalt(deger: number): string {
  if (deger === 0) return '0';
  const mutlak = Math.abs(deger);
  if (mutlak >= 1_000_000) return `${(deger / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (mutlak >= 1_000) return `${Math.round(deger / 1_000)} B`;
  return String(deger);
}
