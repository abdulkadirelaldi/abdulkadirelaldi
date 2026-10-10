import { db } from '@/server/db';

/**
 * `Attachment` VARLIK KONTROLÜ — T-051/B.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN VAR: ŞEMA BİÇİMİ DOĞRULUYOR, VARLIĞI DOĞRULAMIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `coverAttachmentId` (proje + blog) ve `avatarAttachmentId`/`cvAttachmentId`
 * (profil) GİZLİ FORM ALANLARINDAN geliyor. Şema yalnızca `cuidSchema` ile
 * biçimi doğruluyor; var olmayan bir kimlik şemayı geçiyor ve tek kapı
 * veritabanındaki FK kısıtı oluyor (`onDelete: Restrict`).
 *
 * Bu modül o kapıyı YAZMADAN ÖNCEYE taşıyor. İki kazanç:
 *   1. Hangi ALANIN bozuk olduğu KESİN bilinir — çünkü kontrolü biz yapıyoruz.
 *   2. Başarısız bir yazma denemesi hiç yapılmıyor.
 *
 * ⚠️ T-037'NİN KANCASI BURASI. Bugün sorulan soru "bu eklenti VAR MI". Yükleme
 * bağlandığında soru "bu eklenti BU KULLANICIYA MI AİT" olacak ve cevabı aynı
 * fonksiyonun içinde genişleyecek — çağıran taraflar değişmeyecek. Bugün tek
 * kullanıcı olduğu için ikisi aynı kapı; yarın ayrışacak.
 */

/** Bu kontrolün Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface AttachmentExistenceClient {
  attachment: {
    findMany(args: {
      where: { id: { in: string[] } };
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
}

/**
 * Verilen kimliklerden veritabanında BULUNMAYANLARI döndürür.
 *
 * TEK SORGU: kimlikler `in` ile birlikte sorulup dönen kümeyle farkı alınıyor.
 * Alan başına ayrı `findUnique` çağırmak profil kaydında (avatar + cv) iki
 * gidiş-dönüş demekti ve ileride galeri eklendiğinde doğrusal büyürdü.
 *
 * BOŞ GİRDİ SORGU AÇMAZ: hiçbir eklenti alanı gönderilmemiş bir kaydetme —
 * bugün en sık durum — fazladan hiçbir maliyet ödemiyor.
 *
 * YİNELENEN kimlikler tekilleştiriliyor: profilde aynı dosya hem avatar hem cv
 * olarak seçilebilir ve `in` listesine iki kez koymak gereksiz.
 */
export async function findMissingAttachmentIds(
  ids: readonly (string | null | undefined)[],
  client: AttachmentExistenceClient = db,
): Promise<string[]> {
  const aranacak = [
    ...new Set(ids.filter((id): id is string => typeof id === 'string' && id !== '')),
  ];
  if (aranacak.length === 0) return [];

  const bulunanlar = await client.attachment.findMany({
    where: { id: { in: aranacak } },
    select: { id: true },
  });

  const bulunanKume = new Set(bulunanlar.map((row) => row.id));
  return aranacak.filter((id) => !bulunanKume.has(id));
}
