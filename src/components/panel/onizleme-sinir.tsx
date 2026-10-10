'use client';

import { AlertTriangle } from 'lucide-react';
import { Component, type ReactNode } from 'react';

/**
 * ÖNİZLEME HATA SINIRI — T-035'te ÖLÇÜLEREK eklendi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN VAR: GEÇERSİZ MDX BÜTÜN PANELİ DÜŞÜRÜYORDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ölçüm: içinde kapatılmamış bir `<img …>` olan MDX ile "Önizle"ye basıldığında
 * `[next-mdx-remote] error compiling MDX` fırlıyor, `(panel)/error.tsx` devreye
 * giriyor ve YAZILAN HER ŞEYLE BİRLİKTE sayfa kayboluyordu ("Bu ekran
 * yüklenemedi"). Yazar için felaket: MDX yazarken geçersiz ara durumlar
 * normaldir — kapatılmamış bir etiket her tuşta oluşabilir.
 *
 * Sınır bu yüzden ÖNİZLEME PANELİNİN İÇİNDE, sayfanın değil: derleme hatası
 * önizlemede bir mesaja dönüşüyor, "Yaz" sekmesindeki metin yerinde kalıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SINIF BİLEŞEN — İSTİSNA, GEREKÇESİ VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * React'te hata sınırı YALNIZCA sınıf bileşeniyle kurulabiliyor
 * (`componentDidCatch`/`getDerivedStateFromError`in kanca karşılığı yok).
 * Depodaki tek sınıf bileşen bu ve sebebi bu.
 *
 * `anahtar` DEĞİŞİNCE SINIR SIFIRLANIYOR: kullanıcı metni düzeltip tekrar
 * önizlediğinde sınır takılı kalmamalı. React'in `key` mekanizmasını
 * kullanmak yerine `componentDidUpdate` ile sıfırlamak, dinamik yığının
 * yeniden indirilmesine yol açmadan durumu temizliyor.
 */
export class OnizlemeSinir extends Component<
  { anahtar: string; children: ReactNode },
  { hata: Error | null }
> {
  override state: { hata: Error | null } = { hata: null };

  static getDerivedStateFromError(hata: Error) {
    return { hata };
  }

  override componentDidUpdate(oncekiProps: { anahtar: string }) {
    if (oncekiProps.anahtar !== this.props.anahtar && this.state.hata) {
      this.setState({ hata: null });
    }
  }

  override render() {
    const { hata } = this.state;
    if (!hata) return this.props.children;

    /*
      MESAJ OLDUĞU GİBİ GÖSTERİLİYOR — `next-mdx-remote` satır ve sütun
      veriyor ("1:1-1:37"), yazarın hatayı bulmasının tek yolu bu. Kısaltmak
      ya da "bir şeyler ters gitti"ye indirgemek, elindeki tek ipucunu almak
      olurdu.
    */
    return (
      <div
        role="alert"
        className="border-danger/40 bg-danger/8 rounded-card flex flex-col gap-2 border p-4"
      >
        <p className="text-danger flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          MDX derlenemedi — bu hâliyle sitede de yayınlanamaz
        </p>

        <pre className="tabular text-body overflow-x-auto text-xs whitespace-pre-wrap">
          {hata.message}
        </pre>

        <p className="text-muted text-xs">
          Yazdıkların duruyor — &quot;Yaz&quot; sekmesine dönüp düzeltebilirsin. En sık sebep:
          kapatılmamış bir etiket (MDX&apos;te <code className="tabular">&lt;img&gt;</code> değil{' '}
          <code className="tabular">&lt;img /&gt;</code> yazılır).
        </p>
      </div>
    );
  }
}
