'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

import { Pencere } from '@/components/panel/takvim/pencere';
import {
  gorevDurumuAction,
  gorevGuncelleAction,
  gorevOlusturAction,
  gorevSilAction,
} from '@/server/actions/masa';
import type { DolapSecenegi, GorevDto } from '@/server/services/masa';
import type { ApiResponse } from '@/types';

import { bosGorev, GorevFormu, gorevdenForm, type GorevFormDurumu } from './gorev-formu';

type Durum =
  { tur: 'kapali' } | { tur: 'yeni'; form: GorevFormDurumu } | { tur: 'duzenle'; g: GorevDto };

/**
 * Görev penceresi + tamamla düğmesi — Masa üstü ve dolap ekranı aynı davranışı paylaşır.
 * Kayıttan sonra sayfa sunucudan tazelenir (sıralama ve öbekler sunucuda kurulur).
 */
export function useGorevIslemleri(secenekler: readonly DolapSecenegi[]) {
  const router = useRouter();
  const [durum, setDurum] = useState<Durum>({ tur: 'kapali' });
  const [, gecis] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  /*
   * YEREL GÜNCEL HÂL: kayıttan sonra sayfa sunucudan TAZELENİR ama bu zaman alır (telefonda
   * belirgin). Arada görev yeniden açılırsa eski kopya görünür ve kaydetmek yeni değeri ESKİSİYLE
   * ezerdi; tamamla kutusuna iki kez dokunmak eski duruma göre çalışırdı (ölçüldü: mobil e2e).
   * Sunucunun döndürdüğü DTO tutulur; `null` = silindi. Taze veri gelince ekran `sifirla` der.
   */
  const [yerel, setYerel] = useState<Readonly<Record<string, GorevDto | null>>>({});
  const kapat = () => setDurum({ tur: 'kapali' });
  const yaz = (id: string, g: GorevDto | null) => setYerel((y) => ({ ...y, [id]: g }));

  const bitti = <T,>(sonuc: ApiResponse<T>, id?: string, sil = false): ApiResponse<T> => {
    if (sonuc.ok) {
      const veri = sonuc.data as unknown as GorevDto;
      if (sil && id) yaz(id, null);
      else if (veri && typeof veri === 'object' && 'durum' in veri) yaz(veri.id, veri);
      kapat();
      router.refresh();
    }
    return sonuc;
  };

  const durumDegistir = (g: GorevDto) =>
    gecis(async () => {
      setHata(null);
      const sonuc = await gorevDurumuAction({
        id: g.id,
        durum: g.durum === 'TAMAMLANDI' ? 'YAPILACAK' : 'TAMAMLANDI',
      });
      if (sonuc.ok) {
        yaz(sonuc.data.id, sonuc.data);
        router.refresh();
      } else setHata(sonuc.error.message);
    });

  const pencere =
    durum.tur === 'kapali' ? null : (
      <Pencere baslik={durum.tur === 'yeni' ? 'Yeni görev' : 'Görevi düzenle'} kapat={kapat}>
        {durum.tur === 'yeni' ? (
          <GorevFormu
            ilk={durum.form}
            secenekler={secenekler}
            vazgec={kapat}
            kaydet={async (girdi) => bitti(await gorevOlusturAction(girdi))}
          />
        ) : (
          <GorevFormu
            ilk={gorevdenForm(durum.g)}
            secenekler={secenekler}
            vazgec={kapat}
            kaydet={async (girdi) => bitti(await gorevGuncelleAction({ ...girdi, id: durum.g.id }))}
            sil={async () => bitti(await gorevSilAction({ id: durum.g.id }), durum.g.id, true)}
          />
        )}
      </Pencere>
    );

  return {
    pencere,
    hata,
    durumDegistir,
    yeniGorev: (yer?: { dolapId?: string | null; rafId?: string | null }) =>
      setDurum({ tur: 'yeni', form: bosGorev(yer) }),
    duzenle: (g: GorevDto) => setDurum({ tur: 'duzenle', g: yerel[g.id] ?? g }),
    /** Listeyi yerel güncel hâlle çizer: düzenlenen yenisiyle, silinen hiç. */
    uygula: (liste: readonly GorevDto[]): GorevDto[] =>
      liste.flatMap((g) => {
        const y = yerel[g.id];
        return y === null ? [] : [y ?? g];
      }),
    sifirla: useCallback(() => setYerel({}), []),
  };
}
