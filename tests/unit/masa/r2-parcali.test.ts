import { describe, expect, it, vi } from 'vitest';

import {
  abortMultipartUploadQuietly,
  completeMultipartUpload,
  createMultipartUpload,
  getObjectResponse,
  presignUrl,
  uploadPart,
  type FetchLike,
  type R2Config,
} from '@/server/storage/r2';

/**
 * R2 PARÇALI YÜKLEME (ADR-049 M2b) — imza ve protokol, sahte `fetch` ile. Gerçek R2'ye yazmaz
 * (CI'da anahtar yok). Ölçülenler: hangi yöntem/sorgu imzaya giriyor, R2'nin XML'i nasıl
 * okunuyor, "200 ama gövdede <Error>" durumu, iptalin fırlatmaması, Range'in iletilmesi.
 */
const config: R2Config = {
  accountId: 'hesap',
  accessKeyId: 'AKID',
  secretAccessKey: 'gizli',
  bucket: 'kova',
};
const now = new Date('2026-11-15T10:00:00Z');

function sahte(yanit: () => Response) {
  const cagrilar: { url: URL; init?: RequestInit }[] = [];
  const fetchImpl: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    cagrilar.push({ url: new URL(url), init });
    return yanit();
  });
  return { cagrilar, deps: { config, now, fetchImpl } };
}

describe('R2 parçalı yükleme', () => {
  it('ek sorgu parametreleri imzaya girer — imza değişir, sıralı kanonik sorgu', () => {
    const duz = presignUrl({ key: 'masa/a.m4a', method: 'POST', expiresIn: 300, now }, config);
    const parcali = presignUrl(
      { key: 'masa/a.m4a', method: 'POST', expiresIn: 300, now, query: { uploads: '' } },
      config,
    );
    const imza = (u: string) => new URL(u).searchParams.get('X-Amz-Signature');
    expect(imza(duz)).not.toBe(imza(parcali));
    expect(new URL(parcali).searchParams.has('uploads')).toBe(true);
  });

  it('başlat: POST ?uploads, yanıttaki UploadId okunur; Content-Type gönderilir', async () => {
    const { cagrilar, deps } = sahte(
      () =>
        new Response(
          '<?xml version="1.0"?><InitiateMultipartUploadResult><Bucket>kova</Bucket>' +
            '<Key>masa/a.m4a</Key><UploadId>YUK-123+/=</UploadId></InitiateMultipartUploadResult>',
          { status: 200 },
        ),
    );
    await expect(createMultipartUpload('masa/a.m4a', 'audio/mp4', deps)).resolves.toBe(
      'YUK-123+/=',
    );
    expect(cagrilar[0]!.init?.method).toBe('POST');
    expect(cagrilar[0]!.url.searchParams.has('uploads')).toBe(true);
    expect((cagrilar[0]!.init?.headers as Record<string, string>)['Content-Type']).toBe(
      'audio/mp4',
    );
  });

  it('başlat: UploadId yoksa ya da hata kodu dönerse fırlatır', async () => {
    const { deps } = sahte(
      () => new Response('<Error><Code>AccessDenied</Code></Error>', { status: 403 }),
    );
    await expect(createMultipartUpload('k', 'audio/mp4', deps)).rejects.toThrow(
      'başlatılamadı: 403',
    );
  });

  it('parça: PUT ?partNumber&uploadId, ETag başlığı döner', async () => {
    const { cagrilar, deps } = sahte(
      () => new Response(null, { status: 200, headers: { etag: '"e1"' } }),
    );
    await expect(uploadPart('k', 'YUK+1', 3, new Uint8Array([1, 2, 3]), deps)).resolves.toBe(
      '"e1"',
    );
    const { url, init } = cagrilar[0]!;
    expect(init?.method).toBe('PUT');
    expect(url.searchParams.get('partNumber')).toBe('3');
    expect(url.searchParams.get('uploadId')).toBe('YUK+1');
  });

  it('parça: ETag yoksa başarısız sayılır', async () => {
    const { deps } = sahte(() => new Response(null, { status: 200 }));
    await expect(uploadPart('k', 'u', 1, new Uint8Array([1]), deps)).rejects.toThrow(
      'parça yazılamadı',
    );
  });

  it('tamamla: parçalar NUMARA SIRASIYLA XML olur', async () => {
    const { cagrilar, deps } = sahte(
      () => new Response('<CompleteMultipartUploadResult/>', { status: 200 }),
    );
    await completeMultipartUpload(
      'k',
      'u',
      [
        { n: 2, etag: '"b"' },
        { n: 1, etag: '"a"' },
      ],
      deps,
    );
    expect(cagrilar[0]!.init?.body).toBe(
      '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"a"</ETag></Part>' +
        '<Part><PartNumber>2</PartNumber><ETag>"b"</ETag></Part></CompleteMultipartUpload>',
    );
  });

  it('⚠️ tamamla: 200 ama gövdede <Error> — BAŞARISIZ', async () => {
    const { deps } = sahte(
      () => new Response('<Error><Code>InvalidPart</Code></Error>', { status: 200 }),
    );
    await expect(completeMultipartUpload('k', 'u', [{ n: 1, etag: '"a"' }], deps)).rejects.toThrow(
      'InvalidPart',
    );
  });

  it('iptal: ağ hatasında FIRLATMAZ, false döner; 404 başarı sayılır', async () => {
    const hata: FetchLike = async () => {
      throw new Error('ağ yok');
    };
    await expect(
      abortMultipartUploadQuietly('k', 'u', { config, now, fetchImpl: hata }),
    ).resolves.toBe(false);
    const { cagrilar, deps } = sahte(() => new Response(null, { status: 404 }));
    await expect(abortMultipartUploadQuietly('k', 'u', deps)).resolves.toBe(true);
    expect(cagrilar[0]!.init?.method).toBe('DELETE');
  });

  it('akışla okuma: Range iletilir, 206 geçer; 404 → null', async () => {
    const { cagrilar, deps } = sahte(() => new Response('ab', { status: 206 }));
    const yanit = await getObjectResponse('k', 'bytes=0-1', deps);
    expect(yanit?.status).toBe(206);
    expect((cagrilar[0]!.init?.headers as Record<string, string>).Range).toBe('bytes=0-1');
    const yok = sahte(() => new Response(null, { status: 404 }));
    await expect(getObjectResponse('k', null, yok.deps)).resolves.toBeNull();
  });
});
