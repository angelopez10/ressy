import 'server-only';

/**
 * Construye el `NotificationMessage` para un (tipo, canal, reserva). Toda hora se
 * formatea con Luxon en la TZ DEL NEGOCIO y en el idioma del CLIENTE (CLAUDE.md
 * §3/§6), con label de zona para que se entienda desde cualquier lugar.
 */

import * as React from 'react';
import { DateTime } from 'luxon';
import { buildIcs } from '@/lib/booking/ics';
import { formatMoney } from '@/lib/db/mappers';
import { ClientBookingEmail } from '@/emails/ClientBookingEmail';
import { BusinessNotificationEmail } from '@/emails/BusinessNotificationEmail';
import { DailySummaryEmail } from '@/emails/DailySummaryEmail';
import type { StatusTone } from '@/emails/EmailLayout';
import { copy, type NotifLocale } from './copy';
import { getAppUrl } from './env';
import type { AgendaItem, BookingNotifCtx } from './data';
import type { Channel, NotificationMessage, NotificationType } from './types';

const DEFAULT_ACCENT = '#348D83';

function fmtWhen(date: Date, tz: string, locale: NotifLocale): string {
  return DateTime.fromJSDate(date, { zone: tz })
    .setLocale(locale)
    .toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY);
}

function fmtTime(date: Date, tz: string, locale: NotifLocale): string {
  return DateTime.fromJSDate(date, { zone: tz }).setLocale(locale).toFormat('HH:mm');
}

function manageUrl(ctx: BookingNotifCtx, locale: NotifLocale): string {
  return `${getAppUrl()}/${locale}/${ctx.business.slug}/manage/${ctx.booking.managementToken}`;
}
function bookingUrl(ctx: BookingNotifCtx, locale: NotifLocale): string {
  return `${getAppUrl()}/${locale}/${ctx.business.slug}`;
}

function clientRows(ctx: BookingNotifCtx, locale: NotifLocale) {
  const c = copy(locale);
  const rows = [
    { label: c.labelService, value: `${ctx.service.name} · ${c.labelDuration(ctx.service.durationMin)}` },
    { label: c.labelWhen, value: fmtWhen(ctx.booking.startsAt, ctx.business.timezone, locale) },
    { label: c.labelProfessional, value: ctx.staff.name },
  ];
  if (ctx.business.address) rows.push({ label: c.labelWhere, value: ctx.business.address });
  return rows;
}

function icsAttachment(ctx: BookingNotifCtx): NotificationMessage['attachments'] {
  const ics = buildIcs({
    uid: ctx.booking.id,
    start: ctx.booking.startsAt,
    end: ctx.booking.endsAt,
    title: `${ctx.service.name} · ${ctx.business.name}`,
    location: ctx.business.address ?? undefined,
  });
  return [{ filename: 'reserva.ics', content: ics, contentType: 'text/calendar' }];
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

interface Variant {
  heading: string;
  intro: string;
  cta?: { url: string; label: string };
  attachIcs: boolean;
  subject: string;
  wa: string;
}

/** Badge de estado por tipo. `post_service` no lleva (la cita ya pasó). */
function statusFor(
  type: NotificationType,
  locale: NotifLocale,
): { label: string; tone: StatusTone } | undefined {
  const c = copy(locale);
  switch (type) {
    case 'confirmation':
    case 'reminder':
      return { label: c.statusConfirmed, tone: 'confirmed' };
    case 'rescheduled':
      return { label: c.statusRescheduled, tone: 'rescheduled' };
    case 'cancelled':
      return { label: c.statusCancelled, tone: 'cancelled' };
    default:
      return undefined;
  }
}

function clientVariant(type: NotificationType, ctx: BookingNotifCtx, locale: NotifLocale): Variant {
  const c = copy(locale);
  const biz = ctx.business.name;
  const waArgs = {
    business: biz,
    service: ctx.service.name,
    when: fmtWhen(ctx.booking.startsAt, ctx.business.timezone, locale),
    professional: ctx.staff.name,
    manageUrl: manageUrl(ctx, locale),
    custom: ctx.settings.customMessage,
  };
  switch (type) {
    case 'confirmation':
      return { heading: c.confirmedHeading, intro: c.confirmedIntro(biz), cta: { url: manageUrl(ctx, locale), label: c.manageCta }, attachIcs: true, subject: c.subjectConfirmation(biz), wa: c.waConfirmation(waArgs) };
    case 'reminder':
      return { heading: c.reminderHeading, intro: c.reminderIntro(biz), cta: { url: manageUrl(ctx, locale), label: c.manageCta }, attachIcs: false, subject: c.subjectReminder(biz), wa: c.waReminder(waArgs) };
    case 'rescheduled':
      return { heading: c.rescheduledHeading, intro: c.rescheduledIntro(biz), cta: { url: manageUrl(ctx, locale), label: c.manageCta }, attachIcs: true, subject: c.subjectRescheduled(biz), wa: c.waRescheduled(waArgs) };
    case 'cancelled':
      return { heading: c.cancelledHeading, intro: c.cancelledIntro(biz), cta: { url: bookingUrl(ctx, locale), label: c.bookAgainCta }, attachIcs: false, subject: c.subjectCancelled(biz), wa: c.waCancelled(waArgs) };
    case 'post_service':
      return { heading: c.postServiceHeading, intro: c.postServiceIntro(biz), cta: { url: bookingUrl(ctx, locale), label: c.bookAgainCta }, attachIcs: false, subject: c.subjectPostService(biz), wa: c.waConfirmation(waArgs) };
    default:
      throw new Error(`no client variant for ${type}`);
  }
}

export function buildClientMessage(
  type: NotificationType,
  channel: Channel,
  ctx: BookingNotifCtx,
  to: string,
): NotificationMessage {
  const locale = ctx.customer.locale;
  const c = copy(locale);
  const v = clientVariant(type, ctx, locale);

  if (channel === 'email') {
    const status = statusFor(type, locale);
    const react = React.createElement(ClientBookingEmail, {
      accent: ctx.business.accentColor ?? DEFAULT_ACCENT,
      businessName: ctx.business.name,
      logoUrl: ctx.business.logoUrl,
      preview: v.intro,
      greeting: c.greeting(ctx.customer.fullName),
      heading: v.heading,
      intro: v.intro,
      rows: clientRows(ctx, locale),
      statusLabel: status?.label,
      statusTone: status?.tone,
      ctaUrl: v.cta?.url,
      ctaLabel: v.cta?.label,
      customMessage: ctx.settings.customMessage,
      timezoneNote: c.timezoneNote(ctx.business.timezone),
      footer: c.footer,
    });
    return {
      to,
      subject: v.subject,
      react,
      text: v.wa,
      attachments: v.attachIcs ? icsAttachment(ctx) : undefined,
    };
  }

  // WhatsApp / SMS: texto plano.
  return { to, text: v.wa };
}

// ---------------------------------------------------------------------------
// Negocio
// ---------------------------------------------------------------------------

export function buildBusinessMessage(
  type: 'business_new_booking' | 'business_cancellation',
  ctx: BookingNotifCtx,
  to: string,
): NotificationMessage {
  // El negocio lee en el idioma de su booking page (aproximación: la tz/locale
  // del negocio no se guarda por-usuario; usamos el locale del cliente como
  // idioma del contenido de la reserva, pero los rótulos van en ES por defecto).
  const locale: NotifLocale = 'es';
  const c = copy(locale);
  const rows = [
    { label: c.labelService, value: ctx.service.name },
    { label: c.labelWhen, value: fmtWhen(ctx.booking.startsAt, ctx.business.timezone, locale) },
    { label: c.labelProfessional, value: ctx.staff.name },
    { label: 'Cliente', value: ctx.customer.fullName },
  ];
  const heading = type === 'business_new_booking' ? c.businessNewHeading : c.businessCancelHeading;
  const intro = type === 'business_new_booking' ? c.businessNewIntro : c.businessCancelIntro;
  const subject =
    type === 'business_new_booking'
      ? c.subjectBusinessNew(ctx.customer.fullName)
      : c.subjectBusinessCancel(ctx.customer.fullName);

  const react = React.createElement(BusinessNotificationEmail, {
    accent: ctx.business.accentColor ?? DEFAULT_ACCENT,
    businessName: ctx.business.name,
    logoUrl: ctx.business.logoUrl,
    preview: intro,
    heading,
    intro,
    rows,
    ctaUrl: `${getAppUrl()}/es/dashboard/calendar`,
    ctaLabel: c.labelWhen,
    footer: c.footer,
  });
  return { to, subject, react, text: `${heading}: ${ctx.customer.fullName} · ${ctx.service.name} · ${fmtWhen(ctx.booking.startsAt, ctx.business.timezone, locale)}` };
}

export function buildDailySummaryMessage(
  business: { name: string; logoUrl: string | null; timezone: string; bookingLocale: NotifLocale },
  items: AgendaItem[],
  to: string,
  dateLabel: string,
): NotificationMessage {
  const locale = business.bookingLocale;
  const c = copy(locale);
  const react = React.createElement(DailySummaryEmail, {
    businessName: business.name,
    logoUrl: business.logoUrl,
    preview: c.dailySummaryIntro(items.length, dateLabel),
    heading: c.dailySummaryHeading,
    intro: c.dailySummaryIntro(items.length, dateLabel),
    emptyText: c.dailySummaryEmpty,
    items: items.map((it) => ({
      time: fmtTime(it.startsAt, business.timezone, locale),
      customer: it.customerName,
      service: it.serviceName,
    })),
    footer: c.footer,
  });
  return { to, subject: c.subjectDailySummary(dateLabel), react, text: c.dailySummaryIntro(items.length, dateLabel) };
}

// ---------------------------------------------------------------------------
// Trial (aviso de término del plan Team de prueba)
// ---------------------------------------------------------------------------

export function buildTrialEmailMessage(
  business: { name: string; logoUrl: string | null; accentColor: string | null; locale: NotifLocale },
  daysLeft: number,
  to: string,
  ctaUrl: string,
): NotificationMessage {
  const c = copy(business.locale);
  const react = React.createElement(BusinessNotificationEmail, {
    accent: business.accentColor ?? DEFAULT_ACCENT,
    businessName: business.name,
    logoUrl: business.logoUrl,
    preview: c.trialEndingIntro(daysLeft),
    heading: c.trialEndingHeading,
    intro: c.trialEndingIntro(daysLeft),
    rows: [],
    ctaUrl,
    ctaLabel: c.trialEndingCta,
    footer: c.footer,
  });
  return { to, subject: c.trialEndingSubject(daysLeft), react, text: c.trialEndingIntro(daysLeft) };
}

export { formatMoney };
