/**
 * Esquemas Zod del onboarding (CLAUDE.md §6). Cada paso valida en el server
 * action antes de escribir; los mensajes son claves i18n que la UI traduce.
 */

import { z } from 'zod';
import { CATEGORIES } from './countries';

// Paso 1 — datos del negocio
export const businessBasicsSchema = z.object({
  name: z.string().trim().min(2, 'nameRequired').max(80),
  ownerName: z.string().trim().min(2, 'ownerRequired').max(80),
  category: z.enum(CATEGORIES),
  country: z.string().trim().min(2).max(2),
  // Timezone y moneda son obligatorias: el motor y los precios dependen de ellas.
  timezone: z.string().trim().min(1, 'timezoneRequired'),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, 'currencyRequired'),
});

export type BusinessBasics = z.infer<typeof businessBasicsSchema>;

// Paso 2 — servicios
export const serviceDraftSchema = z.object({
  id: z.uuid().optional(), // presente si edita uno existente
  name: z.string().trim().min(2, 'serviceNameRequired').max(80),
  durationMin: z.coerce.number().int().min(5, 'durationInvalid').max(1440),
  // Monto en la unidad menor de la moneda (integer). La UI convierte el input.
  priceAmount: z.coerce.number().int().min(0, 'priceInvalid'),
  bufferAfterMin: z.coerce.number().int().min(0).max(240).default(0),
});

export const servicesStepSchema = z.object({
  services: z.array(serviceDraftSchema).min(1, 'atLeastOneService'),
});

export type ServiceDraft = z.infer<typeof serviceDraftSchema>;

// Paso 3 — horario semanal
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayHoursSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    open: z.boolean(),
    startTime: z.string().regex(timeRe, 'timeInvalid'),
    endTime: z.string().regex(timeRe, 'timeInvalid'),
  })
  .refine((d) => !d.open || d.endTime > d.startTime, {
    message: 'rangeInvalid',
    path: ['endTime'],
  });

export const scheduleStepSchema = z.object({
  days: z.array(dayHoursSchema).length(7),
});

export type DayHours = z.infer<typeof dayHoursSchema>;

// Paso 4 — página pública
export const pageStepSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'slugTooShort')
    .max(63, 'slugTooLong')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'slugFormat'),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'colorInvalid')
    .default('#348D83'),
  bookingLocale: z.enum(['es', 'en']),
});

export type PageStep = z.infer<typeof pageStepSchema>;
