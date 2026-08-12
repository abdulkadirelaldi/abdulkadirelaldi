'use client';

import { Mail } from 'lucide-react';

import { GithubIcon, InstagramIcon, LinkedinIcon, XIcon } from '@/components/icons/social';
import {
  Aurora,
  BlurText,
  CountUp,
  GlassIcons,
  GooeyNav,
  LogoLoop,
  RotatingText,
  ShinyText,
  SpotlightCard,
  StarBorder,
  TiltedCard,
} from '@/components/reactbits/lazy';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * T-020 doğrulama galerisi — GEÇİCİ, F2'de silinecek.
 *
 * Amacı: kurulan her bileşeni bir kez render edip token uyumunu, iskelet
 * fallback'ini ve iki temadaki görünümünü gözle denetlemek. Bundle ölçümü de
 * bu sayfadan alındı — bileşenlerin hepsi `lazy.tsx` üzerinden geldiği için
 * her biri kendi parçasına (chunk) çıkıyor ve ayrı ayrı ölçülebiliyor.
 */

function Bolum({
  no,
  ad,
  not,
  children,
}: {
  no: string;
  ad: string;
  not: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="tabular text-accent-soft text-xs tracking-wider uppercase">{no}</p>
        <h2 className="text-xl">{ad}</h2>
        <p className="text-muted max-w-2xl text-sm">{not}</p>
      </div>
      {children}
    </section>
  );
}

export function ReactBitsGaleri() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-14">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="warning">T-020 · geçici doğrulama sayfası</Badge>
          <ThemeToggle />
        </div>
        <h1 className="text-3xl md:text-4xl">React Bits doğrulaması</h1>
        <p className="text-body max-w-2xl">
          Kurulan on bileşen. Hepsi <code className="tabular text-sm">next/dynamic</code> +{' '}
          <code className="tabular text-sm">ssr:false</code> ile geliyor ve iskelet fallback
          taşıyor. Hareket tercihini kapatıp sayfayı yenilersen animasyonların yerini statik içerik
          alır.
        </p>
      </header>

      <Bolum
        no="00"
        ad="Aurora — hero arka planı"
        not="Sayfanın TEK WebGL bileşeni (§5.2.2). <768px ve hareket tercihi kapalıyken hiç yüklenmez; yerini statik gradient alır."
      >
        <div
          id="aurora-hero"
          className="border-line bg-canvas rounded-card relative isolate overflow-hidden border"
          style={{ minHeight: '340px' }}
        >
          <Aurora opacity={0.45} />
          <div className="relative z-10 flex flex-col items-start gap-3 p-8">
            <span id="hero-rozet" className="text-accent-soft text-sm font-medium">
              Full Stack Developer
            </span>
            <h3 id="hero-isim" className="font-display text-primary text-4xl font-bold md:text-5xl">
              Abdulkadir Elaldi
            </h3>
            <p id="hero-ozet" className="text-body max-w-md">
              Web uygulamalari ve dijital urunler tasarliyor, uctan uca gelistiriyorum.
            </p>
          </div>
        </div>
      </Bolum>

      <Bolum no="01" ad="ShinyText" not="Rozet metni. Renkler --text-body / --text-primary.">
        <div className="border-line bg-surface rounded-card border p-6">
          <ShinyText text="Full Stack Developer" className="text-lg font-medium" speed={3} />
        </div>
      </Bolum>

      <Bolum no="02" ad="BlurText" not="Hero ismi. Tek seferlik, görünür olunca.">
        <div className="border-line bg-surface rounded-card border p-6">
          <BlurText
            text="Abdulkadir Elaldı"
            className="font-display text-primary text-3xl font-bold"
            delay={60}
            animateBy="words"
          />
        </div>
      </Bolum>

      <Bolum no="03" ad="RotatingText" not="Hero ünvanı. Yükseklik sabit — satır kaymaz.">
        <div className="border-line bg-surface rounded-card flex items-center gap-2 border p-6">
          <span className="text-body">Ben bir</span>
          <RotatingText
            texts={['Yazılım Mühendisi', 'Full Stack Developer', 'Ürün Odaklı Geliştirici']}
            mainClassName="text-accent-soft font-medium"
            rotationInterval={2600}
          />
        </div>
      </Bolum>

      <Bolum no="04" ad="CountUp" not="İstatistikler. Görünür olunca tetiklenir, sekmeli rakam.">
        <div className="border-line bg-surface rounded-card grid grid-cols-3 gap-4 border p-6">
          {[
            { deger: 2, etiket: 'yıl deneyim' },
            { deger: 18, etiket: 'proje' },
            { deger: 12, etiket: 'müşteri' },
          ].map((s) => (
            <div key={s.etiket} className="flex flex-col gap-1">
              <span className="tabular text-primary text-3xl font-medium">
                <CountUp to={s.deger} duration={1.4} />
              </span>
              <span className="text-muted text-sm">{s.etiket}</span>
            </div>
          ))}
        </div>
      </Bolum>

      <Bolum no="05" ad="StarBorder" not="Birincil buton kenarı. Kenar rengi --accent-soft.">
        <div className="flex flex-wrap gap-4">
          <StarBorder as="button" speed="6s">
            Projelerimi gör
          </StarBorder>
          <StarBorder as="button" speed="4s">
            Benimle çalış
          </StarBorder>
        </div>
      </Bolum>

      <Bolum no="06" ad="SpotlightCard" not="Yetenek ve hizmet kartları. Spotlight --accent-glow.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['Frontend', 'Backend', 'Altyapı'].map((baslik) => (
            <SpotlightCard key={baslik}>
              <h3 className="text-primary mb-2 text-base font-semibold">{baslik}</h3>
              <p className="text-muted text-sm">
                Kartın üstünde imleci gezdir — mor spotlight imleci takip eder.
              </p>
            </SpotlightCard>
          ))}
        </div>
      </Bolum>

      <Bolum
        no="07"
        ad="TiltedCard"
        not="Proje ızgarası. §5.1 gereği ChromaGrid ile birlikte KULLANILMAZ — biri seçildi."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <TiltedCard
              key={n}
              imageSrc="/icon.svg"
              altText={`Örnek proje ${n}`}
              captionText={`Örnek proje ${n}`}
              containerHeight="220px"
              imageHeight="220px"
              imageWidth="100%"
              showMobileWarning={false}
              showTooltip={false}
            />
          ))}
        </div>
      </Bolum>

      <Bolum
        no="08"
        ad="GlassIcons"
        not="Sosyal ikonlar. Marka SVG yollari Simple Icons (CC0); currentColor ile token uyumlu."
      >
        <div className="border-line bg-surface rounded-card border p-6">
          <GlassIcons
            items={[
              { icon: <GithubIcon />, color: 'accent', label: 'GitHub' },
              { icon: <LinkedinIcon />, color: 'info', label: 'LinkedIn' },
              { icon: <XIcon />, color: 'surface', label: 'X' },
              { icon: <InstagramIcon />, color: 'accent', label: 'Instagram' },
              { icon: <Mail />, color: 'surface', label: 'E-posta' },
            ]}
          />
        </div>
      </Bolum>

      <Bolum
        no="09"
        ad="GooeyNav"
        not="Aktif bölüm göstergesi. YALNIZCA masaüstü — mobilde normal menü kullanılır."
      >
        <div className="border-line bg-surface rounded-card hidden border p-6 md:block">
          <GooeyNav
            items={[
              { label: 'Hakkımda', href: '#' },
              { label: 'Projeler', href: '#' },
              { label: 'Hizmetler', href: '#' },
              { label: 'İletişim', href: '#' },
            ]}
          />
        </div>
        <p className="text-muted text-sm md:hidden">
          Mobil genişlikte gösterilmez — mobil menü normal bağlantı listesidir.
        </p>
      </Bolum>

      <Bolum no="10" ad="LogoLoop" not="Kıyı Medya müşteri logoları — hizmetler sayfası.">
        <div className="border-line bg-surface rounded-card border p-6">
          <LogoLoop
            logos={[
              { node: <span className="text-body font-semibold">Kıyı Medya</span>, title: 'Kıyı' },
              { node: <span className="text-body font-semibold">Örnek A.Ş.</span>, title: 'A' },
              { node: <span className="text-body font-semibold">Deneme Ltd.</span>, title: 'B' },
              { node: <span className="text-body font-semibold">Üçüncü Marka</span>, title: 'C' },
            ]}
            speed={60}
            logoHeight={24}
            gap={48}
            fadeOut
          />
        </div>
      </Bolum>
    </div>
  );
}
