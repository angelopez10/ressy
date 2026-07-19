/**
 * Generador de `.ics` (RFC 5545) para el botón "Agregar al calendario".
 *
 * Hecho a mano a propósito: un `.ics` de un solo evento son ~15 líneas de texto;
 * una dependencia para esto no se justifica (restricción de la sesión 03B). Los
 * instantes van en UTC con sufijo `Z`, que es lo que el motor ya entrega.
 */

export interface CalendarEvent {
  /** Identificador estable del evento (usar el booking id). */
  uid: string;
  /** UTC. */
  start: Date;
  /** UTC. */
  end: Date;
  title: string;
  description?: string;
  location?: string;
}

/** Fecha UTC → 'YYYYMMDDTHHMMSSZ' (formato UTC de iCalendar). */
function toIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** Escapa los caracteres especiales de un valor de texto iCalendar (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Serializa un evento a un documento `.ics` completo. `PRODID` identifica a
 * Ressy; las líneas van con CRLF, que es lo que exige el RFC (varios clientes
 * rechazan `\n` solo).
 */
export function buildIcs(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ressy//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@getressy.com`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);

  return lines.join('\r\n');
}

/** `data:` URI para descargar el `.ics` desde un `<a download>` sin route handler. */
export function icsDataUri(event: CalendarEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(event))}`;
}
