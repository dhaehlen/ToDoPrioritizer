const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** A short local date for display, e.g. "Nov 20, 2026". */
export const formatDate = (iso: string): string => dateFormat.format(new Date(iso));

/** The full local date and time, e.g. for a tooltip. */
export const formatDateTime = (iso: string): string => dateTimeFormat.format(new Date(iso));
