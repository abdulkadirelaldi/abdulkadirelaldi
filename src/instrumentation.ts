/**
 * SUNUCU BAŞLANGICI (Next.js `register`) — 2026-10-30.
 *
 * Bildirim zamanlayıcısı `instrumentation-node.ts`te. İçe aktarma Next.js'in
 * belgelediği kalıpla bu dalın İÇİNDE: derleyici Edge paketinde dalı atar.
 * (İlk sürüm "nodejs değilse dön" diye erken dönüyordu; o biçimde dal
 * atılmadı ve `web-push` Edge'e girip derlemeyi kırdı — `http`/`net` yok.)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}
