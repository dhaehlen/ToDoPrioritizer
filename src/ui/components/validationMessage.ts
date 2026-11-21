import type { ValidationError } from '../../domain/todo.rules';

/** Turns a validation error into a message to show next to its field. */
export function validationMessage(error: ValidationError): string {
  if (error.code === 'required') return 'Enter a title.';
  return `Use at most ${String(error.max)} characters.`;
}
