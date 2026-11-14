'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
  const kapat = () => setDurum({ tur: 'kapali' });

  const bitti = <T,>(sonuc: ApiResponse<T>): ApiResponse<T> => {
    if (sonuc.ok) {
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
      if (sonuc.ok) router.refresh();
      else setHata(sonuc.error.message);
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
            sil={async () => bitti(await gorevSilAction({ id: durum.g.id }))}
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
    duzenle: (g: GorevDto) => setDurum({ tur: 'duzenle', g }),
  };
}
