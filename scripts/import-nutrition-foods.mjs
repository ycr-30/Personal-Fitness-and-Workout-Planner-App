import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false

  function pushField() {
    row.push(field)
    field = ''
  }

  function pushRow() {
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ',') {
      pushField()
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1
      pushField()
      if (row.some((item) => String(item || '').trim() !== '')) {
        pushRow()
      } else {
        row = []
      }
      continue
    }

    field += char
  }

  if (field || row.length) {
    pushField()
    if (row.some((item) => String(item || '').trim() !== '')) {
      pushRow()
    }
  }

  const [header = [], ...body] = rows
  return body.map((values) =>
    Object.fromEntries(header.map((key, index) => [String(key || '').trim(), values[index] ?? '']))
  )
}

function toNumber(value, fallback = null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeKey(value, fallback) {
  return String(value || fallback || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeFoodRow(row, index) {
  const foodName = String(row.food_name || row.name || '').trim()
  if (!foodName) return null
  const brand = String(row.brand || '').trim()
  const sourceKey = String(row.source_key || '').trim() || `csv-${normalizeKey(`${foodName}-${brand}`, index)}`
  return {
    source_key: sourceKey,
    source: String(row.source || 'csv').trim() || 'csv',
    food_name: foodName,
    brand: brand || null,
    serving_label: String(row.serving_label || '1 serving').trim() || '1 serving',
    serving_size_g: toNumber(row.serving_size_g),
    calories_per_100g: toNumber(row.calories_per_100g || row.kcal_per_100g, 0),
    protein_per_100g: toNumber(row.protein_per_100g || row.protein_g, 0),
    carbs_per_100g: toNumber(row.carbs_per_100g || row.carbs_g, 0),
    fat_per_100g: toNumber(row.fat_per_100g || row.fat_g, 0),
    calories_per_serving: toNumber(row.calories_per_serving),
    protein_per_serving: toNumber(row.protein_per_serving),
    carbs_per_serving: toNumber(row.carbs_per_serving),
    fat_per_serving: toNumber(row.fat_per_serving),
    is_branded: ['1', 'true', 'yes'].includes(String(row.is_branded || '').trim().toLowerCase())
  }
}

function compareNaturalCsv(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

async function resolveCsvPaths(inputPath) {
  const fullPath = path.resolve(process.cwd(), inputPath)
  const stats = await fs.stat(fullPath)

  if (stats.isDirectory()) {
    const entries = await fs.readdir(fullPath)
    const csvFiles = entries
      .filter((name) => name.toLowerCase().endsWith('.csv'))
      .sort(compareNaturalCsv)
      .map((name) => path.join(fullPath, name))

    if (!csvFiles.length) {
      console.error(`No CSV files found in directory: ${fullPath}`)
      process.exit(1)
    }

    return csvFiles
  }

  if (!fullPath.toLowerCase().endsWith('.csv')) {
    console.error('Only a CSV file path or a directory containing CSV files is supported.')
    process.exit(1)
  }

  return [fullPath]
}

async function importCsvFile(supabase, fullPath) {
  const raw = await fs.readFile(fullPath, 'utf8')
  const parsed = parseCsv(raw)
  const rows = parsed.map(normalizeFoodRow).filter(Boolean)

  if (!rows.length) {
    console.warn(`Skipped ${path.basename(fullPath)}: no valid food rows found.`)
    return 0
  }

  const batchSize = 200
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    const { error } = await supabase.from('nutrition_foods').upsert(batch, { onConflict: 'source_key' })
    if (error) {
      console.error(`Failed to import ${path.basename(fullPath)} batch ${index / batchSize + 1}:`, error.message)
      process.exit(1)
    }
    console.log(`Imported ${path.basename(fullPath)} batch ${index / batchSize + 1} (${batch.length} rows)`)
  }

  return rows.length
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: npm run import:nutrition-foods -- ./path/to/foods.csv')
    console.error('   or: npm run import:nutrition-foods -- ./path/to/folder-with-csvs')
    process.exit(1)
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const csvPaths = await resolveCsvPaths(inputPath)
  let totalRows = 0

  for (const fullPath of csvPaths) {
    console.log(`\nImporting ${fullPath}`)
    totalRows += await importCsvFile(supabase, fullPath)
  }

  console.log(`\nImported ${totalRows} nutrition foods into nutrition_foods.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
