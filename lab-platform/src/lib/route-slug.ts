/**
 * Route params arrive percent-encoded, so a slug with an accent, an ñ or a space (`Andrés-…`,
 * `Joaco Bruno`) reached the database as `Andr%C3%A9s-…` and the page answered 404. A malformed
 * sequence is kept as it came, which simply finds nothing.
 */
export function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
