/** Razón de dominio → clave de i18n en `dashboard.calendar.errors`. */
export function errorKey(reason: string): string {
  switch (reason) {
    case 'slot_taken':
      return 'slotTaken';
    case 'slot_unavailable':
      return 'slotUnavailable';
    case 'contact_required':
      return 'contactRequired';
    case 'not_authorized':
      return 'notAuthorized';
    case 'invalid_range':
      return 'invalidRange';
    default:
      return 'generic';
  }
}
