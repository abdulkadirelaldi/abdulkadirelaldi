import { dateToAppDay, type AppDay } from './app-date';

/**
 * Kişisel rekor yeniden hesaplayıcısı — ADR-021.
 *
 * PR TÜRETİLMİŞ VERİDİR. Kaynağı `WorkoutSet`'tir ve her set mutasyonunda —
 * EKLEME, DÜZELTME ve SİLME — yeniden hesaplanır. Tek yönlü "yeni ağırlık
 * eskisinden büyükse güncelle" mantığı YETMEZ: yanlış girilmiş bir set
 * düzeltildiğinde veya silindiğinde rekor olduğu yerde kalır ve veri sessizce
 * tutarsızlaşır. Bu yüzden hesap DAİMA sıfırdan, tüm setler taranarak yapılır.
 *
 * TEKRAR BAZINDA: her `reps` değeri için ayrı rekor (`@@unique([exerciseId, reps])`).
 * Tahmini 1RM formülü KULLANILMAZ — karşılaştırma gerçek performansa dayanır.
 */

/** Hesap için gereken asgari set bilgisi. Ağırlıksız setler (vücut ağırlığı) elenir. */
export interface SetSnapshot {
  id: string;
  reps: number;
  /** `Decimal(6,2)` dize karşılığı. `null` = ağırlık girilmemiş. */
  weightKg: string | null;
  /** Setin ait olduğu antrenmanın günü. */
  day: AppDay;
}

export interface RecordCandidate {
  reps: number;
  weightKg: string;
  day: AppDay;
  workoutSetId: string;
}

/** Ondalık dizeleri kayan noktaya çevirmeden karşılaştırır (kuruş mantığının kilo hâli). */
function compareDecimalStrings(a: string, b: string): number {
  const scale = (value: string): bigint => {
    const [whole = '0', fraction = ''] = value.split('.');
    return BigInt(whole + fraction.padEnd(2, '0').slice(0, 2));
  };
  const left = scale(a);
  const right = scale(b);
  return left === right ? 0 : left > right ? 1 : -1;
}

/**
 * Setlerden tekrar sayısı başına EN İYİ performansı seçer.
 *
 * Eşitlikte ÖNCE olan gün kazanır: rekor "ne zaman kırıldı" bilgisi taşır ve
 * aynı ağırlığı tekrar kaldırmak yeni bir rekor değildir.
 */
export function selectPersonalRecords(sets: readonly SetSnapshot[]): RecordCandidate[] {
  const best = new Map<number, RecordCandidate>();

  for (const set of sets) {
    if (set.weightKg === null) continue; // ağırlıksız set rekora girmez

    const current = best.get(set.reps);
    if (!current) {
      best.set(set.reps, {
        reps: set.reps,
        weightKg: set.weightKg,
        day: set.day,
        workoutSetId: set.id,
      });
      continue;
    }

    const comparison = compareDecimalStrings(set.weightKg, current.weightKg);
    const isHeavier = comparison > 0;
    const isEarlierWithSameWeight = comparison === 0 && set.day < current.day;

    if (isHeavier || isEarlierWithSameWeight) {
      best.set(set.reps, {
        reps: set.reps,
        weightKg: set.weightKg,
        day: set.day,
        workoutSetId: set.id,
      });
    }
  }

  return [...best.values()].sort((a, b) => a.reps - b.reps);
}

/* ===========================================================================
 * SERVİS TARAFI
 * ======================================================================== */

/** Hesaplayıcının Prisma'dan ihtiyaç duyduğu asgari yüzey. */
export interface PersonalRecordClient {
  workoutSet: {
    findMany(args: {
      where: { exerciseId: string };
    }): Promise<Array<{ id: string; reps: number; weightKg: unknown; workout: { date: Date } }>>;
  };
  personalRecord: {
    findMany(args: { where: { exerciseId: string } }): Promise<Array<{ id: string; reps: number }>>;
    upsert(args: {
      where: { exerciseId_reps: { exerciseId: string; reps: number } };
      update: { weightKg: string; date: Date; workoutSetId: string | null };
      create: {
        exerciseId: string;
        reps: number;
        weightKg: string;
        date: Date;
        workoutSetId: string | null;
      };
    }): Promise<unknown>;
    deleteMany(args: { where: { exerciseId: string; reps: { in: number[] } } }): Promise<{
      count: number;
    }>;
  };
}

export interface RecalculateResult {
  /** Yazılan/güncellenen rekor sayısı. */
  upserted: number;
  /** Artık karşılığı olmadığı için SİLİNEN rekor sayısı. */
  removed: number;
}

/**
 * Bir egzersizin tüm rekorlarını sıfırdan hesaplar ve veritabanıyla eşitler.
 *
 * SİLME YOLU KRİTİK: kaynağı kalmayan rekorlar `deleteMany` ile temizlenir.
 * Yalnızca `upsert` yapılsaydı, son 5 tekrarlık seti silen kullanıcı 5RM
 * rekorunu ekranda görmeye devam ederdi — ADR-021'in kapatmak istediği
 * "F5'in en olası sessiz hatası" tam olarak budur.
 *
 * Çağrılma anı: `WorkoutSet` ekleme/düzeltme/silme mutasyonundan SONRA,
 * aynı işlem (transaction) içinde.
 */
export async function recalculatePersonalRecords(
  exerciseId: string,
  client: PersonalRecordClient,
  toWeightString: (value: unknown) => string | null,
): Promise<RecalculateResult> {
  const sets = await client.workoutSet.findMany({ where: { exerciseId } });

  const snapshots: SetSnapshot[] = sets.map((set) => ({
    id: set.id,
    reps: set.reps,
    weightKg: toWeightString(set.weightKg),
    day: dateToAppDay(set.workout.date),
  }));

  const candidates = selectPersonalRecords(snapshots);
  const keepReps = new Set(candidates.map((candidate) => candidate.reps));

  const existing = await client.personalRecord.findMany({ where: { exerciseId } });
  const staleReps = existing.map((record) => record.reps).filter((reps) => !keepReps.has(reps));

  let removed = 0;
  if (staleReps.length > 0) {
    const result = await client.personalRecord.deleteMany({
      where: { exerciseId, reps: { in: staleReps } },
    });
    removed = result.count;
  }

  for (const candidate of candidates) {
    await client.personalRecord.upsert({
      where: { exerciseId_reps: { exerciseId, reps: candidate.reps } },
      update: {
        weightKg: candidate.weightKg,
        date: new Date(`${candidate.day}T00:00:00.000Z`),
        workoutSetId: candidate.workoutSetId,
      },
      create: {
        exerciseId,
        reps: candidate.reps,
        weightKg: candidate.weightKg,
        date: new Date(`${candidate.day}T00:00:00.000Z`),
        workoutSetId: candidate.workoutSetId,
      },
    });
  }

  return { upserted: candidates.length, removed };
}
