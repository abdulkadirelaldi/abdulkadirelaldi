import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { dukkanSchema } from '@/lib/schemas/dukkan';
import { gorevGuncelleSchema, gorevSchema } from '@/lib/schemas/gorev';
import { db } from '@/server/db';
import {
  DukkanHatasi,
  dukkanKaydet,
  fetchDukkanKayitlari,
  paketSay,
} from '@/server/services/dukkan';
import { gorevGuncelle, gorevOlustur } from '@/server/services/gorev';

/**
 * DÜKKÂN KAYDI — gerçek PostgreSQL (ADR-058). Kayıt ilk kaydedişte oluşur, sayaç aya bağlıdır,
 * sıfırın altına inmez, paketi olmayan dükkân sayılmaz. "Acil" verilmeyen güncellemede korunur.
 * İzler `d:zzit-` anahtarıyla.
 */
const A = 'd:zzit-garage';
const B = 'd:zzit-leyla';
const AY = '2020-04';

const temizle = async () => {
  await db.dukkan.deleteMany({ where: { anahtar: { startsWith: 'd:zzit-' } } });
  await db.gorev.deleteMany({ where: { baslik: { startsWith: 'zzit-dukkan' } } });
};

beforeEach(temizle);
afterAll(async () => {
  await temizle();
  await db.$disconnect();
});

describe('dükkân kaydı', () => {
  it('kaydeder, günceller; paket sayacı aya bağlı ve sıfırın altına inmez', async () => {
    const ilk = await dukkanKaydet(
      dukkanSchema.parse({
        anahtar: A,
        driveUrl: 'https://drive.google.com/drive/folders/abc',
        not: 'yetkili: Ali',
        paket: { reels: 4, post: 8, story: 8 },
      }),
      AY,
    );
    expect(ilk.paket).toEqual([
      { tur: 'reels', n: 0, hedef: 4 },
      { tur: 'post', n: 0, hedef: 8 },
      { tur: 'story', n: 0, hedef: 8 },
    ]);

    await paketSay({ anahtar: A, tur: 'reels', fark: 1 }, AY);
    const iki = await paketSay({ anahtar: A, tur: 'reels', fark: 1 }, AY);
    expect(iki.paket![0]).toEqual({ tur: 'reels', n: 2, hedef: 4 });
    const eksi = await paketSay({ anahtar: A, tur: 'post', fark: -1 }, AY);
    expect(eksi.paket![1]!.n).toBe(0);

    // Başka ay sıfırdan başlar.
    const sonraki = await fetchDukkanKayitlari('2020-05');
    expect(sonraki[A]!.paket![0]!.n).toBe(0);
    expect((await fetchDukkanKayitlari(AY))[A]).toMatchObject({ not: 'yetkili: Ali' });

    // Paket kaldırılınca sayaç reddedilir; kayıt yoksa da.
    await dukkanKaydet(dukkanSchema.parse({ anahtar: A, driveUrl: '', paket: null }), AY);
    await expect(paketSay({ anahtar: A, tur: 'reels', fark: 1 }, AY)).rejects.toBeInstanceOf(
      DukkanHatasi,
    );
    await expect(paketSay({ anahtar: B, tur: 'reels', fark: 1 }, AY)).rejects.toBeInstanceOf(
      DukkanHatasi,
    );
  });

  it('acil işareti verilmeyen güncellemede korunur, açıkça kaldırılabilir', async () => {
    const g = await gorevOlustur(gorevSchema.parse({ baslik: 'zzit-dukkan acil', acil: true }));
    expect(g.acil).toBe(true);
    const ayni = await gorevGuncelle(
      gorevGuncelleSchema.parse({ id: g.id, baslik: 'zzit-dukkan acil 2' }),
    );
    expect(ayni.acil).toBe(true);
    const kalkti = await gorevGuncelle(
      gorevGuncelleSchema.parse({ id: g.id, baslik: 'zzit-dukkan acil 2', acil: false }),
    );
    expect(kalkti.acil).toBe(false);
  });
});
