import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * MDX RENDER KALIBI — §8.9. T-024'te kuruldu, T-025 (blog) aynısını kullanır.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * GÜVENLİK — İKİ KATMAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. `rehype-sanitize`, **VARSAYILAN ŞEMAYLA** (genişletilmedi).
 *
 *    Varsayılan şema GitHub'ın şemasıdır ve içeriğimizin ihtiyacı olan her şeyi
 *    zaten kapsıyor: tablolar (`align` genel öznitelik listesinde), görev
 *    listeleri (`input[type=checkbox][disabled]`), dipnotlar (`section`,
 *    `sup`, `data-footnote-*`) ve kod blokları (`code` üzerinde `language-*`
 *    sınıfı). Genişletmek için bir sebep bulunamadı; şemayı genişletmek
 *    saldırı yüzeyini genişletmektir, "ihtiyaç olursa" diye yapılmaz.
 *
 *    Şemanın kapattıkları ÖLÇÜLDÜ (kötü niyetli MDX ile uçtan uca denendi):
 *      - `<script>` ve `<iframe>` → `tagNames` listesinde yok, düşer
 *      - `onerror` / `onclick` → izinli öznitelik listesinde yok, düşer
 *      - `javascript:` href → `protocols.href` yalnızca http/https/mailto/
 *        irc/ircs/xmpp kabul eder, öznitelik düşer
 *
 * 2. JSX VE İFADELER DE DÜŞER — sanitize'in az bilinen ama burada kritik olan
 *    yan etkisi. MDX kaynağındaki `<script>` bir HAM HTML düğümü değil, bir
 *    JSX düğümüdür (`mdxJsxFlowElement`); `{...}` ifadeleri de öyle
 *    (`mdxFlowExpression`). `hast-util-sanitize` tanımadığı düğüm tiplerini
 *    ağaçtan atar ve bu, MDX derlenip JS'e çevrilmeden ÖNCE olur — yani ifade
 *    çalışma zamanına hiç ulaşmaz. §2'nin yasakladığı "sanitize edilmemiş
 *    içerik" yolu bu sayede JSX tarafında da kapalı.
 *
 * §2 yasağı gereği `dangerouslySetInnerHTML` bu dosyada YOK; MDX doğrudan
 * React ağacına derleniyor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BAŞLIK HİYERARŞİSİ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sayfanın `<h1>`'i başlıktır ve TEK olmalıdır. İçerik yazarı MDX'te `#`
 * kullanırsa ikinci bir `<h1>` doğardı; bu yüzden `h1` eşlemesi `<h2>` üretir.
 * `h2`–`h4` olduğu gibi kalır: içerik `##` ile başlıyorsa sayfa `h1 > h2`
 * sırasını korur, atlama olmaz.
 */

/** Dış bağlantı mı — sanitize `href`i bıraktıysa protokol zaten güvenli. */
function disBaglanti(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}

function Baslik2({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 className={cn('mt-10 mb-3 text-2xl first:mt-0', className)} {...props} />;
}

const BILESENLER = {
  /* Başlıklar — `h1` bilinçli olarak `h2` üretir (yukarıdaki nota bakınız). */
  h1: Baslik2,
  h2: Baslik2,
  h3: ({ className, ...props }: ComponentProps<'h3'>) => (
    <h3 className={cn('mt-8 mb-2 text-xl', className)} {...props} />
  ),
  h4: ({ className, ...props }: ComponentProps<'h4'>) => (
    <h4 className={cn('text-primary mt-6 mb-2 text-base font-semibold', className)} {...props} />
  ),

  p: ({ className, ...props }: ComponentProps<'p'>) => (
    <p className={cn('text-body my-4 leading-relaxed', className)} {...props} />
  ),

  /*
    HREF'SİZ BAĞLANTI, BAĞLANTI GİBİ GÖRÜNMEZ.

    Sanitize `javascript:` gibi izinsiz protokolleri `href`i DÜŞÜREREK
    temizliyor; geriye `<a>` etiketi ve metni kalıyor. Bu öğe odak almaz ve
    hiçbir yere gitmez ama altı çizili ve vurgu renginde durursa TIKLANABİLİR
    görünür — T-018'in "çalışıyormuş gibi görünen ölü bağlantı yok" kuralının
    aynısı. Ölçümde bu hâliyle yakalandı ve düz metne indirildi.
  */
  a: ({ href, className, ...props }: ComponentProps<'a'>) =>
    href ? (
      <a
        href={href}
        /* Dış bağlantıda `noopener`: `target="_blank"` olmadan da alışkanlık. */
        {...(disBaglanti(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn('link', className)}
        {...props}
      />
    ) : (
      <span className={cn('text-body', className)} {...props} />
    ),

  ul: ({ className, ...props }: ComponentProps<'ul'>) => (
    <ul
      className={cn('text-body my-4 flex list-disc flex-col gap-1.5 pl-5', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentProps<'ol'>) => (
    <ol
      className={cn('text-body my-4 flex list-decimal flex-col gap-1.5 pl-5', className)}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentProps<'li'>) => (
    <li className={cn('leading-relaxed', className)} {...props} />
  ),

  blockquote: ({ className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={cn('border-accent text-muted my-6 border-l-2 pl-4 italic', className)}
      {...props}
    />
  ),

  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={cn('border-line my-10', className)} {...props} />
  ),

  /*
    KOD: `pre` içindeki `code` blok, tek başına `code` satır içi. İkisi de
    `--font-mono` kullanıyor (§3.2). Uzun satır SAYFAYI GENİŞLETMEZ — kutu
    kendi içinde kayar, yoksa 360 px'de yatay taşma oluşurdu.
  */
  pre: ({ className, ...props }: ComponentProps<'pre'>) => (
    <pre
      className={cn(
        'border-line bg-elevated rounded-card my-6 overflow-x-auto border p-4 text-sm',
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentProps<'code'>) => (
    <code className={cn('tabular text-primary text-[0.9em]', className)} {...props} />
  ),

  /*
    TABLO: kabı kaydırılabilir. `table-fixed` YOK — içerik genişliğine göre
    davransın; taşma yatay kaydırmayla çözülüyor (mobil-önce, 360 px).
  */
  table: ({ className, ...props }: ComponentProps<'table'>) => (
    <div className="border-line rounded-card my-6 overflow-x-auto border">
      {/*
        Son satırın alt kenarlığı SATIR düzeyinde kaldırılıyor. Hücreye
        `last:` vermek yalnızca satırın SON HÜCRESİNİ etkiliyor ve tabloyu
        yarım çizgiyle bitiriyordu — ölçümde görüldü.
      */}
      <table
        className={cn('w-full border-collapse text-sm [&_tr:last-child_td]:border-b-0', className)}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }: ComponentProps<'thead'>) => (
    <thead className={cn('bg-elevated', className)} {...props} />
  ),
  th: ({ className, ...props }: ComponentProps<'th'>) => (
    <th
      className={cn(
        'text-primary border-line border-b px-3 py-2 text-left font-semibold',
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentProps<'td'>) => (
    <td className={cn('text-body border-line border-b px-3 py-2', className)} {...props} />
  ),

  /*
    GÖRSEL: MDX görselleri dış kaynaklı (sanitize yalnızca http/https `src`
    bırakır) ve ölçüsü DTO'dan gelmiyor, bu yüzden `KapakGorsel` kalıbı burada
    kullanılamıyor — o kalıp `AttachmentRefDto`'nun width/height'ine dayanıyor.
    `next/image` de uzak alan adı yapılandırması ister (`next.config.ts` ortak
    dosya, §10.1). Bugün seed'de MDX görseli YOK; geldiğinde ölçü bilgisi
    olmadığı için CLS riski taşır — T-037'de imzalı URL ve boyut birlikte
    geldiğinde burası da o kalıba bağlanmalı.
  */
  img: ({ className, alt, ...props }: ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element -- gerekçe yukarıda
    <img
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      className={cn('rounded-card border-line my-6 max-w-full border', className)}
      {...props}
    />
  ),
} as const;

export type MdxProps = {
  /** Ham MDX kaynağı — `ProjectDto.content` / `PostDto.content`. */
  kaynak: string;
  className?: string;
};

/**
 * MDX içeriğini render eder. Çağıran taraf yalnızca kaynağı verir; eklentiler,
 * şema ve tipografi burada — iki içerik türü (proje, yazı) aynı yerden beslensin.
 */
export function Mdx({ kaynak, className }: MdxProps): ReactNode {
  return (
    <div className={cn('max-w-2xl', className)}>
      <MDXRemote
        source={kaynak}
        components={BILESENLER}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
            /*
              SIRA ÖNEMLİ: sanitize EN SONDA çalışır. Önce çalışsaydı, sonraki
              bir eklentinin ürettiği düğümler denetimden geçmemiş olurdu.
              Şema açıkça veriliyor — argümansız çağırmak da varsayılanı kullanır
              ama hangi şemanın yürürlükte olduğu okunurken görünsün.
            */
            rehypePlugins: [[rehypeSanitize, defaultSchema]],
          },
        }}
      />
    </div>
  );
}
