import type { Dil } from './diller';

/**
 * ADR-046 — hata sayfasının metinleri. Sözlükten AYRI ve küçük: `error.tsx`
 * bir istemci bileşeni ve her public sayfanın paketine giriyor; üç sözlüğün
 * tamamını oraya koymak her sayfayı şişirirdi. Sözlükler `hata` bölümünü
 * buradan alıyor — metin tek yerde.
 */
export const HATA_METNI = {
  tr: {
    sus: 'Hata',
    baslik: 'Sayfa yüklenemedi',
    yigin: 'içerik getirilemedi',
    konum: 'sayfa',
    kod: 'kod',
    aciklama:
      'Beklenmedik bir şey oldu. Tekrar denemek çoğu zaman yetiyor; devam ederse bana yaz ve yukarıdaki kodu ekle — sunucu kaydında tam ayrıntıyı bulurum.',
    tekrar: 'Tekrar dene',
    banaYaz: 'Bana yaz',
  },
  en: {
    sus: 'Error',
    baslik: "The page couldn't load",
    yigin: 'content could not be fetched',
    konum: 'page',
    kod: 'code',
    aciklama:
      'Something unexpected happened. Trying again usually helps; if it persists, write to me and include the code above — it lets me find the full details in the server log.',
    tekrar: 'Try again',
    banaYaz: 'Write to me',
  },
  de: {
    sus: 'Fehler',
    baslik: 'Die Seite konnte nicht geladen werden',
    yigin: 'Inhalt konnte nicht abgerufen werden',
    konum: 'seite',
    kod: 'code',
    aciklama:
      'Etwas Unerwartetes ist passiert. Ein erneuter Versuch hilft meist; falls nicht, schreiben Sie mir bitte mit dem Code oben – damit finde ich die Details im Serverprotokoll.',
    tekrar: 'Erneut versuchen',
    banaYaz: 'Schreiben Sie mir',
  },
} satisfies Record<Dil, Record<string, string>>;
