/** Returns the current time. Injected so tests can control it. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** Returns a new unique id. Injected so tests can produce predictable ids. */
export type IdGenerator = () => string;

export const randomId: IdGenerator = () => crypto.randomUUID();
