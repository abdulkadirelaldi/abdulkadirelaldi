'use client';

import { Check, Flame, Minus, Plus, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { HAFTA_GUNLERI_KISA, gunAy, seriMetni, simgeMetni } from '@/components/panel/hayat-bicim';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-error';
import { cn } from '@/lib/utils/cn';
import { setHabitDayCountAction, toggleHabitDayAction } from '@/server/actions/habit';
import type { HabitWeekDto, HabitWeekRowDto } from '@/server/services/habit';

/**
 * HAFTALIK ALIŞKANLIK PANOSU — §4.2 `/panel/hayat`, T-115. Sayfanın ana işi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İYİMSER GÜNCELLEME — AMA YALNIZCA HÜCRE; SERİ SUNUCUDAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hücreye tıklamak §4.2'nin en sık eylemi; her tıkta tam bir sayfa
 * tazelemesini beklemek panoyu yavaş hissettirirdi. Hücrenin sayacı bu yüzden
 * TIK ANINDA değişiyor ve sunucu cevap verince SUNUCUNUN değeriyle
 * (`HabitDayResult.count`) üzerine yazılıyor — tahmin değil, yazılan değer.
 *
 * SERİ İYİMSER HESAPLANMIYOR: 400 günlük pencereye bakıyor ve istemcide yalnızca
 * bu haftanın 7 günü var. Başarıdan sonra `router.refresh()` seriyi sunucudan
 * yeniden getiriyor. Haftalık "tamamlanan gün" sayısı ise eldeki 7 sayaçtan
 * BİREBİR türetilebiliyor, o yüzden hücreyle birlikte anında değişiyor.
 *
 * Hata dalında hücre ESKİ değerine dönüyor ve mesaj `FormAlert` (`role="alert"`)
 * ile duyuruluyor — "tıkladım, işaret kaldı ama kaydedilmedi" yalanı yok.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İSTEKTEKİ HÜCRE KİLİTLİ — SERVİSİN KABUL ETTİĞİ YARIŞI EKRAN DARALTIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `toggleHabitDay` sayaç artırmada oku-sonra-yaz yarışını kabul ediyor: iki
 * eşzamanlı tık aynı `n`i okuyup ikisi de `n+1` yazabilir. Servis bunu "tek
 * kullanıcılı panoda görünür ve düzeltilebilir" diye bıraktı; ekran bir adım
 * daha atıyor ve istek sürerken AYNI hücreyi devre dışı bırakıyor. Başka
 * sekmeden gelen yarış hâlâ mümkün — yalnızca bu sekmenin hızlı çift tıkı kapandı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * İKİ TÜR HÜCRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   - `targetPerDay` YOK → AÇ/KAPA düğmesi, `aria-pressed`. Ekran okuyucu
 *     "basılı / basılı değil" duyuruyor; etiket yalnızca alışkanlık ve gün.
 *   - `targetPerDay` VAR → ARTIRMA düğmesi; durum `aria-pressed` ile
 *     anlatılamaz (iki değerli değil), etiket sayacı söylüyor: "Su, 21 Ekim:
 *     3/8". Altındaki küçük "−" düğmesi DÜZELTME yolu (`setHabitDayCountAction`)
 *     — artırma düğmesi geri alamaz; ikinci bardak ilk bardağı silmemeli.
 *
 * GELECEK GÜNLER DEVRE DIŞI: yarını bugünden işaretlemek "yapıldı" kaydının
 * anlamını bozardı. Karşılaştırma `today` dizesiyle — `YYYY-MM-DD` sözlük
 * sırası tarih sırasıyla aynı; istemcinin saat dilimine bakılmıyor (ADR-016,
 * "bugün" sunucuda İstanbul gününe göre hesaplandı).
 *
 * DAR EKRAN: ızgara KENDİ kabında yatay kayıyor (`overflow-x-auto`), sayfa
 * değil. Alışkanlık adı sütunu `sticky` — kaydırırken hangi satırda olduğunu
 * kaybetmemek için.
 */

/** `isDayComplete` (`services/habit.ts`) ile AYNI kural — servis değer olarak
 *  içe aktarılamıyor (veritabanı istemcisini istemci paketine sürüklerdi). */
function gunTamam(sayi: number, gunlukHedef: number | null): boolean {
  return sayi >= (gunlukHedef ?? 1);
}

const SAYAC_UST_SINIRI = 100;

const anahtar = (habitId: string, gun: string) => `${habitId}:${gun}`;

export function AliskanlikPanosu({ hafta }: { hafta: HabitWeekDto }) {
  const router = useRouter();
  const [, gecis] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState<ReadonlySet<string>>(new Set());

  /*
   * YEREL SAYAÇLAR, HANGİ SUNUCU VERİSİNE AİT OLDUKLARIYLA BİRLİKTE tutuluyor.
   * `router.refresh()` yeni bir `hafta` nesnesi getirdiğinde eski yerel
   * değerler KENDİLİĞİNDEN geçersiz sayılıyor — `useEffect` içinde sıfırlamaya
   * gerek kalmıyor ve bir çizim boyunca eski ile yeni veri karışmıyor.
   */
  const [yerel, setYerel] = useState<{ kaynak: HabitWeekDto; sayilar: Record<string, number> }>({
    kaynak: hafta,
    sayilar: {},
  });
  const yerelSayilar = yerel.kaynak === hafta ? yerel.sayilar : {};

  const sayiOku = (satir: HabitWeekRowDto, sira: number): number =>
    yerelSayilar[anahtar(satir.id, hafta.days[sira] ?? '')] ?? satir.counts[sira] ?? 0;

  const sayiYaz = (k: string, deger: number) =>
    setYerel((onceki) => ({
      kaynak: hafta,
      sayilar: { ...(onceki.kaynak === hafta ? onceki.sayilar : {}), [k]: deger },
    }));

  const bekliyor = (k: string, durum: boolean) =>
    setBekleyen((onceki) => {
      const yeni = new Set(onceki);
      if (durum) yeni.add(k);
      else yeni.delete(k);
      return yeni;
    });

  /**
   * Ortak yazma yolu — tahmini değeri hemen göster, sunucunun değeriyle
   * kesinleştir, hata dalında eskisine dön.
   */
  const yaz = async (
    satir: HabitWeekRowDto,
    gun: string,
    onceki: number,
    tahmin: number,
    cagri: () => ReturnType<typeof toggleHabitDayAction>,
  ) => {
    const k = anahtar(satir.id, gun);
    setHata(null);
    sayiYaz(k, tahmin);
    bekliyor(k, true);

    try {
      const sonuc = await cagri();
      if (sonuc.ok) {
        sayiYaz(k, sonuc.data.count);
        gecis(() => router.refresh());
      } else {
        sayiYaz(k, onceki);
        setHata(`${satir.name}, ${gunAy(gun)}: ${sonuc.error.message}`);
      }
    } catch {
      sayiYaz(k, onceki);
      setHata(`${satir.name}, ${gunAy(gun)}: kaydedilemedi — bağlantı kurulamadı.`);
    } finally {
      bekliyor(k, false);
    }
  };

  const tikla = (satir: HabitWeekRowDto, gun: string, onceki: number) => {
    const tahmin =
      satir.targetPerDay === null ? (onceki > 0 ? 0 : 1) : Math.min(onceki + 1, SAYAC_UST_SINIRI);
    void yaz(satir, gun, onceki, tahmin, () =>
      toggleHabitDayAction({ habitId: satir.id, date: gun }),
    );
  };

  const azalt = (satir: HabitWeekRowDto, gun: string, onceki: number) => {
    const tahmin = Math.max(0, onceki - 1);
    void yaz(satir, gun, onceki, tahmin, () =>
      setHabitDayCountAction({ habitId: satir.id, date: gun, count: tahmin }),
    );
  };

  if (hafta.habits.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Panoda alışkanlık yok"
        description="Bir alışkanlık ekle; her gün işaretledikçe haftalık hedef ve seri burada hesaplanır. Ara verilen ve arşivlenen alışkanlıklar panoda görünmez."
        action={
          <Link href="/panel/hayat/aliskanliklar/yeni" className={buttonClasses({ size: 'sm' })}>
            <Plus className="size-4" aria-hidden="true" />
            Alışkanlık ekle
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hata && <FormAlert>{hata}</FormAlert>}

      {/*
        `relative` ŞART — `veri-tablosu.tsx`teki T-043f ölçümünün aynısı. Hücrelerdeki
        `.sr-only` etiketler `position: absolute`; konumlandırılmış ata olmayınca bu
        kabın kırpmasından kaçıp sayfayı 360 px'te 252 px taşırıyordu (T-116 E2E).
      */}
      <div className="border-line rounded-card relative overflow-x-auto border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            Haftalık alışkanlık panosu — satırlar alışkanlıklar, sütunlar pazartesiden pazara
            günler. Gelecek günler işaretlenemez.
          </caption>
          <thead>
            <tr className="border-line border-b">
              <th
                scope="col"
                className="bg-surface text-muted sticky left-0 z-10 px-3 py-2 text-left text-xs font-medium"
              >
                Alışkanlık
              </th>
              {hafta.days.map((gun, sira) => {
                const bugun = gun === hafta.today;
                return (
                  <th
                    key={gun}
                    scope="col"
                    aria-current={bugun ? 'date' : undefined}
                    className={cn(
                      'px-1 py-2 text-center text-xs font-medium',
                      bugun ? 'text-accent-soft' : 'text-muted',
                    )}
                  >
                    <span className="block">{HAFTA_GUNLERI_KISA[sira]}</span>
                    <span className="tabular block font-normal">{gun.slice(8, 10)}</span>
                  </th>
                );
              })}
              <th scope="col" className="text-muted px-3 py-2 text-right text-xs font-medium">
                Hafta
              </th>
            </tr>
          </thead>

          <tbody>
            {hafta.habits.map((satir) => {
              const sayilar = hafta.days.map((_, sira) => sayiOku(satir, sira));
              const tamamlanan = sayilar.filter((s) => gunTamam(s, satir.targetPerDay)).length;
              const hedefTuttu = tamamlanan >= satir.targetPerWeek;
              const seri = seriMetni(satir.streak);

              return (
                <tr key={satir.id} className="border-line border-b last:border-b-0">
                  <th
                    scope="row"
                    className="bg-surface sticky left-0 z-10 max-w-44 px-3 py-2 text-left align-middle font-normal"
                  >
                    <Link
                      href={`/panel/hayat/aliskanliklar/${satir.id}`}
                      className="focus-ring rounded-btn text-primary -m-1 flex items-center gap-2 p-1 font-medium"
                    >
                      {satir.color && (
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: satir.color }}
                        />
                      )}
                      <span className="truncate">
                        {simgeMetni(satir.icon)}
                        {satir.name}
                      </span>
                    </Link>
                    <span className="text-muted mt-0.5 flex items-center gap-1 text-xs">
                      <Flame className="size-3 shrink-0" aria-hidden="true" />
                      {/* `aria-label` düz `span`de yasak (genel rol) — görünür metin
                          gizleniyor, ekran okuyucuya "en az" diyen metin veriliyor. */}
                      <span className="tabular" aria-hidden="true">
                        {satir.streak.value === 0 ? 'Seri yok' : seri.metin}
                      </span>
                      <span className="sr-only">{seri.aciklama}</span>
                    </span>
                  </th>

                  {hafta.days.map((gun, sira) => {
                    const sayi = sayilar[sira] ?? 0;
                    const k = anahtar(satir.id, gun);
                    const gelecek = gun > hafta.today;
                    const istekte = bekleyen.has(k);
                    const tamam = gunTamam(sayi, satir.targetPerDay);
                    const sayacli = satir.targetPerDay !== null;
                    const tarih = `${HAFTA_GUNLERI_KISA[sira]} ${gunAy(gun)}`;

                    return (
                      <td key={gun} className="px-1 py-2 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={gelecek || istekte}
                            onClick={() => tikla(satir, gun, sayi)}
                            aria-pressed={sayacli ? undefined : sayi > 0}
                            aria-label={
                              sayacli
                                ? `${satir.name}, ${tarih}: ${sayi}/${satir.targetPerDay}${gelecek ? ' (gelecek gün)' : ' — bir ekle'}`
                                : `${satir.name}, ${tarih}${gelecek ? ' (gelecek gün)' : ''}`
                            }
                            className={cn(
                              'focus-ring ease-brand duration-micro rounded-btn inline-flex size-10 items-center justify-center border text-xs transition-colors',
                              'disabled:cursor-not-allowed',
                              tamam
                                ? 'border-success/40 bg-success/15 text-success'
                                : sayi > 0
                                  ? 'border-accent/40 bg-accent/10 text-accent-soft'
                                  : 'border-line bg-surface text-muted hover:border-line-hover',
                              gelecek && 'border-dashed opacity-50',
                              istekte && 'animate-pulse',
                            )}
                          >
                            {sayacli ? (
                              <span className="tabular">
                                {sayi}
                                <span className="text-muted">/{satir.targetPerDay}</span>
                              </span>
                            ) : sayi > 0 ? (
                              <Check className="size-4" aria-hidden="true" />
                            ) : null}
                          </button>

                          {sayacli && sayi > 0 && !gelecek && (
                            <button
                              type="button"
                              disabled={istekte}
                              onClick={() => azalt(satir, gun, sayi)}
                              aria-label={`${satir.name}, ${tarih}: bir azalt (şu an ${sayi})`}
                              className="focus-ring rounded-btn text-muted hover:text-primary inline-flex h-6 w-8 items-center justify-center disabled:cursor-not-allowed"
                            >
                              <Minus className="size-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  <td className="px-3 py-2 text-right align-middle">
                    <span
                      className={cn('tabular text-sm', hedefTuttu ? 'text-success' : 'text-body')}
                    >
                      {tamamlanan}/{satir.targetPerWeek}
                    </span>
                    <span className="sr-only">
                      {hedefTuttu ? ' gün, haftalık hedef tuttu' : ' gün tamamlandı'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-muted text-xs">
        Sayaçlı alışkanlıkta hücreye her tık bir ekler; yanlış sayıyı alttaki − ile düzelt. Bir gün
        günlük hedefe ulaşınca tamamlanmış sayılır. Seri bugüne göre hesaplanır; bugün henüz
        tamamlanmadıysa dünden sayılır.
      </p>
    </div>
  );
}
