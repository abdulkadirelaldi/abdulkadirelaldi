import { db } from '@/server/db';

/**
 * `Client` servisi — §6 mesaj→iş dönüşümünün İHTİYAÇ DUYDUĞU KADARI.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KAPSAM SINIRI — TAM CRUD F4'ÜN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Burada YALNIZCA dönüşümün çağırdığı tek yazma var. Listeleme, arama,
 * güncelleme, arşivleme (`isArchived`, ADR-017) ve müşteri bazlı muhasebe
 * toplamları F4'ün (İş & Muhasebe) kapsamında.
 *
 * Sınırı şöyle çizdim: **§6'nın "müşteri kaydı otomatik açılır" cümlesini
 * yerine getiren asgari yüzey.** Dönüşüm bir müşteriye BAĞLANMAK zorunda,
 * dolayısıyla "bul ya da aç" gerekiyor; başka hiçbir şey gerekmiyor.
 * `clientFilterSchema` ve `updateClientSchema` T-011'de zaten yazılı ve
 * DOKUNULMADI — F4 onları bulduğu gibi kullanacak.
 *
 * Fazlasını yazmak iki şeyi bozardı: F4'ün tasarım alanını daraltır (listeleme
 * sözleşmesi burada donardı), ve bu turda sınanmayan kod bırakırdı.
 */

/** Dönüşümün gereksinim duyduğu asgari Prisma yüzeyi. */
export interface ClientWriteClient {
  client: {
    findUnique(args: { where: { email: string } }): Promise<ClientRow | null>;
    create(args: {
      data: { name: string; email: string | null; phone: string | null; notes: string | null };
    }): Promise<ClientRow>;
  };
}

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isArchived: boolean;
}

/** Dönüşümün dışarı verdiği müşteri özeti — tam DTO F4'te. */
export interface ClientRefDto {
  id: string;
  name: string;
  email: string | null;
  /**
   * Bu çağrıda YENİ mi açıldı, yoksa mevcut kayda mı bağlandı.
   *
   * Sonuç zarfında taşınıyor çünkü kullanıcıya söylenmesi gereken şey bu:
   * "yeni müşteri açıldı" ile "mevcut müşteriye bağlandı" farklı sonuçlardır ve
   * ikincisinde kullanıcı beklemediği bir kayda bağlandığını fark edebilmeli.
   */
  created: boolean;
  /** Mevcut kayıt arşivlenmişse `true` — bkz. `findOrCreateClientForMessage`. */
  isArchived: boolean;
}

export interface MessageContact {
  name: string;
  email: string;
  phone: string | null;
}

/**
 * Mesajın göndereni için müşteri kaydını BULUR ya da AÇAR — §6, ADR-017.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KİMLİK ANAHTARI E-POSTADIR, AD DEĞİL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Client.email @unique` tam da bunun için var (ADR-017): aynı kişi üç kez
 * yazarsa üç müşteri oluşmamalı.
 *
 * ADA GÖRE EŞLEŞTİRME BİLEREK YAPILMIYOR. İki farklı "Ahmet Yılmaz" birbirinin
 * aynı değildir; ada göre birleştirmek İKİ GERÇEK MÜŞTERİYİ TEK KAYDA KATARDI
 * ve müşteri bazlı muhasebeyi geri döndürülemez biçimde bozardı. Yinelenen bir
 * kayıt can sıkıcıdır ama düzeltilebilir; birleşmiş iki kayıt ayrıştırılamaz.
 * Asimetri, hangi hatayı tercih edeceğimizi belirliyor.
 *
 * `upsert` YERİNE `findUnique` + `create`: `upsert`in `update` tarafı boş
 * kalırdı (mevcut müşterinin adını mesajdaki adla EZMEK istemiyoruz — panelde
 * elle düzeltilmiş bir ad, gelen bir mesaj yüzünden geri alınmamalı) ve dahası
 * `created` bilgisini `upsert`ten okumak mümkün değil.
 *
 * ARŞİVLENMİŞ MÜŞTERİYE BAĞLANIR ve arşivden ÇIKARMAZ: arşivleme bilinçli bir
 * karardı, gelen bir mesaj onu sessizce geri almamalı. Durum `isArchived` ile
 * raporlanır, kararı kullanıcı verir.
 */
export async function findOrCreateClientForMessage(
  contact: MessageContact,
  client: ClientWriteClient = db,
): Promise<ClientRefDto> {
  const eposta = contact.email.trim();

  /*
   * ═══════════════════════════════════════════════════════════════════════
   * E-POSTASIZ MESAJ — ŞEMADA İMKÂNSIZ, YİNE DE ELE ALINIYOR
   * ═══════════════════════════════════════════════════════════════════════
   *
   * `ContactMessage.email` NOT NULL ve `createContactMessageSchema` geçerli
   * bir adres şart koşuyor; yani formdan gelen HİÇBİR mesaj buraya boş
   * e-postayla giremez. Kalan tek yol doğrudan bir veritabanı yazımı (seed,
   * migration, elle müdahale).
   *
   * O durumda TEKİLLEŞTİRME YAPILMAZ ve müşteri `email: null` ile açılır.
   * Sebep: `findUnique({ email: '' })` boş dizeyi bir KİMLİK gibi kullanırdı
   * ve e-postasız her gönderen aynı müşteri kaydında birikirdi — ada göre
   * eşleştirmenin reddedilme gerekçesinin aynısı, daha kötü hâli.
   *
   * `Client.email` nullable olduğu için birden fazla `null` yan yana durabilir
   * (Postgres'te NULL'lar unique indekste birbirinden ayrıdır). Yani bu yol
   * YİNELENEN kayıt üretebilir; kabul ediyoruz, çünkü alternatifi ayrı
   * kişileri birleştirmek ve o geri alınamaz.
   */
  if (!eposta) {
    const kimliksiz = await client.client.create({
      data: {
        name: contact.name,
        email: null,
        phone: contact.phone,
        notes: 'İletişim formundan gelen mesajdan otomatik oluşturuldu (e-posta yok).',
      },
    });
    return {
      id: kimliksiz.id,
      name: kimliksiz.name,
      email: null,
      created: true,
      isArchived: kimliksiz.isArchived,
    };
  }

  const mevcut = await client.client.findUnique({ where: { email: eposta } });

  if (mevcut) {
    return {
      id: mevcut.id,
      name: mevcut.name,
      email: mevcut.email,
      created: false,
      isArchived: mevcut.isArchived,
    };
  }

  const yeni = await client.client.create({
    data: {
      name: contact.name,
      email: eposta,
      phone: contact.phone,
      // İzin verilen tek otomatik not: müşterinin nereden geldiği.
      notes: 'İletişim formundan gelen mesajdan otomatik oluşturuldu.',
    },
  });

  return {
    id: yeni.id,
    name: yeni.name,
    email: yeni.email,
    created: true,
    isArchived: yeni.isArchived,
  };
}
