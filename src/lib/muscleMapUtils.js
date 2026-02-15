const WRKOUT_MEDIA_HOST = 'https://wrkout-media.nyc3.digitaloceanspaces.com'
const MOJIBAKE_RE = /(Ã.|Â.|â€™|â€œ|â€|ï»¿|�)/
const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i
const MEDIA_EXT_RE = /\.(mp4|webm|ogg|mov|m4v|gif|png|jpe?g|webp|avif)(\?.*)?$/i

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch (err) {
      return value
    }
  }
  return value
}

function repairMojibake(value) {
  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff))
    return new TextDecoder('utf-8').decode(bytes)
  } catch (err) {
    return value
  }
}

export function sanitizeDisplayText(value, fallback = '') {
  if (value == null) return fallback
  let text = String(value).trim()
  if (!text) return fallback
  if (MOJIBAKE_RE.test(text)) {
    text = repairMojibake(text).trim()
  }
  text = text.replace(/\uFFFD/g, '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

export function normalizeSlug(value) {
  return sanitizeDisplayText(value)
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export function formatSlugLabel(value) {
  const slug = normalizeSlug(value)
  if (!slug) return ''
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeStringList(value) {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeStringList(item))
  }
  if (typeof value === 'object') {
    const parsedName = value.name || value.label || value.slug || value.code
    if (parsedName) return [String(parsedName)]
    return Object.values(value).flatMap((item) => normalizeStringList(item))
  }
  if (typeof value === 'string') {
    const parsed = parseMaybeJson(value)
    if (parsed !== value) return normalizeStringList(parsed)
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return [String(value)]
}

export function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDisplayText(item)).filter(Boolean)
  }
  if (typeof value === 'string') {
    const parsed = parseMaybeJson(value)
    if (parsed !== value) return normalizeList(parsed)
    return value
      .split(/\r?\n|[•·;]+/)
      .map((item) => sanitizeDisplayText(item))
      .filter(Boolean)
  }
  return []
}

export function getEquipmentList(source) {
  const list = normalizeStringList(
    source?.equipments ||
      source?.equipment ||
      source?.equipmentLabel ||
      source?.equipmentType ||
      source?.tools ||
      []
  )
    .map((item) => sanitizeDisplayText(item))
    .filter(Boolean)

  return [...new Set(list)]
}

export function getPrimaryMuscleName(source) {
  return sanitizeDisplayText(
    source?.primaryMuscle?.name ||
      source?.primaryMuscle?.slug ||
      source?.primaryMuscle ||
      source?.muscle ||
      source?.mainMuscle ||
      ''
  )
}

function collectStrings(value, bucket = []) {
  if (value == null) return bucket
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, bucket))
    return bucket
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, bucket))
    return bucket
  }
  if (typeof value === 'string') {
    const parsed = parseMaybeJson(value)
    if (parsed !== value) {
      collectStrings(parsed, bucket)
    } else {
      bucket.push(value.trim())
    }
  }
  return bucket
}

function isLikelyMediaValue(value) {
  const text = sanitizeDisplayText(value)
  if (!text) return false
  if (MEDIA_EXT_RE.test(text)) return true
  if (/wrkout-media|\/media\//i.test(text)) return true
  return false
}

function normalizeMediaUrl(value) {
  const text = sanitizeDisplayText(value)
  if (!text) return ''
  if (text.startsWith('//')) return `https:${text}`
  if (text.startsWith('/media/')) return `${WRKOUT_MEDIA_HOST}${text}`
  if (text.startsWith('media/')) return `${WRKOUT_MEDIA_HOST}/${text}`
  return text
}

function toMediaCandidates(value) {
  return [...new Set(collectStrings(value).filter((item) => isLikelyMediaValue(item)).map(normalizeMediaUrl))]
}

function inferMediaType(url) {
  return VIDEO_EXT_RE.test(url) ? 'video' : 'image'
}

function firstMediaByType(values, wantedType = null) {
  for (const value of values) {
    for (const candidate of toMediaCandidates(value)) {
      if (!wantedType || inferMediaType(candidate) === wantedType) {
        return candidate
      }
    }
  }
  return ''
}

export function resolveExerciseMedia(source) {
  const media = parseMaybeJson(source?.media)

  const explicitVideo = firstMediaByType(
    [
      source?.videoUrl,
      source?.demoVideo,
      source?.premiumVideos,
      source?.videos,
      source?.video,
      media?.premiumVideos,
      media?.videos,
      media?.video,
      media?.mp4,
      media?.webm
    ],
    'video'
  )

  const explicitImage = firstMediaByType(
    [
      source?.gifUrl,
      source?.imageUrl,
      source?.thumbnailUrl,
      source?.premiumImages,
      source?.images,
      source?.demoUrl,
      media?.premiumImages,
      media?.images,
      media?.gifs,
      media?.gif,
      media?.image,
      media?.thumbnail,
      media?.thumbnails
    ],
    'image'
  )

  const generic = firstMediaByType(
    [
      source?.mediaUrl,
      source?.media,
      source?.url,
      media?.url,
      media?.src,
      media?.media,
      source?.demoUrl
    ],
    null
  )

  let mediaUrl = explicitVideo
  if (!mediaUrl && generic && inferMediaType(generic) === 'video') {
    mediaUrl = generic
  }
  if (!mediaUrl) {
    mediaUrl = explicitImage || generic || ''
  }

  return {
    mediaUrl,
    mediaType: mediaUrl ? inferMediaType(mediaUrl) : 'image'
  }
}

export function buildExerciseView(source, options = {}) {
  if (!source) return null

  const {
    fallbackName = 'Exercise',
    fallbackInstruction = 'Select an exercise to see step-by-step cues.',
    maxInstructions = 0
  } = options

  const name = sanitizeDisplayText(source.name || source.title || source.exerciseName, fallbackName)
  const equipmentList = getEquipmentList(source)
  const equipmentLabel = equipmentList.join(', ')
  const primaryMuscle = getPrimaryMuscleName(source)
  const difficulty = sanitizeDisplayText(source.difficulty || source.level || '')
  const { mediaUrl, mediaType } = resolveExerciseMedia(source)

  let instructions = normalizeList(
    source.instructions || source.steps || source.notes || source.tips || source.cues || ''
  )
  if (maxInstructions > 0) {
    instructions = instructions.slice(0, maxInstructions)
  }
  if (!instructions.length) {
    instructions = [fallbackInstruction]
  }

  const subtitle =
    equipmentLabel || primaryMuscle ? [equipmentLabel, primaryMuscle].filter(Boolean).join(' · ') : ''

  return {
    id: source.id || source.exerciseId || source.slug || name,
    name,
    equipmentLabel,
    primaryMuscle,
    difficulty,
    instructions,
    notes: instructions,
    mediaUrl,
    mediaType,
    subtitle,
    raw: source
  }
}
