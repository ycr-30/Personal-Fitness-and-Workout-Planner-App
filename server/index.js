import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import appleSignin from 'apple-signin-auth'
import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import 'dotenv/config'

const {
  PORT = 4000,
  APP_ORIGIN = 'http://localhost:5173',
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  APPLE_CLIENT_ID,
  APPLE_TEAM_ID,
  APPLE_KEY_ID,
  APPLE_PRIVATE_KEY,
  APPLE_REDIRECT_URI,
  SUPABASE_URL = '',
  SUPABASE_SERVICE_ROLE_KEY = '',
  AI_CHAT_API_URL = '',
  AI_CHAT_API_KEY = '',
  AI_CHAT_API_FORMAT = 'custom',
  AI_CHAT_MODEL = '',
  AI_CHAT_SYSTEM_PROMPT = '',
  AI_CHAT_TEMPERATURE = '0.2',
  AI_CHAT_MAX_TOKENS = '700',
  AI_CHAT_TIMEOUT_MS = '25000',
  AI_EMBEDDING_API_URL = '',
  AI_EMBEDDING_API_KEY = '',
  AI_EMBEDDING_API_FORMAT = 'openai',
  AI_EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5',
  AI_EMBEDDING_TIMEOUT_MS = '12000',
  RAG_EMBED_DIM = '768',
  RAG_MATCH_COUNT = '8',
  RAG_MATCH_THRESHOLD = '0.6',
  RAG_CONTEXT_ITEMS = '6',
  RAG_CONTEXT_MAX_CHARS = '3000',
  RAG_SOURCE_TYPES = '',
  JWT_SECRET = 'replace-me'
} = process.env

const app = express()
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
const secureCookie = process.env.NODE_ENV === 'production'
const MAX_CHAT_MESSAGE_LENGTH = 2000
const MAX_CHAT_HISTORY_ITEMS = 200
const MAX_MODEL_HISTORY_ITEMS = 12
const parsedRagEmbedDim = Number.parseInt(RAG_EMBED_DIM, 10)
const parsedRagMatchCount = Number.parseInt(RAG_MATCH_COUNT, 10)
const parsedRagContextItems = Number.parseInt(RAG_CONTEXT_ITEMS, 10)
const parsedRagContextMaxChars = Number.parseInt(RAG_CONTEXT_MAX_CHARS, 10)
const parsedChatMaxTokens = Number.parseInt(AI_CHAT_MAX_TOKENS, 10)
const parsedChatTemperature = Number.parseFloat(AI_CHAT_TEMPERATURE)
const parsedChatTimeoutMs = Number.parseInt(AI_CHAT_TIMEOUT_MS, 10)
const parsedEmbeddingTimeoutMs = Number.parseInt(AI_EMBEDDING_TIMEOUT_MS, 10)

const RAG_EMBEDDING_DIMENSION = Number.isInteger(parsedRagEmbedDim) && parsedRagEmbedDim > 0 ? parsedRagEmbedDim : 768
const RAG_RETRIEVAL_COUNT =
  Number.isInteger(parsedRagMatchCount) && parsedRagMatchCount > 0 ? Math.min(parsedRagMatchCount, 20) : 8
const RAG_CONTEXT_ITEM_COUNT =
  Number.isInteger(parsedRagContextItems) && parsedRagContextItems > 0
    ? Math.min(parsedRagContextItems, 12)
    : 6
const RAG_CONTEXT_CHARACTER_LIMIT =
  Number.isInteger(parsedRagContextMaxChars) && parsedRagContextMaxChars > 500
    ? Math.min(parsedRagContextMaxChars, 12000)
    : 3000
const CHAT_MODEL_MAX_TOKENS =
  Number.isInteger(parsedChatMaxTokens) && parsedChatMaxTokens > 50 ? Math.min(parsedChatMaxTokens, 2000) : 700
const CHAT_MODEL_TEMPERATURE =
  Number.isFinite(parsedChatTemperature) && parsedChatTemperature >= 0 && parsedChatTemperature <= 2
    ? parsedChatTemperature
    : 0.2
const CHAT_REQUEST_TIMEOUT_MS =
  Number.isInteger(parsedChatTimeoutMs) && parsedChatTimeoutMs >= 2000
    ? Math.min(parsedChatTimeoutMs, 120000)
    : 25000
const EMBEDDING_REQUEST_TIMEOUT_MS =
  Number.isInteger(parsedEmbeddingTimeoutMs) && parsedEmbeddingTimeoutMs >= 1000
    ? Math.min(parsedEmbeddingTimeoutMs, 60000)
    : 12000
const RAG_DEFAULT_THRESHOLD = (() => {
  const parsed = Number.parseFloat(RAG_MATCH_THRESHOLD)
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed
  return 0.6
})()
const RAG_SOURCE_TYPE_FILTERS = String(RAG_SOURCE_TYPES || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const PRODUCT_HELP_DOCS = [
  {
    id: 'chat_loading_failed',
    title: 'Fix: Failed to load conversations',
    keywords: ['failed to load conversations', 'load conversations', 'chat not loading', 'conversation error'],
    answer:
      'If chat cannot load conversations: 1) ensure backend is running on the correct port (usually localhost:4000), 2) sign in again so session cookie is valid, 3) check DATABASE_URL points to the same Supabase project, 4) verify AiChatConversation and AiChatMessage tables exist in public schema.'
  },
  {
    id: 'port_in_use',
    title: 'Fix: Port 4000 already in use',
    keywords: ['address already in use', 'eaddrinuse', 'port 4000', 'port conflict'],
    answer:
      'If port 4000 is already in use: run lsof -nP -iTCP:4000 -sTCP:LISTEN, then kill the PID, and restart backend from Fitness-project/server with npm run dev.'
  },
  {
    id: 'chat_sources_behavior',
    title: 'Why chat shows retrieval fallback',
    keywords: ['fallback response', 'model endpoint not connected', 'why same answer', 'retrieval fallback'],
    answer:
      'Retrieval fallback means RAG is working but model API is not configured. Set AI_CHAT_API_URL (and key if needed) to enable model generation. Without model endpoint, assistant uses retrieved knowledge snippets and template fallback.'
  },
  {
    id: 'rag_data_scope',
    title: 'What data powers the assistant',
    keywords: ['which data', 'rag data', 'knowledge base', 'what dataset'],
    answer:
      'Current knowledge comes from rag_chunks/rag_documents, including exercise_db, usda, cofid, uk_guideline, nhs, and openfoodfacts. Conversation history is stored separately in AiChatConversation and AiChatMessage.'
  },
  {
    id: 'safety_scope',
    title: 'Safety scope and limitations',
    keywords: ['medical advice', 'injury', 'pain', 'safe', 'limitation'],
    answer:
      'This coach provides general fitness guidance only, not diagnosis or medical treatment. Stop exercise if sharp pain appears, reduce load, and consult a qualified clinician for injury symptoms.'
  },
  {
    id: 'deployment_sync',
    title: 'Deploy after local development',
    keywords: ['deploy', 'production', 'github', 'sync', 'release'],
    answer:
      'Typical release flow: verify locally (frontend + backend), push to GitHub, set production env vars (database and AI endpoints), run migrations on production database, then deploy frontend and backend.'
  }
]
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const USERNAME_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/
const LEGACY_VERIFICATION_TTL_MS = 10 * 60 * 1000
const scryptAsync = promisify(scrypt)

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl
  try {
    const parsed = new URL(rawUrl)
    const schema = parsed.searchParams.get('schema')
    // Some malformed URLs accidentally set schema to query fragments
    // (for example "apppgbouncer=true"), which breaks Prisma table lookup.
    if (!schema || /pgbouncer|connection_limit|sslmode/i.test(schema)) {
      parsed.searchParams.set('schema', 'public')
    }
    return parsed.toString()
  } catch {
    return rawUrl
  }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL)
if (normalizedDatabaseUrl && normalizedDatabaseUrl !== process.env.DATABASE_URL) {
  console.warn('DATABASE_URL schema was normalized to public')
}

const prisma = new PrismaClient(
  normalizedDatabaseUrl
    ? {
        datasources: {
          db: {
            url: normalizedDatabaseUrl
          }
        }
      }
    : undefined
)

function normalizeOptionalText(value) {
  const text = String(value || '').trim()
  return text || null
}

function normalizeLocalAccount(value) {
  return String(value || '').trim()
}

function normalizeAccountKey(value) {
  return normalizeLocalAccount(value).toLowerCase()
}

function normalizeOptionalEmail(value) {
  const text = String(value || '').trim().toLowerCase()
  return text || null
}

function normalizeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIsoString(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function hashVerificationCode(code) {
  return createHash('sha256').update(String(code || '')).digest('hex')
}

async function hashPasswordSecret(password, salt = randomBytes(16).toString('hex')) {
  const derived = await scryptAsync(String(password || ''), salt, 64)
  return {
    salt,
    hash: Buffer.from(derived).toString('hex')
  }
}

async function verifyPasswordSecret(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const derived = await scryptAsync(String(password || ''), String(salt), 64)
  const actual = Buffer.from(derived).toString('hex')
  const actualBuffer = Buffer.from(actual, 'hex')
  const expectedBuffer = Buffer.from(String(expectedHash), 'hex')
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

function createVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function normalizeLocalRegistrationPayload(payload = {}) {
  const account = normalizeLocalAccount(payload.account)
  const accountKey = normalizeAccountKey(account)
  const accountIsEmail = EMAIL_PATTERN.test(account)
  const email = normalizeOptionalEmail(payload.email) || (accountIsEmail ? accountKey : null)
  const name = normalizeOptionalText(payload.name)
  const password = String(payload.password || '')
  const sex = String(payload.sex || '').trim().toLowerCase() === 'male' ? 'male' : 'female'
  const birthday = normalizeOptionalText(payload.birthday)
  const height = normalizeNumber(payload.height)
  const weight = normalizeNumber(payload.weight)
  const avatar = normalizeOptionalText(payload.avatarData || payload.avatar)

  if (!account || (!accountIsEmail && !USERNAME_PATTERN.test(account))) {
    throw new Error('Please enter a valid account or email.')
  }
  if (!name) {
    throw new Error('Name is required.')
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }
  if (!birthday) {
    throw new Error('Birthday is required.')
  }
  if (!height || !weight) {
    throw new Error('Height and weight must be valid numbers.')
  }

  return {
    account,
    accountKey,
    email,
    name,
    password,
    sex,
    birthday,
    height,
    weight,
    avatar
  }
}

function buildLocalSessionUser(user, localAccount = null) {
  if (!user) return null
  const account = localAccount?.account || user.username || user.email || ''
  return {
    id: user.id,
    sub: `${user.provider}:${user.providerId}`,
    email: user.email || null,
    name: user.name || null,
    provider: user.provider,
    username: user.username || null,
    account,
    avatar: user.avatar || null,
    sex: user.sex || null,
    birthday: toIsoString(user.birthday),
    height: user.heightCm ?? null,
    weight: user.weightKg ?? null,
    onboardingCompleted: !!user.onboardingCompleted,
    onboardingAnswers: user.onboardingAnswers ?? null
  }
}

async function findLegacyLocalAccountByIdentifier(identifier) {
  const lookup = normalizeAccountKey(identifier)
  if (!lookup) return null

  const rows = await prisma.$queryRawUnsafe(
    `
      select
        a.id::text as credential_id,
        a.account,
        a.account_key,
        a.email,
        a.password_hash,
        a.password_salt,
        u.id as user_id,
        u.provider,
        u."providerId" as provider_id,
        u.email as user_email,
        u.name,
        u.username,
        u.avatar,
        u.sex,
        u.birthday,
        u."heightCm" as height_cm,
        u."weightKg" as weight_kg,
        u."onboardingCompleted" as onboarding_completed,
        u."onboardingAnswers" as onboarding_answers
      from public.legacy_local_auth_accounts a
      join public."User" u on u.id = a.user_id
      where a.account_key = $1
         or lower(coalesce(a.email, '')) = $1
      limit 1
    `,
    lookup
  )

  return rows?.[0] || null
}

async function localAccountExists({ accountKey, email }) {
  const rawAccount = normalizeLocalAccount(accountKey)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedEmail = normalizeOptionalEmail(email)
  const localRows = await prisma.$queryRawUnsafe(
    `
      select id::text as id
      from public.legacy_local_auth_accounts
      where account_key = $1
         or ($2::text is not null and lower(coalesce(email, '')) = $2)
      limit 1
    `,
    normalizedAccountKey,
    normalizedEmail
  )
  if (localRows?.length) return true

  const existingRows = await prisma.$queryRawUnsafe(
    `
      select id
      from public."User"
      where ($1::text is not null and lower(coalesce(email, '')) = $1)
         or ($2::text is not null and lower(coalesce(username, '')) = lower($2))
      limit 1
    `,
    normalizedEmail,
    EMAIL_PATTERN.test(rawAccount) ? null : rawAccount
  )
  return !!existingRows?.length
}

async function loadLatestVerification(accountKey) {
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  if (!normalizedAccountKey) return null
  const rows = await prisma.$queryRawUnsafe(
    `
      select *
      from public.legacy_local_auth_verifications
      where account_key = $1
        and consumed_at is null
      order by created_at desc
      limit 1
    `,
    normalizedAccountKey
  )
  return rows?.[0] || null
}

async function resolveClientStateIdentity(req) {
  const accessToken = getBearerToken(req)
  if (accessToken) {
    const authUser = await getSupabaseAuthUser(accessToken)
    return {
      type: 'supabase',
      serverUserId: null,
      supabaseUserId: String(authUser.id || ''),
      accountLabel: authUser.email || 'Connected account'
    }
  }

  const sessionUser = getSessionUserFromRequest(req)
  if (sessionUser?.id) {
    return {
      type: 'server',
      serverUserId: Number(sessionUser.id),
      supabaseUserId: null,
      accountLabel: sessionUser.email || sessionUser.username || sessionUser.name || 'Current user'
    }
  }

  const error = new Error('No authenticated account session was found.')
  error.statusCode = 401
  throw error
}

async function findClientStateEntries({ identity, scope, deviceId = null, keys = [] }) {
  const scopeValue = scope === 'user' ? 'user' : 'device'
  const normalizedDeviceId = scopeValue === 'device' ? String(deviceId || '').trim() : null
  const normalizedKeys = keys.map((item) => String(item || '').trim()).filter(Boolean)

  let query = `
    select state_key, state_value, scope, device_id, updated_at
    from public.user_client_state
    where scope = $1
  `
  const params = [scopeValue]
  let nextIndex = 2

  if (identity.type === 'server') {
    query += ` and server_user_id = $${nextIndex}`
    params.push(identity.serverUserId)
    nextIndex += 1
  } else {
    query += ` and supabase_user_id = $${nextIndex}::uuid`
    params.push(identity.supabaseUserId)
    nextIndex += 1
  }

  if (scopeValue === 'device') {
    query += ` and device_id = $${nextIndex}`
    params.push(normalizedDeviceId)
    nextIndex += 1
  }

  if (normalizedKeys.length) {
    query += ` and state_key = any($${nextIndex}::text[])`
    params.push(normalizedKeys)
    nextIndex += 1
  }

  query += ' order by updated_at desc'
  return prisma.$queryRawUnsafe(query, ...params)
}

async function upsertClientStateEntry(identity, entry) {
  const scopeValue = entry.scope === 'user' ? 'user' : 'device'
  const deviceId = scopeValue === 'device' ? String(entry.deviceId || '').trim() : null
  const stateKey = String(entry.stateKey || '').trim()
  const stateValue = entry.stateValue ?? null

  if (!stateKey) {
    throw new Error('State key is required.')
  }
  if (scopeValue === 'device' && !deviceId) {
    throw new Error('Device id is required for device-scoped state.')
  }

  let selectQuery = `
    select id::text as id
    from public.user_client_state
    where scope = $1
      and state_key = $2
  `
  const selectParams = [scopeValue, stateKey]
  let nextIndex = 3

  if (identity.type === 'server') {
    selectQuery += ` and server_user_id = $${nextIndex}`
    selectParams.push(identity.serverUserId)
    nextIndex += 1
  } else {
    selectQuery += ` and supabase_user_id = $${nextIndex}::uuid`
    selectParams.push(identity.supabaseUserId)
    nextIndex += 1
  }

  if (scopeValue === 'device') {
    selectQuery += ` and device_id = $${nextIndex}`
    selectParams.push(deviceId)
  }

  const existingRows = await prisma.$queryRawUnsafe(selectQuery, ...selectParams)
  const existingId = existingRows?.[0]?.id || ''

  if (existingId) {
    const updatedRows = await prisma.$queryRawUnsafe(
      `
        update public.user_client_state
        set state_value = $2::jsonb,
            updated_at = now()
        where id = $1::uuid
        returning state_key, state_value, scope, device_id, updated_at
      `,
      existingId,
      JSON.stringify(stateValue)
    )
    return updatedRows?.[0] || null
  }

  const insertedRows = await prisma.$queryRawUnsafe(
    `
      insert into public.user_client_state
        (server_user_id, supabase_user_id, scope, device_id, state_key, state_value)
      values
        ($1, $2::uuid, $3, $4, $5, $6::jsonb)
      returning state_key, state_value, scope, device_id, updated_at
    `,
    identity.type === 'server' ? identity.serverUserId : null,
    identity.type === 'supabase' ? identity.supabaseUserId : null,
    scopeValue,
    deviceId,
    stateKey,
    JSON.stringify(stateValue)
  )

  return insertedRows?.[0] || null
}

async function hydrateServerUserPayloadFromSession(decoded) {
  if (!decoded?.id) return null
  const user = await findUserById(Number(decoded.id))
  if (!user) return null
  let localAccount = null
  if (user.provider === 'local') {
    const account = await prisma.$queryRawUnsafe(
      `
        select account, account_key, email
        from public.legacy_local_auth_accounts
        where user_id = $1
        limit 1
      `,
      user.id
    )
    localAccount = account?.[0] || null
  }
  return buildLocalSessionUser(user, localAccount)
}

function resolveRedirectTarget(raw) {
  if (!raw || typeof raw !== 'string') return null
  let candidate = raw
  try {
    candidate = decodeURIComponent(raw)
  } catch (err) {
    candidate = raw
  }
  if (candidate.startsWith('/')) return `${APP_ORIGIN}${candidate}`
  try {
    const url = new URL(candidate)
    if (url.origin === APP_ORIGIN) return url.toString()
  } catch (err) {
    return null
  }
  return null
}

app.use(
  cors({
    origin: APP_ORIGIN,
    credentials: true
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000, timeoutLabel = 'Request') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${timeoutLabel} timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function normalizeListParam(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatExercisePayload(exercise) {
  const equipments = exercise.equipments?.map((item) => item.equipment?.name).filter(Boolean) || []
  return {
    id: exercise.id,
    name: exercise.name,
    slug: exercise.slug,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions,
    notes: exercise.notes,
    media: exercise.media,
    primaryMuscle: exercise.primaryMuscle
      ? {
          id: exercise.primaryMuscle.id,
          name: exercise.primaryMuscle.name,
          slug: exercise.primaryMuscle.slug,
          regionId: exercise.primaryMuscle.regionId,
          side: exercise.primaryMuscle.side
        }
      : null,
    equipments
  }
}

app.get('/api/muscles', async (req, res) => {
  try {
    const muscles = await prisma.muscle.findMany({ orderBy: { name: 'asc' } })
    res.json(
      muscles.map((muscle) => ({
        id: muscle.id,
        name: muscle.name,
        slug: muscle.slug,
        side: muscle.side,
        regionId: muscle.regionId
      }))
    )
  } catch (err) {
    console.error('Failed to load muscles', err)
    res.status(500).json({ error: 'Failed to load muscles' })
  }
})

app.get('/api/equipments', async (req, res) => {
  try {
    const equipments = await prisma.equipment.findMany({ orderBy: { name: 'asc' } })
    res.json(
      equipments.map((equipment) => ({
        id: equipment.id,
        name: equipment.name,
        slug: equipment.slug
      }))
    )
  } catch (err) {
    console.error('Failed to load equipments', err)
    res.status(500).json({ error: 'Failed to load equipments' })
  }
})

app.get('/api/exercises', async (req, res) => {
  try {
    const muscle = typeof req.query.muscle === 'string' ? req.query.muscle.trim() : ''
    const equipmentFilters = normalizeListParam(req.query.equipments)
    const muscleId = Number(muscle)

    const where = {}
    if (muscle) {
      where.OR = [
        { primaryMuscle: { slug: muscle } },
        { primaryMuscle: { name: { equals: muscle, mode: 'insensitive' } } }
      ]
      if (Number.isFinite(muscleId) && muscleId > 0) {
        where.OR.push({ primaryMuscleId: muscleId })
      }
    }

    if (equipmentFilters.length) {
      where.equipments = {
        some: {
          equipment: {
            OR: [
              { slug: { in: equipmentFilters } },
              { name: { in: equipmentFilters } }
            ]
          }
        }
      }
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        primaryMuscle: true,
        equipments: {
          include: { equipment: true }
        }
      }
    })

    res.json(exercises.map((exercise) => formatExercisePayload(exercise)))
  } catch (err) {
    console.error('Failed to load exercises', err)
    res.status(500).json({ error: 'Failed to load exercises' })
  }
})

app.get('/api/exercises/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid exercise id' })
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        primaryMuscle: true,
        equipments: {
          include: { equipment: true }
        }
      }
    })
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' })
    res.json({
      ...formatExercisePayload(exercise),
      instructions: exercise.instructions
    })
  } catch (err) {
    console.error('Failed to load exercise detail', err)
    res.status(500).json({ error: 'Failed to load exercise detail' })
  }
})

function issueSession(user) {
  return jwt.sign(
    {
      id: user.id,
      sub: user.sub,
      email: user.email,
      name: user.name,
      provider: user.provider,
      username: user.username || null,
      onboardingCompleted: user.onboardingCompleted || false
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function setSessionCookie(res, token) {
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/'
  })
}

function clearSessionCookie(res) {
  res.clearCookie('session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: '/'
  })
}

async function findUserById(id) {
  return prisma.user.findUnique({ where: { id } })
}

function requireAuth(req, res, next) {
  const token = req.cookies.session
  if (!token) return res.status(401).json({ error: 'No session' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.session = decoded
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Session invalid' })
  }
}

function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || '')
  if (!authHeader.toLowerCase().startsWith('bearer ')) return ''
  return authHeader.slice(7).trim()
}

function getSessionUserFromRequest(req) {
  const token = req.cookies.session
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

async function getSupabaseAuthUser(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin environment variables are missing on the server.')
  }
  if (!accessToken) {
    const error = new Error('Missing Supabase access token.')
    error.statusCode = 401
    throw error
  }

  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    },
    15000,
    'Supabase user lookup'
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.id) {
    const error = new Error(payload?.msg || payload?.error_description || payload?.error || 'Supabase session is invalid.')
    error.statusCode = response.status || 401
    throw error
  }
  return payload
}

async function deleteServerSideAccountData({ userId = null, email = '' } = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  let existingUser = null

  if (userId) {
    existingUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })
  }

  if (!existingUser && normalizedEmail) {
    existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail
      }
    })
  }

  if (!existingUser) return
  await prisma.user.delete({
    where: {
      id: existingUser.id
    }
  })
}

function isMissingRelationError(error) {
  const message = String(error?.message || '')
  return /relation .* does not exist/i.test(message) || /42P01/.test(message)
}

async function deleteSupabaseBusinessData(userId) {
  if (!userId) return
  const cleanupQueries = [
    'DELETE FROM public.user_onboarding_answers WHERE user_id = $1::uuid',
    'DELETE FROM public.user_profiles WHERE user_id = $1::uuid',
    'DELETE FROM public.user_app_settings WHERE user_id = $1::uuid',
    'DELETE FROM public.user_client_state WHERE supabase_user_id = $1::uuid',
    'DELETE FROM public.user_nutrition_goals WHERE user_id = $1::uuid',
    'DELETE FROM public.meal_entries WHERE user_id = $1::uuid',
    'DELETE FROM public.water_entries WHERE user_id = $1::uuid',
    'DELETE FROM public.user_plans WHERE user_id = $1::uuid',
    'DELETE FROM public.workout_entries WHERE user_id = $1::uuid',
    'DELETE FROM public.rest_day_entries WHERE user_id = $1::uuid'
  ]

  for (const query of cleanupQueries) {
    try {
      await prisma.$executeRawUnsafe(query, userId)
    } catch (error) {
      if (isMissingRelationError(error)) continue
      throw error
    }
  }
}

async function lookupSupabaseAuthUserIdByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return ''

  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT id::text AS id FROM auth.users WHERE lower(email) = $1 LIMIT 1',
      normalizedEmail
    )
    return rows?.[0]?.id || ''
  } catch (error) {
    if (isMissingRelationError(error)) return ''
    throw error
  }
}

async function deleteSupabaseAuthUser(userId) {
  if (!userId) return
  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    },
    15000,
    'Supabase auth delete'
  )

  if (response.status === 404) return
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error || 'Failed to delete auth user.')
  }
}

function normalizeConversationId(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function normalizeMessageText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function buildConversationTitle(raw) {
  const normalized = normalizeMessageText(raw).replace(/\s+/g, ' ')
  if (!normalized) return 'New chat'
  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized
}

function normalizeMessageRole(value) {
  if (value === 'assistant' || value === 'system') return value
  return 'user'
}

function normalizeAppStatePayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  return {
    planState: source.planState && typeof source.planState === 'object' ? source.planState : null,
    workoutLogs: Array.isArray(source.workoutLogs) ? source.workoutLogs : [],
    restDays: Array.isArray(source.restDays) ? source.restDays : []
  }
}

function extractAssistantContent(payload) {
  if (!payload || typeof payload !== 'object') return ''

  if (typeof payload.content === 'string' && payload.content.trim()) {
    return payload.content.trim()
  }

  if (typeof payload.reply === 'string' && payload.reply.trim()) {
    return payload.reply.trim()
  }

  if (typeof payload.output === 'string' && payload.output.trim()) {
    return payload.output.trim()
  }

  const firstChoice = payload.choices?.[0]
  const choiceMessageContent = firstChoice?.message?.content
  if (typeof choiceMessageContent === 'string' && choiceMessageContent.trim()) {
    return choiceMessageContent.trim()
  }

  if (Array.isArray(choiceMessageContent)) {
    const merged = choiceMessageContent
      .map((item) => item?.text || '')
      .join('\n')
      .trim()
    if (merged) return merged
  }

  return ''
}

function extractEmbeddingVector(payload) {
  if (!payload || typeof payload !== 'object') return null
  if (Array.isArray(payload.embedding)) return payload.embedding
  if (Array.isArray(payload.vector)) return payload.vector
  const dataVector = payload.data?.[0]?.embedding
  if (Array.isArray(dataVector)) return dataVector
  return null
}

function normalizeEmbeddingVector(raw) {
  if (!Array.isArray(raw)) return null
  if (raw.length !== RAG_EMBEDDING_DIMENSION) return null
  const normalized = raw.map((value) => Number(value))
  if (normalized.some((value) => !Number.isFinite(value))) return null
  return normalized
}

function vectorToSqlLiteral(values) {
  return `[${values.map((value) => Number(value).toFixed(8)).join(',')}]`
}

function normalizeRagChunkRow(row) {
  const similarity = Number(row?.similarity)
  return {
    chunkId: Number(row?.chunk_id),
    documentId: String(row?.document_id || ''),
    title: String(row?.title || 'Untitled source'),
    sourceType: String(row?.source_type || 'unknown'),
    sourceUri: row?.source_uri ? String(row.source_uri) : '',
    chunkText: normalizeMessageText(row?.chunk_text || ''),
    similarity: Number.isFinite(similarity) ? similarity : 0
  }
}

function buildProductHelpChunks(queryText) {
  const normalizedQuery = normalizeMessageText(queryText).toLowerCase()
  if (!normalizedQuery) return []

  const scored = []
  for (const entry of PRODUCT_HELP_DOCS) {
    let score = 0
    for (const keyword of entry.keywords) {
      const normalizedKeyword = String(keyword || '').trim().toLowerCase()
      if (!normalizedKeyword) continue
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += normalizedKeyword.includes(' ') ? 0.36 : 0.18
      }
    }
    if (score <= 0) continue
    scored.push({
      chunkId: -1,
      documentId: `help:${entry.id}`,
      title: entry.title,
      sourceType: 'product_help',
      sourceUri: '',
      chunkText: entry.answer,
      similarity: Math.min(score, 0.99)
    })
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, 2)
}

function mergeRetrievedChunks(primaryChunks, secondaryChunks) {
  const merged = []
  const seen = new Set()
  for (const chunk of [...(secondaryChunks || []), ...(primaryChunks || [])]) {
    const key = `${chunk.sourceType}::${chunk.title}::${chunk.chunkText.slice(0, 120)}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(chunk)
  }
  return merged.sort((a, b) => b.similarity - a.similarity)
}

function extractRetrievedChunkIds(ragChunks) {
  const ids = []
  for (const chunk of ragChunks || []) {
    const chunkId = Number(chunk?.chunkId)
    if (!Number.isInteger(chunkId) || chunkId <= 0) continue
    ids.push(chunkId)
  }
  return [...new Set(ids)]
}

function toPgBigIntArrayLiteral(values) {
  if (!Array.isArray(values) || !values.length) return '{}'
  return `{${values.join(',')}}`
}

function formatRagSources(ragChunks) {
  const seen = new Set()
  const lines = []
  for (const chunk of ragChunks) {
    const key = `${chunk.sourceType}::${chunk.title}`
    if (seen.has(key)) continue
    seen.add(key)
    if (chunk.sourceUri) {
      lines.push(`- [${chunk.sourceType}] ${chunk.title} (${chunk.sourceUri})`)
    } else {
      lines.push(`- [${chunk.sourceType}] ${chunk.title}`)
    }
    if (lines.length >= 5) break
  }
  return lines
}

function appendSourcesBlock(content, ragChunks) {
  const body = normalizeMessageText(content)
  const sources = formatRagSources(ragChunks)
  if (!sources.length) return body
  return `${body}\n\nSources:\n${sources.join('\n')}`
}

function buildRagContextText(ragChunks) {
  const selected = ragChunks.slice(0, RAG_CONTEXT_ITEM_COUNT)
  if (!selected.length) return ''

  const segments = []
  let totalChars = 0
  for (const chunk of selected) {
    const snippet = chunk.chunkText.replace(/\s+/g, ' ').slice(0, 450)
    const segment = `[${chunk.sourceType}] ${chunk.title}\n${snippet}`
    if (totalChars + segment.length > RAG_CONTEXT_CHARACTER_LIMIT) break
    segments.push(segment)
    totalChars += segment.length
  }
  return segments.join('\n\n')
}

function buildUserProfileText(user) {
  const profileBits = []
  if (user?.sex) profileBits.push(`sex=${user.sex}`)
  if (Number.isFinite(Number(user?.heightCm))) profileBits.push(`height_cm=${Number(user.heightCm)}`)
  if (Number.isFinite(Number(user?.weightKg))) profileBits.push(`weight_kg=${Number(user.weightKg)}`)
  if (!profileBits.length) return ''
  return `User profile: ${profileBits.join(', ')}`
}

function buildFallbackAssistantReply({ userMessage, user, ragChunks }) {
  const name = user?.name || 'there'
  const helpChunks = (ragChunks || []).filter((chunk) => chunk.sourceType === 'product_help')
  if (helpChunks.length) {
    const helpBody = helpChunks
      .map((chunk, index) => `${index + 1}. ${chunk.chunkText}`)
      .join('\n\n')
    return appendSourcesBlock(
      `Hi ${name}. I found a product usage answer for your question.\n\n${helpBody}\n\nIf this still does not solve the issue, share your exact error message and I will guide you step by step.`,
      ragChunks
    )
  }

  if (!ragChunks.length) {
    const safeSnippet = userMessage.slice(0, 140)
    return `Hi ${name}. I saved your message: "${safeSnippet}". The model endpoint is not connected yet, and I also could not run semantic retrieval. Ask a specific training, nutrition, recovery, or app-usage question and I will provide a structured troubleshooting or coaching answer.`
  }

  const topFindings = ragChunks.slice(0, 3).map((chunk, index) => {
    const snippet = chunk.chunkText.replace(/\s+/g, ' ').slice(0, 180)
    return `${index + 1}. ${snippet}`
  })
  const base = [
    `Hi ${name}. I found relevant knowledge for your question and used retrieval fallback (model endpoint not connected).`,
    '',
    'Key findings:',
    ...topFindings,
    '',
    'If you share your goal, training days per week, and equipment, I can convert this into a structured workout + nutrition plan.'
  ].join('\n')
  return appendSourcesBlock(base, ragChunks)
}

function resolveEmbeddingEndpoint() {
  const explicit = String(AI_EMBEDDING_API_URL || '').trim()
  if (explicit) return explicit

  const chatEndpoint = String(AI_CHAT_API_URL || '').trim()
  const chatFormat = String(AI_CHAT_API_FORMAT || 'custom').trim().toLowerCase()
  if (chatFormat !== 'openai' || !chatEndpoint) return ''
  if (chatEndpoint.endsWith('/chat/completions')) {
    return chatEndpoint.replace(/\/chat\/completions$/, '/embeddings')
  }
  return ''
}

async function requestQueryEmbedding(queryText) {
  const endpoint = resolveEmbeddingEndpoint()
  if (!endpoint) return null

  const headers = { 'Content-Type': 'application/json' }
  const authToken = String(AI_EMBEDDING_API_KEY || AI_CHAT_API_KEY || '').trim()
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const embeddingFormat = String(AI_EMBEDDING_API_FORMAT || 'openai').trim().toLowerCase()
  const requestBody =
    embeddingFormat === 'openai'
      ? {
          input: queryText,
          model: AI_EMBEDDING_MODEL
        }
      : {
          input: queryText,
          text: queryText,
          model: AI_EMBEDDING_MODEL
        }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    },
    EMBEDDING_REQUEST_TIMEOUT_MS,
    'Embedding request'
  )
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Embedding endpoint error: ${response.status}`)
  }

  const payload = await response.json()
  const embedding = normalizeEmbeddingVector(extractEmbeddingVector(payload))
  if (!embedding) {
    throw new Error(
      `Embedding response invalid. Expected dimension=${RAG_EMBEDDING_DIMENSION} from model=${AI_EMBEDDING_MODEL}.`
    )
  }
  return embedding
}

async function retrieveRagChunksByKeyword(queryText) {
  const normalizedQuery = normalizeMessageText(queryText)
  if (!normalizedQuery) return []

  try {
    if (RAG_SOURCE_TYPE_FILTERS.length) {
      const rows = await prisma.$queryRawUnsafe(
        `
          select
            c.id as chunk_id,
            c.document_id,
            d.title,
            d.source_type,
            d.source_uri,
            c.chunk_text,
            c.metadata,
            ts_rank_cd(to_tsvector('english', c.chunk_text), plainto_tsquery('english', $1))::float as similarity
          from public.rag_chunks c
          join public.rag_documents d on d.id = c.document_id
          where to_tsvector('english', c.chunk_text) @@ plainto_tsquery('english', $1)
            and d.source_type = any($2::text[])
          order by similarity desc
          limit $3;
        `,
        normalizedQuery,
        RAG_SOURCE_TYPE_FILTERS,
        RAG_RETRIEVAL_COUNT
      )
      return Array.isArray(rows) ? rows.map((row) => normalizeRagChunkRow(row)) : []
    }

    const rows = await prisma.$queryRawUnsafe(
      `
        select
          c.id as chunk_id,
          c.document_id,
          d.title,
          d.source_type,
          d.source_uri,
          c.chunk_text,
          c.metadata,
          ts_rank_cd(to_tsvector('english', c.chunk_text), plainto_tsquery('english', $1))::float as similarity
        from public.rag_chunks c
        join public.rag_documents d on d.id = c.document_id
        where to_tsvector('english', c.chunk_text) @@ plainto_tsquery('english', $1)
        order by similarity desc
        limit $2;
      `,
      normalizedQuery,
      RAG_RETRIEVAL_COUNT
    )
    return Array.isArray(rows) ? rows.map((row) => normalizeRagChunkRow(row)) : []
  } catch (error) {
    console.error('Keyword retrieval failed', error?.message || error)
    return []
  }
}

async function retrieveRagChunks(queryText) {
  try {
    const embedding = await requestQueryEmbedding(queryText)
    if (!embedding) return retrieveRagChunksByKeyword(queryText)

    const vectorLiteral = vectorToSqlLiteral(embedding)
    const filter =
      RAG_SOURCE_TYPE_FILTERS.length === 1
        ? { source_type: RAG_SOURCE_TYPE_FILTERS[0] }
        : {}

    const rows = await prisma.$queryRawUnsafe(
      `
        select chunk_id, document_id, title, source_type, source_uri, chunk_text, metadata, similarity
        from public.match_rag_chunks(
          $1::vector(${RAG_EMBEDDING_DIMENSION}),
          $2::int,
          $3::float,
          $4::jsonb
        );
      `,
      vectorLiteral,
      RAG_RETRIEVAL_COUNT,
      RAG_DEFAULT_THRESHOLD,
      JSON.stringify(filter)
    )

    const normalizedRows = Array.isArray(rows) ? rows.map((row) => normalizeRagChunkRow(row)) : []
    if (RAG_SOURCE_TYPE_FILTERS.length > 1) {
      return normalizedRows.filter((item) => RAG_SOURCE_TYPE_FILTERS.includes(item.sourceType))
    }
    return normalizedRows.length ? normalizedRows : retrieveRagChunksByKeyword(queryText)
  } catch (error) {
    console.error('RAG retrieval failed', error?.message || error)
    return retrieveRagChunksByKeyword(queryText)
  }
}

async function writeRagQueryLog({ userId, queryText, retrievedChunkIds, responseMs }) {
  try {
    await prisma.$executeRawUnsafe(
      `
        insert into public.rag_query_logs
          (user_id, query_text, top_k, threshold, retrieved_chunk_ids, response_ms)
        values
          ($1, $2, $3, $4, $5::bigint[], $6);
      `,
      Number.isInteger(userId) ? userId : null,
      queryText,
      RAG_RETRIEVAL_COUNT,
      RAG_DEFAULT_THRESHOLD,
      toPgBigIntArrayLiteral(retrievedChunkIds),
      Number.isInteger(responseMs) ? responseMs : null
    )
  } catch (error) {
    // Keep chat response path resilient even when log schema differs.
    console.warn('Skip rag_query_logs write:', error?.message || error)
  }
}

function buildModelMessages({ user, userMessage, history, ragContextText }) {
  const systemPromptBase =
    AI_CHAT_SYSTEM_PROMPT ||
    'You are KeepFit, an English AI coach for a UK university graduation project. Answer both fitness coaching questions and KeepFit product usage/troubleshooting questions. Give concise, safe, structured guidance. For health risk, avoid diagnosis and recommend professional care.'
  const profileText = buildUserProfileText(user)
  const ragInstruction = ragContextText
    ? `Use this retrieved context as evidence. If context is insufficient, say what is missing.\n\nRetrieved context:\n${ragContextText}`
    : 'No retrieval context is available. Ask follow-up questions when data is missing.'

  const messages = [
    {
      role: 'system',
      content: [systemPromptBase, profileText, ragInstruction].filter(Boolean).join('\n\n')
    }
  ]

  const historyItems = Array.isArray(history) ? history.slice(-MAX_MODEL_HISTORY_ITEMS) : []
  for (const item of historyItems) {
    const role = normalizeMessageRole(item?.role)
    const content = normalizeMessageText(item?.content || '')
    if (!content) continue
    messages.push({ role, content })
  }

  if (!historyItems.length) {
    messages.push({ role: 'user', content: userMessage })
  } else {
    const latest = messages[messages.length - 1]
    if (!latest || latest.role !== 'user' || latest.content !== userMessage) {
      messages.push({ role: 'user', content: userMessage })
    }
  }
  return messages
}

async function requestChatCompletion({ messages, user, ragChunks, ragContextText }) {
  const endpoint = String(AI_CHAT_API_URL || '').trim()
  if (!endpoint) return ''

  const headers = { 'Content-Type': 'application/json' }
  if (AI_CHAT_API_KEY) {
    headers.Authorization = `Bearer ${AI_CHAT_API_KEY}`
  }

  const apiFormat = String(AI_CHAT_API_FORMAT || 'custom').trim().toLowerCase()
  const requestBody =
    apiFormat === 'openai'
      ? {
          model: AI_CHAT_MODEL || undefined,
          messages,
          temperature: CHAT_MODEL_TEMPERATURE,
          max_tokens: CHAT_MODEL_MAX_TOKENS
        }
      : {
          model: AI_CHAT_MODEL || undefined,
          messages,
          user: {
            id: user?.id || null,
            name: user?.name || null,
            sex: user?.sex || null,
            heightCm: user?.heightCm || null,
            weightKg: user?.weightKg || null
          },
          ragContext: ragContextText || null,
          sources: formatRagSources(ragChunks)
        }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    },
    CHAT_REQUEST_TIMEOUT_MS,
    'Chat completion request'
  )
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Model endpoint error: ${response.status}`)
  }
  const payload = await response.json()
  return extractAssistantContent(payload)
}

async function generateAssistantReply({ userMessage, user, history, userId }) {
  const retrievalStartedAt = Date.now()
  const semanticChunks = await retrieveRagChunks(userMessage)
  const helpChunks = buildProductHelpChunks(userMessage)
  const ragChunks = mergeRetrievedChunks(semanticChunks, helpChunks)
  const retrievalMs = Date.now() - retrievalStartedAt
  await writeRagQueryLog({
    userId,
    queryText: userMessage,
    retrievedChunkIds: extractRetrievedChunkIds(semanticChunks),
    responseMs: retrievalMs
  })
  const ragContextText = buildRagContextText(ragChunks)
  const fallbackContent = buildFallbackAssistantReply({
    userMessage,
    user,
    ragChunks
  })
  const endpoint = String(AI_CHAT_API_URL || '').trim()
  if (!endpoint) {
    return {
      content: fallbackContent,
      usedFallback: true,
      sourceCount: formatRagSources(ragChunks).length
    }
  }

  try {
    const messages = buildModelMessages({
      user,
      userMessage,
      history,
      ragContextText
    })
    const content = await requestChatCompletion({
      messages,
      user,
      ragChunks,
      ragContextText
    })
    if (!content) {
      return {
        content: fallbackContent,
        usedFallback: true,
        sourceCount: formatRagSources(ragChunks).length
      }
    }
    return {
      content: appendSourcesBlock(content, ragChunks),
      usedFallback: false,
      sourceCount: formatRagSources(ragChunks).length
    }
  } catch (error) {
    console.error('AI chat fallback triggered', error?.message || error)
    return {
      content: fallbackContent,
      usedFallback: true,
      sourceCount: formatRagSources(ragChunks).length
    }
  }
}

function numericValue(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildHeuristicAnalyticsInsight(summary, rangeDays) {
  const totals = summary?.totals || {}
  const streaks = summary?.streaks || {}
  const challenges = Array.isArray(summary?.challenges) ? summary.challenges : []
  const muscles = Array.isArray(summary?.muscles) ? summary.muscles : []
  const weightTrend = summary?.weight?.trend || null

  const sessions = numericValue(totals.sessions, 0)
  const completionRate = numericValue(totals.completionRate, 0)
  const totalMinutes = numericValue(totals.minutes, 0)
  const avgDailyMinutes = numericValue(totals.avgDailyMinutes, 0)
  const currentStreak = numericValue(streaks.current, 0)
  const bestStreak = numericValue(streaks.best, 0)
  const weightChange = numericValue(weightTrend?.changeKg, 0)

  const strongChallenges = challenges
    .filter((item) => numericValue(item.progressPercent, 0) >= 100)
    .map((item) => item.title)
    .slice(0, 2)

  const weakChallenges = challenges
    .filter((item) => numericValue(item.progressPercent, 0) > 0 && numericValue(item.progressPercent, 0) < 70)
    .map((item) => item.title)
    .slice(0, 2)

  const topFocus = muscles[0]?.name || 'General training'
  const minutesTarget = rangeDays >= 30 ? 180 : 150

  const conclusion = []
  conclusion.push(
    `Key conclusions: In the last ${rangeDays} days, you logged ${sessions} sessions with a ${completionRate}% completion rate and ${totalMinutes} total minutes.`
  )
  conclusion.push(
    `Your current streak is ${currentStreak} days (best ${bestStreak} days), and your top focus area was ${topFocus}.`
  )
  if (weightTrend) {
    const weightText =
      weightChange > 0 ? `up ${weightChange.toFixed(1)} kg` : weightChange < 0 ? `down ${Math.abs(weightChange).toFixed(1)} kg` : 'stable'
    conclusion.push(`Weight trend is ${weightText} versus the previous period.`)
  }

  const risks = []
  if (completionRate < 65) {
    risks.push('Completion is below target. Session scheduling or workload may be too aggressive.')
  }
  if (avgDailyMinutes < 20) {
    risks.push('Daily movement volume is low for progression. Consistency is the main bottleneck.')
  }
  if (!risks.length) {
    risks.push('No major red flags, but maintain progression and recovery balance.')
  }
  if (weakChallenges.length) {
    risks.push(`Low adherence challenges: ${weakChallenges.join(', ')}.`)
  }

  const actions = []
  actions.push(`Training: lock at least 4 planned training days and target ${minutesTarget}+ minutes per week.`)
  actions.push('Recovery: keep one full rest day and include 1 lighter session after high-intensity days.')
  actions.push('Nutrition: prioritize protein each meal and keep hydration steady around workouts.')
  if (strongChallenges.length) {
    actions.push(`Keep momentum on strong metrics: ${strongChallenges.join(', ')}.`)
  }
  if (weakChallenges.length) {
    actions.push(`For the next 7 days, focus first on improving: ${weakChallenges.join(', ')}.`)
  }

  return [
    conclusion.join(' '),
    '',
    `Risks / bottlenecks: ${risks.join(' ')}`,
    '',
    `Next 7-day action plan: ${actions.join(' ')}`
  ].join('\n')
}

function buildAnalyticsPrompt(summary, rangeDays) {
  const summaryText = JSON.stringify(summary || {})
  const trimmedSummary = summaryText.length > 4500 ? `${summaryText.slice(0, 4500)}...` : summaryText
  return [
    'You are a senior fitness performance analyst for KeepFit.',
    `Analyze the following user training summary for the last ${rangeDays} days.`,
    'Return concise, practical guidance in exactly three sections:',
    '1) Key conclusions',
    '2) Risks / bottlenecks',
    '3) Next 7-day action plan (training, nutrition, recovery)',
    'Use concrete numbers from the summary and do not mention missing model endpoints or retrieval internals.',
    `Summary JSON:\n${trimmedSummary}`
  ].join('\n\n')
}

async function findOrCreateUser(profile) {
  const normalizedEmail =
    typeof profile.email === 'string' && profile.email.trim()
      ? profile.email.trim().toLowerCase()
      : null

  const existing = await prisma.user.findUnique({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId
      }
    }
  })

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: normalizedEmail ?? existing.email,
        name: profile.name ?? existing.name,
        avatar: profile.avatar ?? existing.avatar
      }
    })
    return { user: updated, created: false }
  }

  // If the same email already exists (e.g. user signed in via another method),
  // reuse that account instead of failing on unique(email) constraint.
  if (normalizedEmail) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })
    if (existingByEmail) {
      const linked = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          provider: profile.provider,
          providerId: profile.providerId,
          email: normalizedEmail,
          name: profile.name ?? existingByEmail.name,
          avatar: profile.avatar ?? existingByEmail.avatar
        }
      })
      return { user: linked, created: false }
    }
  }

  const createdUser = await prisma.user.create({
    data: {
      provider: profile.provider,
      providerId: profile.providerId,
      email: normalizedEmail,
      name: profile.name ?? null,
      avatar: profile.avatar ?? null
    }
  })
  return { user: createdUser, created: true }
}

app.post('/auth/local/send-verification', async (req, res) => {
  try {
    const normalized = normalizeLocalRegistrationPayload(req.body || {})
    const alreadyExists = await localAccountExists({
      accountKey: normalized.accountKey,
      email: normalized.email
    })
    if (alreadyExists) {
      return res.status(409).json({ error: 'This account or email is already registered.' })
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)
    const passwordSecret = await hashPasswordSecret(normalized.password)
    const expiresAt = new Date(Date.now() + LEGACY_VERIFICATION_TTL_MS)

    await prisma.$executeRawUnsafe(
      `
        delete from public.legacy_local_auth_verifications
        where account_key = $1
      `,
      normalized.accountKey
    )

    const registrationPayload = {
      account: normalized.account,
      accountKey: normalized.accountKey,
      email: normalized.email,
      name: normalized.name,
      sex: normalized.sex,
      birthday: normalized.birthday,
      height: normalized.height,
      weight: normalized.weight,
      avatar: normalized.avatar
    }

    await prisma.$executeRawUnsafe(
      `
        insert into public.legacy_local_auth_verifications
          (account, account_key, email, verification_code_hash, password_hash, password_salt, registration_payload, expires_at)
        values
          ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
      `,
      normalized.account,
      normalized.accountKey,
      normalized.email,
      verificationCodeHash,
      passwordSecret.hash,
      passwordSecret.salt,
      JSON.stringify(registrationPayload),
      expiresAt.toISOString()
    )

    return res.json({
      ok: true,
      deliveryTarget: normalized.email || normalized.account,
      expiresIn: Math.floor(LEGACY_VERIFICATION_TTL_MS / 1000),
      debugCode: process.env.NODE_ENV === 'production' ? undefined : verificationCode,
      notice:
        process.env.NODE_ENV === 'production'
          ? 'Verification code generated.'
          : 'Verification code generated in cloud state. Local development returns the code directly.'
    })
  } catch (err) {
    console.error('Local verification send failed', err)
    return res.status(400).json({ error: err?.message || 'Failed to create verification state.' })
  }
})

app.post('/auth/local/confirm-registration', async (req, res) => {
  try {
    const account = normalizeLocalAccount(req.body?.account)
    const accountKey = normalizeAccountKey(account)
    const code = String(req.body?.code || '').trim()

    if (!accountKey || !code) {
      return res.status(400).json({ error: 'Account and verification code are required.' })
    }

    const verification = await loadLatestVerification(accountKey)
    if (!verification) {
      return res.status(404).json({ error: 'No verification request was found for this account.' })
    }
    if (verification.consumed_at) {
      return res.status(400).json({ error: 'This verification code has already been used.' })
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Please resend.' })
    }
    if (hashVerificationCode(code) !== String(verification.verification_code_hash || '')) {
      return res.status(400).json({ error: 'Incorrect verification code.' })
    }

    const payload = verification.registration_payload && typeof verification.registration_payload === 'object'
      ? verification.registration_payload
      : {}
    const email = normalizeOptionalEmail(payload.email)
    const accountLabel = normalizeLocalAccount(payload.account) || account
    const username = EMAIL_PATTERN.test(accountLabel) ? null : accountLabel
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(username ? [{ username }] : [])
        ]
      }
    })
    if (existingUser) {
      return res.status(409).json({ error: 'This account or email is already registered.' })
    }

    const createdUser = await prisma.user.create({
      data: {
        provider: 'local',
        providerId: accountKey,
        email,
        name: normalizeOptionalText(payload.name),
        username,
        avatar: normalizeOptionalText(payload.avatar),
        sex: String(payload.sex || '').trim().toLowerCase() === 'male' ? 'male' : 'female',
        birthday: payload.birthday ? new Date(payload.birthday) : null,
        heightCm: normalizeNumber(payload.height),
        weightKg: normalizeNumber(payload.weight),
        onboardingCompleted: false,
        onboardingAnswers: null
      }
    })

    await prisma.$executeRawUnsafe(
      `
        insert into public.legacy_local_auth_accounts
          (user_id, account, account_key, email, password_hash, password_salt)
        values
          ($1, $2, $3, $4, $5, $6)
      `,
      createdUser.id,
      accountLabel,
      accountKey,
      email,
      String(verification.password_hash || ''),
      String(verification.password_salt || '')
    )

    await prisma.$executeRawUnsafe(
      `
        update public.legacy_local_auth_verifications
        set consumed_at = now(),
            updated_at = now()
        where id = $1::uuid
      `,
      String(verification.id)
    )

    const sessionUser = buildLocalSessionUser(createdUser, {
      account: accountLabel,
      email
    })
    const session = issueSession(sessionUser)
    setSessionCookie(res, session)

    return res.json({
      ok: true,
      user: sessionUser
    })
  } catch (err) {
    console.error('Local registration confirm failed', err)
    return res.status(500).json({ error: err?.message || 'Failed to complete registration.' })
  }
})

app.post('/auth/local/login', async (req, res) => {
  try {
    const identifier = normalizeLocalAccount(req.body?.identifier)
    const password = String(req.body?.password || '')

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Account and password are required.' })
    }

    const accountRow = await findLegacyLocalAccountByIdentifier(identifier)
    if (!accountRow) {
      return res.status(401).json({ error: 'Incorrect account or password.' })
    }

    const verified = await verifyPasswordSecret(
      password,
      String(accountRow.password_salt || ''),
      String(accountRow.password_hash || '')
    )
    if (!verified) {
      return res.status(401).json({ error: 'Incorrect account or password.' })
    }

    const sessionUser = buildLocalSessionUser(
      {
        id: Number(accountRow.user_id),
        provider: String(accountRow.provider || 'local'),
        providerId: String(accountRow.provider_id || accountRow.account_key || ''),
        email: accountRow.user_email || accountRow.email || null,
        name: accountRow.name || null,
        username: accountRow.username || null,
        avatar: accountRow.avatar || null,
        sex: accountRow.sex || null,
        birthday: accountRow.birthday || null,
        heightCm: accountRow.height_cm ?? null,
        weightKg: accountRow.weight_kg ?? null,
        onboardingCompleted: !!accountRow.onboarding_completed,
        onboardingAnswers: accountRow.onboarding_answers ?? null
      },
      {
        account: accountRow.account,
        email: accountRow.email
      }
    )

    const session = issueSession(sessionUser)
    setSessionCookie(res, session)

    return res.json({
      ok: true,
      user: sessionUser
    })
  } catch (err) {
    console.error('Local auth login failed', err)
    return res.status(500).json({ error: err?.message || 'Failed to log in.' })
  }
})

// Start Google OAuth flow
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(500).send('Google OAuth is not configured.')
  }
  const redirectTarget = resolveRedirectTarget(req.query.redirect)
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent'
  })
  if (redirectTarget) params.set('state', redirectTarget)
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

// Google OAuth2 code exchange (Auth Code flow)
app.get('/auth/google/callback', async (req, res) => {
  const { code, redirect, state } = req.query
  if (!code) return res.status(400).send('Missing authorization code')
  try {
    const body = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return res.status(401).send(`Google token exchange failed: ${errText}`)
    }

    const tokenJson = await tokenRes.json()
    const { id_token: idToken } = tokenJson
    if (!idToken) return res.status(401).send('Missing id_token from Google')

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    })
    const payload = ticket.getPayload()
    const { user, created } = await findOrCreateUser({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      avatar: payload.picture
    })
    const sessionUser = { ...user, sub: `google:${payload.sub}` }

    const session = issueSession(sessionUser)
    setSessionCookie(res, session)
    const redirectTarget = resolveRedirectTarget(
      typeof state === 'string' ? state : redirect
    )
    const registerTarget = `${APP_ORIGIN}/register?prefill=google&name=${encodeURIComponent(payload.name || '')}&email=${encodeURIComponent(payload.email || '')}`
    const needsOnboarding = !user.onboardingCompleted
    const target = created
      ? registerTarget
      : needsOnboarding
        ? `${APP_ORIGIN}/onboarding`
        : redirectTarget || `${APP_ORIGIN}/dashboard`
    res.redirect(target)
  } catch (err) {
    console.error('Google callback error', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack
    })
    res.status(500).send('Google auth failed')
  }
})

// Apple OAuth2 code exchange (Sign in with Apple)
app.post('/auth/apple/callback', async (req, res) => {
  const { code, redirect } = req.body
  if (!code) return res.status(400).json({ error: 'Missing authorization code' })
  try {
    const clientSecret = await appleSignin.getClientSecret({
      clientID: APPLE_CLIENT_ID,
      teamID: APPLE_TEAM_ID,
      keyIdentifier: APPLE_KEY_ID,
      privateKey: APPLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: APPLE_REDIRECT_URI,
      client_id: APPLE_CLIENT_ID,
      client_secret: clientSecret
    })

    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      return res.status(401).json({ error: `Apple token exchange failed: ${errText}` })
    }

    const tokenJson = await tokenRes.json()
    const { id_token: idToken } = tokenJson
    if (!idToken) return res.status(401).json({ error: 'Missing id_token from Apple' })

    const appleProfile = await appleSignin.verifyIdToken(idToken, {
      audience: APPLE_CLIENT_ID
    })

    const { user, created } = await findOrCreateUser({
      provider: 'apple',
      providerId: appleProfile.sub,
      email: appleProfile.email || null,
      name: appleProfile.email?.split?.('@')?.[0] || 'Apple User',
      avatar: null
    })
    const sessionUser = { ...user, sub: `apple:${appleProfile.sub}` }

    const session = issueSession(sessionUser)
    setSessionCookie(res, session)
    const target =
      redirect ||
      (created ? `${APP_ORIGIN}/register?prefill=apple` : `${APP_ORIGIN}/dashboard`)
    res.redirect(target)
  } catch (err) {
    console.error('Apple callback error', err)
    res.status(500).json({ error: 'Apple auth failed' })
  }
})

// Session probe
app.get('/me', async (req, res) => {
  const token = req.cookies.session
  if (!token) return res.status(401).json({ error: 'No session' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const payload = await hydrateServerUserPayloadFromSession(decoded)
    res.json({ ok: true, user: payload || decoded })
  } catch (err) {
    res.status(401).json({ error: 'Session invalid' })
  }
})

app.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/user/client-state', async (req, res) => {
  try {
    const identity = await resolveClientStateIdentity(req)
    const scope = req.query.scope === 'user' ? 'user' : 'device'
    const deviceId = scope === 'device' ? String(req.query.deviceId || '').trim() : null
    const keys = String(req.query.keys || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    const rows = await findClientStateEntries({
      identity,
      scope,
      deviceId,
      keys
    })
    res.json({
      ok: true,
      entries: Array.isArray(rows)
        ? rows.map((row) => ({
            scope: row.scope,
            deviceId: row.device_id || null,
            stateKey: row.state_key,
            stateValue: row.state_value ?? null,
            updatedAt: row.updated_at || null
          }))
        : []
    })
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 500
    res.status(statusCode).json({ error: err?.message || 'Failed to load client state.' })
  }
})

app.post('/api/user/client-state', async (req, res) => {
  try {
    const identity = await resolveClientStateIdentity(req)
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : []
    if (!entries.length) {
      return res.status(400).json({ error: 'At least one state entry is required.' })
    }

    const savedEntries = []
    for (const entry of entries) {
      const saved = await upsertClientStateEntry(identity, entry)
      if (saved) {
        savedEntries.push({
          scope: saved.scope,
          deviceId: saved.device_id || null,
          stateKey: saved.state_key,
          stateValue: saved.state_value ?? null,
          updatedAt: saved.updated_at || null
        })
      }
    }

    res.json({
      ok: true,
      entries: savedEntries
    })
  } catch (err) {
    console.error('Client state save failed', err)
    const statusCode = Number(err?.statusCode) || 500
    res.status(statusCode).json({ error: err?.message || 'Failed to save client state.' })
  }
})

app.post('/api/account/delete', async (req, res) => {
  try {
    const confirmation = String(req.body?.confirmation || '').trim()
    const enteredEmail = String(req.body?.email || '').trim().toLowerCase()
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation must equal DELETE.' })
    }
    if (!enteredEmail) {
      return res.status(400).json({ error: 'Account email is required for deletion verification.' })
    }

    const accessToken = getBearerToken(req)
    const sessionUser = getSessionUserFromRequest(req)
    let supabaseUserId = ''
    let email = String(sessionUser?.email || '').trim().toLowerCase()

    if (accessToken) {
      const authUser = await getSupabaseAuthUser(accessToken)
      supabaseUserId = authUser.id || ''
      email = String(authUser.email || email).trim().toLowerCase()
    } else if (!sessionUser) {
      return res.status(401).json({ error: 'No authenticated account session was found.' })
    }

    if (!supabaseUserId && email) {
      supabaseUserId = await lookupSupabaseAuthUserIdByEmail(email)
    }
    if (!email || enteredEmail !== email) {
      return res.status(400).json({ error: 'Entered email does not match the current account.' })
    }

    await deleteSupabaseBusinessData(supabaseUserId)
    await deleteServerSideAccountData({
      userId: sessionUser?.id || null,
      email
    })
    await deleteSupabaseAuthUser(supabaseUserId)

    clearSessionCookie(res)
    res.json({ ok: true })
  } catch (err) {
    console.error('Account delete error', err)
    const statusCode = Number(err?.statusCode) || 500
    res.status(statusCode).json({ error: err?.message || 'Failed to delete account.' })
  }
})

// Update profile after social sign-in
app.post('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.id
    const payload = req.body || {}
    const data = {
      name: payload.name ?? undefined,
      username: payload.username ?? undefined,
      email: payload.email ?? undefined,
      avatar: payload.avatar ?? undefined,
      sex: payload.sex ?? undefined,
      birthday: payload.birthday ? new Date(payload.birthday) : undefined,
      heightCm: payload.heightCm != null ? Number(payload.heightCm) : undefined,
      weightKg: payload.weightKg != null ? Number(payload.weightKg) : undefined,
      onboardingCompleted:
        typeof payload.onboardingCompleted === 'boolean'
          ? payload.onboardingCompleted
          : undefined,
      onboardingAnswers: payload.onboardingAnswers ?? undefined
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    })

    const sessionUser = { ...updated, sub: `${updated.provider}:${updated.providerId}` }
    const session = issueSession(sessionUser)
    setSessionCookie(res, session)
    res.json({ ok: true, user: sessionUser })
  } catch (err) {
    console.error('Profile update error', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

app.get('/api/user/app-state', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.id)
    const appState = await prisma.userAppState.findUnique({
      where: { userId }
    })

    res.json({
      ok: true,
      appState: {
        planState: appState?.planState ?? null,
        workoutLogs: Array.isArray(appState?.workoutLogs) ? appState.workoutLogs : [],
        restDays: Array.isArray(appState?.restDays) ? appState.restDays : [],
        updatedAt: appState?.updatedAt || null
      }
    })
  } catch (err) {
    console.error('Failed to load user app state', err)
    res.status(500).json({ error: 'Failed to load app state' })
  }
})

app.post('/api/user/app-state', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.id)
    const normalized = normalizeAppStatePayload(req.body)

    const appState = await prisma.userAppState.upsert({
      where: { userId },
      update: {
        planState: normalized.planState,
        workoutLogs: normalized.workoutLogs,
        restDays: normalized.restDays,
        updatedAt: new Date()
      },
      create: {
        userId,
        planState: normalized.planState,
        workoutLogs: normalized.workoutLogs,
        restDays: normalized.restDays
      }
    })

    res.json({
      ok: true,
      appState: {
        planState: appState.planState ?? null,
        workoutLogs: Array.isArray(appState.workoutLogs) ? appState.workoutLogs : [],
        restDays: Array.isArray(appState.restDays) ? appState.restDays : [],
        updatedAt: appState.updatedAt
      }
    })
  } catch (err) {
    console.error('Failed to save user app state', err)
    res.status(500).json({ error: 'Failed to save app state' })
  }
})

app.get('/api/ai/chat/conversations', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.id)
    const conversations = await prisma.aiChatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    res.json(
      conversations.map((conversation) => ({
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title || 'New chat',
        updatedAt: conversation.updatedAt,
        createdAt: conversation.createdAt,
        messageCount: conversation._count?.messages || 0,
        lastMessage: conversation.messages?.[0]
          ? {
              id: conversation.messages[0].id,
              role: conversation.messages[0].role,
              content: conversation.messages[0].content,
              createdAt: conversation.messages[0].createdAt
            }
          : null
      }))
    )
  } catch (err) {
    console.error('Failed to load AI chat conversations', err)
    res.status(500).json({ error: 'Failed to load conversations' })
  }
})

app.post('/api/ai/chat/conversations', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.id)
    const title = buildConversationTitle(req.body?.title || '')
    const conversation = await prisma.aiChatConversation.create({
      data: {
        userId,
        title
      }
    })
    res.json({
      ok: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        userId: conversation.userId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    })
  } catch (err) {
    console.error('Failed to create AI chat conversation', err)
    res.status(500).json({ error: 'Failed to create conversation' })
  }
})

app.get('/api/ai/chat/messages', requireAuth, async (req, res) => {
  const userId = Number(req.session.id)
  const conversationId = normalizeConversationId(req.query.conversationId)
  if (!conversationId) {
    return res.status(400).json({ error: 'Invalid conversationId' })
  }

  try {
    const conversation = await prisma.aiChatConversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    })
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }

    const messages = await prisma.aiChatMessage.findMany({
      where: {
        conversationId,
        userId
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_CHAT_HISTORY_ITEMS
    })
    res.json({
      ok: true,
      conversationId,
      messages
    })
  } catch (err) {
    console.error('Failed to load AI chat messages', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

app.post('/api/ai/chat/messages', requireAuth, async (req, res) => {
  const userId = Number(req.session.id)
  const conversationId = normalizeConversationId(req.body?.conversationId)
  const message = normalizeMessageText(req.body?.message)

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }
  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message is too long. Max ${MAX_CHAT_MESSAGE_LENGTH} characters.`
    })
  }

  try {
    let conversation = null
    if (conversationId) {
      conversation = await prisma.aiChatConversation.findFirst({
        where: {
          id: conversationId,
          userId
        }
      })
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }
    } else {
      conversation = await prisma.aiChatConversation.create({
        data: {
          userId,
          title: buildConversationTitle(message)
        }
      })
    }

    const userMessage = await prisma.aiChatMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: 'user',
        content: message
      }
    })

    const user = await findUserById(userId)
    const recentHistoryDesc = await prisma.aiChatMessage.findMany({
      where: {
        conversationId: conversation.id,
        userId
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MODEL_HISTORY_ITEMS
    })
    const recentHistory = recentHistoryDesc.reverse()
    const assistantReply = await generateAssistantReply({
      userMessage: message,
      user,
      history: recentHistory,
      userId
    })

    const assistantMessage = await prisma.aiChatMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: 'assistant',
        content: assistantReply.content
      }
    })

    await prisma.aiChatConversation.update({
      where: { id: conversation.id },
      data: {
        title: conversation.title || buildConversationTitle(message),
        updatedAt: new Date()
      }
    })

    res.json({
      ok: true,
      conversationId: conversation.id,
      userMessage,
      assistantMessage,
      assistantMeta: {
        usedFallback: assistantReply.usedFallback,
        sourceCount: assistantReply.sourceCount
      }
    })
  } catch (err) {
    console.error('Failed to send AI chat message', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

app.post('/api/ai/analytics/insights', requireAuth, async (req, res) => {
  const userId = Number(req.session.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user session.' })
  }

  const requestedRange = Number.parseInt(req.body?.rangeDays, 10)
  const rangeDays =
    Number.isInteger(requestedRange) && requestedRange > 0
      ? Math.min(Math.max(requestedRange, 7), 180)
      : 30
  const summary = req.body?.summary && typeof req.body.summary === 'object' ? req.body.summary : {}

  const fallbackInsight = buildHeuristicAnalyticsInsight(summary, rangeDays)
  let insight = fallbackInsight
  let source = 'heuristic'
  let usedFallback = true

  try {
    const user = await findUserById(userId)
    const prompt = buildAnalyticsPrompt(summary, rangeDays)
    const assistantReply = await generateAssistantReply({
      userMessage: prompt,
      user,
      history: [],
      userId
    })
    const aiContent = normalizeMessageText(assistantReply?.content || '')
    const looksGenericFallback =
      /retrieval fallback|model endpoint not connected|saved your message/i.test(aiContent)

    if (aiContent && !assistantReply?.usedFallback && !looksGenericFallback) {
      insight = aiContent
      source = 'ai'
      usedFallback = false
    } else if (aiContent && !looksGenericFallback) {
      insight = aiContent
      source = 'ai_fallback'
      usedFallback = true
    }
  } catch (err) {
    console.error('Failed to generate analytics insights', err)
  }

  return res.json({
    ok: true,
    insight,
    meta: {
      source,
      usedFallback,
      generatedAt: new Date().toISOString()
    }
  })
})

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
