#!/usr/bin/env node
/**
 * MASA MAC KÖPRÜSÜ (ADR-049 M6) — ders kayıtlarını BU MAC'te yazıya döker.
 *
 * Döngü: panelden sıradaki ses kaydını al → indir → ffmpeg ile 16 kHz mono WAV → whisper.cpp
 * (Türkçe) → yazıyı panele gönder. Ses bu Mac'ten başka yere gitmez; panel yalnızca yazıyı alır.
 *
 * Ayar: ~/.config/aelaldi/masa-kopru.json  { url, anahtar, model }  (kur.sh yazar, izin 600).
 * Çalıştırma: launchd (kur.sh kurar). Elle: `node masa-kopru.mjs --tek` (tek iş, sonra çık).
 * Bağımlılık yok: Node 22, ffmpeg, whisper-cli (Homebrew).
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const AYAR = process.env.MASA_KOPRU_AYAR ?? join(homedir(), '.config/aelaldi/masa-kopru.json');
const BEKLE_MS = 60_000;
const TEK = process.argv.includes('--tek');

// launchd stdout ve stderr'i aynı günlüğe yazar; proje kuralı gereği stderr.
const gunluk = (...p) => console.error(new Date().toISOString(), ...p);
const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

async function ayarOku() {
  const a = JSON.parse(await readFile(AYAR, 'utf8'));
  if (!a.url || !a.anahtar || !a.model) throw new Error(`Ayar eksik: ${AYAR}`);
  return { ...a, url: a.url.replace(/\/+$/, '') };
}

function calistir(komut, argumanlar) {
  return new Promise((coz, reddet) => {
    const s = spawn(komut, argumanlar, { stdio: ['ignore', 'ignore', 'pipe'] });
    let hata = '';
    s.stderr.on('data', (d) => (hata = (hata + d).slice(-2000)));
    s.on('error', reddet);
    s.on('close', (kod) => (kod === 0 ? coz() : reddet(new Error(`${komut} çıkış ${kod}: ${hata.trim().split('\n').pop()}`))));
  });
}

async function istek(ayar, yol, init = {}) {
  return fetch(`${ayar.url}${yol}`, {
    ...init,
    headers: { Authorization: `Bearer ${ayar.anahtar}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(init.zaman ?? 60_000),
  });
}

async function bitir(ayar, is, sonuc) {
  // Özet sunucuda Claude'la birkaç dakika sürebilir.
  const y = await istek(ayar, is.bitir, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sonuc),
    zaman: 10 * 60_000,
  });
  if (!y.ok) throw new Error(`Sonuç gönderilemedi: ${y.status}`);
  return (await y.json()).data;
}

/** Bir iş: true = iş vardı, false = sıra boş. */
async function birIs(ayar) {
  const y = await istek(ayar, '/api/v1/kopru/mac/is', { method: 'POST' });
  if (y.status === 401) throw Object.assign(new Error('Anahtar geçersiz — panelden yeniden üretip kur.sh ile kur.'), { kalici: true });
  if (!y.ok) throw new Error(`İş alınamadı: ${y.status}`);
  const is = (await y.json()).data;
  if (!is) return false;

  gunluk(`iş: ${is.id} (${Math.round(is.boyut / 1024 / 1024)} MB)`);
  const klasor = await mkdtemp(join(tmpdir(), 'masa-kopru-'));
  try {
    const ses = await istek(ayar, is.indir, { zaman: 30 * 60_000 });
    if (!ses.ok) throw new Error(`Ses indirilemedi: ${ses.status}`);
    const ham = join(klasor, 'ham');
    await writeFile(ham, Buffer.from(await ses.arrayBuffer()));
    const wav = join(klasor, 'ses.wav');
    await calistir('ffmpeg', ['-loglevel', 'error', '-y', '-i', ham, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    const cikti = join(klasor, 'yazi');
    const bas = Date.now();
    await calistir(ayar.whisper ?? 'whisper-cli', ['-m', ayar.model, '-l', 'tr', '-nt', '-np', '-otxt', '-of', cikti, '-f', wav]);
    const metin = (await readFile(`${cikti}.txt`, 'utf8')).replace(/\s+\n/g, '\n').trim();
    gunluk(`yazıya döküldü: ${metin.length} karakter, ${Math.round((Date.now() - bas) / 1000)} sn`);
    const sonuc = await bitir(ayar, is, metin ? { metin } : { hata: 'Kayıtta konuşma bulunamadı.' });
    gunluk(`bitti: ${JSON.stringify(sonuc)}`);
  } catch (error) {
    gunluk(`HATA ${is.id}: ${error.message}`);
    await bitir(ayar, is, { hata: String(error.message).slice(0, 500) }).catch(() => {});
  } finally {
    await rm(klasor, { recursive: true, force: true });
  }
  return true;
}

async function ana() {
  const ayar = await ayarOku();
  gunluk(`köprü başladı → ${ayar.url}`);
  for (;;) {
    let vardi = false;
    try {
      vardi = await birIs(ayar);
    } catch (error) {
      gunluk(`HATA: ${error.message}`);
      if (error.kalici && !TEK) await uyu(10 * BEKLE_MS);
    }
    if (TEK) return;
    if (!vardi) await uyu(BEKLE_MS);
  }
}

ana().catch((e) => {
  gunluk(`ÖLÜMCÜL: ${e.message}`);
  process.exit(1);
});
