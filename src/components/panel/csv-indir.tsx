'use client';

import { Download, Loader2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import type { ExportBasis } from '@/lib/schemas/report';
import type { TransactionFilterInput } from '@/lib/schemas/transaction';
import { exportCsvAction, type CsvExportResponseDto } from '@/server/actions/export';
import type { ApiResponse } from '@/types';

/**
 * CSV İNDİRME — §4.2, T-109f.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TESLİMAT: SUNUCU EYLEMİ + BLOB — `src/app/api/**` ALTINDA ROTA YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `CsvExportDto.content` bir DİZE, akış değil. Bu tek olgu bütün teslimat
 * kararını veriyor: dosyayı akıtacak bir şey olmadığı için `Response` döndüren
 * bir rota handler'ına ihtiyaç yok. Eylem metni döndürüyor, istemci `Blob`a
 * sarıp indiriyor.
 *
 * Kazanç yalnızca "daha az dosya" değil: bir GET rotası açmak, dosyayı adresi
 * bilen herkese (ve tarayıcı geçmişine, log'lara, önbelleğe) açılabilir bir
 * URL'e dönüştürürdü. Sunucu eylemi POST ve oturum kapısını Backend
 * `currentActorId()` ile zaten koşuyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `basis` ZORUNLU VE VARSAYILAN UYDURULMUYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Şema `basis`i zorunlu tutuyor ve bir varsayılan VERMİYOR. Arayüz de vermiyor.
 * Gerekçe T-105'in kararının aynısı: nakit ve tahakkuk AYNI SORUNUN iki farklı
 * cevabı değil, İKİ FARKLI SORU. Birini önceden seçmek, kullanıcının sormadığı
 * soruya onun adına cevap vermek olurdu — ve bu dosya muhasebecisine gidiyor.
 *
 * Seçim yapılmadan "İndir"e basılırsa düğme DEVRE DIŞI BIRAKILMIYOR (T-018:
 * ölü düğme yok); basılıyor ve neden olmadığı SÖYLENİYOR. Devre dışı bir
 * düğme "neden?" sorusunu cevapsız bırakır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KESİLME UYARISI SESSİZ KALAMAZ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `truncated` zarfın içinde geliyor (Backend bunu bilerek DTO'ya koydu).
 * Gösterilmezse kullanıcı 10.000 satırlık bir dosya indirir ve defterin
 * TAMAMINI aldığını sanır — dosyayı açtığında bile anlamaz, çünkü eksik olan
 * şey orada OLMAYAN satırlardır. İndirme engellenmiyor (dosya gerçek ve
 * işe yarar), uyarı indirmeden SONRA ve kalıcı olarak duruyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BOM ARAYÜZDE EKLENMİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `_shared/csv.ts` içeriğe UTF-8 BOM'u ZATEN koyuyor (ölçülmüş bir karar:
 * BOM'suz dosyada Excel Türkçe karakterleri bozuyor). Burada ikinci bir BOM
 * eklemek dosyanın başına görünmez bir çöp karakter bırakırdı — `Blob` yalnızca
 * gelen dizeyi sarıyor.
 */

/** İndirilecek küme — `basis` BURADA YOK, onu kullanıcı seçiyor. */
export type CsvIstegi =
  | { dataset: 'transactions'; filter: TransactionFilterInput }
  | { dataset: 'categories'; range: { from: string; to: string } }
  | { dataset: 'monthly'; year: number };

const ESAS_SECENEKLERI: ReadonlyArray<{ deger: ExportBasis; etiket: string; aciklama: string }> = [
  {
    deger: 'cash',
    etiket: 'Nakit esası',
    aciklama: 'Eline geçen ve elinden çıkan para. Kesilmiş ama tahsil edilmemiş tutarlar yok.',
  },
  {
    deger: 'accrual',
    etiket: 'Tahakkuk esası',
    aciklama: 'Kesilen ve doğan toplam — ödenme durumuna bakılmaz.',
  },
];

export function CsvIndir({
  istek,
  etiket = 'CSV indir',
  aciklama,
}: {
  istek: CsvIstegi;
  etiket?: string;
  /** Neyin indirileceğini söyleyen kısa cümle — "Bu süzgeçteki işlemler" gibi. */
  aciklama: string;
}) {
  const [acik, setAcik] = useState(false);
  const [esas, setEsas] = useState<ExportBasis | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<CsvExportResponseDto | null>(null);
  const ilkSecenek = useRef<HTMLInputElement>(null);
  const grupId = useId();

  /* Panel açılınca odak ilk seçeneğe — klavye kullanıcısı Tab'la aramasın
     (ArsivleDugmesi'nin ölçülmüş kalıbı). */
  useEffect(() => {
    if (acik) ilkSecenek.current?.focus();
  }, [acik]);

  useEffect(() => {
    if (!acik) return;
    const tusla = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') setAcik(false);
    };
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [acik]);

  const indir = async () => {
    if (!esas) {
      setHata(
        'Önce esası seç. Nakit ve tahakkuk aynı sorunun iki cevabı değil, iki ayrı soru — senin yerine seçilemez.',
      );
      return;
    }

    setCalisiyor(true);
    setHata(null);
    setSonuc(null);

    try {
      const cevap: ApiResponse<CsvExportResponseDto> = await exportCsvAction({
        ...istek,
        basis: esas,
      });

      if (!cevap.ok) {
        setHata(cevap.error.message);
        return;
      }

      /*
        TARAYICIYA DOSYAYI VERME. `download` özniteliği dosya adını belirliyor;
        `URL.revokeObjectURL` olmazsa nesne sekme kapanana kadar bellekte kalır.
        `a` DOM'a EKLENİYOR: Firefox eklenmemiş bir bağlantının `click()`ini
        yoksayıyor ve indirme sessizce hiç başlamıyor.
      */
      const blob = new Blob([cevap.data.content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const bag = document.createElement('a');
      bag.href = url;
      bag.download = cevap.data.filename;
      document.body.appendChild(bag);
      bag.click();
      bag.remove();
      URL.revokeObjectURL(url);

      setSonuc(cevap.data);
      setAcik(false);
    } catch {
      setHata('Dosya üretilemedi — bağlantı kurulamadı. Hiçbir veri dışarı çıkmadı.');
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!acik ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setAcik(true)}>
          <Download className="size-4" aria-hidden="true" />
          {etiket}
        </Button>
      ) : (
        <div className="rounded-card border-line bg-surface flex flex-col gap-3 border p-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-primary text-sm font-medium">
              Hangi esasa göre indirilsin?
            </legend>
            <p className="text-muted text-xs">{aciklama}</p>

            {ESAS_SECENEKLERI.map((secenek, i) => (
              <label
                key={secenek.deger}
                className="rounded-input border-line hover:border-line-hover flex cursor-pointer items-start gap-2.5 border px-3 py-2"
              >
                <input
                  ref={i === 0 ? ilkSecenek : undefined}
                  type="radio"
                  name={`${grupId}-esas`}
                  value={secenek.deger}
                  checked={esas === secenek.deger}
                  onChange={() => {
                    setEsas(secenek.deger);
                    setHata(null);
                  }}
                  /*
                    ⚠️ ODAK HALKASI KONTROLÜN KENDİSİNDE, SARMALAYICI ETİKETTE
                    DEĞİL — ölçüldü. İlk hâlde etikette `focus-within:ring-2`
                    vardı; göstergesi 2px ve %40 saydamlıkta çıktı, yani
                    panelin geri kalanından ZAYIF ve projenin `focus-ring`
                    standardıyla tutarsızdı. Odağı alan şey radyo düğmesinin
                    kendisi; göstergenin de orada olması gerekiyor.
                  */
                  className="focus-ring accent-accent mt-0.5 rounded-full"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-body text-sm">{secenek.etiket}</span>
                  <span className="text-muted text-xs">{secenek.aciklama}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={indir}
              disabled={calisiyor}
              aria-busy={calisiyor}
            >
              {calisiyor ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {calisiyor ? 'Dosya hazırlanıyor…' : 'İndir'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAcik(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      )}

      {hata && <FormAlert>{hata}</FormAlert>}

      {sonuc && (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-muted text-sm">
            <span className="tabular">{sonuc.rowCount}</span> satır indirildi ·{' '}
            <span className="text-body">{sonuc.filename}</span>
          </p>

          {/*
            ⚠️ KESİLME UYARISI AYRI VE `role="alert"`. Yukarıdaki satır sayısı
            bir BİLGİ (`status`); bu bir UYARI ve ekran okuyucuya da öyle
            duyurulmalı. Kullanıcı dosyayı ZATEN indirdi — mesajın işi onu
            durdurmak değil, elindeki dosyanın eksik OLABİLECEĞİNİ söylemek.
          */}
          {sonuc.truncated && (
            <FormAlert>
              Bu dosya üst sınıra dayandı (<span className="tabular">{sonuc.rowCount}</span> satır)
              ve <strong>eksik olabilir</strong>. Sınırın ötesindeki satırlar dosyada YOK ve dosyaya
              bakarak bunu anlayamazsın. Tarih aralığını daraltıp birkaç parça hâlinde indir.
            </FormAlert>
          )}
        </div>
      )}
    </div>
  );
}
