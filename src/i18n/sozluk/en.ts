import { HATA_METNI } from '../hata-metni';

import type { Sozluk } from './tr';

/**
 * ADR-046 — UI dictionary, English (US). Shape enforced by `Sozluk`.
 * Tone: direct and professional, second person.
 */
export const en: Sozluk = {
  site: {
    unvan: 'Software Engineer',
    aciklama: 'I design and build web applications and digital products, end to end.',
    anaSayfaAciklama:
      'Software engineer working across embedded systems, AI and full-stack development. Projects, services and contact.',
    icerigeGec: 'Skip to content',
    terminalKullanici: 'abdulkadir@site',
  },
  sayfaAdi: {
    anasayfa: 'Home',
    hakkimda: 'About',
    projeler: 'Projects',
    blog: 'Blog',
    hizmetler: 'Services',
    iletisim: 'Contact',
    cv: 'CV',
  },
  nav: {
    anaMenu: 'Main menu',
    anaSayfa: 'Home',
    menu: 'Menu',
    kapat: 'Close',
    menuyuAc: 'Open menu',
    menuyuKapat: 'Close menu',
    cta: "Let's work together",
    dilSecici: 'Language',
  },
  altBilgi: {
    menu: 'Footer menu',
    sayfalar: 'Pages',
    sosyal: 'Social',
    iletisim: 'Contact',
    kiyiOnce: 'Commercial projects are handled through',
    kiyiSonra: '.',
    yigin: 'Hand-built with Next.js · TypeScript · PostgreSQL.',
  },
  hero: {
    dosya: 'me.ts',
    kodDegisken: 'me',
    kodOdak: 'focus',
    kodSimdi: 'now',
    kodKonum: 'location',
    kodSaat: 'localTime',
    pencereEtiket: 'Quick profile',
    yeteneklerEtiket: 'Core skills',
    projeler: 'Projects',
    cta: 'Work with me',
  },
  seritler: {
    ekipler: "Teams I've worked with",
    teknolojiler: 'Technologies I use',
  },
  hakkimdaBolum: {
    baslik: 'About',
    devam: 'Read my full story',
    odulDerece: 'awards and rankings',
    yayinlananProje: 'published projects',
  },
  basarilar: { baslik: 'Achievements' },
  hizmetlerBolum: {
    baslik: 'Services',
    kiyiOnce: 'Commercial work is handled through',
    kiyiSonra: ' — quotes, contracts and invoicing happen there.',
    tumu: 'All details →',
  },
  projelerBolum: {
    baslik: 'Projects',
    tumu: 'All projects',
    incele: 'View',
    inceleEtiket: (baslik) => `View the ${baslik} project`,
    kunyeEtiket: (baslik) => `${baslik} fact sheet`,
    kodDegisken: 'project',
    kodYigin: 'stack',
    kodEtiketler: 'tags',
    kodDonem: 'period',
  },
  yeteneklerBolum: {
    baslik: 'What I work with',
    sira1: 'Skills — first row',
    sira2: 'Skills — second row',
  },
  iletisimBolum: {
    baslikUst: "Let's",
    baslikAlt: 'talk',
    giris:
      "Have an idea, a project or a problem? Write a few lines and we'll figure it out together. I usually reply within a day.",
    konum: 'Location:',
    durum: 'Status:',
    sosyalHesaplar: 'Social accounts',
  },
  form: {
    ad: 'Full name',
    eposta: 'Email',
    telefon: 'Phone',
    konu: 'Subject',
    mesaj: 'Message',
    istegeBagli: '(optional)',
    mesajYerTutucu: "Briefly describe what you'd like to do — a few sentences is ideal.",
    tuzak: 'Your website (leave empty)',
    gonder: 'Send message',
    gonderiliyor: 'Sending…',
    yukleniyor: 'Loading form',
    basari:
      'Your message reached me. I usually reply within a day — to the email address you entered.',
    agHatasi:
      "Your message couldn't be sent — no connection. What you wrote is still here; please try again.",
    agHatasiEposta:
      "Your message couldn't be sent — no connection. What you wrote is still here; try again or email me directly at {eposta}.",
    genelHata:
      "Your message couldn't be sent. What you wrote is still here; please try again in a moment.",
    cokFazla: 'Too many messages were sent in a short time.',
    biraz: 'Could you try again in a little while?',
    saat1: 'You can try again in about an hour.',
    saatN: 'You can try again in about {n} hours.',
    dakika1: 'You can try again in about a minute.',
    dakikaN: 'You can try again in about {n} minutes.',
    hata: {
      ad: 'Please enter your name.',
      eposta: 'Please enter a valid email address.',
      telefon: 'This phone number is not valid.',
      konu: 'The subject can be at most 255 characters.',
      mesajKisa: 'Your message should be at least 10 characters.',
      mesajUzun: 'Your message can be at most 5,000 characters.',
      alan: 'Please check this field.',
    },
  },
  sayfaBaslik: {
    projeler: {
      baslik: 'Projects',
      metaAciklama:
        'Selected work across embedded systems, AI and the web — from a Hyperloop pod control system to production web platforms.',
      aciklama: 'Embedded systems, AI and web projects. Filter by tag or by the technology used.',
    },
    blog: {
      baslik: 'Blog',
      metaAciklama:
        'Technical writing on software, embedded systems and AI — what I measured and learned while building things.',
      aciklama:
        'Notes on software, embedded systems and AI. Most of them started as notes I took while building something.',
    },
    hakkimda: {
      metaBaslik: 'About',
      metaAciklama:
        'Who I am, how I work and where I have been — with my experience, education and awards.',
    },
    hizmetler: {
      baslik: 'Services',
      metaAciklama:
        'Corporate websites, web applications and mobile apps. Commercial work is handled through Kıyı Medya.',
      aciklama:
        "I build end to end — from design and database to deployment and maintenance. If one of the services below fits what you need, let's talk.",
    },
    iletisim: {
      baslik: 'Contact',
      metaAciklama:
        'Get in touch by email, on social media or through the contact form. I usually reply within a day.',
      aciklama: 'Have an idea, a project or a problem? Fill in the form or send me an email.',
    },
    cv: {
      metaBaslik: 'CV',
      metaAciklama: 'Printable one-page CV: experience, education, awards and skills.',
    },
  },
  liste: {
    tumu: 'All',
    etiket: 'tag',
    teknoloji: 'tech',
    projeSayisi: (n, suzulmus) =>
      `${n} project${n === 1 ? '' : 's'}${suzulmus ? ' (filtered)' : ''}`,
    yaziSayisi: (n, suzulmus) => `${n} post${n === 1 ? '' : 's'}${suzulmus ? ' (filtered)' : ''}`,
    bosSuzgecProje: 'No projects match this filter',
    bosSuzgecProjeAciklama:
      'No project matches the selected tag and technology. Clear the filter to see all of them.',
    suzgeciTemizle: 'Clear filter',
    bosProje: 'Projects coming soon',
    bosProjeAciklama: "The first projects will be here very soon. Meanwhile, let's talk.",
    banaYaz: 'Write to me',
    bosSuzgecYazi: 'No posts with this tag',
    bosSuzgecYaziAciklama: 'No post matches the selected tag. Remove it to see all posts.',
    tumYazilar: 'All posts',
    bosYazi: 'The first post is on its way',
    bosYaziAciklama:
      "I'll be writing about software and product development here. Meanwhile, have a look at my projects.",
    projelereBak: 'See projects',
    dkOkuma: (n) => `${n} min read`,
  },
  proje: {
    geri: 'cd ../projects',
    musteri: 'Client',
    donem: 'Period',
    yigin: 'Stack',
    canliSite: 'Live site',
    kaynakKodu: 'Source code',
    mimari: 'Architecture',
    gorseller: 'Gallery',
    gorselEtiket: (baslik, n) => `${baslik} — image ${n}`,
    benzer: 'Planning something similar?',
    kiyiOnce: 'Commercial work is handled through',
    kiyiSonra: ' — quotes and contracts happen there.',
    kiyiIlerle: 'Continue with Kıyı Medya',
    konusalim: "Let's talk about this project",
    konusalimAciklama:
      'Curious about the details, the code or my role on the team? Write to me — my CV has my full experience on one page.',
    banaYaz: 'Write to me',
    cvGor: 'View CV',
    kaldirildi: 'This project has been removed',
    kaldirildiAciklama:
      'This page existed once, but its content has been permanently removed. The address is correct — there is nothing to come back to.',
    tumProjeler: 'All projects',
    kapakYok: (baslik) => `${baslik} — cover image not added yet`,
  },
  yazi: {
    geri: 'cd ../blog',
    icindekiler: 'Contents',
    kaldirildi: 'This post has been removed',
    kaldirildiAciklama:
      'This address used to lead to a post, but its content has been permanently removed. The address is correct — there is nothing to come back to.',
    gosterilemedi: "This content couldn't be displayed",
    gosterilemediAciklama:
      "The address is correct — there's a formatting problem in the text, so it can't be rendered. The issue has been logged and the page will recover once it's fixed.",
  },
  hakkimdaSayfa: {
    kisaca: '01 — In short',
    oduller: 'Awards',
    deneyim: 'Experience',
    egitim: 'Education',
    sertifikalar: 'Certifications',
    spor: 'Sports',
    sporDereceler: 'Results',
    sporTakimlar: 'Teams',
    ozgecmis: 'Résumé',
    devamEdiyor: 'Ongoing',
    bosDeneyim: 'Experience coming soon',
    bosDeneyimAciklama: "I'll add my work history here. We can already talk about what I do.",
    bosEgitim: 'Education not added yet',
    bosEgitimAciklama: 'This section fills itself once entries are added in the panel.',
  },
  cvIndir: {
    baslik: 'Résumé',
    hazir: 'Download as PDF; a printable version of the same content is available too.',
    hazirDegil:
      "The PDF download isn't ready yet. All of the same information is on the printable CV page.",
    indir: 'Download PDF',
    yakinda: 'PDF coming soon',
    sayfayiAc: 'Open CV page',
  },
  hizmetlerSayfa: {
    ekipler: "Teams I've worked with",
    kiyiBaslik: 'Commercial work runs through Kıyı Medya',
    kiyiAciklama:
      'Quotes, contracts and invoicing are handled under Kıyı Medya. If your project is a commercial one, starting there is fastest; for a personal question or an exchange of ideas, feel free to write to me directly.',
    kiyiGit: 'Go to Kıyı Medya',
    banaYaz: 'Write to me',
    bos: 'Services coming soon',
    bosAciklama: "I'll describe what I do here. We can already talk about your project.",
  },
  cvSayfa: {
    ozet: 'Summary',
    oduller: 'Awards and achievements',
    deneyim: 'Experience',
    egitim: 'Education',
    sertifikalar: 'Certifications',
    spor: 'Sports',
    yetenekler: 'Skills',
    yazdir: 'Print',
    bos: 'CV coming soon',
    bosAciklama: 'This page fills itself once experience and skill entries are added.',
    hakkimdaGit: 'Go to the About page',
  },
  bulunamadi: {
    metaBaslik: 'Page not found',
    baslik: "This path doesn't lead anywhere",
    komut: 'cd the-page-you-want',
    cikti: 'bash: cd: no such file or directory',
    aciklama:
      'The address may be mistyped, or the page may have moved. You can continue from here.',
  },
  hata: HATA_METNI.en,
  kategori: {
    LANGUAGE: 'Languages',
    EMBEDDED: 'Embedded systems',
    AI: 'AI / computer vision',
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    DATABASE: 'Databases',
    DEVOPS: 'Infrastructure',
    MOBILE: 'Mobile',
    DESIGN: 'Design',
    TOOLING: 'Tools',
    SOFT_SKILL: 'Ways of working',
    OTHER: 'Other',
  },
};
