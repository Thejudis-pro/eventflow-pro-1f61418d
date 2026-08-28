/**
 * A thrown value from a TanStack Start server function isn't always
 * `instanceof Error` once it's deserialized back on the client -- it can
 * arrive as a plain object with a `message` property instead. `String(error)`
 * on that plain object gives the useless "[object Object]", hiding the real
 * reason from whoever's reading the toast.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return String(error);
}
