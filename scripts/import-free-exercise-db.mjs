import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SOURCE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_PREFIX = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

const MUSCLE_ALIASES = {
  abs: 'abs',
  abdominals: 'abs',
  obliques: 'obliques',
  chest: 'chest',
  pectorals: 'chest',
  biceps: 'biceps',
  triceps: 'triceps',
  shoulders: 'deltoids',
  deltoids: 'deltoids',
  traps: 'trapezius',
  trapezius: 'trapezius',
  lats: 'upper-back',
  back: 'upper-back',
  'middle-back': 'upper-back',
  'upper-back': 'upper-back',
  'lower-back': 'lower-back',
  glutes: 'gluteal',
  gluteals: 'gluteal',
  hamstrings: 'hamstring',
  quadriceps: 'quadriceps',
  quads: 'quadriceps',
  adductors: 'adductors',
  abductors: 'adductors',
  calves: 'calves',
  tibialis: 'tibialis',
  forearms: 'forearm',
  neck: 'neck'
}

const EQUIPMENT_ALIASES = {
  'body-only': 'bodyweight',
  bodyweight: 'bodyweight',
  none: 'bodyweight',
  dumbbell: 'dumbbell',
  dumbbells: 'dumbbell',
  barbell: 'barbell',
  'e-z-curl-bar': 'barbell',
  'ez-bar': 'barbell',
  kettlebell: 'kettlebell',
  kettlebells: 'kettlebell',
  machine: 'machine',
  'smith-machine': 'smith-machine',
  cable: 'cable',
  bands: 'bands',
  band: 'bands',
  'resistance-band': 'bands',
  'resistance-bands': 'bands',
  trx: 'trx',
  suspension: 'trx',
  stretching: 'stretching',
  yoga: 'yoga',
  cardio: 'cardio',
  recovery: 'recovery',
  'foam-roll': 'recovery',
  'foam-roller': 'recovery',
  plate: 'plate',
  plates: 'plate',
  vitruvian: 'vitruvian',
  'medicine-ball': 'medicine-ball',
  'med-ball': 'medicine-ball',
  'bosu-ball': 'bosu-ball',
  bosu: 'bosu-ball',
  'exercise-ball': 'bosu-ball',
  'stability-ball': 'bosu-ball',
  'swiss-ball': 'bosu-ball'
}

const EQUIPMENT_OVERRIDE_BY_SOURCE_ID = {
  Childs_Pose: 'yoga',
  Cat_Stretch: 'yoga',
  One_Half_Locust: 'yoga'
}

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE_URL,
    limit: 0,
    dryRun: false
  }

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (value === '--source') {
      args.source = String(argv[index + 1] || '').trim() || DEFAULT_SOURCE_URL
      index += 1
      continue
    }
    if (value === '--limit') {
      const parsed = Number(argv[index + 1] || '0')
      args.limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
      index += 1
      continue
    }
  }

  return args
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function slugify(value) {
  return normalizeToken(value).replace(/-{2,}/g, '-')
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  const output = {}
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const splitIndex = line.indexOf('=')
    if (splitIndex <= 0) continue
    const key = line.slice(0, splitIndex).trim()
    let value = line.slice(splitIndex + 1).trim()
    value = value.replace(/^['"]|['"]$/g, '')
    output[key] = value
  }
  return output
}

function getEnvValue(key, envFromFiles) {
  return process.env[key] || envFromFiles[key] || ''
}

function resolveMuscleSlug(primaryMuscles) {
  const first = Array.isArray(primaryMuscles) ? primaryMuscles[0] : ''
  const normalized = normalizeToken(first)
  return MUSCLE_ALIASES[normalized] || ''
}

function inferEquipmentFromName(name) {
  const text = normalizeToken(name)
  if (!text) return ''

  if (/barbell|axle|olympic|clean|snatch|jerk|curl-bar|ez-curl|e-z-curl/.test(text)) return 'barbell'
  if (/dumbbell/.test(text)) return 'dumbbell'
  if (/kettlebell/.test(text)) return 'kettlebell'
  if (/smith/.test(text)) return 'smith-machine'
  if (/cable/.test(text)) return 'cable'
  if (/trx|suspension|strap/.test(text)) return 'trx'
  if (/band|resistance-band|battle-rope|battling-rope/.test(text)) return 'bands'
  if (/medicine-ball|med-ball/.test(text)) return 'medicine-ball'
  if (/bosu|swiss-ball|stability-ball|exercise-ball/.test(text)) return 'bosu-ball'
  if (/foam-roll|smr|myofascial|release/.test(text)) return 'recovery'
  if (/stretch|mobility|pose/.test(text)) return 'stretching'
  if (/bike|cycle|sprint|run|jog|cardio|aerobic/.test(text)) return 'cardio'
  if (/atlas|stone|prowler|sled|yoke|farmers|farmer|plate|pinch|strongman|keg/.test(text)) return 'plate'
  if (/push-up|pull-up|chin-up|dip|lunge|plank|sit-up|burpee|mountain-climber|jump/.test(text))
    return 'bodyweight'

  return ''
}

function resolveEquipmentSlug(equipment, category, name, sourceId) {
  const override = EQUIPMENT_OVERRIDE_BY_SOURCE_ID[String(sourceId || '').trim()]
  if (override) return override

  const normalizedEquipment = normalizeToken(equipment)
  const mappedEquipment = EQUIPMENT_ALIASES[normalizedEquipment]
  if (mappedEquipment) return mappedEquipment

  const inferredByName = inferEquipmentFromName(name)
  if (inferredByName) return inferredByName

  const normalizedCategory = normalizeToken(category)
  if (normalizedCategory === 'stretching') return 'stretching'
  if (normalizedCategory === 'cardio') return 'cardio'
  if (normalizedCategory === 'plyometrics') return 'bodyweight'
  if (normalizedCategory === 'strongman') return 'plate'
  if (normalizedCategory === 'olympic-weightlifting') return 'barbell'
  if (normalizedCategory === 'powerlifting') return 'barbell'

  if (!normalizedEquipment) {
    return 'bodyweight'
  }

  if (normalizedEquipment === 'other') {
    return 'plate'
  }

  return 'bodyweight'
}

function buildMedia(images) {
  const imageList = Array.isArray(images)
    ? images
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => `${IMAGE_PREFIX}${item}`)
    : []

  return {
    source: 'yuhonas/free-exercise-db',
    sourceUrl: 'https://github.com/yuhonas/free-exercise-db',
    premiumImages: imageList,
    premiumVideos: []
  }
}

function buildNotes(item) {
  const tags = [item?.category, item?.force, item?.mechanic]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return tags.length ? `Tags: ${tags.join(' · ')}` : 'Imported from free-exercise-db'
}

async function readDataset(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error(`Failed to download dataset: HTTP ${response.status}`)
    }
    return response.json()
  }

  const absolute = path.resolve(process.cwd(), source)
  const raw = fs.readFileSync(absolute, 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const args = parseArgs(process.argv)
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const envFromFiles = {
    ...parseEnvFile(path.join(rootDir, '.env')),
    ...parseEnvFile(path.join(rootDir, '.env.local'))
  }

  const supabaseUrl = getEnvValue('VITE_SUPABASE_URL', envFromFiles)
  const serviceRoleKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY', envFromFiles)

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing env. Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role key).'
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const dataset = await readDataset(args.source)
  const list = Array.isArray(dataset) ? dataset : []
  const items = args.limit > 0 ? list.slice(0, args.limit) : list

  const [muscleRes, equipmentRes] = await Promise.all([
    supabase.from('muscles').select('id,slug,name'),
    supabase.from('equipments').select('id,slug,name')
  ])

  if (muscleRes.error) throw new Error(`Failed to load muscles: ${muscleRes.error.message}`)
  if (equipmentRes.error) throw new Error(`Failed to load equipments: ${equipmentRes.error.message}`)

  const musclesBySlug = new Map(
    (muscleRes.data || []).map((row) => [normalizeToken(row.slug || row.name), row.id])
  )
  const equipmentBySlug = new Map(
    (equipmentRes.data || []).map((row) => [normalizeToken(row.slug || row.name), row.id])
  )

  let upserted = 0
  let linked = 0
  let skippedNoMuscle = 0
  let skippedNoEquipment = 0
  let skippedInvalid = 0

  const unknownMuscles = new Set()
  const unknownEquipments = new Set()

  for (const item of items) {
    const name = String(item?.name || '').trim()
    if (!name) {
      skippedInvalid += 1
      continue
    }

    const sourceId = String(item?.id || '').trim()
    const slug = slugify(sourceId || name)
    if (!slug) {
      skippedInvalid += 1
      continue
    }

    const muscleSlug = resolveMuscleSlug(item?.primaryMuscles)
    const muscleId = musclesBySlug.get(normalizeToken(muscleSlug))
    if (!muscleId) {
      const raw = Array.isArray(item?.primaryMuscles) ? item.primaryMuscles[0] : ''
      unknownMuscles.add(String(raw || '').trim() || '(empty)')
      skippedNoMuscle += 1
      continue
    }

    const equipmentSlug = resolveEquipmentSlug(item?.equipment, item?.category, item?.name, item?.id)
    const equipmentId = equipmentBySlug.get(normalizeToken(equipmentSlug))
    if (!equipmentId) {
      unknownEquipments.add(String(item?.equipment || '').trim() || '(empty)')
      skippedNoEquipment += 1
      continue
    }

    const row = {
      name,
      slug,
      difficulty: String(item?.level || '').trim() || null,
      primary_muscle_id: muscleId,
      instructions: Array.isArray(item?.instructions) ? item.instructions : [],
      notes: buildNotes(item),
      media: buildMedia(item?.images)
    }

    if (args.dryRun) {
      upserted += 1
      linked += 1
      continue
    }

    const upsertRes = await supabase
      .from('exercises')
      .upsert(row, { onConflict: 'slug' })
      .select('id')
      .single()

    if (upsertRes.error) {
      console.error(`Skip ${slug}:`, upsertRes.error.message)
      skippedInvalid += 1
      continue
    }

    const exerciseId = upsertRes.data?.id
    if (!exerciseId) {
      skippedInvalid += 1
      continue
    }

    await supabase.from('exercise_equipments').delete().eq('exercise_id', exerciseId)
    const linkRes = await supabase
      .from('exercise_equipments')
      .upsert(
        {
          exercise_id: exerciseId,
          equipment_id: equipmentId
        },
        { onConflict: 'exercise_id,equipment_id' }
      )

    if (!linkRes.error) linked += 1
    upserted += 1
  }

  console.log('Import done.')
  console.log(`Source items: ${items.length}`)
  console.log(`Upserted exercises: ${upserted}`)
  console.log(`Linked equipment: ${linked}`)
  console.log(`Skipped (no mapped muscle): ${skippedNoMuscle}`)
  console.log(`Skipped (no mapped equipment): ${skippedNoEquipment}`)
  console.log(`Skipped (invalid): ${skippedInvalid}`)

  if (unknownMuscles.size) {
    console.log('\nUnknown primary muscles (top 20):')
    console.log([...unknownMuscles].slice(0, 20).join(', '))
  }
  if (unknownEquipments.size) {
    console.log('\nUnknown equipments (top 20):')
    console.log([...unknownEquipments].slice(0, 20).join(', '))
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
