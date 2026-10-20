'use client';

import { Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DosyaYukleyici } from '@/components/panel/dosya-yukleyici';
import { KaliciSilDugmesi } from '@/components/panel/kalici-sil-dugmesi';
import { KapakGorsel } from '@/components/public/kapak-gorsel';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { deleteAttachmentAction } from '@/server/actions/attachment';
import type { AttachmentDto } from '@/server/services/attachment';

/**
 * PROJE DOSYALARI — galeri yönetimi (T-037f, ADR-018, ADR-044).
 *
 * Projenin dosyaları TEK HAVUZ: kapak da bu havuzdan seçiliyor. Public galeri
 * havuzdan KAPAĞI ve görsel olmayanları çıkararak çiziyor
 * (`fetchProjectGallery`) — burada hepsi görünür ve kapak İŞARETLİ, ki "bu
 * dosya neden sitede galeride yok" sorusunun cevabı ekranda olsun.
 *
 * SİLME GERÇEK (geri alınamaz) ve KULLANIMDAKİ kapak silinemez: `onDelete:
 * Restrict` P2003 veriyor ve eylem bunu "önce kullanıldığı yerden kaldırın"
 * metnine çeviriyor. Onay metni bunu baştan söylüyor.
 */
export function ProjeGalerisi({
  projeId,
  kapakId,
  dosyalar,
}: {
  projeId: string;
  kapakId: string | null;
  dosyalar: AttachmentDto[];
}) {
  const router = useRouter();
  const [bildirim, setBildirim] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <CardTitle seviye="h2">Dosyalar ve galeri</CardTitle>
          <p className="text-muted text-sm">
            <span className="tabular">{dosyalar.length}</span> dosya
          </p>
        </div>

        <p className="text-muted text-sm">
          Kapak dışındaki görseller sitede proje galerisinde, yükleme sırasıyla görünür.
        </p>

        {bildirim && (
          <p role="status" className="text-success text-sm">
            {bildirim}
          </p>
        )}

        {dosyalar.length === 0 ? (
          <div className="border-line text-muted rounded-card flex items-center gap-3 border border-dashed p-4 text-sm">
            <Images className="size-5 shrink-0" aria-hidden="true" />
            Henüz dosya yok. Galeriye görsel ekleyebilir ya da formdan kapak yükleyebilirsin.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {dosyalar.map((d) => {
              const kapak = d.id === kapakId;
              const ad = kapak ? 'Kapak görseli' : `Galeri görseli ${d.id.slice(-6)}`;
              return (
                <li key={d.id} className="border-line rounded-card flex flex-col gap-2 border p-2">
                  <KapakGorsel kapak={d} baslik={ad} className="rounded-btn" />
                  <div className="flex items-center justify-between gap-2">
                    {kapak ? (
                      <Badge variant="accent">Kapak</Badge>
                    ) : d.mime.startsWith('image/') ? (
                      <Badge variant="neutral">Galeri</Badge>
                    ) : (
                      <Badge variant="outline">Sitede görünmez</Badge>
                    )}
                    <KaliciSilDugmesi
                      kayitAdi={ad}
                      aciklama={
                        kapak
                          ? 'Kapak olarak kullanılıyor — önce formdan başka bir kapak seçip kaydet.'
                          : 'Dosya depodan da silinir; denetim kaydında anahtarı kalır.'
                      }
                      sil={async () => {
                        const sonuc = await deleteAttachmentAction({ id: d.id });
                        if (sonuc.ok) {
                          setBildirim('Dosya silindi.');
                          router.refresh();
                        }
                        return sonuc;
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DosyaYukleyici
          entity="PROJECT"
          entityId={projeId}
          tur="gorsel"
          etiket="Galeriye görsel ekle"
          order={dosyalar.length}
          onYuklendi={() => {
            setBildirim('Görsel galeriye eklendi.');
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
