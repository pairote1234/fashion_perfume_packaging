$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
trap {
  Add-Content -LiteralPath (Join-Path $root "server.fatal.log") -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.ToString())
  break
}
$mysql = "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"
$port = 8088
$prefix = "http://localhost:$port/"

function ConvertTo-SqlString {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return "'" + $Value.Replace("\", "\\").Replace("'", "''") + "'"
}

function Invoke-MySql {
  param([string]$Sql)

  $temp = [System.IO.Path]::GetTempFileName()
  $content = "SET NAMES utf8mb4;`nUSE stock;`n$Sql"
  [System.IO.File]::WriteAllText($temp, $content, [System.Text.UTF8Encoding]::new($false))

  try {
    $previousPassword = $env:MYSQL_PWD
    $env:MYSQL_PWD = "P@ssw0rd"
    $output = & $mysql -h localhost -u admin --default-character-set=utf8mb4 --batch --raw --skip-column-names stock -e "SOURCE $($temp.Replace('\','/'))" 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw ($output -join "`n")
    }

    return $output
  }
  finally {
    $env:MYSQL_PWD = $previousPassword
    Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  }
}

function Read-RequestJson {
  param($Request)

  $reader = [System.IO.StreamReader]::new($Request.InputStream, [System.Text.Encoding]::UTF8)
  $body = $reader.ReadToEnd()
  $reader.Close()

  if ([string]::IsNullOrWhiteSpace($body)) {
    return @{}
  }

  return $body | ConvertFrom-Json
}

function Write-Response {
  param(
    $Response,
    [int]$StatusCode = 200,
    [string]$Body = "",
    [string]$ContentType = "application/json; charset=utf-8"
  )

  $Response.StatusCode = $StatusCode
  $Response.ContentType = $ContentType
  $Response.Headers.Add("Access-Control-Allow-Origin", "*")
  $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
  $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Write-Json {
  param($Response, $Data, [int]$StatusCode = 200)

  Write-Response -Response $Response -StatusCode $StatusCode -Body ($Data | ConvertTo-Json -Depth 10)
}

function Get-Products {
  $sql = @"
SELECT
  p.id,
  p.sku,
  p.name,
  c.name AS category,
  s.name AS supplier,
  p.selling_price,
  p.cost_price,
  p.stock_quantity,
  p.reorder_point,
  COALESCE(SUM(soi.quantity), 0) AS sold_quantity
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN suppliers s ON s.id = p.supplier_id
LEFT JOIN sales_order_items soi ON soi.product_id = p.id
WHERE p.status = 'active'
GROUP BY p.id, p.sku, p.name, c.name, s.name, p.selling_price, p.cost_price, p.stock_quantity, p.reorder_point
ORDER BY p.id;
"@

  $rows = Invoke-MySql $sql
  $products = @()

  foreach ($row in $rows) {
    if ($row -match "Using a password") { continue }
    $cols = $row -split "`t"
    if ($cols.Count -lt 10) { continue }

    $products += [ordered]@{
      id = [int]$cols[0]
      sku = $cols[1]
      name = $cols[2]
      category = $cols[3]
      supplier = $cols[4]
      price = [decimal]$cols[5]
      cost = [decimal]$cols[6]
      stock = [int]$cols[7]
      reorderPoint = [int]$cols[8]
      sold = [int]$cols[9]
    }
  }

  return $products
}

function Get-Sales {
  $sql = @"
SELECT
  so.order_no,
  p.sku,
  soi.quantity,
  COALESCE(c.name, 'Walk-in') AS customer,
  so.order_date,
  so.total_amount
FROM sales_orders so
JOIN sales_order_items soi ON soi.sales_order_id = so.id
JOIN products p ON p.id = soi.product_id
LEFT JOIN customers c ON c.id = so.customer_id
WHERE so.status <> 'cancelled'
ORDER BY so.order_date DESC, so.id DESC
LIMIT 50;
"@

  $rows = Invoke-MySql $sql
  $sales = @()

  foreach ($row in $rows) {
    if ($row -match "Using a password") { continue }
    $cols = $row -split "`t"
    if ($cols.Count -lt 6) { continue }

    $sales += [ordered]@{
      order = $cols[0]
      sku = $cols[1]
      qty = [int]$cols[2]
      customer = $cols[3]
      date = $cols[4]
      total = [decimal]$cols[5]
    }
  }

  return $sales
}

function Get-Shipments {
  $sql = @"
SELECT
  sh.shipment_no,
  sh.title,
  sh.origin_city,
  sh.origin_country,
  sh.destination,
  sh.eta_date,
  sh.total_units,
  sh.transport_mode,
  sh.current_stage_index,
  ts.stage_index,
  ts.stage_name,
  ts.planned_date
FROM import_shipments sh
LEFT JOIN import_tracking_stages ts ON ts.shipment_id = sh.id
WHERE sh.status <> 'cancelled'
ORDER BY sh.eta_date ASC, sh.id ASC, ts.stage_index ASC;
"@

  $rows = Invoke-MySql $sql
  $shipmentsByNo = [ordered]@{}

  foreach ($row in $rows) {
    if ($row -match "Using a password") { continue }
    $cols = $row -split "`t"
    if ($cols.Count -lt 12) { continue }

    $shipmentNo = $cols[0]
    if (-not $shipmentsByNo.Contains($shipmentNo)) {
      $shipmentsByNo[$shipmentNo] = [ordered]@{
        id = $shipmentNo
        title = $cols[1]
        origin = "$($cols[2]), $($cols[3])"
        destination = $cols[4]
        eta = $cols[5]
        units = [int]$cols[6]
        mode = $cols[7]
        currentStage = [int]$cols[8]
        stages = @()
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($cols[10])) {
      $shipmentsByNo[$shipmentNo].stages += [ordered]@{
        label = $cols[10]
        date = $cols[11]
      }
    }
  }

  return @($shipmentsByNo.Values)
}

function Add-Shipment {
  param($Payload)

  $shipmentNo = ConvertTo-SqlString $Payload.shipmentNo
  $title = ConvertTo-SqlString $Payload.title
  $originCity = ConvertTo-SqlString $Payload.originCity
  $destination = ConvertTo-SqlString $Payload.destination
  $mode = ConvertTo-SqlString $Payload.mode
  $eta = ConvertTo-SqlString $Payload.eta
  $units = [int]$Payload.units
  $firstStage = ConvertTo-SqlString $Payload.firstStage
  $firstStageDate = ConvertTo-SqlString $Payload.firstStageDate

  if ($units -lt 1) {
    throw "Shipment units must be greater than zero"
  }

  $sql = @"
START TRANSACTION;
INSERT INTO import_shipments
  (shipment_no, title, origin_city, origin_country, destination, transport_mode, eta_date, total_units, current_stage_index, status)
VALUES
  ($shipmentNo, $title, $originCity, 'China', $destination, $mode, $eta, $units, 0, 'preparing');

INSERT INTO import_tracking_stages (shipment_id, stage_index, stage_name, planned_date, completed_at)
SELECT id, 0, $firstStage, $firstStageDate, NOW()
FROM import_shipments
WHERE shipment_no = $shipmentNo;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Update-ShipmentStatus {
  param($Payload)

  $shipmentNo = ConvertTo-SqlString $Payload.shipmentNo
  $currentStage = [int]$Payload.currentStage

  $sql = @"
START TRANSACTION;
UPDATE import_shipments sh
JOIN (
  SELECT shipment_id, MAX(stage_index) AS max_stage
  FROM import_tracking_stages
  GROUP BY shipment_id
) stages ON stages.shipment_id = sh.id
SET
  sh.current_stage_index = GREATEST(0, LEAST($currentStage, stages.max_stage)),
  sh.status = CASE
    WHEN GREATEST(0, LEAST($currentStage, stages.max_stage)) >= stages.max_stage THEN 'arrived'
    WHEN GREATEST(0, LEAST($currentStage, stages.max_stage)) >= 5 THEN 'customs'
    ELSE 'in_transit'
  END
WHERE sh.shipment_no = $shipmentNo;

UPDATE import_tracking_stages ts
JOIN import_shipments sh ON sh.id = ts.shipment_id
SET ts.completed_at = CASE
  WHEN ts.stage_index <= sh.current_stage_index THEN COALESCE(ts.completed_at, NOW())
  ELSE NULL
END
WHERE sh.shipment_no = $shipmentNo;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Add-ShipmentStage {
  param($Payload)

  $shipmentNo = ConvertTo-SqlString $Payload.shipmentNo
  $label = ConvertTo-SqlString $Payload.label
  $date = ConvertTo-SqlString $Payload.date

  $sql = @"
START TRANSACTION;
INSERT INTO import_tracking_stages (shipment_id, stage_index, stage_name, planned_date)
SELECT sh.id, COALESCE(MAX(ts.stage_index), -1) + 1, $label, $date
FROM import_shipments sh
LEFT JOIN import_tracking_stages ts ON ts.shipment_id = sh.id
WHERE sh.shipment_no = $shipmentNo
GROUP BY sh.id;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Remove-LastShipmentStage {
  param([string]$ShipmentNo)

  $shipmentNoSql = ConvertTo-SqlString $ShipmentNo
  $sql = @"
START TRANSACTION;
DELETE ts
FROM import_tracking_stages ts
JOIN import_shipments sh ON sh.id = ts.shipment_id
JOIN (
  SELECT shipment_id, MAX(stage_index) AS max_stage, COUNT(*) AS stage_count
  FROM import_tracking_stages
  GROUP BY shipment_id
) last_stage ON last_stage.shipment_id = ts.shipment_id
WHERE sh.shipment_no = $shipmentNoSql
  AND ts.stage_index = last_stage.max_stage
  AND last_stage.stage_count > 1;

UPDATE import_shipments sh
JOIN (
  SELECT shipment_id, MAX(stage_index) AS max_stage
  FROM import_tracking_stages
  GROUP BY shipment_id
) stages ON stages.shipment_id = sh.id
SET sh.current_stage_index = LEAST(sh.current_stage_index, stages.max_stage)
WHERE sh.shipment_no = $shipmentNoSql;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Add-SampleSale {
  param($Payload)

  $sku = ConvertTo-SqlString $Payload.sku
  $qty = [int]$Payload.qty
  $customer = ConvertTo-SqlString $Payload.customer

  if ($qty -le 0) {
    throw "Quantity must be greater than zero"
  }

  $sql = @"
START TRANSACTION;
INSERT INTO customers (name, customer_type)
VALUES ($customer, 'online')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO sales_orders (order_no, customer_id, order_date, total_amount)
SELECT
  CONCAT('SO-WEB-', DATE_FORMAT(NOW(6), '%Y%m%d%H%i%s%f')),
  c.id,
  CURDATE(),
  $qty * p.selling_price
FROM customers c
JOIN products p ON p.sku = $sku
WHERE c.name = $customer
  AND p.status = 'active'
  AND p.stock_quantity > 0;

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, unit_cost)
SELECT LAST_INSERT_ID(), p.id, LEAST($qty, p.stock_quantity), p.selling_price, p.cost_price
FROM products p
WHERE p.sku = $sku
  AND p.status = 'active'
  AND p.stock_quantity > 0;

UPDATE products
SET stock_quantity = GREATEST(0, stock_quantity - $qty)
WHERE sku = $sku
  AND status = 'active';

INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, reference_id, note)
SELECT p.id, 'sale_out', LEAST($qty, $qty + p.stock_quantity), p.stock_quantity, 'sales_order', LAST_INSERT_ID(), 'ขายตัวอย่างจากหน้าเว็บ'
FROM products p
WHERE p.sku = $sku
  AND p.status = 'active';
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Add-Product {
  param($Payload)

  $sku = ConvertTo-SqlString $Payload.sku
  $name = ConvertTo-SqlString $Payload.name
  $category = ConvertTo-SqlString $Payload.category
  $supplier = ConvertTo-SqlString $Payload.supplier
  $price = [decimal]$Payload.price
  $cost = [decimal]$Payload.cost
  $stock = [int]$Payload.stock
  $reorderPoint = [int]$Payload.reorderPoint

  $sql = @"
START TRANSACTION;
INSERT INTO categories (name, parent_name)
VALUES ($category, SUBSTRING_INDEX($category, ' / ', 1))
ON DUPLICATE KEY UPDATE parent_name = VALUES(parent_name);

INSERT INTO suppliers (name, country)
VALUES ($supplier, 'China')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO products
  (sku, name, category_id, supplier_id, selling_price, cost_price, stock_quantity, reorder_point)
SELECT $sku, $name, c.id, s.id, $price, $cost, $stock, $reorderPoint
FROM categories c
JOIN suppliers s ON s.name = $supplier
WHERE c.name = $category;

INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, note)
SELECT id, 'opening', stock_quantity, stock_quantity, 'web', 'เพิ่มสินค้าจากหน้าเว็บ'
FROM products
WHERE sku = $sku;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Adjust-Stock {
  param($Payload)

  $sku = ConvertTo-SqlString $Payload.sku
  $qty = [int]$Payload.qty
  $action = [string]$Payload.action

  if ($action -eq "add") {
    $setSql = "stock_quantity = stock_quantity + $qty"
    $movement = "adjust_in"
  }
  elseif ($action -eq "remove") {
    $setSql = "stock_quantity = GREATEST(0, stock_quantity - $qty)"
    $movement = "adjust_out"
  }
  else {
    $setSql = "stock_quantity = $qty"
    $movement = "set_balance"
  }

  $sql = @"
START TRANSACTION;
UPDATE products SET $setSql WHERE sku = $sku;
INSERT INTO inventory_movements (product_id, movement_type, quantity, balance_after, reference_type, note)
SELECT id, '$movement', $qty, stock_quantity, 'web', 'ปรับ stock จากหน้าเว็บ'
FROM products
WHERE sku = $sku;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Delete-Product {
  param([string]$Sku)

  $skuSql = ConvertTo-SqlString $Sku
  $sql = @"
START TRANSACTION;
DELETE im
FROM inventory_movements im
JOIN products p ON p.id = im.product_id
WHERE p.sku = $skuSql;

DELETE isi
FROM import_shipment_items isi
JOIN products p ON p.id = isi.product_id
WHERE p.sku = $skuSql;

DELETE soi
FROM sales_order_items soi
JOIN products p ON p.id = soi.product_id
WHERE p.sku = $skuSql;

DELETE so
FROM sales_orders so
LEFT JOIN sales_order_items soi ON soi.sales_order_id = so.id
WHERE soi.id IS NULL;

DELETE FROM products
WHERE sku = $skuSql;
COMMIT;
"@

  Invoke-MySql $sql | Out-Null
}

function Get-StaticContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Send-HttpResponse {
  param(
    $Client,
    [int]$StatusCode = 200,
    [string]$ContentType = "application/json; charset=utf-8",
    [byte[]]$Bytes = @()
  )

  $reason = switch ($StatusCode) {
    200 { "OK" }
    204 { "No Content" }
    404 { "Not Found" }
    500 { "Internal Server Error" }
    default { "OK" }
  }

  $headers = @(
    "HTTP/1.1 $StatusCode $reason",
    "Content-Type: $ContentType",
    "Content-Length: $($Bytes.Length)",
    "Access-Control-Allow-Origin: *",
    "Access-Control-Allow-Headers: Content-Type",
    "Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE",
    "Connection: close",
    "",
    ""
  ) -join "`r`n"

  $stream = $Client.GetStream()
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Bytes.Length -gt 0) {
    $stream.Write($Bytes, 0, $Bytes.Length)
  }
  $stream.Flush()
  $Client.Close()
}

function Send-JsonResponse {
  param($Client, $Data, [int]$StatusCode = 200)

  $json = $Data | ConvertTo-Json -Depth 10
  Send-HttpResponse -Client $Client -StatusCode $StatusCode -ContentType "application/json; charset=utf-8" -Bytes ([System.Text.Encoding]::UTF8.GetBytes($json))
}

function Read-RawRequest {
  param($Client)

  $stream = $Client.GetStream()
  $stream.ReadTimeout = 15000
  $bytes = [System.Collections.Generic.List[byte]]::new()
  $headerEnd = -1
  $buffer = New-Object byte[] 1

  while ($headerEnd -lt 0) {
    $read = $stream.Read($buffer, 0, 1)
    if ($read -le 0) { break }
    $bytes.Add($buffer[0])
    $count = $bytes.Count

    if (
      $count -ge 4 -and
      $bytes[$count - 4] -eq 13 -and
      $bytes[$count - 3] -eq 10 -and
      $bytes[$count - 2] -eq 13 -and
      $bytes[$count - 1] -eq 10
    ) {
      $headerEnd = $count
    }
  }

  if ($headerEnd -lt 0) {
    return @{ Header = ""; Body = "" }
  }

  $headerText = [System.Text.Encoding]::ASCII.GetString($bytes.ToArray(), 0, $headerEnd)
  $contentLength = 0

  foreach ($line in ($headerText -split "`r`n")) {
    if ($line -match "^Content-Length:\s*(\d+)") {
      $contentLength = [int]$Matches[1]
    }
  }

  $bodyBytes = New-Object byte[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $stream.Read($bodyBytes, $offset, $contentLength - $offset)
    if ($read -le 0) { break }
    $offset += $read
  }

  return @{
    Header = $headerText.TrimEnd()
    Body = [System.Text.Encoding]::UTF8.GetString($bodyBytes, 0, $offset)
  }
}

$tcpListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $port)
$tcpListener.Start()
Write-Host "SupplyPilot running at $prefix"

while ($true) {
  $client = $tcpListener.AcceptTcpClient()

  try {
    $raw = Read-RawRequest $client
    $lines = $raw.Header -split "`r`n"
    if ($lines.Count -eq 0 -or [string]::IsNullOrWhiteSpace($lines[0])) {
      Send-JsonResponse -Client $client -StatusCode 500 -Data @{ error = "Invalid request" }
      continue
    }

    $requestParts = $lines[0] -split " "
    $method = $requestParts[0]
    $path = [uri]::UnescapeDataString(($requestParts[1] -split "\?")[0]).Trim("/")

    if ($method -eq "OPTIONS") {
      Send-HttpResponse -Client $client -StatusCode 204
      continue
    }

    if ($path -eq "api/products" -and $method -eq "GET") {
      Send-JsonResponse -Client $client -Data (Get-Products)
      continue
    }

    if ($path -eq "api/sales" -and $method -eq "GET") {
      Send-JsonResponse -Client $client -Data (Get-Sales)
      continue
    }

    if ($path -eq "api/shipments" -and $method -eq "GET") {
      Send-JsonResponse -Client $client -Data (Get-Shipments)
      continue
    }

    if ($path -eq "api/shipments" -and $method -eq "POST") {
      Add-Shipment ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; shipments = Get-Shipments }
      continue
    }

    if ($path -eq "api/shipments/status" -and $method -eq "POST") {
      Update-ShipmentStatus ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; shipments = Get-Shipments }
      continue
    }

    if ($path -eq "api/shipments/stages" -and $method -eq "POST") {
      Add-ShipmentStage ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; shipments = Get-Shipments }
      continue
    }

    if ($path.StartsWith("api/shipments/") -and $path.EndsWith("/stages/last") -and $method -eq "DELETE") {
      $shipmentNo = $path.Substring("api/shipments/".Length)
      $shipmentNo = $shipmentNo.Substring(0, $shipmentNo.Length - "/stages/last".Length)
      Remove-LastShipmentStage $shipmentNo
      Send-JsonResponse -Client $client -Data @{ ok = $true; shipments = Get-Shipments }
      continue
    }

    if ($path -eq "api/products" -and $method -eq "POST") {
      Add-Product ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; products = Get-Products }
      continue
    }

    if ($path -eq "api/sales/sample" -and $method -eq "POST") {
      Add-SampleSale ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; products = Get-Products; sales = Get-Sales }
      continue
    }

    if ($path -eq "api/stock" -and $method -eq "POST") {
      Adjust-Stock ($raw.Body | ConvertFrom-Json)
      Send-JsonResponse -Client $client -Data @{ ok = $true; products = Get-Products }
      continue
    }

    if ($path.StartsWith("api/products/") -and $method -eq "DELETE") {
      Delete-Product ($path.Substring("api/products/".Length))
      Send-JsonResponse -Client $client -Data @{ ok = $true; products = Get-Products }
      continue
    }

    if ([string]::IsNullOrWhiteSpace($path)) {
      $path = "index.html"
    }

    $filePath = Join-Path $root $path
    $resolvedRoot = [System.IO.Path]::GetFullPath($root)
    $resolvedFile = [System.IO.Path]::GetFullPath($filePath)

    if (-not $resolvedFile.StartsWith($resolvedRoot) -or -not (Test-Path -LiteralPath $resolvedFile -PathType Leaf)) {
      Send-JsonResponse -Client $client -StatusCode 404 -Data @{ error = "Not found" }
      continue
    }

    Send-HttpResponse -Client $client -ContentType (Get-StaticContentType $resolvedFile) -Bytes ([System.IO.File]::ReadAllBytes($resolvedFile))
  }
  catch {
    Add-Content -LiteralPath (Join-Path $root "server.runtime.log") -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.ToString())
    try {
      Send-JsonResponse -Client $client -StatusCode 500 -Data @{ error = $_.Exception.Message }
    }
    catch {
      Add-Content -LiteralPath (Join-Path $root "server.runtime.log") -Value ("[{0}] Response error: {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $_.Exception.ToString())
    }
    continue
  }
}
