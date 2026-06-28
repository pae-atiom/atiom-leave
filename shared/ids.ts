// ID + time helpers shared by the backend and (where relevant) the web app.
// Runtime IDs are server-generated now, so we use crypto.randomUUID() instead
// of the old module-local counter — safe across concurrent Lambda invocations.
// `crypto` is a global in Node 20+, Bun and the browser.

/** Unique id with a prefix, e.g. `req_1f0c…`. */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID()}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
