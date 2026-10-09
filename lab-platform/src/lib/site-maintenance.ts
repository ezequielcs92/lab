// Temporary full-site suspension. Set to false and redeploy to restore service.
export const SITE_MAINTENANCE_ENABLED = false

const maintenanceHtml = `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Sitio en mantenimiento</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f7f7;color:#222;font-family:Arial,sans-serif}
    main{padding:32px;text-align:center;max-width:440px}
    h1{font-size:24px;margin:0 0 16px}
    p{font-size:16px;line-height:1.6;margin:0;color:#555}
  </style>
</head>
<body>
  <main>
    <h1>Sitio en mantenimiento</h1>
    <p>El sitio no está disponible por el momento.<br>Por favor, volvé más tarde.</p>
  </main>
</body>
</html>`

export function createMaintenanceResponse(method = 'GET'): Response {
  return new Response(method === 'HEAD' ? null : maintenanceHtml, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Retry-After': '3600',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
