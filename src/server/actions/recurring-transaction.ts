'use server';

import { db } from '@/server/db';
import {
  processDueRecurringTransactions,
  type ProcessRecurringResultDto,
} from '@/server/services/recurring-transaction';
import { ok, writeAuditLog, type ApiResponse } from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * TEKRARLAYAN KALEMLERİ İŞLE — ADR-040'ın elle tetikleyicisi, T-109b.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * F7'DE CRON BU EYLEMİ ÇAĞIRIR — YENİ KOD DEĞİL, YENİ BİR TETİKLEYİCİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ADR-040'ın sözü bu ve uygulamanın şekli onu tutmak zorunda. İki sonucu var:
 *
 * 1. MANTIK EYLEMDE DEĞİL SERVİSTE. Bu dosya yalnızca yetki + denetim kaydı
 *    ekliyor; `processDueRecurringTransactions` tetikleyiciden bağımsız.
 *    F7'nin cron'u servisi doğrudan çağırabilir (düz Node, `auth()` yok) ya da
 *    bu eylemi — ikisi de aynı mantığı koşar.
 *
 * 2. `now` SERVİSE PARAMETRE olarak geçiyor (varsayılanı `new Date()`).
 *    Cron'un "şu an"ı ile kullanıcının "şu an"ı aynı mekanizmadan gelsin ve
 *    test edilebilir kalsın — `appToday`ın ADR-016 gerekçesinin aynısı.
 *
 * ⚠️ GİRDİ YOK VE BU KASITLI. Eylem hangi şablonların işleneceğini KENDİ
 * belirliyor (`isActive` + gecikmiş `nextRunAt`). İstemciden bir kimlik listesi
 * almak, kullanıcının görmediği bir şablonu işlemesine ya da bir şablonu
 * atlamasına izin verirdi — ve "işlenmeyi bekleyen her şey işlensin" zaten
 * düğmenin anlamı. Doğrulanacak girdi olmadığı için `parseOrFail` de yok
 * (§8.8 doğrulanacak bir şey olmadığında bir şey istemiyor).
 *
 * ⚠️ İDEMPOTANSLIK BU EYLEMİ GÜVENLİ KILAN ŞEY: `@@unique([sourceRecurringId,
 * periodKey])` + `skipDuplicates`. Kullanıcı düğmeye iki kez basarsa ikinci
 * basış sıfır kayıt üretir ve HATA DÖNDÜRMEZ — `skippedDuplicateCount` artar.
 * Cron'da bir kereliktir; elle tetiklemede kullanıcı iki kez basabilir ve
 * basması bir sorun olmamalı.
 */
export async function processRecurringAction(): Promise<ApiResponse<ProcessRecurringResultDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  try {
    const sonuc = await processDueRecurringTransactions(new Date(), db);

    /*
     * ⚠️ DENETİM KAYDI — ADR-022: bu bir SONUÇ. Defterde kayıt doğuyor.
     *
     * Diff'e ne yazıldığı §8.20 kararı: ÜRETİLEN KAYITLARIN KENDİSİ YOK
     * (tutar, kategori, açıklama — hepsi `Transaction` satırlarında ve
     * oradan okunuyor), yalnızca SAYILAR ve ATLAMA SEBEPLERİ var.
     *
     * `skippedDuplicateCount` özellikle değerli: sıfırdan farklı olması
     * idempotanslığın devreye girdiğini söylüyor, yani "kullanıcı iki kez
     * bastı" olayı denetim kaydından okunabiliyor — ve bu bir hata değil.
     *
     * `skipped` listesinde SEBEP var ama şablon açıklaması YOK: açıklama
     * serbest metin (`mediumTextSchema`) ve denetim kaydına serbest metin
     * yazmamak bu projenin kuralı (ADR-034'ün "değere gömülü sır" ölçümü).
     * Kimlik yeterli — şablonun kendisi okunabilir.
     */
    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Transaction',
        diff: {
          context: 'RECURRING_RUN',
          consideredTemplates: sonuc.consideredTemplates,
          createdCount: sonuc.createdCount,
          skippedDuplicateCount: sonuc.skippedDuplicateCount,
          remainingPeriodCount: sonuc.remainingPeriodCount,
          skippedReasons: sonuc.skipped.map((s) => s.reason).join(', '),
        },
      },
      db,
    );

    /*
     * ETİKET DÜŞÜRÜLMÜYOR — `Transaction` public tarafta yok (T-101'de
     * tarandı: `ContentEntity`de yok, hiçbir `cachedRead` okumuyor,
     * `getSiteStats` toplamıyor).
     */
    return ok(sonuc);
  } catch (error) {
    return toFailure('recurring:process', error);
  }
}
