import {
  Activity,
  Briefcase,
  Dumbbell,
  FileText,
  LayoutDashboard,
  GraduationCap,
  LayoutTemplate,
  Mail,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * PANEL ROTA HARİTASI — §4.2. Menü VE kırıntı yolu (breadcrumb) buradan okur.
 *
 * TEK KAYNAK OLMASI ŞART: etiketler iki yerde yazılsaydı bir gün ayrışır ve
 * menüde "Müşteriler" yazarken kırıntıda "musteriler" görünürdü. Aynı hatayı
 * T-025'te başlık slug'larında yaşadık; oradaki çözüm de tek fonksiyondu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * YENİ ROTA EKLEME KURALI (T-032 sözleşmesi)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Rota YAZILMADAN ÖNCE buraya `hazir` VERMEDEN eklenir: menüde görünür,
 *    "Yakında" rozeti taşır, tıklanamaz ve ÖN ÇEKİLMEZ. Olmayan bir rotayı
 *    `next/link` önden çekince 404 döner ve konsola hata yazar (T-002b).
 * 2. Sayfa yayına girdiği TURDA `hazir: true` yapılır — sonraki tura bırakılmaz,
 *    çünkü unutulduğunda çalışan bir sayfa menüden erişilemez kalır.
 * 3. Kırıntı yolu ayrıca bir şey istemez: etiket buradan gelir. Rota burada
 *    yoksa kırıntı segmenti olduğu gibi gösterir (uydurma etiket üretmez).
 */

export type PanelRotasi = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Sayfa gerçekten var mı — yalnızca `true` olanlar tıklanır ve ön çekilir. */
  hazir?: boolean;
};

export const PANEL_GRUPLARI: ReadonlyArray<{
  title: string;
  items: readonly PanelRotasi[];
}> = [
  {
    title: 'Genel',
    items: [
      { href: '/panel', label: 'Panel', icon: LayoutDashboard, hazir: true },
      { href: '/panel/desenler', label: 'Desenler', icon: LayoutTemplate, hazir: true },
    ],
  },
  {
    title: 'İş',
    items: [
      { href: '/panel/muhasebe', label: 'Muhasebe', icon: Wallet },
      { href: '/panel/isler', label: 'İşler', icon: Briefcase },
      { href: '/panel/musteriler', label: 'Müşteriler', icon: Users },
      { href: '/panel/mesajlar', label: 'Mesajlar', icon: Mail },
    ],
  },
  {
    title: 'Kişisel',
    items: [
      { href: '/panel/saglik', label: 'Sağlık', icon: Activity },
      { href: '/panel/spor', label: 'Spor', icon: Dumbbell },
      { href: '/panel/hayat', label: 'Hayat', icon: Sparkles },
    ],
  },
  {
    title: 'Site',
    items: [
      { href: '/panel/icerik/projeler', label: 'Projeler', icon: FileText, hazir: true },
      { href: '/panel/icerik/deneyim', label: 'Deneyim', icon: GraduationCap, hazir: true },
      { href: '/panel/ayarlar', label: 'Ayarlar', icon: Settings, hazir: true },
    ],
  },
] as const;

/** Menüde tanımlı olmayan ama kırıntıda görünen alt yollar. */
const EK_ETIKETLER: Record<string, string> = {
  '/panel/ayarlar/guvenlik': 'Güvenlik',
  /* `/panel/icerik` bir sayfa DEĞİL, yalnızca kırıntı yolundaki ara segment. */
  '/panel/icerik': 'İçerik',
};

const ETIKETLER: Record<string, string> = {
  ...Object.fromEntries(PANEL_GRUPLARI.flatMap((g) => g.items.map((i) => [i.href, i.label]))),
  ...EK_ETIKETLER,
};

/**
 * Yol için görünen ad. Bilinmiyorsa segmentin kendisi döner — kayıt kimliği
 * gibi bir segment için ("cmt8uw…") uydurma bir başlık üretmek yanlış olurdu;
 * o durumda sayfa kendi başlığını `PanelUstBaslik` ile veriyor.
 */
export function rotaEtiketi(yol: string): string {
  return ETIKETLER[yol] ?? yol.split('/').pop() ?? yol;
}

/** Bu yol tıklanabilir mi (sayfa yazıldı mı). */
export function rotaHazirMi(yol: string): boolean {
  if (yol in EK_ETIKETLER) return yol === '/panel/ayarlar/guvenlik';
  return PANEL_GRUPLARI.some((g) => g.items.some((i) => i.href === yol && i.hazir));
}
