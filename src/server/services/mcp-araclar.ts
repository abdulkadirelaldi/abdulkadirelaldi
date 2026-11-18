import * as z from 'zod';

import { ALANLAR, teslimMetni } from '@/lib/gorev/bicim';
import { gorevGuncelleSchema, gorevSchema } from '@/lib/schemas/gorev';
import { saatMetni } from '@/lib/takvim/bicim';
import { db } from '@/server/db';
import { appToday, dateToAppDay, writeAuditLog, type AppDay } from '@/server/services/_shared';
import {
  fetchBugunGorevleri,
  fetchIsListesi,
  gorevBitti,
  gorevGuncelle,
  gorevOlustur,
  gorevSil,
  GorevHatasi,
  type GorevDto,
} from '@/server/services/gorev';
import { fetchHabitDay } from '@/server/services/habit-gun';
import { fetchBugunTakvim } from '@/server/services/takvim';
import { IsAlani } from '@/types';

/**
 * CLAUDE BAĞLAYICISI — MCP araçları (ADR-056). Yalnızca İşler ve bugünün özeti; cüzdan/sağlık yok.
 * Girdiler panel formuyla AYNI şemalardan geçer (`gorevSchema`). Her yazım denetim kaydına
 * `context: 'mcp'` ile düşer; Google eşitlemesi çağıranın `sonra` kancasıyla yanıttan sonra koşar.
 */

export interface AracBaglami {
  userId: string;
  /** Yanıttan sonra koşacak iş (Google eşitlemesi). */
  sonra: (gorevId: string, silinenEtkinlik?: string | null) => void;
}

export interface AracSonucu {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

const metin = (text: string, isError = false): AracSonucu => ({
  content: [{ type: 'text', text }],
  ...(isError ? { isError: true } : {}),
});

const SAAT = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});
const GUN_ADI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const ALAN_DEGERLERI = Object.values(IsAlani);

function satir(g: GorevDto, bugun: AppDay): string {
  const t = teslimMetni(g, bugun).metin;
  const parca = [
    `[${g.id}]`,
    g.tamamlandiAt ? '✓' : '○',
    g.baslik,
    `(${ALANLAR[g.alan].ad}${g.etiket ? ` · ${g.etiket}` : ''}${t ? ` · ${t}` : ''})`,
  ];
  return parca.join(' ');
}

const kucuk = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

/** Bütün kelimeleri başlık + etikette geçen açık görevler. */
async function ara(sorgu: string): Promise<GorevDto[]> {
  const kelimeler = kucuk(sorgu).split(/\s+/).filter(Boolean);
  const l = await fetchIsListesi(appToday());
  const acik = [...l.gecikmis, ...l.bugun, ...l.buHafta, ...l.sonra, ...l.tarihsiz];
  return acik.filter((g) => {
    const h = kucuk(`${g.baslik} ${g.etiket ?? ''}`);
    return kelimeler.every((k) => h.includes(k));
  });
}

async function denetim(
  b: AracBaglami,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: string,
  diff: Record<string, unknown>,
) {
  await writeAuditLog(
    { actorId: b.userId, action, entity: 'Gorev', entityId, diff: { context: 'mcp', ...diff } },
    db,
  );
}

const gunAlani = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('YYYY-AA-GG (İstanbul günü). Göreli tarihleri ("cuma") sen hesapla.');
const saatAlani = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .describe('SS:DD, İstanbul saati; gün gerektirir.');

const ARACLAR = {
  bugun_ozeti: {
    title: 'Bugünün özeti',
    description:
      'Bugünün tarihi, gecikmiş ve bugünkü işler, Google Takvim’deki bugünkü etkinlikler ve kalan rutinler. Günü sorulduğunda ya da tarih hesaplamadan önce çağır.',
    girdi: z.object({}).strict(),
    salt: true,
    async calistir() {
      const bugun = appToday();
      const [isler, takvim, rutin] = await Promise.all([
        fetchBugunGorevleri(bugun),
        fetchBugunTakvim(bugun).catch(() => []),
        fetchHabitDay(bugun, undefined, bugun),
      ]);
      const gun = GUN_ADI[new Date(`${bugun}T12:00:00Z`).getUTCDay()];
      const kalan = rutin.items.filter((i) => i.durum === 'ISARETSIZ' || i.durum === 'EKSIK');
      const parca = [
        `Bugün: ${bugun} ${gun}`,
        '',
        `İşler (gecikmiş + bugün): ${isler.length === 0 ? 'yok' : ''}`,
        ...isler.map((g) => `- ${satir(g, bugun)}`),
        '',
        `Takvim: ${takvim.length === 0 ? 'yok' : ''}`,
        ...takvim.map(
          (o) => `- ${o.tumGun ? 'gün boyu' : SAAT.format(new Date(o.baslangic))} ${o.baslik}`,
        ),
        '',
        `Kalan rutinler: ${kalan.length === 0 ? 'yok' : kalan.map((i) => i.name).join(', ')}`,
      ];
      return metin(parca.join('\n'));
    },
  },

  isleri_listele: {
    title: 'İşleri listele',
    description:
      'Paneldeki işler. Varsayılan açık işler (gecikmiş, bugün, bu hafta, sonra, tarihsiz); `durum: "biten"` son 7 günde bitenler. Her satırın başındaki [id] diğer araçlarda kullanılır.',
    girdi: z
      .object({
        alan: z
          .enum(ALAN_DEGERLERI)
          .optional()
          .describe('KIYI_MEDYA | OKUL | SPECTRALOOP | KISISEL'),
        durum: z.enum(['acik', 'biten']).optional(),
        ara: z.string().max(80).optional().describe('Başlık/etikette geçen kelimeler'),
      })
      .strict(),
    salt: true,
    async calistir(g: { alan?: IsAlani; durum?: 'acik' | 'biten'; ara?: string }) {
      const bugun = appToday();
      const l = await fetchIsListesi(bugun);
      let liste =
        g.durum === 'biten'
          ? l.bitenler
          : [...l.gecikmis, ...l.bugun, ...l.buHafta, ...l.sonra, ...l.tarihsiz];
      if (g.alan) liste = liste.filter((x) => x.alan === g.alan);
      if (g.ara) {
        const k = kucuk(g.ara).split(/\s+/).filter(Boolean);
        liste = liste.filter((x) =>
          k.every((w) => kucuk(`${x.baslik} ${x.etiket ?? ''}`).includes(w)),
        );
      }
      return metin(
        liste.length === 0
          ? 'Eşleşen iş yok.'
          : `${liste.length} iş:\n${liste.map((x) => `- ${satir(x, bugun)}`).join('\n')}`,
      );
    },
  },

  is_ekle: {
    title: 'İş ekle',
    description:
      'Panele yeni iş ekler. Tarihli iş Google Takvim’e alarmlarıyla kendiliğinden düşer. Müşteri ya da ders adını `etiket`e yaz (ör. "Kozmos", "Veri Tabanı").',
    girdi: z
      .object({
        baslik: z.string().min(1).max(160),
        alan: z.enum(ALAN_DEGERLERI).optional().describe('Varsayılan KISISEL'),
        etiket: z.string().max(40).optional(),
        gun: gunAlani.optional(),
        saat: saatAlani.optional(),
        not: z.string().max(4000).optional(),
      })
      .strict(),
    salt: false,
    async calistir(
      g: {
        baslik: string;
        alan?: IsAlani;
        etiket?: string;
        gun?: string;
        saat?: string;
        not?: string;
      },
      b: AracBaglami,
    ) {
      const v = gorevSchema.safeParse({
        baslik: g.baslik,
        alan: g.alan,
        etiket: g.etiket,
        not: g.not,
        teslimGun: g.gun,
        teslimSaat: g.saat,
      });
      if (!v.success)
        return metin(`Eklenemedi: ${v.error.issues.map((i) => i.message).join('; ')}`, true);
      const s = await gorevOlustur(v.data);
      await denetim(b, 'CREATE', s.id, { alan: s.alan, teslimli: s.teslimGun !== null });
      b.sonra(s.id);
      return metin(`Eklendi: ${satir(s, appToday())}`);
    },
  },

  is_bitti: {
    title: 'İşi bitti olarak işaretle',
    description:
      'Bir işe tik atar. `id` ya da `ara` (başlık/etiket kelimeleri, ör. "Garage reels") ver. `ara` birden çok açık işe uyarsa hiçbirine dokunmaz, adayları listeler — kullanıcıya hangisi olduğunu sor.',
    girdi: z
      .object({ id: z.string().max(64).optional(), ara: z.string().max(80).optional() })
      .strict(),
    salt: false,
    async calistir(g: { id?: string; ara?: string }, b: AracBaglami) {
      const bugun = appToday();
      let id = g.id;
      if (!id) {
        if (!g.ara) return metin('`id` ya da `ara` gerekli.', true);
        const adaylar = await ara(g.ara);
        if (adaylar.length === 0) return metin(`"${g.ara}" ile eşleşen açık iş yok.`, true);
        if (adaylar.length > 1) {
          return metin(
            `"${g.ara}" ${adaylar.length} işe uyuyor, hiçbirine dokunmadım:\n${adaylar
              .map((x) => `- ${satir(x, bugun)}`)
              .join('\n')}`,
            true,
          );
        }
        id = adaylar[0]!.id;
      }
      const s = await gorevBitti({ id, bitti: true });
      await denetim(b, 'UPDATE', s.id, { bitti: true });
      b.sonra(s.id);
      return metin(`Bitti: ${satir(s, bugun)}`);
    },
  },

  is_geri_al: {
    title: 'Tiki geri al',
    description: 'Bitmiş işi yeniden açık yapar.',
    girdi: z.object({ id: z.string().max(64) }).strict(),
    salt: false,
    async calistir(g: { id: string }, b: AracBaglami) {
      const s = await gorevBitti({ id: g.id, bitti: false });
      await denetim(b, 'UPDATE', s.id, { bitti: false });
      b.sonra(s.id);
      return metin(`Yeniden açıldı: ${satir(s, appToday())}`);
    },
  },

  is_guncelle: {
    title: 'İşi düzenle',
    description:
      'Bir işin başlığını, alanını, etiketini, tarihini, saatini ya da notunu değiştirir. Verilmeyen alan aynı kalır; tarihi kaldırmak için `gun: null`.',
    girdi: z
      .object({
        id: z.string().max(64),
        baslik: z.string().min(1).max(160).optional(),
        alan: z.enum(ALAN_DEGERLERI).optional(),
        etiket: z.string().max(40).nullable().optional(),
        gun: gunAlani.nullable().optional(),
        saat: saatAlani.nullable().optional(),
        not: z.string().max(4000).nullable().optional(),
      })
      .strict(),
    salt: false,
    async calistir(
      g: {
        id: string;
        baslik?: string;
        alan?: IsAlani;
        etiket?: string | null;
        gun?: string | null;
        saat?: string | null;
        not?: string | null;
      },
      b: AracBaglami,
    ) {
      const eski = await db.gorev.findUnique({ where: { id: g.id } });
      if (!eski) return metin('İş bulunamadı.', true);
      const eskiGun = eski.teslimGun ? dateToAppDay(eski.teslimGun) : null;
      const gun = g.gun === undefined ? eskiGun : g.gun;
      const v = gorevGuncelleSchema.safeParse({
        id: g.id,
        baslik: g.baslik ?? eski.baslik,
        alan: g.alan ?? eski.alan,
        etiket: g.etiket === undefined ? eski.etiket : g.etiket,
        not: g.not === undefined ? eski.not : g.not,
        teslimGun: gun,
        teslimSaat:
          g.saat === undefined
            ? gun && eski.teslimDakika !== null
              ? saatMetni(eski.teslimDakika)
              : null
            : g.saat,
      });
      if (!v.success)
        return metin(`Güncellenemedi: ${v.error.issues.map((i) => i.message).join('; ')}`, true);
      const s = await gorevGuncelle(v.data);
      await denetim(b, 'UPDATE', s.id, { alan: s.alan, teslimli: s.teslimGun !== null });
      b.sonra(s.id);
      return metin(`Güncellendi: ${satir(s, appToday())}`);
    },
  },

  is_sil: {
    title: 'İşi sil',
    description:
      'İşi kalıcı olarak siler (Google Takvim etkinliği de kalkar). Silmeden önce kullanıcıdan onay al.',
    girdi: z.object({ id: z.string().max(64) }).strict(),
    salt: false,
    yikici: true,
    async calistir(g: { id: string }, b: AracBaglami) {
      const s = await gorevSil(g.id);
      await denetim(b, 'DELETE', s.id, {});
      b.sonra(s.id, s.googleEtkinlikId);
      return metin('Silindi.');
    },
  },
} as const;

type AracAdi = keyof typeof ARACLAR;

export function aracListesi() {
  return (Object.entries(ARACLAR) as [AracAdi, (typeof ARACLAR)[AracAdi]][]).map(([name, a]) => ({
    name,
    title: a.title,
    description: a.description,
    inputSchema: z.toJSONSchema(a.girdi),
    annotations: {
      title: a.title,
      readOnlyHint: a.salt,
      destructiveHint: 'yikici' in a ? a.yikici : false,
      openWorldHint: false,
    },
  }));
}

export async function aracCalistir(
  ad: string,
  girdi: unknown,
  b: AracBaglami,
): Promise<AracSonucu> {
  const a = ARACLAR[ad as AracAdi];
  if (!a) return metin(`Bilinmeyen araç: ${ad}`, true);
  const v = a.girdi.safeParse(girdi ?? {});
  if (!v.success)
    return metin(`Geçersiz girdi: ${v.error.issues.map((i) => i.message).join('; ')}`, true);
  try {
    // Her aracın girdisi kendi şemasından geçti; çalıştırıcı tipleri şemayla aynı.
    return await (a.calistir as (g: unknown, b: AracBaglami) => Promise<AracSonucu>)(v.data, b);
  } catch (e) {
    if (e instanceof GorevHatasi) return metin(e.message, true);
    throw e;
  }
}
