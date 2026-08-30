import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import {
  contactMessageFormSchema,
  createContactMessageSchema,
  serverInterpreted,
  serverInterpretedFields,
  serverInterpretedReason,
  toFormSchema,
} from '@/lib/schemas';

/**
 * SUNUCUDA YORUMLANAN ALANLAR KAPISI — T-031 (kaynağı T-026b).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BU DOSYA NEDEN VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `createContactMessageSchema.website` honeypot alanı `.max(0)` taşıyordu.
 * İstemcide `zodResolver` ile koşunca dolu honeypot bir DOĞRULAMA HATASI oldu,
 * `handleSubmit` hiç tetiklenmedi ve gönderim sunucuya ULAŞMADI. Bot kazandı,
 * spam sinyali kaydedilmedi (ADR-020/C11 delindi) ve yanlış pozitifte gerçek
 * kullanıcı "Gönder"e bastığında hiçbir şey olmadı.
 *
 * Kusuru Frontend kendi dosyasında `.extend({ website: z.string().optional() })`
 * ile aştı — yama doğruydu ama BİLGİ TEK BİR FORMUN İÇİNDE KALDI. Bir sonraki
 * formu yazan kişi aynı tuzağa düşerdi ve tuzak SESSİZ.
 *
 * Buradaki testler tuzağı SESLİ yapıyor. En önemlisi "düşmanca değer" testi:
 * `.max(0)` (ya da benzeri bir reddeden kural) geri gelirse kırılır. Yani
 * konvansiyon bir yorum değil, bir kapı.
 */

/**
 * Kapının koruduğu şemalar.
 *
 * Buraya bir satır eklemek YENİ BİR PUBLIC FORM demektir. Liste sabit ama
 * "listeyi güncelle" refleksi değil: aşağıdaki son test, `serverInterpreted`
 * işareti taşıyan HER şemanın burada kayıtlı olmasını da zorluyor.
 */
const KORUNAN_FORMLAR = [
  {
    ad: 'contactMessage',
    sunucuSemasi: createContactMessageSchema,
    formSemasi: contactMessageFormSchema,
    /** İşaretli alanlara konacak DÜŞMANCA değerler — bir botun yazacağı şey. */
    dusmancaDegerler: { website: 'https://spam.example/bot' },
    /** Şemanın geri kalanını geçiren asgari geçerli gövde. */
    gecerliGovde: {
      name: 'Ayşe Yılmaz',
      email: 'ayse@example.com',
      message: 'Merhaba, bir projem var ve görüşmek isterim.',
    },
  },
] as const;

describe('serverInterpreted — işaret mekanizması', () => {
  it('işaret çalışma zamanında okunabiliyor', () => {
    const sema = z.object({
      normal: z.string(),
      tuzak: serverInterpreted(z.string().optional(), 'gerekçe burada'),
    });

    expect(serverInterpretedFields(sema)).toEqual(['tuzak']);
    expect(serverInterpretedReason(sema, 'tuzak')).toBe('gerekçe burada');
    expect(serverInterpretedReason(sema, 'normal')).toBeUndefined();
  });

  it('toFormSchema işaretli alanı ÇIKARIR, diğerlerine dokunmaz', () => {
    const sema = z.object({
      normal: z.string(),
      tuzak: serverInterpreted(z.string().optional(), 'gerekçe'),
    });
    const form = toFormSchema(sema);

    expect(Object.keys(form.shape)).toEqual(['normal']);
    // Çıkarılan alan artık BİLİNMEYEN anahtar; Zod onu sessizce düşürür,
    // hata VERMEZ — formun gönderimi engellenmesin diye tam olarak istenen bu.
    expect(form.safeParse({ normal: 'a', tuzak: 'her ne olursa' }).success).toBe(true);
  });

  it('işaretsiz şema değişmeden döner', () => {
    const sema = z.object({ a: z.string() });
    expect(toFormSchema(sema)).toBe(sema);
  });

  it('işaret alanın KURALINI değiştirmez — yalnızca etiketler', () => {
    // `serverInterpreted` bir kısıt EKLEMEZ veya KALDIRMAZ; işaretlemek,
    // alanı gevşetmenin yerine geçmez. Gevşetme alanı yazanın işi.
    const kisitli = serverInterpreted(z.string().max(3), 'gerekçe');
    expect(kisitli.safeParse('abcd').success).toBe(false);
  });
});

describe.each(KORUNAN_FORMLAR)('public form kapısı — $ad', (form) => {
  const isaretli = serverInterpretedFields(form.sunucuSemasi);

  it('en az bir işaretli alanı var (kayıt ölü değil)', () => {
    expect(isaretli.length).toBeGreaterThan(0);
  });

  it('her işaretin YAZILI bir gerekçesi var', () => {
    for (const alan of isaretli) {
      const gerekce = serverInterpretedReason(form.sunucuSemasi, alan);
      expect(gerekce, `${alan} işaretli ama gerekçesiz`).toBeTruthy();
      // Tek kelimelik bir gerekçe ("honeypot") sonraki okuyucuya hiçbir şey
      // anlatmaz; işaretin NEDEN konduğu yazılmalı.
      expect(gerekce?.length, `${alan} gerekçesi çok kısa`).toBeGreaterThan(30);
    }
  });

  it('işaretli alanlar FORM ŞEMASINDA YOK', () => {
    for (const alan of isaretli) {
      expect(Object.keys(form.formSemasi.shape), `${alan} form şemasında kalmış`).not.toContain(
        alan,
      );
    }
  });

  /**
   * KUSURU YENİDEN ÜRETEN TEST — bu dosyadaki en önemli assert.
   *
   * İşaretli alana bir bot ne yazarsa yazsın, İSTEMCİ ŞEMASI GEÇMELİ. Geçmezse
   * `handleSubmit` tetiklenmez ve gönderim sunucuya hiç ulaşmaz — T-026b'de
   * ölçülen zincirin tamamı budur.
   *
   * `.max(0)` geri gelirse burası kırılır.
   */
  it('DÜŞMANCA değerlerle form şeması BAŞARIYLA parse eder', () => {
    const sonuc = form.formSemasi.safeParse({
      ...form.gecerliGovde,
      ...form.dusmancaDegerler,
    });

    expect(
      sonuc.success,
      `form şeması işaretli alan yüzünden reddediyor — gönderim sunucuya ULAŞMAZ: ${
        sonuc.success ? '' : JSON.stringify(sonuc.error.issues)
      }`,
    ).toBe(true);
  });

  it('SUNUCU şeması da düşmanca değeri reddetmiyor', () => {
    // Sunucu tarafı reddetseydi mesaj kaydedilmez ve `honeypotHit` hiç
    // yazılmazdı — ADR-020/C11 "spam silinmez, ayrılır" delinirdi.
    expect(
      form.sunucuSemasi.safeParse({ ...form.gecerliGovde, ...form.dusmancaDegerler }).success,
    ).toBe(true);
  });

  it('form şeması geri kalan kuralları HÂLÂ koşuyor', () => {
    // Kapı, doğrulamayı toptan gevşetmenin bahanesi değil.
    expect(form.formSemasi.safeParse({ ...form.gecerliGovde, email: 'eposta-degil' }).success).toBe(
      false,
    );
  });
});

describe('kapı kapsamlı — işaretli her şema kayıtlı', () => {
  it('şema barrel’ında kayıt dışı işaretli şema YOK', async () => {
    const barrel: Record<string, unknown> = await import('@/lib/schemas');
    const kayitli = new Set<unknown>(KORUNAN_FORMLAR.map((f) => f.sunucuSemasi));

    const kacaklar = Object.entries(barrel)
      .filter(
        (entry): entry is [string, z.ZodObject] =>
          entry[1] instanceof z.ZodObject && serverInterpretedFields(entry[1]).length > 0,
      )
      .filter(([, sema]) => !kayitli.has(sema))
      .map(([ad]) => ad);

    expect(
      kacaklar,
      `işaretli alanı olan şema KORUNAN_FORMLAR'a eklenmemiş: ${kacaklar.join(', ')}`,
    ).toEqual([]);
  });
});
