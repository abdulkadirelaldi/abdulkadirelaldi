/* AE Panel service worker — 2026-10-30. YALNIZCA bildirim: önbellek YOK
   (panel her zaman canlı veriyi gösterir). Adı `/panel` ile başlamıyor:
   ara katman `/panel/*`ı oturuma bağlıyor (bildirim dosyasıyla aynı gerekçe). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let veri = { baslik: 'AE Panel', govde: '', url: '/panel' };
  try {
    veri = { ...veri, ...event.data.json() };
  } catch {
    /* boş ya da düz metin — varsayılanlar */
  }
  event.waitUntil(
    self.registration.showNotification(veri.baslik, {
      body: veri.govde,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: veri.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/panel', self.location.origin);
  // Yalnızca aynı köken — bildirim gövdesi başka siteye yönlendiremesin.
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((pencereler) => {
      const acik = pencereler.find((p) => p.url.startsWith(self.location.origin));
      if (acik) return acik.focus().then(() => acik.navigate(url.href));
      return self.clients.openWindow(url.href);
    }),
  );
});
