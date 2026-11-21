/** Joins class names, skipping empty values (CSS-module lookups are typed `string | undefined`). */
export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
