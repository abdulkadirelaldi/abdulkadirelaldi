'use server';

import { archiveClientSchema, createClientSchema, updateClientSchema } from '@/lib/schemas';
import { db } from '@/server/db';
import { revalidateTag } from 'next/cache';

import {
  clientLogoBelongsTo,
  createClient,
  setClientArchived,
  updateClient,
  type ClientPanelDto,
} from '@/server/services/client';
import { entityTag } from '@/server/services/_shared/content-cache';
import {
  buildDiff,
  fail,
  ok,
  parseOrFail,
  writeAuditLog,
  type ApiResponse,
} from '@/server/services/_shared';

import { currentActorId, toFailure, unauthorized } from './_shared';

/**
 * `Client` Server Action'ları — §4.2, §7.1, ADR-017, ADR-022.
 *
 * §7.1 sırası `actions/project.ts`te ayrıntılı anlatıldı ve BİREBİR aynı:
 *   1. `currentActorId()` — §8.6 + ADR-035/B yazma kapısı
 *   2. Zod parse — §8.8
 *   3. servis — §7.4
 *   4. `AuditLog` — §8.19, ADR-022 (bunların hepsi SONUÇ)
 *   5. `revalidateTag(entityTag('client'))` — T-117'den beri (aşağıya bakınız)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `revalidateTag` — T-117'DE GELDİ; ÖNCESİNDEKİ "YOK" KARARI DOĞRUYDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-117 müşteri LOGO ŞERİDİNİ getirdi (`getSiteClientLogos`, önbellekli) ve
 * `ContentEntity`ye `client` girdi. Ad, `showOnSite`, logo ya da arşiv durumu
 * şeridi değiştiriyor; her müşteri mutasyonu `content:client`ı düşürüyor.
 * Aşağıdaki T-100 taraması YAZILDIĞI GÜN doğruydu ve bağlam değişince karar
 * değişti (T-019'un "bağlam değişince kararı gözden geçir" dersi):
 *
 * Kart "varsayma, tara ve doğrula" dedi. Tarandı (T-100):
 *   - `ContentEntity` birleşimi: `'profile' | 'project' | 'post' | 'experience'
 *     | 'skill' | 'service'` — `client` ve `job` YOK, yani düşürülebilecek bir
 *     etiket TANIMLI DEĞİL.
 *   - `services/cached.ts`'teki hiçbir `cachedRead` girdisi `Client`/`Job`
 *     okumuyor.
 *   - `getSiteStats` (`_shared/stats.ts` + `services/stats.ts`): `Job` ya da
 *     `Client` geçen TEK SATIR YOK. T-040'ta `Project`+`Experience` topluyordu
 *     ve bugün de öyle — `Job` EKLENMEMİŞ.
 *   - `src/app/(public)/**`: `fetchJob`/`fetchClient` geçen dosya YOK.
 *
 * Yani düşürülecek bir şey gerçekten yok. Simetri uğruna bir `revalidateTag`
 * çağırmak ölü kod olur ve daha kötüsü sonraki okuyucuya "müşteri listesi
 * önbelleklidir" diye yanlış bilgi verirdi. Kalıbı kopyalarken KOPYALANMAYACAK
 * adımı işaretlemek kalıbın bir parçası (T-038).
 *
 * ⚠️ SİLME EYLEMİ YOK ve bu eksiklik değil: `Client` arşivlenir (ADR-017).
 * Gerekçe `services/client.ts`in başında, FK ölçümüyle.
 */

/* ===========================================================================
 * EKLEME
 * ======================================================================== */

export async function createClientAction(raw: unknown): Promise<ApiResponse<ClientPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(createClientSchema, raw);
  if (!parsed.ok) return parsed.failure;

  /*
   * YENİ KAYITTA LOGO OLAMAZ: logo bu müşterinin KENDİ eklentisi olmalı
   * (`clientLogoBelongsTo`) ve kaydedilmemiş müşterinin eklentisi yok.
   */
  if (parsed.data.logoAttachmentId) {
    return fail('VALIDATION_ERROR', 'Logo, müşteri kaydedildikten sonra eklenebilir.', {
      logoAttachmentId: 'Önce müşteriyi kaydedin.',
    });
  }

  try {
    const dto = await createClient(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'CREATE',
        entity: 'Client',
        entityId: dto.id,
        /*
         * ⚠️ BULGU-019 / ADR-034 — ALANLAR TEK TEK SAYILIYOR.
         *
         * `buildDiff(null, parsed.data)` yazmak cazipti ve YANLIŞ olurdu: alan
         * seçimini ŞEMAYA devreder, yani yarın `clientBase`e eklenen bir alan
         * denetim kaydına KENDİLİĞİNDEN girer. BULGU-019 tam olarak bu sınıftı.
         *
         * ⚠️ `email`, `phone` ve `notes` BİLEREK YOK. `email` §8.20'nin açık
         * yasağı (tam e-posta denetim kaydına girmez — `redactAuditDiff` onu
         * zaten maskeler ama ADR-034 maskeye GÜVENMEMEYİ söylüyor). `phone`
         * aynı sınıf kişisel veri. `notes` serbest metin, yani içine ne
         * yazıldığı bilinemez — ADR-034'ün "masum anahtarın değerine gömülü
         * sır" ölçümü tam bu alanın tarifi.
         *
         * Denetim kaydının cevaplaması gereken soru "hangi müşteri ne zaman
         * açıldı"; kişinin iletişim bilgisi kaydın kendisinde duruyor.
         */
        diff: buildDiff(null, {
          name: dto.name,
          company: dto.company,
          isKiyiMedya: dto.isKiyiMedya,
          /** Değerin kendisi değil, VARLIĞI — "e-postası var mı" bilgisi yeterli. */
          hasEmail: dto.email !== null,
        }),
      },
      db,
    );

    revalidateTag(entityTag('client'));
    return ok(dto);
  } catch (error) {
    return toFailure('client:create', error, {
      // `Client.email @unique` — varsayılan P2002 metni slug'a özel ve burada
      // anlamsız kalırdı (ortada slug yok).
      conflict: {
        message: 'Bu e-posta adresi başka bir müşteride kayıtlı. Mevcut müşteriyi düzenleyin.',
        fields: { email: 'Bu e-posta zaten kullanılıyor.' },
      },
    });
  }
}

/* ===========================================================================
 * GÜNCELLEME
 * ======================================================================== */

export async function updateClientAction(raw: unknown): Promise<ApiResponse<ClientPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(updateClientSchema, raw);
  if (!parsed.ok) return parsed.failure;

  /*
   * ⚠️ LOGO SAHİPLİĞİ — T-117. Logo bu müşterinin KENDİ `CLIENT` eklentisi
   * olmalı. Kontrol olmasa logo alanına bir MAKBUZUN kimliği yazılabilir ve
   * `showOnSite` açıkken o makbuz herkese açılırdı. Sunum ucu bunu ayrıca
   * kontrol ediyor (`isPublicClientLogo` sahip kimliğiyle) — iki kat.
   */
  const logoId = parsed.data.logoAttachmentId;
  if (typeof logoId === 'string' && !(await clientLogoBelongsTo(parsed.data.id, logoId))) {
    return fail('VALIDATION_ERROR', 'Seçilen logo bu müşteriye ait değil — yeniden yükleyin.', {
      logoAttachmentId: 'Logo bu müşteriye ait değil.',
    });
  }

  try {
    const dto = await updateClient(parsed.data);

    await writeAuditLog(
      {
        actorId,
        action: 'UPDATE',
        entity: 'Client',
        entityId: dto.id,
        /*
         * ÖNCEKİ DURUM OKUNMUYOR ve bu bilinçli bir takas.
         *
         * İçerik eylemlerinde (`project.ts`) önce/sonra okunuyor çünkü ADR-029
         * ESKİ slug/dil etiketlerini düşürmek için onlara İHTİYAÇ DUYUYOR —
         * yani okuma zaten yapılmak zorundaydı ve diff onu bedavaya kullanıyor.
         * Burada etiket yok (yukarıdaki tarama), dolayısıyla okumanın TEK sebebi
         * diff olurdu: her güncellemeye fazladan bir sorgu.
         *
         * Karşılığında kaybedilen: "ad neydi" bilgisi. Kabul edilebilir, çünkü
         * `AuditLog` bir SÜRÜM GEÇMİŞİ DEĞİL (T-100 kararı) — cevapladığı soru
         * "kim, ne zaman, neyi değiştirdi". Hangi alanların GÖNDERİLDİĞİ bunu
         * cevaplıyor ve T-053'ün denetim ekranı zaten yalnızca alan ADLARINI
         * gösteriyor, önce/sonra değerlerini göstermiyor.
         */
        diff: {
          changed: Object.keys(parsed.data)
            .filter((key) => key !== 'id')
            .sort()
            .join(', '),
        },
      },
      db,
    );

    revalidateTag(entityTag('client'));
    return ok(dto);
  } catch (error) {
    return toFailure('client:update', error, {
      conflict: {
        message: 'Bu e-posta adresi başka bir müşteride kayıtlı.',
        fields: { email: 'Bu e-posta zaten kullanılıyor.' },
      },
    });
  }
}

/* ===========================================================================
 * ARŞİVLEME — SİLME YOK (ADR-017)
 * ======================================================================== */

/**
 * Müşteriyi arşivler ya da arşivden çıkarır.
 *
 * `AuditAction` olarak `ARCHIVE` ve `RESTORE` kullanılıyor, `UPDATE` değil:
 * eylem kullanıcı için "sil" / "geri al" düğmesidir ve denetim kaydında öyle
 * görünmelidir (`archiveProjectAction` ile aynı gerekçe). İki enum değeri de
 * `AuditAction`da zaten var (ADR-020).
 */
export async function archiveClientAction(raw: unknown): Promise<ApiResponse<ClientPanelDto>> {
  const actorId = await currentActorId();
  if (!actorId) return unauthorized();

  const parsed = parseOrFail(archiveClientSchema, raw);
  if (!parsed.ok) return parsed.failure;

  try {
    const dto = await setClientArchived(parsed.data.id, parsed.data.isArchived);

    await writeAuditLog(
      {
        actorId,
        action: parsed.data.isArchived ? 'ARCHIVE' : 'RESTORE',
        entity: 'Client',
        entityId: dto.id,
        diff: { isArchived: { before: !dto.isArchived, after: dto.isArchived } },
      },
      db,
    );

    revalidateTag(entityTag('client'));
    return ok(dto);
  } catch (error) {
    return toFailure('client:archive', error);
  }
}
