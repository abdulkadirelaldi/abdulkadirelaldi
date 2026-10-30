import { db } from '@/server/db';
import type { Prisma } from '@/server/generated/prisma/client';

/**
 * TEK KEZ ÇALIŞTIRMA (2026-10-31) — hızlı kayıt tekrar önleme.
 *
 * Zayıf şebekede istek sunucuya ulaşıp YANITI kaybolabilir; istemci kaydı
 * kuyruğa alır ve yeniden gönderir. Anahtar işle AYNI işlemde yazılır:
 * - iş başarılı → anahtar kalıcı; aynı anahtarla ikinci çağrı işi çalıştırmaz.
 * - iş başarısız → ikisi de geri alınır; yeniden deneme normal çalışır.
 * Eşzamanlı iki çağrıda birincil anahtar ihlali (P2002) kazananı belirler.
 *
 * @returns işin sonucu; anahtar DAHA ÖNCE işlendiyse `null`.
 */
export async function birKez<T>(
  anahtar: string | undefined,
  is: (tx: Prisma.TransactionClient) => Promise<T>,
  client: Pick<typeof db, '$transaction'> = db,
): Promise<T | null> {
  try {
    return await client.$transaction(async (tx) => {
      if (anahtar) await tx.islemAnahtari.create({ data: { anahtar } });
      return is(tx);
    });
  } catch (error) {
    if (anahtar && (error as { code?: unknown }).code === 'P2002') return null;
    throw error;
  }
}
