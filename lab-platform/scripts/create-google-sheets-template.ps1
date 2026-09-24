param(
  [string]$OutputPath = "$(Split-Path -Parent $PSScriptRoot)\..\Plantilla LAB 2026.xlsx"
)

$ErrorActionPreference = 'Stop'
$excel = $null
$workbook = $null

$sheets = [ordered]@{
  Partidos = @(
    'external_key', 'fecha_numero', 'fecha_hora', 'fase', 'local_slug', 'visitante_slug',
    'estadio', 'estado', 'marcador_local', 'marcador_visitante', 'marcador_innings_json',
    'streaming_url', 'updated_at'
  )
  Bateo = @(
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'orden_bateo',
    'ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp',
    'extras_json', 'updated_at'
  )
  Pitcheo = @(
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'ip', 'h', 'r',
    'er', 'bb', 'so', 'hr', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'extras_json', 'updated_at'
  )
  Fildeo = @(
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug',
    'po', 'a', 'e', 'dp', 'extras_json', 'updated_at'
  )
}

function Format-DataSheet {
  param($Sheet, [string[]]$Headers)

  for ($column = 0; $column -lt $Headers.Count; $column++) {
    $Sheet.Cells.Item(1, $column + 1) = $Headers[$column]
  }

  $headerRange = $Sheet.Range($Sheet.Cells.Item(1, 1), $Sheet.Cells.Item(1, $Headers.Count))
  $headerRange.Font.Bold = $true
  $headerRange.Font.Color = 0xFFFFFF
  $headerRange.Interior.Color = 0x54240B
  $headerRange.HorizontalAlignment = -4108
  $headerRange.AutoFilter() | Out-Null
  $headerRange.RowHeight = 28

  $Sheet.Cells.Font.Name = 'Aptos'
  $Sheet.Cells.Font.Size = 10
  $Sheet.Columns.AutoFit() | Out-Null
  for ($column = 1; $column -le $Headers.Count; $column++) {
    if ($Sheet.Columns.Item($column).ColumnWidth -lt 14) {
      $Sheet.Columns.Item($column).ColumnWidth = 14
    }
    if ($Sheet.Columns.Item($column).ColumnWidth -gt 28) {
      $Sheet.Columns.Item($column).ColumnWidth = 28
    }
  }

  $Sheet.Activate()
  $Sheet.Range('A2').Select() | Out-Null
  $excel.ActiveWindow.FreezePanes = $true
}

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Add()

  while ($workbook.Worksheets.Count -gt 1) {
    $workbook.Worksheets.Item($workbook.Worksheets.Count).Delete()
  }

  $instructions = $workbook.Worksheets.Item(1)
  $instructions.Name = 'Instrucciones'
  $instructions.Range('A1') = 'PLANTILLA OPERATIVA LAB 2026'
  $instructions.Range('A3') = 'Reglas de uso'
  $instructions.Range('A4') = '1. No renombrar las pestanas Partidos, Bateo, Pitcheo y Fildeo.'
  $instructions.Range('A5') = '2. No modificar, mover ni traducir los encabezados de la fila 1.'
  $instructions.Range('A6') = '3. Usar una fila por partido en Partidos y una fila por jugador/partido en las estadisticas.'
  $instructions.Range('A7') = '4. Usar los slugs de club y stable_id de jugador provistos por LAB.'
  $instructions.Range('A8') = '5. En pitcheo, IP usa notacion de beisbol: 4.0, 4.1 o 4.2.'
  $instructions.Range('A9') = '6. No pegar HTML de BallClubz aqui; esos archivos se cargan desde Importar BallClubz.'
  $instructions.Range('A10') = '7. Ejecutar Analizar cambios en LAB antes de aplicar modificaciones.'
  $instructions.Range('A12') = 'Formato recomendado de fecha_hora: 2026-10-31T18:00:00-03:00'
  $instructions.Range('A13') = 'Estados permitidos: programado, en_curso, finalizado, suspendido, cancelado'
  $instructions.Range('A14') = 'Fases permitidas: regular, playoffs'
  $instructions.Range('A1').Font.Bold = $true
  $instructions.Range('A1').Font.Size = 20
  $instructions.Range('A1').Font.Color = 0xFFFFFF
  $instructions.Range('A1').Interior.Color = 0x54240B
  $instructions.Range('A1:F1').Merge()
  $instructions.Range('A3').Font.Bold = $true
  $instructions.Columns.Item(1).ColumnWidth = 105
  $instructions.Rows.Item(1).RowHeight = 34

  foreach ($entry in $sheets.GetEnumerator()) {
    $sheet = $workbook.Worksheets.Add([System.Type]::Missing, $workbook.Worksheets.Item($workbook.Worksheets.Count))
    $sheet.Name = $entry.Key
    Format-DataSheet -Sheet $sheet -Headers $entry.Value
  }

  $partidos = $workbook.Worksheets.Item('Partidos')
  $partidos.Range('D2:D1000').Validation.Delete()
  $partidos.Range('D2:D1000').Validation.Add(3, 1, 1, 'regular,playoffs')
  $partidos.Range('H2:H1000').Validation.Delete()
  $partidos.Range('H2:H1000').Validation.Add(3, 1, 1, 'programado,en_curso,finalizado,suspendido,cancelado')

  $pitcheo = $workbook.Worksheets.Item('Pitcheo')
  foreach ($range in @('L2:L1000', 'M2:M1000', 'N2:N1000')) {
    $pitcheo.Range($range).Validation.Delete()
    $pitcheo.Range($range).Validation.Add(3, 1, 1, 'TRUE,FALSE')
  }

  $instructions.Activate()
  $outputDirectory = Split-Path -Parent $OutputPath
  if (-not (Test-Path -LiteralPath $outputDirectory)) {
    throw "No existe la carpeta de destino: $outputDirectory"
  }
  $workbook.SaveAs($OutputPath, 51)
  $workbook.Close($false)
  $excel.Quit()
  $workbook = $null
  $excel = $null
  Write-Output $OutputPath
} finally {
  if ($workbook) { $workbook.Close($false) }
  if ($excel) { $excel.Quit() }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
