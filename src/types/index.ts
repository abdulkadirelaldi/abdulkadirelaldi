/**
 * Ajanlar arası paylaşılan tipler (§4.3, §10.1 — Backend mülkiyetinde).
 *
 * İçerik: §7.2 yanıt zarfı + §6 enum sözleşmesi (§7.3).
 */

/* ---------------------------------------------------------------------------
 * §6 / §7.3 — ENUM SÖZLEŞMESİ
 *
 * Frontend enum'ları BURADAN alır, `@/server/generated/**` içine ASLA uzanmaz.
 * Yeniden ihraç edilen modül (`prisma/enums`) hiçbir şey import etmeyen, saf
 * sabit nesnelerden oluşan bir yaprak dosyadır — istemci paketine Prisma
 * çalışma zamanı sızmaz.
 *
 * Her enum hem DEĞER hem TİP olarak dışa aktarılır:
 *   import { JobStatus } from '@/types';
 *   JobStatus.ACTIVE                          // değer
 *   const s: JobStatus = JobStatus.ACTIVE;    // tip
 *   Object.values(JobStatus)                  // kanban kolonları, select seçenekleri
 * ------------------------------------------------------------------------- */

export {
  AttachmentEntity,
  AuditAction,
  ContentStatus,
  Currency,
  Equipment,
  ExperienceType,
  GoalCategory,
  GoalStatus,
  JobStatus,
  MuscleGroup,
  PaymentMethod,
  SkillCategory,
  TransactionType,
  WorkoutType,
} from '@/server/generated/prisma/enums';

/**
 * §4.2 / ADR-017 — kanban kolon sırası.
 * Enum değeri kolonun kendisidir; eşleme katmanı YOKTUR. Bu dizi yalnızca
 * SIRAYI tanımlar (Aday → Teklif → Aktif → Teslim → İptal), yeni bir kavram değil.
 */
export const JOB_STATUS_ORDER = ['LEAD', 'PROPOSAL', 'ACTIVE', 'DELIVERED', 'CANCELLED'] as const;

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
