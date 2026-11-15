import { MASA_EN_BUYUK_BAYT } from '@/lib/masa/dosya-sinirlari';
import type { ApiResponse } from '@/types';

/**
 * MASA YÜKLEYİCİSİ (ADR-049 M2b) — tarayıcı tarafı. Dosyayı sunucunun verdiği plana göre eşit
 * parçalara böler ve SIRAYLA gönderir; her parça en çok 3 kez denenir (telefonda ağ kopar).
 * Bir parça kalıcı olarak düşerse yükleme İPTAL edilir — yarım öğe ekranda kalmaz.
 */

const BASE = '/api/v1/panel/masa/yukle';
const DENEME = 3;

type Plan = { id: string; parcaBoyutu: number; parcaSayisi: number };

async function istek<T>(url: string, init: RequestInit): Promise<ApiResponse<T>> {
  try {
    const yanit = await fetch(url, { ...init, credentials: 'same-origin' });
    return (await yanit.json()) as ApiResponse<T>;
  } catch {
    return {
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Bağlantı kurulamadı — internetini kontrol et.' },
    };
  }
}

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function masaDosyasiYukle(
  dosya: File,
  yer: { dolapId: string; rafId: string | null },
  ilerleme: (oran: number) => void,
): Promise<ApiResponse<{ id: string; dosyaId: string }>> {
  if (dosya.size > MASA_EN_BUYUK_BAYT) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Dosya en fazla 300 MB olabilir.' },
    };
  }
  const baslat = await istek<Plan>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...yer, dosyaAdi: dosya.name || 'kayit', boyut: dosya.size }),
  });
  if (!baslat.ok) return baslat;
  const { id, parcaBoyutu, parcaSayisi } = baslat.data;

  for (let n = 1; n <= parcaSayisi; n++) {
    const parca = dosya.slice((n - 1) * parcaBoyutu, n * parcaBoyutu);
    let sonuc: ApiResponse<unknown> | null = null;
    for (let deneme = 1; deneme <= DENEME; deneme++) {
      sonuc = await istek(`${BASE}/${id}/${n}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: parca,
      });
      // Doğrulama hatası (tür reddi, boyut) tekrar denenmez — sonuç değişmez.
      if (sonuc.ok || sonuc.error.code === 'VALIDATION_ERROR' || sonuc.error.code === 'NOT_FOUND') {
        break;
      }
      await bekle(1000 * deneme);
    }
    if (!sonuc?.ok) {
      // Tür reddinde sunucu öğeyi zaten sildi; diğer durumlarda iptal et (sessiz).
      void istek(`${BASE}/${id}`, { method: 'DELETE' });
      return sonuc as ApiResponse<never>;
    }
    ilerleme(n / parcaSayisi);
  }
  return istek(`${BASE}/${id}`, { method: 'POST' });
}
