const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isCrossSiteMutation(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false

  if (request.headers.get('sec-fetch-site') === 'cross-site') return true

  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return new URL(origin).origin !== new URL(request.url).origin
  } catch {
    return true
  }
}
