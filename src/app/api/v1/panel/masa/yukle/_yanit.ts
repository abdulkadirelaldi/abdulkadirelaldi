import { NextResponse } from 'next/server';

import { MasaHatasi } from '@/server/services/masa';
import { fail, internalError, type ApiFailure, type ApiResponse } from '@/server/services/_shared';

/** Masa yükleme uçlarının ortak yanıt biçimi (ADR-049 M2b). */
const BASLIKLAR = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } as const;

export function json<T>(body: ApiResponse<T>, status: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>(body, { status, headers: BASLIKLAR });
}

const DURUM: Record<string, number> = {
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 422,
};

export function hataYaniti(etiket: string, error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof MasaHatasi) {
    return json(
      fail(error.kod, error.message, error.alan ? { [error.alan]: error.message } : undefined),
      DURUM[error.kod] ?? 422,
    );
  }
  return json(internalError(etiket, error), 500);
}

export function basarisiz(f: ApiFailure): NextResponse<ApiResponse<never>> {
  return json(f, DURUM[f.error.code] ?? 500);
}

/** Yoldaki kimlik — dar karakter kümesi (`/api/v1/dosya/[id]` ile aynı gerekçe). */
export const KIMLIK = /^[A-Za-z0-9_-]{1,64}$/;
