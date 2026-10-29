/**
 * PANEL YÜKLENİRKEN (2026-10-30).
 *
 * Panel sayfaları sunucuda üretiliyor; bu dosya yokken sekmeye dokununca ekran
 * sunucu yanıt verene kadar HİÇ değişmiyordu ve telefonda "dondu" gibi
 * görünüyordu. Şimdi dokunuş ANINDA bu iskelete geçer, içerik gelince yerine
 * oturur. Ayrıca Next.js bağlantıları bu sınıra kadar ÖNCEDEN yükleyebilir.
 */
export default function PanelYukleniyor() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">Yükleniyor…</span>
      <div className="border-line/60 h-[calc(4rem+env(safe-area-inset-top))] border-b" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 lg:p-6">
        <div className="iskelet rounded-card h-36" />
        <div className="grid grid-cols-2 gap-4">
          <div className="iskelet rounded-card h-28" />
          <div className="iskelet rounded-card h-28" />
        </div>
        <div className="iskelet rounded-card h-20" />
        <div className="iskelet rounded-card h-20" />
      </div>
    </div>
  );
}
