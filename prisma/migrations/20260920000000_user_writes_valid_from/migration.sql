-- T-046 / ADR-035/B — yazma yetkisi geçersizleştirme damgası.
--
-- Nullable kolon: mevcut satırlar NULL kalır ve NULL "hiç geçersizleştirilmedi"
-- demektir, yani yürürlükteki hiçbir oturum bu migration yüzünden yazma
-- yetkisini kaybetmez. Varsayılan olarak `now()` verilseydi, dağıtımın
-- kendisi tüm oturumları yazamaz hâle getirirdi.
--
-- ADI `sessionsValidFrom` DEĞİL: oturumlar kapanmıyor, yalnızca yazma yetkileri
-- kalkıyor (ADR-035). Kolon adı kapsamını söylüyor.
ALTER TABLE "user" ADD COLUMN "writesValidFrom" TIMESTAMP(3);
