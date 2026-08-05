/**
 * Ajanlar arası paylaşılan tipler (§4.3, §10.1 — Backend mülkiyetinde).
 *
 * T-001'de yalnızca §7.2 yanıt zarfı tanımlıdır; varlık tipleri Prisma şeması
 * ve Zod şemalarıyla birlikte T-003'te eklenecektir.
 */

/** §7.2 — route handler hata kodları. */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

/** §7.2 — başarılı yanıt zarfı. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** §7.2 — hatalı yanıt zarfı. `fields` alan bazlı doğrulama hataları içindir. */
export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
