'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';

/**
 * Public bölümün hata sınırı.
 *
 * NEDEN VAR: `getProfile` profil kaydı yoksa BİLEREK fırlatır (ADR-017 —
 * tekil kayıt, yokluğu boş durum değil kurulum hatası). Sınır olmasaydı
 * ziyaretçi Next'in çıplak hata ekranını görürdü.
 *
 * HATA METNİ EKRANA YAZILMAZ (§8): mesaj veritabanı/dosya yolu sızdırabilir.
 * `digest` sunucu günlüğündeki kayda karşılık gelen opak kimliktir; ziyaretçi
 * onu bize iletince günlükte tam kaydı buluruz. Ayrıntı konsola düşer, sayfaya
 * değil.
 */
export default function PublicHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-4 py-24">
      <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Hata</p>

      <h1 className="text-3xl md:text-4xl">Sayfa yüklenemedi</h1>

      <p className="text-muted">
        Beklenmedik bir şey oldu ve içerik getirilemedi. Tekrar denemek çoğu zaman yetiyor; devam
        ederse bana yazabilirsin.
      </p>

      {error.digest && (
        <p className="text-muted text-sm">
          Hata kodu: <span className="tabular text-body">{error.digest}</span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tekrar dene
        </Button>

        <Link href="/iletisim" prefetch={false} className={buttonClasses({ variant: 'secondary' })}>
          Bana yaz
        </Link>
      </div>
    </div>
  );
}
