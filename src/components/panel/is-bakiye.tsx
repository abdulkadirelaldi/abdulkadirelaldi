import Link from 'next/link';

import { paraBicim } from '@/components/panel/para-bicim';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { JobFinancialsDto } from '@/server/services/job';
import { Currency } from '@/types';

/**
 * İŞ BAKİYESİ — `fetchJobFinancials` çıktısı. T-104'te geldi.
 *
 * T-103'te bu kart için YER AYIRMAMIŞTIM ve bu doğruydu (T-054f'in dersi:
 * "burada bir kart olacak" diye yer ayırmak boş kartın kılık değiştirmiş hâli).
 * Veri geldi, kart şimdi var.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ NETLEME YOK — GİDER TAHSİLATTAN DÜŞÜLMEZ AMA GİZLENMEZ DE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend'in işaret kararı bağlayıcı ve arayüz onu birebir yansıtıyor: dört
 * sayı DÖRT AYRI SORUNUN cevabı ve hiçbiri diğerine karıştırılmıyor.
 *
 *   collected → elimdeki para          (GELİR ∧ tahsil edilmiş)
 *   pending   → kesildi, gelmedi       (GELİR ∧ tahsil edilmemiş) — remaining içinde
 *   expense   → bu işin maliyeti       (GİDER, ödensin ya da ödenmesin)
 *   remaining → alacak                 (agreedBaseAmount − collected)
 *
 * `collected − expense` diye bir "net" HESAPLANMIYOR ve Backend'in gerekçesi
 * kabul edildi: v1 vergiyi hesaplamıyor, yani "kârlılık" iddiası dürüst
 * olmazdı. Türetmeyi arayüz de yapmıyor — yapsa aynı yanlış iddiayı
 * sunucunun ağzından değil kendi ağzından söylerdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEGATİF KALAN KIRPILMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Fazla tahsilat negatif `remaining` veriyor ve Backend sıfıra KIRPMIYOR —
 * kırpmak bir tutarsızlığı gizlemek olurdu. Arayüz de kırpmıyor: negatif
 * değer olduğu gibi gösteriliyor ve NE ANLAMA GELDİĞİ yazılıyor ("anlaşma
 * tutarından fazla tahsil edilmiş"), yoksa kullanıcı eksi işaretini bir hata
 * sanar.
 *
 * `remaining === null` → anlaşma tutarı bilinmiyor. `0,00 ₺` DEĞİL: sıfır
 * "borcu yok" demek, bilinmemek başka bir şey.
 */
export function IsBakiye({ bakiye }: { bakiye: JobFinancialsDto }) {
  const negatifKalan = bakiye.remaining !== null && bakiye.remaining.startsWith('-');

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle seviye="h2">Bakiye</CardTitle>
          <p className="text-muted text-sm">
            <span className="tabular">{bakiye.transactionCount}</span> bağlı işlem
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BakiyeKalem
            etiket="Tahsil edilen"
            deger={bakiye.collected}
            not="Elimdeki para"
            vurgu="success"
          />
          <BakiyeKalem
            etiket="Bekleyen"
            deger={bakiye.pending}
            not="Kesildi, gelmedi — kalan içinde"
            vurgu="warning"
          />
          <BakiyeKalem
            etiket="Gider"
            deger={bakiye.expense}
            not="Bu işin maliyeti — tahsilattan düşülmedi"
            vurgu="danger"
          />
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted text-xs">Kalan</dt>
            {/* Not `<dd>`nin içinde — gerekçe `BakiyeKalem`deki notta. */}
            <dd className="flex flex-col gap-0.5">
              <span
                className={
                  negatifKalan ? 'tabular text-warning text-lg' : 'tabular text-primary text-lg'
                }
              >
                {bakiye.remaining === null
                  ? 'Bilinmiyor'
                  : paraBicim(bakiye.remaining, Currency.TRY)}
              </span>
              <span className="text-muted text-xs">
                {bakiye.remaining === null
                  ? 'Anlaşma tutarı girilmemiş'
                  : negatifKalan
                    ? 'Anlaşma tutarından fazla tahsil edilmiş'
                    : 'Anlaşma tutarı eksi tahsil edilen'}
              </span>
            </dd>
          </div>
        </dl>

        <p className="text-muted text-xs">
          Tutarların tamamı TRY karşılığı. Gider tahsilattan{' '}
          <span className="text-body">düşülmedi</span> — dört sayı dört ayrı sorunun cevabı.{' '}
          <Link
            href={`/panel/muhasebe?gorunum=hepsi&kategori=`}
            className="focus-ring link rounded"
          >
            Muhasebede işlemleri gör
          </Link>
          {/*
            İŞE GÖRE SÜZME ADRESTEN YAPILAMIYOR: `muhasebeYolu` `jobId`
            taşımıyor ve süzgeç arayüzünde iş seçici yok. Bağlantı genel
            listeye gidiyor ve bunu söylüyor — "işe göre süzülmüş liste"
            sözü vermek, tutulamayacak bir söz olurdu.
          */}{' '}
          — bu bağlantı tüm işlemleri açar, işe göre süzmüyor.
        </p>
      </CardContent>
    </Card>
  );
}

function BakiyeKalem({
  etiket,
  deger,
  not,
  vurgu,
}: {
  etiket: string;
  deger: string;
  not: string;
  vurgu: 'success' | 'warning' | 'danger';
}) {
  const renk =
    vurgu === 'success' ? 'text-success' : vurgu === 'warning' ? 'text-warning' : 'text-danger';

  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted text-xs">{etiket}</dt>
      {/*
        NOT `<dd>`NİN İÇİNDE, kardeşi DEĞİL — ölçüldü: `<dl>` içindeki
        sarmalayıcı `div` yalnızca `dt`/`dd` kabul ediyor ve kardeş bir `<p>`
        Lighthouse `definition-list` denetimini kırıyordu (erişilebilirlik
        100 → 97). Semantik olarak da doğrusu bu: not terimin DEĞERİNİ
        açıklıyor, ayrı bir şey söylemiyor.
      */}
      <dd className="flex flex-col gap-0.5">
        <span className={`tabular text-lg ${renk}`}>{paraBicim(deger, Currency.TRY)}</span>
        <span className="text-muted text-xs">{not}</span>
      </dd>
    </div>
  );
}
