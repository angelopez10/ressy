/**
 * Copy bilingüe de las notificaciones. NO usa next-intl: los jobs de Inngest
 * corren fuera del scope de un request, así que las traducciones viven en un
 * diccionario plano. El idioma es el del CLIENTE FINAL capturado en la reserva
 * (CLAUDE.md §6), no el del negocio.
 */

export type NotifLocale = 'es' | 'en';

export interface NotifCopy {
  // Asuntos (email)
  subjectConfirmation: (biz: string) => string;
  subjectReminder: (biz: string) => string;
  subjectRescheduled: (biz: string) => string;
  subjectCancelled: (biz: string) => string;
  subjectPostService: (biz: string) => string;
  subjectBusinessNew: (name: string) => string;
  subjectBusinessCancel: (name: string) => string;
  subjectDailySummary: (date: string) => string;
  // Encabezados / cuerpos
  greeting: (name: string) => string;
  confirmedHeading: string;
  confirmedIntro: (biz: string) => string;
  reminderHeading: string;
  reminderIntro: (biz: string) => string;
  rescheduledHeading: string;
  rescheduledIntro: (biz: string) => string;
  cancelledHeading: string;
  cancelledIntro: (biz: string) => string;
  postServiceHeading: string;
  postServiceIntro: (biz: string) => string;
  // Etiquetas de detalle
  labelService: string;
  labelWhen: string;
  labelProfessional: string;
  labelWhere: string;
  labelDuration: (min: number) => string;
  // Estado de la reserva (badge del email)
  statusConfirmed: string;
  statusRescheduled: string;
  statusCancelled: string;
  manageCta: string;
  bookAgainCta: string;
  addToCalendar: string;
  timezoneNote: (zone: string) => string;
  // Negocio
  businessNewHeading: string;
  businessNewIntro: string;
  businessCancelHeading: string;
  businessCancelIntro: string;
  dailySummaryHeading: string;
  dailySummaryIntro: (count: number, date: string) => string;
  dailySummaryEmpty: string;
  // WhatsApp (texto plano, corto)
  waConfirmation: (a: WaArgs) => string;
  waReminder: (a: WaArgs) => string;
  waRescheduled: (a: WaArgs) => string;
  waCancelled: (a: WaArgs) => string;
  // Trial (término del plan Team de prueba)
  trialEndingSubject: (days: number) => string;
  trialEndingHeading: string;
  trialEndingIntro: (days: number) => string;
  trialEndingCta: string;
  footer: string;
}

export interface WaArgs {
  business: string;
  service: string;
  when: string;
  professional: string;
  manageUrl: string;
  custom?: string | null;
}

const es: NotifCopy = {
  subjectConfirmation: (b) => `Reserva confirmada en ${b}`,
  subjectReminder: (b) => `Recordatorio de tu cita en ${b}`,
  subjectRescheduled: (b) => `Tu cita en ${b} cambió de hora`,
  subjectCancelled: (b) => `Reserva cancelada · ${b}`,
  subjectPostService: (b) => `¡Gracias por tu visita a ${b}!`,
  subjectBusinessNew: (n) => `Nueva reserva: ${n}`,
  subjectBusinessCancel: (n) => `Reserva cancelada: ${n}`,
  subjectDailySummary: (d) => `Tu agenda de hoy · ${d}`,
  greeting: (n) => `Hola ${n},`,
  confirmedHeading: '¡Reserva confirmada!',
  confirmedIntro: (b) => `Tu cita en ${b} está confirmada. Aquí están los detalles:`,
  reminderHeading: 'Te esperamos pronto',
  reminderIntro: (b) => `Un recordatorio de tu próxima cita en ${b}:`,
  rescheduledHeading: 'Tu cita cambió de hora',
  rescheduledIntro: (b) => `Actualizamos tu reserva en ${b}. Nuevos datos:`,
  cancelledHeading: 'Reserva cancelada',
  cancelledIntro: (b) => `Tu cita en ${b} fue cancelada. Si fue un error, puedes reservar de nuevo cuando quieras.`,
  postServiceHeading: '¡Gracias por tu visita!',
  postServiceIntro: (b) => `Esperamos que lo hayas disfrutado. ¿Reservamos la próxima en ${b}?`,
  labelService: 'Servicio',
  labelWhen: 'Cuándo',
  labelProfessional: 'Profesional',
  labelWhere: 'Dónde',
  labelDuration: (m) => `${m} min`,
  statusConfirmed: 'Confirmada',
  statusRescheduled: 'Reagendada',
  statusCancelled: 'Cancelada',
  manageCta: 'Reagendar o cancelar',
  bookAgainCta: 'Reservar de nuevo',
  addToCalendar: 'Agregar al calendario',
  timezoneNote: (z) => `Hora de ${z}`,
  businessNewHeading: 'Nueva reserva',
  businessNewIntro: 'Acabas de recibir una reserva:',
  businessCancelHeading: 'Un cliente canceló',
  businessCancelIntro: 'Se liberó este horario en tu agenda:',
  dailySummaryHeading: 'Tu agenda de hoy',
  dailySummaryIntro: (c, d) => `Tienes ${c} cita${c === 1 ? '' : 's'} para hoy, ${d}.`,
  dailySummaryEmpty: 'No tienes citas para hoy. ¡A descansar o a llenar la agenda!',
  trialEndingSubject: (d) =>
    d <= 0 ? 'Tu prueba de Team terminó' : `Te quedan ${d} día${d === 1 ? '' : 's'} de Team`,
  trialEndingHeading: 'Tu prueba de Team está por terminar',
  trialEndingIntro: (d) =>
    d <= 0
      ? 'Tu prueba de 14 días de Team terminó y tu cuenta pasó al plan Free. Mejora cuando quieras para recuperar WhatsApp, tu equipo completo y los reportes.'
      : `Te quedan ${d} día${d === 1 ? '' : 's'} de tu prueba de Team. Elige un plan para no perder WhatsApp, tu equipo y los reportes avanzados.`,
  trialEndingCta: 'Ver planes',
  waConfirmation: (a) =>
    `✅ *Reserva confirmada* en ${a.business}\n\n📅 ${a.when}\n💇 ${a.service} · ${a.professional}` +
    (a.custom ? `\n\n📝 ${a.custom}` : '') +
    `\n\nReagenda o cancela aquí: ${a.manageUrl}`,
  waReminder: (a) =>
    `⏰ *Recordatorio* — ${a.business}\n\n📅 ${a.when}\n💇 ${a.service} · ${a.professional}` +
    (a.custom ? `\n\n📝 ${a.custom}` : '') +
    `\n\n¿No puedes ir? ${a.manageUrl}`,
  waRescheduled: (a) =>
    `🔁 *Tu cita cambió* — ${a.business}\n\nNueva hora: 📅 ${a.when}\n💇 ${a.service} · ${a.professional}\n\nGestiona aquí: ${a.manageUrl}`,
  waCancelled: (a) =>
    `❌ *Reserva cancelada* — ${a.business}\n\n${a.service} · ${a.when}\n\nReserva de nuevo cuando quieras.`,
  footer: 'Enviado con Ressy',
};

const en: NotifCopy = {
  subjectConfirmation: (b) => `Booking confirmed at ${b}`,
  subjectReminder: (b) => `Reminder for your appointment at ${b}`,
  subjectRescheduled: (b) => `Your appointment at ${b} was rescheduled`,
  subjectCancelled: (b) => `Booking cancelled · ${b}`,
  subjectPostService: (b) => `Thanks for visiting ${b}!`,
  subjectBusinessNew: (n) => `New booking: ${n}`,
  subjectBusinessCancel: (n) => `Booking cancelled: ${n}`,
  subjectDailySummary: (d) => `Your schedule for today · ${d}`,
  greeting: (n) => `Hi ${n},`,
  confirmedHeading: 'Booking confirmed!',
  confirmedIntro: (b) => `Your appointment at ${b} is confirmed. Here are the details:`,
  reminderHeading: 'See you soon',
  reminderIntro: (b) => `A reminder for your upcoming appointment at ${b}:`,
  rescheduledHeading: 'Your appointment moved',
  rescheduledIntro: (b) => `We updated your booking at ${b}. New details:`,
  cancelledHeading: 'Booking cancelled',
  cancelledIntro: (b) => `Your appointment at ${b} was cancelled. If that was a mistake, you can book again anytime.`,
  postServiceHeading: 'Thanks for coming in!',
  postServiceIntro: (b) => `We hope you enjoyed it. Shall we book the next one at ${b}?`,
  labelService: 'Service',
  labelWhen: 'When',
  labelProfessional: 'Professional',
  labelWhere: 'Where',
  labelDuration: (m) => `${m} min`,
  statusConfirmed: 'Confirmed',
  statusRescheduled: 'Rescheduled',
  statusCancelled: 'Cancelled',
  manageCta: 'Reschedule or cancel',
  bookAgainCta: 'Book again',
  addToCalendar: 'Add to calendar',
  timezoneNote: (z) => `${z} time`,
  businessNewHeading: 'New booking',
  businessNewIntro: 'You just got a booking:',
  businessCancelHeading: 'A client cancelled',
  businessCancelIntro: 'This slot just opened up on your calendar:',
  dailySummaryHeading: "Today's schedule",
  dailySummaryIntro: (c, d) => `You have ${c} appointment${c === 1 ? '' : 's'} today, ${d}.`,
  dailySummaryEmpty: 'No appointments today. Time to rest — or fill the calendar!',
  trialEndingSubject: (d) =>
    d <= 0 ? 'Your Team trial has ended' : `${d} day${d === 1 ? '' : 's'} left of Team`,
  trialEndingHeading: 'Your Team trial is ending',
  trialEndingIntro: (d) =>
    d <= 0
      ? 'Your 14-day Team trial has ended and your account moved to the Free plan. Upgrade anytime to get WhatsApp, your full team and reports back.'
      : `You have ${d} day${d === 1 ? '' : 's'} left of your Team trial. Pick a plan so you don't lose WhatsApp, your team and advanced reports.`,
  trialEndingCta: 'See plans',
  waConfirmation: (a) =>
    `✅ *Booking confirmed* at ${a.business}\n\n📅 ${a.when}\n💇 ${a.service} · ${a.professional}` +
    (a.custom ? `\n\n📝 ${a.custom}` : '') +
    `\n\nReschedule or cancel: ${a.manageUrl}`,
  waReminder: (a) =>
    `⏰ *Reminder* — ${a.business}\n\n📅 ${a.when}\n💇 ${a.service} · ${a.professional}` +
    (a.custom ? `\n\n📝 ${a.custom}` : '') +
    `\n\nCan't make it? ${a.manageUrl}`,
  waRescheduled: (a) =>
    `🔁 *Your appointment moved* — ${a.business}\n\nNew time: 📅 ${a.when}\n💇 ${a.service} · ${a.professional}\n\nManage here: ${a.manageUrl}`,
  waCancelled: (a) =>
    `❌ *Booking cancelled* — ${a.business}\n\n${a.service} · ${a.when}\n\nBook again anytime.`,
  footer: 'Sent with Ressy',
};

export function copy(locale: NotifLocale): NotifCopy {
  return locale === 'en' ? en : es;
}
