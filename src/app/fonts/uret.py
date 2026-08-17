"""Font üretimi — ADR-031. Bu klasördeki .woff2 dosyaları bununla üretildi.

    pip install fonttools brotli
    python3 uret.py

Yaptığı iş: google/fonts deposundaki DEĞİŞKEN kaynakları indirir, ağırlık
eksenini yalnızca kullandığımız aralığa daraltır, `latin` + `latin-ext`
birleşimine indirger ve woff2 yazar. Sonunda kapsamı DOĞRULAR — Türkçe bir
karakter düşerse betik hata verir, sessizce bozuk font üretmez.

Aile başına TEK dosya bilinçli: değişken kaldığı için tek yüz bütün ağırlıkları
karşılıyor (163 kB / 3 istek). Sabit ağırlıklara bölmek 275 kB / 7 istek,
Google'ın altkümeli sürümü 218 kB / 6 istek ederdi.
"""

import os
import subprocess
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# ---------------------------------------------------------------------------
# ARALIKLAR — elle yazılmadı: `next/font/google`'ın ürettiği CSS'teki
# `unicode-range` değerlerinden birebir kopyalandı (T-023c).
# ---------------------------------------------------------------------------
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
    "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,"
    "U+2212,U+2215,U+FEFF,U+FFFD"
)
LATIN_EXT = (
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,"
    "U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,"
    "U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
)
ARALIK = LATIN + "," + LATIN_EXT

KAYNAK = "https://raw.githubusercontent.com/google/fonts/main/ofl"

ISLER = [
    ("spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf", "space-grotesk", {"wght": (600, 700)}),
    ("inter/Inter%5Bopsz,wght%5D.ttf", "inter", {"opsz": 14, "wght": (400, 600)}),
    ("jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "jetbrains-mono", {"wght": (400, 500)}),
]

# Doğrulama kümeleri: Türkçe harfler + latin-ext'in temsilcileri.
TURKCE = "ĞğŞşİıÜüÖöÇç"
LATIN_EXT_ORNEK = "ĀŒŹˆ€™ŁȘ"


def uret(yol: str, ad: str, eksenler: dict) -> str:
    ham = f"/tmp/{ad}-kaynak.ttf"
    ara = f"/tmp/{ad}-daraltilmis.ttf"
    hedef = f"{ad}.woff2"

    urllib.request.urlretrieve(f"{KAYNAK}/{yol}", ham)

    font = TTFont(ham)
    instancer.instantiateVariableFont(font, eksenler, inplace=True, updateFontNames=False)
    font.save(ara)

    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", ara,
            f"--unicodes={ARALIK}",
            "--layout-features=*",
            "--flavor=woff2",
            "--no-hinting",
            f"--output-file={hedef}",
        ],
        check=True,
    )

    os.remove(ham)
    os.remove(ara)
    return hedef


def dogrula(hedef: str) -> None:
    cmap = TTFont(hedef).getBestCmap()
    eksik = [h for h in TURKCE + LATIN_EXT_ORNEK if ord(h) not in cmap]
    if eksik:
        raise SystemExit(f"{hedef}: KAPSAM EKSİK → {''.join(eksik)}")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    for yol, ad, eksenler in ISLER:
        hedef = uret(yol, ad, eksenler)
        dogrula(hedef)
        print(f"{hedef:24} {os.path.getsize(hedef):7} bayt  kapsam tamam")
