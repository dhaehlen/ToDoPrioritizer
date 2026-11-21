/**
 * Runtime checks for todos crossing the storage boundary (ARCHITECTURE §4.2).
 *
 * The schema checks the *shape* of a record, not the business rules: title
 * and description length limits live in the domain layer. That way, a record
 * saved under older or looser rules still loads instead of being dropped.
 */
import { z } from 'zod';
import { QUADRANTS, type Todo } from '../domain/todo';

const isoUtc = z.iso.datetime(); // UTC ("Z") only, as produced by toISOString()

const base = {
  id: z.string().min(1),
  title: z.string().trim().min(1),
  description: z.string(),
  quadrant: z.enum(QUADRANTS).nullable(),
  createdAt: isoUtc,
  updatedAt: isoUtc,
};

// Unknown extra fields are stripped rather than rejected, so a record written
// by a newer version of the app still loads.
export const todoSchema = z.discriminatedUnion('isCompleted', [
  z.object({ ...base, isCompleted: z.literal(false), completedAt: z.null() }),
  z.object({ ...base, isCompleted: z.literal(true), completedAt: isoUtc }),
]);

// Compile-time check that the schema and the domain type describe the same thing.
type SchemaTodo = z.infer<typeof todoSchema>;
export type SchemaMatchesDomain = [SchemaTodo, Todo] extends [Todo, SchemaTodo] ? true : never;
// Fails to compile if the two drift apart.
export const schemaMatchesDomain: SchemaMatchesDomain = true;

export class InvalidTodoError extends Error {
  override readonly name = 'InvalidTodoError';
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(error: z.ZodError) {
    super(`Invalid todo:\n${z.prettifyError(error)}`);
    this.issues = error.issues;
  }
}

/** Checks a todo before it is written. Throws `InvalidTodoError` if it is malformed. */
export function assertValidTodo(value: unknown): Todo {
  const result = todoSchema.safeParse(value);
  if (!result.success) throw new InvalidTodoError(result.error);
  return result.data;
}

export interface InvalidRecord {
  readonly record: unknown;
  readonly issues: readonly z.core.$ZodIssue[];
}

/** Checks records read from storage. Bad records are returned separately instead of throwing. */
export function parseStoredTodos(records: readonly unknown[]): {
  todos: Todo[];
  invalid: InvalidRecord[];
} {
  const todos: Todo[] = [];
  const invalid: InvalidRecord[] = [];
  for (const record of records) {
    const result = todoSchema.safeParse(record);
    if (result.success) todos.push(result.data);
    else invalid.push({ record, issues: result.error.issues });
  }
  return { todos, invalid };
}
