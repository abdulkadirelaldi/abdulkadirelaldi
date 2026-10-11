'use server';

import {
  archiveTransactionCategorySchema,
  createTransactionCategorySchema,
  updateTransactionCategorySchema,
} from '@/lib/schemas';
import { db } from '@/server/db';
import {
  createTransactionCategory,
  setTransactionCategoryArchived,
  updateTransactionCategory,
  type TransactionCategoryPanelDto,
} from '@/server/services/transaction-category';
import {
  buildDiff,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `TransactionCategory` Server Action'ları — §7.1, ADR-017, ADR-022, T-101.
 *
 * §7.1 sırası `actions/project.ts`te anlatıldı; `revalidateTag` ADIMI YOK ve
 * gerekçesi `actions/client.ts`in başındaki taramanın aynısı — T-101'de
 * `Transaction`/`TransactionCategory` için yeniden tarandı: `ContentEntity`
 * birleşiminde yok, hiçbir `cachedRead` okumuyor, `getSiteStats` toplamıyor,
 * `src/app/(public)/**`ta geçmiyor.
 *
 * ⚠️ SİLME EYLEMİ YOK — kategori arşivlenir (ADR-017). FK ölçümü ve gerekçe
 * `services/transaction-category.ts`in başında.
 *
 * ⚠️ DİFF'TE KİŞİSEL VERİ YOK, ama burada zaten hiç yok: kategori adı, türü ve
 * rengi iş verisidir. `color` diff'e GİRMİYOR — denetim kaydının cevaplaması
 * gereken soru "hangi kategori ne zaman açıldı/arşivlendi", bir rengin
 * değişmesi o soruya bir şey katmıyor ve her tema düzenlemesinde satır üretirdi.
 */

const BENZERSIZ_CAKISMA = {
  /*
   * `@@unique([name, type])` — benzersizlik AD+TÜR ÇİFTİ üzerinde. Mesaj bunu
   * söylemek zorunda: aynı adın gelir VE gider kategorisi olarak var olması
   * MEŞRU ("Yazılım" ikisi de olabilir) ve kullanıcı "bu ad zaten var" deyip
   * duran bir forma bakıp neden olduğunu anlamazdı.
   */
  message: 'Bu ad bu türde zaten kullanılıyor. Aynı ad diğer türde kullanılabilir.',
  fields: { name: 'Bu ad bu türde zaten var.' },
} as const;

export async function createTransactionCategoryAction(
  raw: unknown,
): Promise<ApiResponse<TransactionCategoryPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createTransactionCategorySchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await createTransactionCategory(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'TransactionCategory',
        entityId: dto.id,
        // BULGU-019 — alanlar TEK TEK. `buildDiff(null, parsed.data)` yazmak
        // alan seçimini şemaya devrederdi.
        diff: buildDiff(null, { name: dto.name, type: dto.type }),
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('transactionCategory:create', error, { conflict: BENZERSIZ_CAKISMA });
  }
}

export async function updateTransactionCategoryAction(
  raw: unknown,
): Promise<ApiResponse<TransactionCategoryPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateTransactionCategorySchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await updateTransactionCategory(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'TransactionCategory',
        entityId: dto.id,
        /*
         * `changed` `buildDiff`TEN GEÇMİYOR — T-100'de ölçülen sebep: `buildDiff`
         * her alanı `{ before, after }` çiftine sarıyor ve T-053'ün denetim
         * ekranı o çiftlerin DEĞERİNİ hiç basmıyor, yani sarılmış bir `changed`
         * ekranda okunamaz hâle gelirdi. Farkın kendisi olan bir alan ikinci kez
         * farklanmaz.
         *
         * `type` DEĞİŞİMİ ayrıca yazılıyor: kategori türünü değiştirmek
         * raporlamayı etkileyen bir karar (bkz. servis notu) ve denetim kaydında
         * ayırt edilebilir olmalı.
         */
        diff: {
          changed: Object.keys(parsed.data)
            .filter((key) => key !== 'id')
            .sort()
            .join(', '),
          ...(parsed.data.type !== undefined ? { newType: dto.type } : {}),
        },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('transactionCategory:update', error, { conflict: BENZERSIZ_CAKISMA });
  }
}

/** Arşivler ya da arşivden çıkarır — `ARCHIVE`/`RESTORE` (ADR-020 enum'u). */
export async function archiveTransactionCategoryAction(
  raw: unknown,
): Promise<ApiResponse<TransactionCategoryPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(archiveTransactionCategorySchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await setTransactionCategoryArchived(parsed.data.id, parsed.data.isArchived);

    await writeAuditLog(
      {
        actorId,
        action: parsed.data.isArchived ? 'ARCHIVE' : 'RESTORE',
        entity: 'TransactionCategory',
        entityId: dto.id,
        diff: { isArchived: { before: !dto.isArchived, after: dto.isArchived } },
      },
      db,
    );

    return ok(dto);
  } catch (error) {
    return toFailure('transactionCategory:archive', error);
  }
}
