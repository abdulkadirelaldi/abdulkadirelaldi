/**
 * Servis katmanı — PROGRAM.md §7.4.
 *
 * DB ERİŞİMİ YALNIZCA BURADA. Route handler ve Server Action ham Prisma
 * çağırmaz; servisi çağırır. Böylece yetki kontrolü, denetim kaydı ve
 * `Decimal` dönüşümü tek noktada kalır ve test edilebilir olur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVİS YAZMA KONVANSİYONU — F3/F4/F5 bunu çoğaltacak
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her varlık servisi `src/server/services/<entity>.ts` içine yazılır ve dört
 * kurala uyar:
 *
 *  1. PRISMA İSTEMCİSİ ENJEKTE EDİLİR (varsayılanı `db`). Böylece `pnpm test`
 *     veritabanı ve `.env` olmadan koşar — T-003c kazanımı korunur.
 *  2. GİRDİ ZATEN DOĞRULANMIŞ GELİR. Zod parse'ı Server Action'da yapılır
 *     (§7.1); servis `CreateXInput` gibi türetilmiş tipi alır, `unknown` almaz.
 *  3. ÇIKIŞTA `Decimal` YOK (ADR-014). Her servis kendi `toDto()` eşleyicisini
 *     yazar ve para/ölçüm alanlarını `toMoneyString` / `toMeasureString` ile
 *     `string`e çevirir. Prisma satırı DOĞRUDAN DÖNDÜRÜLMEZ.
 *  4. `@db.Date` ALANLARI `AppDay` (`YYYY-MM-DD`) OLARAK GİRER VE ÇIKAR
 *     (ADR-016). Dönüşüm `appDayToDate` / `dateToAppDay` ile yapılır.
 *
 * `AuditLog` ve `revalidatePath` SERVİSTE DEĞİL, Server Action'dadır (§7.1) —
 * servis yeniden kullanılabilir kalsın (cron ve seed de çağırır; onların
 * denetim kaydı ve önbellek ihtiyacı farklıdır).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ÖRNEK — kopyalanabilir iskelet
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ```ts
 * // src/server/services/transaction.ts
 * import type { CreateTransactionInput } from '@/lib/schemas';
 * import { db } from '@/server/db';
 * import {
 *   appDayToDate, computeBaseAmount, dateToAppDay, toMoneyString, toRateString,
 * } from '@/server/services/_shared';
 *
 * export interface TransactionDto {
 *   id: string;
 *   amount: string;      // ← Decimal DEĞİL (kural 3)
 *   baseAmount: string;
 *   fxRate: string;
 *   date: string;        // ← AppDay (kural 4)
 * }
 *
 * function toDto(row: TransactionRow): TransactionDto {
 *   return {
 *     id: row.id,
 *     amount: toMoneyString(row.amount),
 *     baseAmount: toMoneyString(row.baseAmount),
 *     fxRate: toRateString(row.fxRate),
 *     date: dateToAppDay(row.date),
 *   };
 * }
 *
 * export async function createTransaction(
 *   input: CreateTransactionInput,      // ← doğrulanmış (kural 2)
 *   client = db,                        // ← enjekte edilebilir (kural 1)
 * ): Promise<TransactionDto> {
 *   const row = await client.transaction.create({
 *     data: {
 *       ...input,
 *       date: appDayToDate(input.date),
 *       // baseAmount İSTEMCİDEN ALINMAZ — burada hesaplanır (ADR-014)
 *       baseAmount: computeBaseAmount(input.amount, input.fxRate),
 *     },
 *   });
 *   return toDto(row);
 * }
 * ```
 *
 * Server Action tarafı (§7.1 sırası):
 *
 * ```ts
 * 'use server';
 * export async function createTransactionAction(raw: unknown) {
 *   const session = await auth();                       // 1. yetki (§8.6)
 *   if (!session?.user?.id) return unauthorized();
 *
 *   const parsed = parseOrFail(createTransactionSchema, raw);  // 2. Zod (§8.8)
 *   if (!parsed.ok) return parsed.failure;
 *
 *   const dto = await createTransaction(parsed.data);   // 3. servis
 *
 *   await writeAuditLog({                               // 4. AuditLog (§8.19)
 *     actorId: session.user.id,
 *     action: 'CREATE',
 *     entity: 'Transaction',
 *     entityId: dto.id,
 *     diff: buildDiff(null, parsed.data),
 *   }, db);
 *
 *   revalidatePath('/panel/muhasebe');                  // 5. önbellek
 *   return ok(dto);
 * }
 * ```
 */

export * from './_shared';
