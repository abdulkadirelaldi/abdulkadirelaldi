import { FolderOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export const metadata: Metadata = {
  title: 'Tasarım sistemi doğrulaması',
  description: 'T-002 — token, tipografi ve tema anahtarı kontrol sayfası.',
  robots: { index: false, follow: false },
};

/**
 * T-002 DOĞRULAMA SAYFASI — geçici.
 *
 * Amacı §3'ün gözle denetlenebilmesi: token'lar iki temada doğru mu, Türkçe
 * karakterler üç fontta da düzgün mü, tip ölçeği §3.2 ile aynı mı, primitifler
 * 360px'te ve klavyeyle çalışıyor mu.
 *
 * F2'de (T-021) gerçek ana sayfayla — Hero, Hakkımda, Yetenekler, Projeler,
 * Hizmetler, İletişim — tamamen değiştirilecek.
 */

/** §3.1 — her token bir yüzey örneğiyle gösterilir. Hex YOK, sınıf üzerinden. */
const SURFACE_TOKENS = [
  { name: '--bg-base', className: 'bg-canvas', utility: 'bg-canvas' },
  { name: '--bg-surface', className: 'bg-surface', utility: 'bg-surface' },
  { name: '--bg-elevated', className: 'bg-elevated', utility: 'bg-elevated' },
  { name: '--border', className: 'bg-line', utility: 'border-line' },
  { name: '--border-hover', className: 'bg-line-hover', utility: 'border-line-hover' },
] as const;

const ACCENT_TOKENS = [
  { name: '--accent', className: 'bg-accent', utility: 'bg-accent' },
  { name: '--accent-hover', className: 'bg-accent-hover', utility: 'bg-accent-hover' },
  { name: '--accent-soft', className: 'bg-accent-soft', utility: 'text-accent-soft' },
  { name: '--accent-blue', className: 'bg-accent-blue', utility: 'bg-accent-blue' },
  { name: '--accent-glow', className: 'bg-accent-glow', utility: 'bg-accent-glow' },
] as const;

const STATUS_TOKENS = [
  { name: '--success', className: 'bg-success', utility: 'text-success' },
  { name: '--warning', className: 'bg-warning', utility: 'text-warning' },
  { name: '--danger', className: 'bg-danger', utility: 'text-danger' },
  { name: '--info', className: 'bg-info', utility: 'text-info' },
] as const;

const TEXT_TOKENS = [
  { name: '--text-primary', className: 'text-primary', utility: 'text-primary' },
  { name: '--text-body', className: 'text-body', utility: 'text-body' },
  { name: '--text-muted', className: 'text-muted', utility: 'text-muted' },
] as const;

/** §3.2 tip ölçeği — Tailwind varsayılanı bu ölçeğin birebir aynısıdır. */
const TYPE_SCALE = [
  { utility: 'text-xs', rem: '0.75', className: 'text-xs' },
  { utility: 'text-sm', rem: '0.875', className: 'text-sm' },
  { utility: 'text-base', rem: '1', className: 'text-base' },
  { utility: 'text-lg', rem: '1.125', className: 'text-lg' },
  { utility: 'text-xl', rem: '1.25', className: 'text-xl' },
  { utility: 'text-2xl', rem: '1.5', className: 'text-2xl' },
  { utility: 'text-3xl', rem: '1.875', className: 'text-3xl' },
  { utility: 'text-4xl', rem: '2.25', className: 'text-4xl' },
  { utility: 'text-5xl', rem: '3', className: 'text-5xl' },
  { utility: 'text-6xl', rem: '3.75', className: 'text-6xl' },
] as const;

/** Türkçe karakter kontrolü — latin-ext subset'i çalışıyor mu? */
const TURKISH_SAMPLE = 'ĞÜŞİÖÇ ğüşıöç — Iğdır, İstanbul, çöşğüı 0123456789';

const BADGE_VARIANTS: readonly BadgeVariant[] = [
  'neutral',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
  'outline',
];

const RADII = [
  { label: 'kart · 16px', className: 'rounded-card', utility: 'rounded-card' },
  { label: 'buton · 12px', className: 'rounded-btn', utility: 'rounded-btn' },
  { label: 'input · 10px', className: 'rounded-input', utility: 'rounded-input' },
  { label: 'rozet · 999px', className: 'rounded-pill', utility: 'rounded-pill' },
] as const;

const SPACING = [
  { label: '4', className: 'w-1' },
  { label: '8', className: 'w-2' },
  { label: '12', className: 'w-3' },
  { label: '16', className: 'w-4' },
  { label: '24', className: 'w-6' },
  { label: '32', className: 'w-8' },
  { label: '48', className: 'w-12' },
  { label: '64', className: 'w-16' },
  { label: '96', className: 'w-24' },
] as const;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-baslik`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">{eyebrow}</p>
        <h2 id={`${id}-baslik`} className="text-2xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  className,
  utility,
}: {
  name: string;
  className: string;
  utility: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`rounded-input border-line h-16 border ${className}`} aria-hidden="true" />
      <div className="flex flex-col">
        <code className="tabular text-primary text-xs">{name}</code>
        <code className="tabular text-muted text-xs">{utility}</code>
      </div>
    </div>
  );
}

export default function DesignSystemCheckPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16 md:gap-24 md:py-24">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="warning">T-002 · geçici doğrulama sayfası</Badge>
          <ThemeToggle />
        </div>

        <h1 className="text-4xl md:text-6xl">
          Tasarım <span className="text-gradient">sistemi</span>
        </h1>

        <p className="text-body max-w-2xl text-lg">
          Bu sayfa PROGRAM.md §3&apos;ün gözle denetlenmesi için var. Sağ üstteki anahtarla temayı
          değiştir, sayfayı yenile — seçim cookie&apos;de tutulduğu için ilk boyamada doğru tema
          gelir, göz kırpması olmaz.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/panel" className={buttonClasses({ variant: 'secondary' })}>
            Panel iskeletine git
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      <Section id="renk" eyebrow="§3.1" title="Renk token'ları">
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Zemin ve kenar</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {SURFACE_TOKENS.map((token) => (
                <Swatch key={token.name} {...token} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">
              Vurgu — iki temada da aynı kalır
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {ACCENT_TOKENS.map((token) => (
                <Swatch key={token.name} {...token} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Durum</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATUS_TOKENS.map((token) => (
                <Swatch key={token.name} {...token} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Metin</h3>
            <div className="flex flex-col gap-2">
              {TEXT_TOKENS.map((token) => (
                <p key={token.name} className={token.className}>
                  <code className="tabular text-xs">{token.name}</code> — Bu satır bu token ile
                  yazıldı. Okunabilirlik iki temada da AA&apos;yı geçmeli.
                </p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">
              Gradient — yalnızca birincil buton, aktif nav ve isim vurgusu
            </h3>
            <div className="bg-gradient-accent rounded-card h-16" aria-hidden="true" />
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="tipografi" eyebrow="§3.2" title="Tipografi">
        <div className="flex flex-col gap-8">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex flex-col gap-2">
                <CardDescription>Display · Space Grotesk</CardDescription>
                <p className="font-display text-primary text-xl font-bold">{TURKISH_SAMPLE}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2">
                <CardDescription>Body · Inter</CardDescription>
                <p className="font-body text-primary text-base">{TURKISH_SAMPLE}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2">
                <CardDescription>Utility · JetBrains Mono</CardDescription>
                <p className="tabular text-primary text-base">{TURKISH_SAMPLE}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Tip ölçeği (rem)</h3>
            <div className="flex flex-col gap-3">
              {TYPE_SCALE.map((step) => (
                <div key={step.utility} className="flex items-baseline gap-4 overflow-hidden">
                  <code className="tabular text-muted w-28 shrink-0 text-xs">
                    {step.rem}rem · {step.utility}
                  </code>
                  <span className={`${step.className} text-primary truncate`}>
                    Yazılım mühendisliği
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">
              Sekmeli rakam — panel sütunları hizalı dursun
            </h3>
            <table className="w-full max-w-md">
              <caption className="sr-only">Sekmeli rakam örneği</caption>
              <tbody>
                {['48.250,00', '1.907,50', '112,00', '9.000,25'].map((amount) => (
                  <tr key={amount} className="border-line border-b last:border-0">
                    <td className="text-body py-1.5 text-sm">Örnek işlem</td>
                    <td className="tabular text-primary py-1.5 text-right text-sm">{amount} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="layout" eyebrow="§3.3" title="Boşluk ve yarıçap">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Boşluk skalası (px)</h3>
            <div className="flex flex-col gap-2">
              {SPACING.map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <code className="tabular text-muted w-8 shrink-0 text-xs">{step.label}</code>
                  <div className={`rounded-pill bg-accent h-3 ${step.className}`} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Köşe yarıçapı</h3>
            <div className="grid grid-cols-2 gap-4">
              {RADII.map((radius) => (
                <div key={radius.utility} className="flex flex-col gap-2">
                  <div
                    className={`border-line bg-elevated h-16 border ${radius.className}`}
                    aria-hidden="true"
                  />
                  <code className="tabular text-muted text-xs">{radius.label}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section id="primitifler" eyebrow="§10.6" title="UI primitifleri">
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">
              Button — Tab ile gez, odak halkası her varyantta görünmeli
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Kaydet</Button>
              <Button variant="secondary">Vazgeç</Button>
              <Button variant="ghost">Daha fazla göster</Button>
              <Button variant="danger">Kaydı sil</Button>
              <Button disabled>Devre dışı</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm">Küçük</Button>
              <Button size="md">Orta</Button>
              <Button size="lg">Büyük</Button>
            </div>
          </div>

          <div>
            <h3 className="text-muted mb-3 text-sm font-semibold">Badge</h3>
            <div className="flex flex-wrap gap-2">
              {BADGE_VARIANTS.map((variant) => (
                <Badge key={variant} variant={variant}>
                  {variant}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-muted mb-3 text-sm font-semibold">
                Input, Label, Textarea — hata durumu dahil
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ornek-ad" required>
                    Adınız
                  </Label>
                  <Input id="ornek-ad" placeholder="Örn. Abdulkadir" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ornek-eposta" required>
                    E-posta
                  </Label>
                  <Input
                    id="ornek-eposta"
                    type="email"
                    defaultValue="gecersiz-adres"
                    aria-invalid
                    aria-describedby="ornek-eposta-hata"
                  />
                  <p id="ornek-eposta-hata" className="text-danger text-sm">
                    Geçerli bir e-posta adresi gir.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ornek-mesaj">Mesaj</Label>
                  <Textarea id="ornek-mesaj" placeholder="Kısaca ne yapmak istediğini yaz." />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-muted mb-3 text-sm font-semibold">Card</h3>
                <Card interactive>
                  <CardContent className="flex flex-col gap-2">
                    <CardTitle>Kart başlığı</CardTitle>
                    <CardDescription>
                      Kart zemininde gradient kullanılmaz — §3.1. Yüzey, kenar ve çok yumuşak bir iç
                      gölgeden ibarettir.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-muted mb-3 text-sm font-semibold">Skeleton</h3>
                <Card>
                  <CardContent className="flex flex-col gap-3">
                    <Skeleton className="h-32 w-full" />
                    <SkeletonText lines={3} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-muted mb-3 text-sm font-semibold">
                EmptyState — eylem daveti içerir
              </h3>
              <EmptyState
                icon={FolderOpen}
                title="Vitrin hazırlanıyor"
                description="İlk projeler çok yakında burada olacak. Bu arada nasıl çalıştığımı konuşalım."
                action={
                  <Link href="/iletisim" className={buttonClasses({ size: 'sm' })}>
                    Bana yaz
                  </Link>
                }
              />
            </div>

            <div>
              <h3 className="text-muted mb-3 text-sm font-semibold">EmptyState — hata tonu</h3>
              <EmptyState
                tone="danger"
                title="Projeler yüklenemedi"
                description="Bağlantı kurulamadı. Birkaç saniye sonra tekrar denemek çoğu zaman yeterli oluyor."
                action={
                  <Button size="sm" variant="secondary">
                    Tekrar dene
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
