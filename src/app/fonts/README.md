# Fontlar — ADR-031

Üç aile repoda tutuluyor. Derleme fonts.gstatic.com'a **çıkmaz**; `next/font/google`
derleme anında ağa gittiği ve CI'ı iki kez düşürdüğü için (koşu 31909914487)
`next/font/local`'a geçildi.

| Dosya                  | Aile                    | Ağırlık ekseni | Boyut   |
| ---------------------- | ----------------------- | -------------- | ------- |
| `space-grotesk.woff2`  | Space Grotesk           | 600–700        | 35.2 kB |
| `inter.woff2`          | Inter (opsz 14'e sabit) | 400–600        | 94.4 kB |
| `jetbrains-mono.woff2` | JetBrains Mono          | 400–500        | 33.8 kB |

Üçü de **değişken** kaldı: tek dosya bütün ağırlıkları karşılıyor. Sabit
ağırlıklara ayırmak yedi dosya ve 275 kB ederdi (ölçüldü); Google'ın altkümeli
sürümü altı dosya ve 218 kB idi.

## Kapsam

`latin` + `latin-ext` **birleşimi**. Aralıklar elle yazılmadı: `next/font/google`'ın
ürettiği eski CSS'teki `unicode-range` değerlerinden birebir alındı ve `uret.py`
içinde duruyor.

`latin-ext` pazarlık konusu değil — ğ ü ş İ ı ö ç harfleri `latin` altkümesinde
**yok**. Eksik olsaydı tarayıcı bu harfleri yedek fontla yamardı ve Türkçe metin
harf harf bozuk görünürdü.

## Yeniden üretme

```
pip install fonttools brotli
cd src/app/fonts
python3 uret.py          # kaynak TTF'leri google/fonts'tan indirir, altkümeler
```

`uret.py` üretimden sonra kapsamı **doğrular**: Türkçe karakterlerden veya
temsili latin-ext karakterlerinden biri eksikse hata verir.

## Lisans

Üçü de SIL Open Font License 1.1. Lisans metinleri bu klasörde:
`inter-OFL.txt`, `space-grotesk-OFL.txt`, `jetbrains-mono-OFL.txt`.
Kaynak: <https://github.com/google/fonts>.
