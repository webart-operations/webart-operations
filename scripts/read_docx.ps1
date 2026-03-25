$src = 'C:\Users\91912\Downloads\Webart_Ops_Platform_Documentation.docx'
$dst = 'C:\Users\91912\.gemini\antigravity\playground\shining-kepler\docx_extracted'

# Remove old extraction if any
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }

# Extract docx (it's a zip)
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($src, $dst)

# Read and parse the main document XML
$xmlPath = Join-Path $dst 'word\document.xml'
$xml = [xml](Get-Content $xmlPath -Encoding UTF8)

# Extract all text nodes
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$paragraphs = $xml.SelectNodes('//w:p', $ns)
foreach ($para in $paragraphs) {
    $runs = $para.SelectNodes('.//w:t', $ns)
    $line = ''
    foreach ($run in $runs) {
        $line += $run.InnerText
    }
    if ($line.Trim() -ne '') {
        Write-Output $line
    }
}
