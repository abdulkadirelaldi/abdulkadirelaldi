-- T-027 / §8.15 — iletişim formu ucu.
--
-- ELLE YAZILDI, `prisma migrate dev` ile DEĞİL: bu turda erişilebilir bir
-- veritabanı yok (bkz. T-028d) ve `migrate dev` bir gölge veritabanı ister.
-- İki değişiklik de geri alınabilir ve veri kaybetmez (nullable kolon + indeks),
-- bu yüzden elle yazmak güvenli. `pnpm db:migrate` bir sonraki çalıştırmada bunu
-- uygulanmış saymaz; ilk uygulamada olduğu gibi koşar.

-- §8.20/KVKK: `ip` ile aynı ömre tabidir, 90 günlük temizlik işi ikisini de siler.
ALTER TABLE "contact_message" ADD COLUMN "userAgent" TEXT;

-- §8.15 — "IP başına saatte 3" sayacının okuduğu tam desen.
CREATE INDEX "contact_message_ip_createdAt_idx" ON "contact_message"("ip", "createdAt");
