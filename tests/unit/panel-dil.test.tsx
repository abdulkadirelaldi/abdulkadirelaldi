import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DilRozeti, DilSekmeleri } from '@/components/panel/dil-sekmeleri';
import { icerikYolu, panelDili } from '@/components/panel/icerik-gorunumleri';
import { baslangicDegerleri as profilBaslangici } from '@/components/panel/profil-formu';
import { ProjeFormu } from '@/components/panel/proje-formu';
import type { ProjectPanelDto } from '@/server/services/content-dto';
import { ContentStatus } from '@/types';

/**
 * PANELDE ÜÇ DİL — ADR-046.
 *
 * Dört halka ayrı ölçülüyor: adres (`?dil=` çözümü ve bağlantı kurulumu),
 * sekme bileşeni, formun dili sorgudan alması ve çeviri anahtarının
 * boşaltılınca `null` gitmesi. Biri kopsa panel yine çalışır ama İngilizce
 * kayıt sessizce Türkçe satır olarak açılır — ya da bağ koparılamaz.
 */

const eylemler = vi.hoisted(() => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
}));

vi.mock('@/server/actions/project', () => eylemler);
vi.mock('@/server/actions/profile', () => ({ saveProfileAction: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  eylemler.createProjectAction.mockReset();
  eylemler.updateProjectAction.mockReset();
});

describe('1 · `?dil=` çözümü', () => {
  it.each([
    ['en', 'en'],
    ['de', 'de'],
    ['tr', 'tr'],
    [undefined, 'tr'],
    ['', 'tr'],
    ['fr', 'tr'],
    ['EN', 'tr'],
    [['de', 'en'], 'de'],
  ] as const)('%j → %s', (ham, beklenen) => {
    expect(panelDili(ham as string | string[] | undefined)).toBe(beklenen);
  });
});

describe('2 · liste adresi', () => {
  it('Türkçe adrese yazılmıyor — eski adresler ve yer imleri kırılmıyor', () => {
    expect(icerikYolu('/panel/icerik/deneyim', { dil: 'tr' })).toBe('/panel/icerik/deneyim');
    expect(icerikYolu('/panel/icerik/deneyim', { dil: 'tr', sayfa: 2 })).toBe(
      '/panel/icerik/deneyim?sayfa=2',
    );
  });

  it('diğer diller durum ve sayfayla birlikte taşınıyor', () => {
    expect(icerikYolu('/panel/icerik/blog', { dil: 'en', durum: 'taslak', sayfa: 3 })).toBe(
      '/panel/icerik/blog?dil=en&durum=taslak&sayfa=3',
    );
    expect(icerikYolu('/panel/icerik/projeler/yeni', { dil: 'de' })).toBe(
      '/panel/icerik/projeler/yeni?dil=de',
    );
  });
});

describe('3 · dil sekmeleri', () => {
  it('üç dil, seçili olan `aria-current`, durum korunuyor, sayfa SIFIRLANIYOR', () => {
    render(
      <DilSekmeleri taban="/panel/icerik/projeler" aktif="en" korunan={{ durum: 'taslak' }} />,
    );

    const baglantilar = screen.getAllByRole('link');
    expect(baglantilar.map((b) => b.getAttribute('href'))).toEqual([
      '/panel/icerik/projeler?durum=taslak',
      '/panel/icerik/projeler?dil=en&durum=taslak',
      '/panel/icerik/projeler?dil=de&durum=taslak',
    ]);
    expect(screen.getByRole('link', { name: /English/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Türkçe/ })).not.toHaveAttribute('aria-current');
  });

  it('rozet bilinmeyen kodu yuvarlamıyor', () => {
    const { rerender } = render(<DilRozeti dil="de" />);
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    rerender(<DilRozeti dil="en-US" />);
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });
});

const PROJE: ProjectPanelDto = {
  id: 'ckabcdefghijklmnopqrstuv',
  locale: 'en',
  slug: 'spectraloop',
  title: 'Spectraloop',
  status: ContentStatus.DRAFT,
  featured: false,
  order: 0,
  publishedAt: null,
  updatedAt: '2026-10-01T00:00:00.000Z',
  translationKey: 'spectraloop-hyperloop',
  summary: 'Özet',
  content: 'İçerik',
  coverAttachmentId: null,
  cover: null,
  tags: [],
  stack: [],
  liveUrl: null,
  repoUrl: null,
  clientName: null,
};

const gizliDil = (kap: HTMLElement) =>
  kap.querySelector<HTMLInputElement>('input[type="hidden"][name="locale"]')?.value;

describe('4 · form dili', () => {
  it('yeni kayıt sorgudaki dille açılıyor ve başlıkta söylüyor', () => {
    const { container } = render(<ProjeFormu dil="de" />);
    expect(gizliDil(container)).toBe('de');
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
  });

  it('dil verilmezse Türkçe', () => {
    const { container } = render(<ProjeFormu />);
    expect(gizliDil(container)).toBe('tr');
  });

  it('⚠️ düzenlemede KAYDIN dili — sorgudaki dil satırı taşıyamaz', () => {
    const { container } = render(<ProjeFormu proje={PROJE} dil="de" />);
    expect(gizliDil(container)).toBe('en');
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /dil/i })).not.toBeInTheDocument();
  });

  it('profil: bu dilde satır yoksa boş form, o dilde', () => {
    expect(profilBaslangici(null, 'en')).toEqual({
      locale: 'en',
      headline: '',
      bio: '',
      socials: {},
    });
  });
});

describe('5 · çeviri anahtarı', () => {
  const basari = { ok: true, data: PROJE } as const;

  it('dolu anahtar boşaltılınca `null` gidiyor — bağ kopuyor', async () => {
    eylemler.updateProjectAction.mockResolvedValue(basari);
    render(<ProjeFormu proje={PROJE} />);

    await userEvent.clear(screen.getByLabelText('Çeviri anahtarı'));
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(eylemler.updateProjectAction).toHaveBeenCalledTimes(1));
    expect(eylemler.updateProjectAction.mock.calls[0]?.[0]).toMatchObject({
      id: PROJE.id,
      translationKey: null,
    });
  });

  it('⚠️ zaten boş anahtar `null` olarak GÖNDERİLMİYOR (denetim kaydı yalan söylemesin)', async () => {
    eylemler.updateProjectAction.mockResolvedValue(basari);
    render(<ProjeFormu proje={{ ...PROJE, translationKey: null }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    await waitFor(() => expect(eylemler.updateProjectAction).toHaveBeenCalledTimes(1));
    expect(eylemler.updateProjectAction.mock.calls[0]?.[0].translationKey).toBeUndefined();
  });

  it('sunucunun `fields.translationKey` hatası alanın altına düşüyor', async () => {
    eylemler.createProjectAction.mockResolvedValue({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Bu çeviri anahtarı aynı dilde başka bir kayıtta kullanılıyor.',
        fields: { translationKey: 'Bu dilde bu anahtarla bir kayıt zaten var.' },
      },
    });
    render(<ProjeFormu dil="en" />);

    await userEvent.type(screen.getByLabelText('Başlık'), 'Spectraloop');
    await userEvent.type(screen.getByLabelText('Slug'), 'spectraloop');
    await userEvent.type(screen.getByLabelText('Özet'), 'Özet');
    await userEvent.type(screen.getByLabelText('İçerik (MDX)'), 'İçerik');
    await userEvent.type(screen.getByLabelText('Çeviri anahtarı'), 'spectraloop-hyperloop');
    await userEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    expect(
      await screen.findByText('Bu dilde bu anahtarla bir kayıt zaten var.'),
    ).toBeInTheDocument();
    expect(eylemler.createProjectAction.mock.calls[0]?.[0]).toMatchObject({
      locale: 'en',
      translationKey: 'spectraloop-hyperloop',
    });
    expect(screen.getByLabelText('Çeviri anahtarı')).toHaveAttribute('aria-invalid', 'true');
  });
});
