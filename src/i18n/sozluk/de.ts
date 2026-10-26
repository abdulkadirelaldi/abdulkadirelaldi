import { HATA_METNI } from '../hata-metni';

import type { Sozluk } from './tr';

/**
 * ADR-046 — UI-Wörterbuch, Deutsch. Form durch `Sozluk` erzwungen.
 *
 * Anrede: „Sie“ — auf einer beruflichen Website im deutschsprachigen Raum der
 * erwartete Standard. Typografie: Halbgeviertstrich mit Leerzeichen („ – “),
 * Monatsabkürzungen nach Duden, Datum „5. Juni 2026“.
 */
export const de: Sozluk = {
  site: {
    unvan: 'Softwareingenieur',
    aciklama:
      'Ich konzipiere und entwickle Webanwendungen und digitale Produkte – von Anfang bis Ende.',
    anaSayfaAciklama:
      'Softwareingenieur für Embedded-Systeme, KI und Full-Stack-Entwicklung. Projekte, Leistungen und Kontakt.',
    icerigeGec: 'Zum Inhalt springen',
    terminalKullanici: 'abdulkadir@site',
  },
  sayfaAdi: {
    anasayfa: 'Startseite',
    hakkimda: 'Über mich',
    projeler: 'Projekte',
    blog: 'Blog',
    hizmetler: 'Leistungen',
    iletisim: 'Kontakt',
    cv: 'Lebenslauf',
  },
  nav: {
    anaMenu: 'Hauptmenü',
    anaSayfa: 'Startseite',
    menu: 'Menü',
    kapat: 'Schließen',
    menuyuAc: 'Menü öffnen',
    menuyuKapat: 'Menü schließen',
    cta: 'Zusammenarbeiten',
    dilSecici: 'Sprache',
  },
  altBilgi: {
    menu: 'Fußzeilenmenü',
    sayfalar: 'Seiten',
    sosyal: 'Social Media',
    iletisim: 'Kontakt',
    kiyiOnce: 'Kommerzielle Aufträge laufen über',
    kiyiSonra: '.',
    yigin: 'Von Hand gebaut mit Next.js · TypeScript · PostgreSQL.',
  },
  hero: {
    dosya: 'ich.ts',
    kodDegisken: 'ich',
    kodOdak: 'fokus',
    kodSimdi: 'aktuell',
    kodKonum: 'standort',
    kodSaat: 'ortszeit',
    pencereEtiket: 'Kurzprofil',
    yeteneklerEtiket: 'Kernkompetenzen',
    projeler: 'Projekte',
    cta: 'Zusammenarbeiten',
  },
  seritler: {
    ekipler: 'Teams, mit denen ich gearbeitet habe',
    teknolojiler: 'Technologien, die ich einsetze',
  },
  hakkimdaBolum: {
    baslik: 'Über mich',
    devam: 'Meine ganze Geschichte',
    odulDerece: 'Preise und Platzierungen',
    yayinlananProje: 'veröffentlichte Projekte',
  },
  basarilar: { baslik: 'Erfolge' },
  hizmetlerBolum: {
    baslik: 'Leistungen',
    kiyiOnce: 'Kommerzielle Aufträge laufen über',
    kiyiSonra: ' – Angebot, Vertrag und Rechnung werden dort abgewickelt.',
    tumu: 'Alle Details →',
  },
  projelerBolum: {
    baslik: 'Projekte',
    tumu: 'Alle Projekte',
    incele: 'Ansehen',
    inceleEtiket: (baslik) => `Projekt ${baslik} ansehen`,
    kunyeEtiket: (baslik) => `Steckbrief: ${baslik}`,
    kodDegisken: 'projekt',
    kodYigin: 'stack',
    kodEtiketler: 'tags',
    kodDonem: 'zeitraum',
  },
  yeteneklerBolum: {
    baslik: 'Womit ich arbeite',
    sira1: 'Kenntnisse – erste Reihe',
    sira2: 'Kenntnisse – zweite Reihe',
  },
  iletisimBolum: {
    baslikUst: 'Lassen Sie',
    baslikAlt: 'uns sprechen',
    giris:
      'Sie haben eine Idee, ein Projekt oder ein Problem? Schreiben Sie mir kurz – wir klären es gemeinsam. Ich antworte in der Regel innerhalb eines Tages.',
    konum: 'Standort:',
    durum: 'Status:',
    sosyalHesaplar: 'Social-Media-Profile',
  },
  form: {
    ad: 'Vor- und Nachname',
    eposta: 'E-Mail',
    telefon: 'Telefon',
    konu: 'Betreff',
    mesaj: 'Nachricht',
    istegeBagli: '(optional)',
    mesajYerTutucu: 'Beschreiben Sie kurz Ihr Vorhaben – ein paar Sätze genügen.',
    tuzak: 'Ihre Website (bitte leer lassen)',
    gonder: 'Nachricht senden',
    gonderiliyor: 'Wird gesendet …',
    yukleniyor: 'Formular wird geladen',
    basari:
      'Ihre Nachricht ist bei mir angekommen. Ich antworte in der Regel innerhalb eines Tages – an die angegebene E-Mail-Adresse.',
    agHatasi:
      'Die Nachricht konnte nicht gesendet werden – keine Verbindung. Ihr Text bleibt erhalten; bitte versuchen Sie es erneut.',
    agHatasiEposta:
      'Die Nachricht konnte nicht gesendet werden – keine Verbindung. Ihr Text bleibt erhalten; versuchen Sie es erneut oder schreiben Sie direkt an {eposta}.',
    genelHata:
      'Die Nachricht konnte nicht gesendet werden. Ihr Text bleibt erhalten; bitte versuchen Sie es gleich noch einmal.',
    cokFazla: 'In kurzer Zeit wurden zu viele Nachrichten gesendet.',
    biraz: 'Bitte versuchen Sie es etwas später noch einmal.',
    saat1: 'Bitte versuchen Sie es in etwa einer Stunde erneut.',
    saatN: 'Bitte versuchen Sie es in etwa {n} Stunden erneut.',
    dakika1: 'Bitte versuchen Sie es in etwa einer Minute erneut.',
    dakikaN: 'Bitte versuchen Sie es in etwa {n} Minuten erneut.',
    hata: {
      ad: 'Bitte geben Sie Ihren Namen ein.',
      eposta: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      telefon: 'Diese Telefonnummer ist ungültig.',
      konu: 'Der Betreff darf höchstens 255 Zeichen lang sein.',
      mesajKisa: 'Ihre Nachricht sollte mindestens 10 Zeichen lang sein.',
      mesajUzun: 'Ihre Nachricht darf höchstens 5.000 Zeichen lang sein.',
      alan: 'Bitte überprüfen Sie dieses Feld.',
    },
  },
  sayfaBaslik: {
    projeler: {
      baslik: 'Projekte',
      metaAciklama:
        'Ausgewählte Arbeiten aus Embedded-Systemen, KI und Web – von der Steuerungssoftware einer Hyperloop-Kapsel bis zu produktiven Webplattformen.',
      aciklama:
        'Projekte aus Embedded-Systemen, KI und Web. Filtern Sie nach Schlagwort oder eingesetzter Technologie.',
    },
    blog: {
      baslik: 'Blog',
      metaAciklama:
        'Technische Beiträge zu Software, Embedded-Systemen und KI – was ich beim Entwickeln gemessen und gelernt habe.',
      aciklama:
        'Notizen zu Software, Embedded-Systemen und KI. Die meisten sind beim Arbeiten an einem Projekt entstanden.',
    },
    hakkimda: {
      metaBaslik: 'Über mich',
      metaAciklama:
        'Wer ich bin, wie ich arbeite und welche Stationen ich durchlaufen habe – mit Berufserfahrung, Ausbildung und Auszeichnungen.',
    },
    hizmetler: {
      baslik: 'Leistungen',
      metaAciklama:
        'Unternehmenswebsites, Webanwendungen und mobile Apps. Kommerzielle Aufträge laufen über Kıyı Medya.',
      aciklama:
        'Ich setze Projekte durchgängig um – von Design und Datenbank bis zu Deployment und Wartung. Wenn eine der folgenden Leistungen zu Ihrem Vorhaben passt, sprechen wir darüber.',
    },
    iletisim: {
      baslik: 'Kontakt',
      metaAciklama:
        'Kontakt per E-Mail, über soziale Netzwerke oder das Kontaktformular. Ich antworte in der Regel innerhalb eines Tages.',
      aciklama:
        'Sie haben eine Idee, ein Projekt oder ein Problem? Füllen Sie das Formular aus oder schreiben Sie mir eine E-Mail.',
    },
    cv: {
      metaBaslik: 'Lebenslauf',
      metaAciklama:
        'Druckbarer einseitiger Lebenslauf: Berufserfahrung, Ausbildung, Auszeichnungen und Kenntnisse.',
    },
  },
  liste: {
    tumu: 'Alle',
    etiket: 'tag',
    teknoloji: 'technik',
    projeSayisi: (n, suzulmus) =>
      `${n} Projekt${n === 1 ? '' : 'e'}${suzulmus ? ' (gefiltert)' : ''}`,
    yaziSayisi: (n, suzulmus) =>
      `${n} ${n === 1 ? 'Beitrag' : 'Beiträge'}${suzulmus ? ' (gefiltert)' : ''}`,
    bosSuzgecProje: 'Kein Projekt passt zu diesem Filter',
    bosSuzgecProjeAciklama:
      'Kein Projekt entspricht der gewählten Kombination aus Schlagwort und Technologie. Setzen Sie den Filter zurück, um alle zu sehen.',
    suzgeciTemizle: 'Filter zurücksetzen',
    bosProje: 'Projekte folgen in Kürze',
    bosProjeAciklama:
      'Die ersten Projekte erscheinen hier sehr bald. Bis dahin sprechen wir gern über Ihr Vorhaben.',
    banaYaz: 'Schreiben Sie mir',
    bosSuzgecYazi: 'Keine Beiträge zu diesem Schlagwort',
    bosSuzgecYaziAciklama:
      'Kein Beitrag passt zum gewählten Schlagwort. Entfernen Sie es, um alle Beiträge zu sehen.',
    tumYazilar: 'Alle Beiträge',
    bosYazi: 'Der erste Beitrag ist in Arbeit',
    bosYaziAciklama:
      'Hier schreibe ich über Software- und Produktentwicklung. Bis dahin finden Sie meine Projekte.',
    projelereBak: 'Projekte ansehen',
    dkOkuma: (n) => `${n} Min. Lesezeit`,
  },
  proje: {
    geri: 'cd ../projekte',
    musteri: 'Kunde',
    donem: 'Zeitraum',
    yigin: 'Stack',
    canliSite: 'Live-Website',
    kaynakKodu: 'Quellcode',
    mimari: 'Architektur',
    gorseller: 'Galerie',
    gorselEtiket: (baslik, n) => `${baslik} – Bild ${n}`,
    benzer: 'Ähnliches Vorhaben?',
    kiyiOnce: 'Kommerzielle Aufträge laufen über',
    kiyiSonra: ' – Angebot und Vertrag werden dort abgewickelt.',
    kiyiIlerle: 'Weiter mit Kıyı Medya',
    konusalim: 'Sprechen wir über dieses Projekt',
    konusalimAciklama:
      'Sie möchten mehr über Details, den Code oder meine Rolle im Team erfahren? Schreiben Sie mir – mein Lebenslauf fasst meine gesamte Erfahrung auf einer Seite zusammen.',
    banaYaz: 'Schreiben Sie mir',
    cvGor: 'Lebenslauf ansehen',
    kaldirildi: 'Dieses Projekt wurde entfernt',
    kaldirildiAciklama:
      'Diese Seite gab es einmal, ihr Inhalt wurde jedoch dauerhaft entfernt. Die Adresse ist korrekt – es gibt nichts mehr anzuzeigen.',
    tumProjeler: 'Alle Projekte',
    kapakYok: (baslik) => `${baslik} – Titelbild noch nicht hinzugefügt`,
  },
  yazi: {
    geri: 'cd ../blog',
    icindekiler: 'Inhalt',
    kaldirildi: 'Dieser Beitrag wurde entfernt',
    kaldirildiAciklama:
      'Diese Adresse führte einmal zu einem Beitrag, dessen Inhalt jedoch dauerhaft entfernt wurde. Die Adresse ist korrekt – es gibt nichts mehr anzuzeigen.',
    gosterilemedi: 'Dieser Inhalt kann nicht angezeigt werden',
    gosterilemediAciklama:
      'Die Adresse ist korrekt – der Text enthält einen Formatierungsfehler und kann daher nicht dargestellt werden. Das Problem wurde protokolliert; nach der Korrektur erscheint die Seite automatisch wieder.',
  },
  hakkimdaSayfa: {
    kisaca: '01 – Kurz gesagt',
    oduller: 'Auszeichnungen',
    deneyim: 'Berufserfahrung',
    egitim: 'Ausbildung',
    sertifikalar: 'Zertifikate',
    spor: 'Sport',
    sporDereceler: 'Platzierungen',
    sporTakimlar: 'Mannschaften',
    ozgecmis: 'Lebenslauf',
    devamEdiyor: 'Laufend',
    bosDeneyim: 'Berufserfahrung folgt in Kürze',
    bosDeneyimAciklama:
      'Meinen beruflichen Werdegang ergänze ich hier. Über meine Arbeit können wir schon jetzt sprechen.',
    bosEgitim: 'Ausbildung noch nicht ergänzt',
    bosEgitimAciklama:
      'Dieser Abschnitt füllt sich automatisch, sobald Einträge im Panel angelegt sind.',
  },
  cvIndir: {
    baslik: 'Lebenslauf',
    hazir: 'Als PDF herunterladen; eine druckbare Fassung desselben Inhalts gibt es ebenfalls.',
    hazirDegil:
      'Der PDF-Download ist noch nicht verfügbar. Alle Angaben finden Sie auf der druckbaren Lebenslauf-Seite.',
    indir: 'PDF herunterladen',
    yakinda: 'PDF folgt',
    sayfayiAc: 'Lebenslauf öffnen',
  },
  hizmetlerSayfa: {
    ekipler: 'Teams, mit denen ich gearbeitet habe',
    kiyiBaslik: 'Kommerzielle Aufträge über Kıyı Medya',
    kiyiAciklama:
      'Angebot, Vertrag und Rechnungsstellung laufen über Kıyı Medya. Bei einem kommerziellen Vorhaben ist das der schnellste Weg; bei einer persönlichen Frage oder für einen fachlichen Austausch schreiben Sie mir gern direkt.',
    kiyiGit: 'Zu Kıyı Medya',
    banaYaz: 'Schreiben Sie mir',
    bos: 'Leistungen folgen in Kürze',
    bosAciklama:
      'Hier beschreibe ich meine Leistungen. Über Ihr Vorhaben können wir schon jetzt sprechen.',
  },
  cvSayfa: {
    ozet: 'Profil',
    oduller: 'Auszeichnungen und Erfolge',
    deneyim: 'Berufserfahrung',
    egitim: 'Ausbildung',
    sertifikalar: 'Zertifikate',
    spor: 'Sport',
    yetenekler: 'Kenntnisse',
    yazdir: 'Drucken',
    bos: 'Lebenslauf folgt in Kürze',
    bosAciklama:
      'Diese Seite füllt sich automatisch, sobald Berufserfahrung und Kenntnisse eingetragen sind.',
    hakkimdaGit: 'Zur Seite „Über mich“',
  },
  bulunamadi: {
    metaBaslik: 'Seite nicht gefunden',
    baslik: 'Dieser Pfad führt nirgendwohin',
    komut: 'cd gesuchte-seite',
    cikti: 'bash: cd: Datei oder Verzeichnis nicht gefunden',
    aciklama:
      'Die Adresse ist möglicherweise falsch geschrieben, oder die Seite wurde verschoben. Hier geht es weiter:',
  },
  hata: HATA_METNI.de,
  kategori: {
    LANGUAGE: 'Programmiersprachen',
    EMBEDDED: 'Embedded-Systeme',
    AI: 'KI / Computer Vision',
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    DATABASE: 'Datenbanken',
    DEVOPS: 'Infrastruktur',
    MOBILE: 'Mobile',
    DESIGN: 'Design',
    TOOLING: 'Werkzeuge',
    SOFT_SKILL: 'Arbeitsweise',
    OTHER: 'Sonstiges',
  },
};
