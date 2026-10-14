'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import { processRecurringAction } from '@/server/actions/recurring-transaction';
import type {
  DueRecurringSummaryDto,
  ProcessRecurringResultDto,
  RecurringSkipReason,
} from '@/server/services/recurring-transaction';

/**
 * TEKRARLAYAN KALEMLER — ADR-040'ın elle tetikleyicisi, T-109f.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ADR-040'IN BAĞLAYICI CÜMLESİ: "SESSİZ DEĞİL"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * *"'3 kalem işlenmeyi bekliyor' ekranda görünür olmalı."* Gerekçe mekanik:
 * üretim ELLE tetikleniyor, yani kullanıcı düğmeye basmayı unutursa kalem
 * DÜŞMEZ. Bu geçici hâlin (F7'de cron gelene kadar) tek savunması görünürlük —
 * sayıyı bir menünün arkasına koymak, unutmayı garantilemek olurdu.
 *
 * Bu yüzden kart `/panel/muhasebe`nin ÜSTÜNDE ve listeden ÖNCE: kullanıcı
 * defterine bakmaya geldiğinde defterin eksik olabileceğini önce görüyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `dueCount` ENGELLİ ŞABLONLARI DA SAYIYOR — VE BU AYRIM GİZLENEMEZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `fetchDueRecurringSummary` vadesi gelmiş HER şablonu döndürüyor, işlenemez
 * olanlar dahil (`blockedReason`). Sayıyı olduğu gibi basmak şunu üretirdi:
 * ekran "3 kalem bekliyor" der, kullanıcı basar, SIFIR kayıt oluşur ve sayı
 * 3'te kalır. Hiçbir hata yok, hiçbir açıklama yok — kullanıcı düğmenin
 * bozuk olduğunu sanır.
 *
 * Bu yüzden iki sayı AYRI: İŞLENEBİLİR olanlar ve ENGELLİ olanlar. Engelli
 * olanların sebebi de yazılı, çünkü sebep kullanıcının düzeltebileceği bir şey
 * (TRY dışı şablon, tanınmayan kural).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEKLEYEN KALEM YOKKEN DÜĞME YOK — DEVRE DIŞI DA DEĞİL, GİZLİ DE DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Üç seçenek vardı ve ikisi yanlış:
 *
 *   DEVRE DIŞI DÜĞME → T-018'in ölü düğme yasağı. Tıklanamayan bir düğme
 *     "neden?" sorusunu cevapsız bırakır ve kullanıcı arızadan şüphelenir.
 *   HER ŞEYİ GİZLEMEK → özellik görünmez olur. Kullanıcı tekrarlayan
 *     kalemlerin işlendiğini hiç öğrenmez ve bir gün eksik defteri fark
 *     ettiğinde nereye bakacağını bilmez.
 *
 * SEÇİLEN: kart DURUR, düğme GİTMEZ — çünkü basılacak bir şey yok ve bunu
 * SÖYLÜYOR ("Bekleyen tekrarlayan kalem yok"). Bu bir OLGU, uydurma bir sıfır
 * değil; T-104'ün dersi ("0,00 ₺ yazmak hiç işlem olmadığını hepsi sıfır diye
 * söylemek olurdu") burada da geçerli: boş bir durumu boş bir sayıyla değil,
 * cümleyle anlatıyoruz.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ İDEMPOTANSLIK GARANTİ EDİLİYOR AMA KULLANICI BUNU BİLMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend `@@unique([sourceRecurringId, periodKey])` + `skipDuplicates` ile
 * ikinci basışın kayıt üretmemesini garanti ediyor. Arayüzün sorunu bu değil:
 * sonuç "İşlendi" derse kullanıcı bir şey olup olmadığını anlamaz ve İKİNCİ
 * KEZ BASAR. Bu yüzden sonuç SAYI söylüyor:
 *
 *   createdCount > 0                → "4 kayıt oluşturuldu"
 *   createdCount 0, duplicate > 0   → "Zaten işlenmişti — yeni kayıt yok"
 *   ikisi de 0                      → "İşlenecek bir şey bulunamadı"
 *
 * İkinci satır idempotansliği GÖRÜNÜR kılıyor: kullanıcı iki kez bastığında
 * bir hata değil, bir açıklama görüyor.
 */

const SEBEP_ETIKET: Record<RecurringSkipReason, string> = {
  NON_TRY_CURRENCY: 'TRY dışı para birimi — kur kaynağı yok, uydurulmuyor',
  UNKNOWN_RULE: 'Tekrar kuralı tanınmıyor',
  YEAR_LIMIT: 'Yıl sınırı (9999) aşıldı',
};

export function TekrarlayanKalemler({ ozet }: { ozet: DueRecurringSummaryDto }) {
  const yonlendirici = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<ProcessRecurringResultDto | null>(null);

  const engelliler = ozet.items.filter((k) => k.blockedReason !== null);
  const islenebilirler = ozet.items.filter((k) => k.blockedReason === null);
  const islenebilirSayi = islenebilirler.length;

  /*
    ⚠️ DÖNEM SAYISI ENGELLİLERDEN DEĞİL, İŞLENEBİLİRLERDEN TOPLANIYOR.
    `ozet.pendingPeriodCount` bütün şablonları topluyor; düğmeye basınca
    üretilecek olan ise yalnızca engelsiz olanların dönemleri. İkisi
    ayrıştığında ekrandaki sayı düğmenin yapacağı işi ANLATMAZ — ve sayıyla
    düğmenin aynı şeyi söylemesi bu kartın bütün amacı.
  */
  const uretilecekDonem = islenebilirler.reduce((toplam, k) => toplam + k.pendingPeriods, 0);

  const isle = async () => {
    setCalisiyor(true);
    setHata(null);
    setSonuc(null);
    try {
      const cevap = await processRecurringAction();
      if (cevap.ok) {
        setSonuc(cevap.data);
        /* Defter değişti — liste ve sayaçlar sunucudan yeniden okunmalı. */
        yonlendirici.refresh();
      } else {
        setHata(cevap.error.message);
      }
    } catch {
      setHata('İşlenemedi — bağlantı kurulamadı. Hiçbir kayıt oluşturulmadı.');
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <section
      aria-labelledby="tekrarlayan-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="tekrarlayan-baslik" className="text-primary text-sm font-medium">
            Tekrarlayan kalemler
          </h2>

          {/*
            ⚠️ DAL `islenebilirSayi`E GÖRE, `dueCount`A GÖRE DEĞİL — VE BU BİR
            ÖLÇÜM DÜZELTMESİ. Önce `dueCount === 0` ile dallanıyordu; engelli
            şablonlar da "vadesi gelmiş" sayıldığı için işlenebilir kalem
            bittiğinde kart şunu yazdı: "0 kalem işlenmeyi bekliyor · 0 dönem
            kayıt üretecek". Yani SIFIRI bir ölçüm gibi sundu — T-104'ün
            "0,00 ₺ yazmak hiç işlem olmadığını hepsi sıfır diye söylemek
            olurdu" dersinin aynısı. Üç durum üç AYRI cümle hak ediyor.
          */}
          {islenebilirSayi > 0 ? (
            <p className="text-body text-sm">
              <span className="tabular font-medium">{islenebilirSayi}</span> kalem işlenmeyi
              bekliyor · <span className="tabular">{uretilecekDonem}</span> dönem kayıt üretecek.
              {engelliler.length > 0 && (
                <>
                  {' '}
                  Ayrıca <span className="tabular">{engelliler.length}</span> şablon{' '}
                  <span className="text-warning">işlenemiyor</span> (aşağıda).
                </>
              )}
            </p>
          ) : engelliler.length > 0 ? (
            <p className="text-body text-sm">
              İşlenebilecek kalem yok. Aşağıdaki{' '}
              <span className="tabular">{engelliler.length}</span> şablon{' '}
              <span className="text-warning">engelli</span> ve düzeltilene kadar kayıt üretmiyor —
              basılacak bir şey olmadığı için düğme de yok.
            </p>
          ) : (
            <p className="text-muted text-sm">
              Bekleyen tekrarlayan kalem yok — defterde eksik kayıt bırakan bir şablon bulunmuyor.
            </p>
          )}
        </div>

        {/*
          ⚠️ DÜĞME YALNIZCA İŞLENEBİLİR KALEM VARKEN. Engelli şablonlar için
          basmak sıfır kayıt üretir ve kullanıcıyı düğmenin bozuk olduğuna
          inandırırdı; sayı ile düğmenin varlığı AYNI şeyi söylemeli.
        */}
        {islenebilirSayi > 0 && (
          <Button type="button" size="sm" onClick={isle} disabled={calisiyor} aria-busy={calisiyor}>
            {calisiyor ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            {calisiyor ? 'İşleniyor…' : 'Bekleyenleri işle'}
          </Button>
        )}
      </div>

      {engelliler.length > 0 && (
        <ul className="flex flex-col gap-1">
          {engelliler.map((k) => (
            <li
              key={k.id}
              className="rounded-input border-warning/40 bg-warning/8 text-body border px-3 py-2 text-xs"
            >
              <span className="text-body">{k.description ?? 'Açıklamasız şablon'}</span> —{' '}
              <span className="text-warning">
                {k.blockedReason ? SEBEP_ETIKET[k.blockedReason] : ''}
              </span>
              . Düzeltilene kadar bu şablon kayıt üretmez.
            </li>
          ))}
        </ul>
      )}

      {hata && <FormAlert>{hata}</FormAlert>}

      {sonuc && (
        <p
          role="status"
          className="rounded-input border-success/40 bg-success/8 text-body border px-3 py-2 text-sm"
        >
          {sonuc.createdCount > 0 ? (
            <>
              <span className="tabular font-medium">{sonuc.createdCount}</span> kayıt oluşturuldu.
            </>
          ) : sonuc.skippedDuplicateCount > 0 ? (
            <>
              Yeni kayıt oluşmadı: bu dönemler <strong>zaten işlenmişti</strong> (
              <span className="tabular">{sonuc.skippedDuplicateCount}</span> dönem atlandı). İkinci
              kez basmak defteri bozmaz.
            </>
          ) : (
            <>İşlenecek bir şey bulunamadı — hiçbir kayıt oluşturulmadı.</>
          )}
          {sonuc.remainingPeriodCount > 0 && (
            <>
              {' '}
              <span className="tabular">{sonuc.remainingPeriodCount}</span> dönem üst sınır yüzünden
              bu turda üretilmedi; tekrar bas.
            </>
          )}
        </p>
      )}
    </section>
  );
}
