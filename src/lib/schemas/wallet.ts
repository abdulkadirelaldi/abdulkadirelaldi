import * as z from 'zod';

import { WalletAccountKind, WalletFlowKind, WalletFrequency, WalletUnit } from '@/types';

import {
  cuidSchema,
  dayDateSchema,
  decimalSchema,
  mediumTextSchema,
  shortTextSchema,
} from './common';

/**
 * CÜZDAN şemaları (2026-10-30). Tutarlar METİN (en fazla 10 tam — `computeBaseAmount`ın
 * sınırı — ve 2 ondalık), sayıya çevrilmez (ADR-014/D). Formda virgül
 * yazılabilir; noktaya çevirmek istemcinin işi.
 */
const tutar = decimalSchema(10, 2);
const ad = shortTextSchema.min(1, { error: 'Ad zorunludur.' });
const birim = z.enum(WalletUnit, { error: 'Geçersiz birim.' });

export const walletAccountSchema = z.object({
  name: ad,
  kind: z.enum(WalletAccountKind, { error: 'Geçersiz hesap türü.' }).default('BANK'),
  unit: birim.default('TRY'),
  balance: tutar,
});
export const updateWalletAccountSchema = walletAccountSchema.partial().extend({ id: cuidSchema });

export const walletDebtSchema = z
  .object({
    name: ad,
    lender: shortTextSchema.optional(),
    unit: birim.default('TRY'),
    totalAmount: tutar,
    remainingAmount: tutar,
    monthlyPayment: tutar.optional(),
    paymentDay: z.number().int().min(1).max(31).optional(),
    endDate: dayDateSchema.optional(),
    note: mediumTextSchema.optional(),
  })
  .refine((d) => Number(d.remainingAmount) <= Number(d.totalAmount), {
    error: 'Kalan borç toplam borçtan büyük olamaz.',
    path: ['remainingAmount'],
  });
export const updateWalletDebtSchema = z.object({
  id: cuidSchema,
  name: ad.optional(),
  lender: shortTextSchema.nullable().optional(),
  remainingAmount: tutar.optional(),
  monthlyPayment: tutar.nullable().optional(),
  paymentDay: z.number().int().min(1).max(31).nullable().optional(),
  endDate: dayDateSchema.nullable().optional(),
  note: mediumTextSchema.nullable().optional(),
  isClosed: z.boolean().optional(),
});

export const walletDebtPaymentSchema = z.object({
  debtId: cuidSchema,
  date: dayDateSchema,
  amount: tutar.refine((v) => Number(v) > 0, { error: 'Ödeme sıfırdan büyük olmalı.' }),
  note: shortTextSchema.optional(),
});

export const walletFlowSchema = z.object({
  kind: z.enum(WalletFlowKind),
  name: ad,
  counterparty: shortTextSchema.optional(),
  unit: birim.default('TRY'),
  amount: tutar,
  frequency: z.enum(WalletFrequency).default('MONTHLY'),
  day: z.number().int().min(1).max(31).optional(),
  date: dayDateSchema.optional(),
  category: shortTextSchema.optional(),
  note: mediumTextSchema.optional(),
});
export const updateWalletFlowSchema = walletFlowSchema
  .partial()
  .extend({ id: cuidSchema, isActive: z.boolean().optional() });

export type WalletAccountInput = z.infer<typeof walletAccountSchema>;
export type UpdateWalletAccountInput = z.infer<typeof updateWalletAccountSchema>;
export type WalletDebtInput = z.infer<typeof walletDebtSchema>;
export type UpdateWalletDebtInput = z.infer<typeof updateWalletDebtSchema>;
export type WalletDebtPaymentInput = z.infer<typeof walletDebtPaymentSchema>;
export type WalletFlowInput = z.infer<typeof walletFlowSchema>;
export type UpdateWalletFlowInput = z.infer<typeof updateWalletFlowSchema>;
