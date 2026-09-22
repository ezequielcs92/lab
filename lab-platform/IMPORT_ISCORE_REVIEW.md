# Revisión previa de importación iScore 2017/2018

El preview es de sólo lectura y no escribe en Supabase.

## Resultado

- 426 copias procesadas.
- 142 partidos únicos.
- 284 copias duplicadas exactas.
- 170 nombres de jugador normalizados.
- 2 clubes vinculados por coincidencia exacta: Falcons e Infernales.
- 10 conflictos bloqueantes pendientes.
- 0 discrepancias de contenido y 0 carpetas de partido sin parsear.

## Clubes históricos resueltos

Según la confirmación de Wilmer:

- Aguilas → Cachorros
- Condores → Arias
- Pampas → club histórico independiente
- Pumas → club histórico independiente

## Jugadores multiclub

Wilmer confirmó que son las mismas personas en sus distintas participaciones. Se conserva una identidad estable y se mantienen las inscripciones por club/temporada:

- Facundo Maccio: Pampas / Pumas
- Juan Cruz Martin: Pumas / Falcons
- Jacinto Cipriota: Pumas / Falcons
- Franco Pozzo: Falcons / Pumas
- Victor Parajon: Falcons / Pumas
- Pablo Palacios: Pumas / Falcons

La fecha de nacimiento o el ID anterior quedan como evidencia complementaria, no como bloqueo de la importación.

## Reproducir

```powershell
npm run iscore:preview -- "C:\ruta\a\la\carpeta\extraida" --details
```

Con estas decisiones los bloqueos de mapeo de clubes e identidades quedan resueltos por confirmación del cliente. No usar un modo de escritura hasta aprobar el reporte final y ejecutar una prueba en staging.
