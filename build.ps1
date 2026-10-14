# Script Build Otomatis Standalone HTML untuk Vercel
$idx = Get-Content (Join-Path $PSScriptRoot 'index_gas.html') -Raw -Encoding UTF8
$css = Get-Content 'css.html' -Raw -Encoding UTF8
$mod = Get-Content 'modals.html' -Raw -Encoding UTF8
$js = Get-Content 'js.html' -Raw -Encoding UTF8

$standalone = $idx.Replace('<?!= include(''css''); ?>', $css)
$standalone = $standalone.Replace('<?!= include(''modals''); ?>', $mod)
$standalone = $standalone.Replace('<?!= include(''js''); ?>', $js)

[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'index.html'), $standalone, [System.Text.Encoding]::UTF8)

if (!(Test-Path (Join-Path $PSScriptRoot 'dist'))) {
    New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'dist') | Out-Null
}
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'dist\index.html'), $standalone, [System.Text.Encoding]::UTF8)

Write-Output "SUKSES: File index.html dan dist/index.html berhasil dibuild untuk Vercel!"
