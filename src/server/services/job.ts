import { db } from '@/server/db';

import { findOrCreateClientForMessage, type ClientRefDto, type ClientWriteClient } from './client';

/**
 * `Job` servisi — §6 mesaj→iş dönüşümünün İHTİYAÇ DUYDUĞU KADARI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KAPSAM SINIRI — TAM CRUD F4'ÜN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * YAZILAN: yalnızca `convertMessageToJob`. §6'nın "gelen mesajdan iş kartı
 * oluşturulur, müşteri kaydı otomatik açılır" cümlesini yerine getirir.
 *
 * YAZILMAYAN (F4'e devrediliyor): iş listeleme/kanban okuması, elle iş açma
 * (`createJobSchema`), güncelleme (`updateJobSchema`), kanban durum değişimi
 * (`changeJobStatusSchema`), ve PARANIN TAMAMI — `agreedAmount`, `fxRate`,
 * `baseAmount` (ADR-014). Üç şema da T-011'de yazılı ve DOKUNULMADI.
 *
 * PARA NEDEN HİÇ YOK: `convertMessageToJobSchema` (T-011) yalnızca
 * `contactMessageId` + `title` taşıyor. Dönüşüm anında tutar HENÜZ BİLİNMİYOR —
 * iş `LEAD` (aday) olarak açılır, pazarlık sonra yapılır. Yani `baseAmount`
 * türetmesi bu turda gerekmiyor; F4 onu kendi `createJob`/`updateJob`ında
 * kuracak. Buraya bugün bir tutar hesabı yazmak, sınanmayan ve çağrılmayan
 * bir kural bırakırdı.
 */

/** Dönüşümün ihtiyaç duyduğu asgari Prisma yüzeyi. */
interface JobRow {
  id: string;
  title: string;
  status: string;
  clientId: string | null;
  contactMessageId: string | null;
  createdAt: Date;
}

export interface JobWriteClient extends ClientWriteClient {
  job: {
    findUnique(args: { where: { contactMessageId: string } }): Promise<JobRow | null>;
    create(args: {
      data: {
        title: string;
        status: 'LEAD';
        clientId: string;
        contactMessageId: string;
      };
    }): Promise<JobRow>;
  };
}

/**
 * Dönüşümün tam sonucu.
 *
 * `client` de dönüyor çünkü kullanıcıya söylenecek şey iki parçalı: iş açıldı,
 * VE müşteri ya yeni açıldı ya mevcut olana bağlandı (bkz. `ClientRefDto.created`).
 */
export interface JobConversionDto {
  job: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
  client: ClientRefDto;
}

/** Dönüşümün girdisi — mesajdan okunan gönderen bilgisi + kullanıcının verdiği başlık. */
export interface ConvertMessageInput {
  contactMessageId: string;
  title: string;
  contact: { name: string; email: string; phone: string | null };
}

/** Bu mesajdan zaten bir iş açılmış mı — `Job.contactMessageId @unique` (ADR-017). */
export async function findJobByContactMessageId(
  contactMessageId: string,
  client: JobWriteClient = db,
): Promise<{ id: string; title: string } | null> {
  const row = await client.job.findUnique({ where: { contactMessageId } });
  return row ? { id: row.id, title: row.title } : null;
}

/**
 * Mesajı iş kartına dönüştürür — §6'nın kritik ilişkisi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TEK İŞLEMDE (ATOMİK) — İKİ YAZMA BİRLİKTE YA DA HİÇ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Müşteri açılıp iş oluşturma başarısız olsaydı (örneğin `contactMessageId`
 * benzersizlik ihlali — aynı mesaj ikinci kez dönüştürülüyor), ORTADA SAHİPSİZ
 * BİR MÜŞTERİ KAYDI KALIRDI. Kullanıcı hata görür, ama müşteri listesinde
 * açıklanamayan bir kayıt belirir; üstelik ikinci denemede o kayıt "mevcut"
 * sayılıp `created: false` dönerdi — yani hata, sonraki denemenin sonucunu da
 * değiştirirdi.
 *
 * `$transaction` bunu kökten çözüyor: `job.create` patlarsa `client.create`
 * geri alınır.
 *
 * `status: 'LEAD'` SABİT: §4.2/ADR-017'nin beş kolonlu kanban'ında yeni gelen
 * her şey ilk kolondan başlar. Kullanıcıya sorulacak bir şey değil — dönüşüm
 * "tek tıkla" olmalı (§6) ve tek tık bir durum seçimi içeremez.
 */
export async function convertMessageToJob(
  input: ConvertMessageInput,
  client: JobWriteClient = db,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
): Promise<JobConversionDto> {
  return runInTransaction(client, async (tx) => {
    const musteri = await findOrCreateClientForMessage(input.contact, tx);

    const is = await tx.job.create({
      data: {
        title: input.title,
        status: 'LEAD',
        clientId: musteri.id,
        contactMessageId: input.contactMessageId,
      },
    });

    return {
      job: {
        id: is.id,
        title: is.title,
        status: is.status,
        createdAt: is.createdAt.toISOString(),
      },
      client: musteri,
    };
  });
}

/**
 * İşlem sarmalayıcısı — ENJEKTE EDİLEBİLİR.
 *
 * `db.$transaction`ı doğrudan çağırmak, testi Prisma'nın etkileşimli işlem
 * uygulamasını taklit etmeye zorlardı (`pnpm test` DB'siz koşar). Sarmalayıcıyı
 * dışarı almak, testin "işlem içinde koşuyormuş gibi" davranan sade bir işlev
 * geçirmesini sağlıyor — ve GERÇEK kod yolu değişmiyor.
 */
export type RunInTransaction = <T>(
  client: JobWriteClient,
  work: (tx: JobWriteClient) => Promise<T>,
) => Promise<T>;

interface TransactionCapableClient {
  $transaction<T>(work: (tx: JobWriteClient) => Promise<T>): Promise<T>;
}

const defaultRunInTransaction: RunInTransaction = (client, work) =>
  (client as unknown as TransactionCapableClient).$transaction(work);
