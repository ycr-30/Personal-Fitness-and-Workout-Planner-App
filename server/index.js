import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const {
  PORT = 4000,
  APP_ORIGIN: APP_ORIGIN_RAW = 'http://localhost:5173',
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SUPABASE_URL: RAW_SUPABASE_URL = '',
  SUPABASE_SERVICE_ROLE_KEY = '',
  SUPABASE_PUBLISHABLE_KEY = '',
  SUPABASE_ANON_KEY = '',
  RESEND_API_KEY = '',
  RESEND_FROM_EMAIL = '',
  RESEND_FROM_NAME = 'Fitness AI Planner',
  RESEND_REPLY_TO = '',
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

function parseAllowedOrigins(rawValue) {
  return [...new Set(String(rawValue || '').split(',').map((item) => item.trim()).filter(Boolean))]
}

const APP_ORIGINS = parseAllowedOrigins(APP_ORIGIN_RAW)
const ALLOWED_APP_ORIGINS = new Set(APP_ORIGINS)
const APP_ORIGIN = APP_ORIGINS[0] || 'http://localhost:5173'

const SUPABASE_URL = RAW_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_PUBLIC_KEY =
  SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

const app = express()
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
const secureCookie = process.env.NODE_ENV === 'production'
console.info(
  '[config] AI chat endpoint configured:',
  Boolean(resolveChatApiUrl()),
  'format:',
  AI_CHAT_API_FORMAT || 'custom',
  'endpoint:',
  resolveChatApiUrl() || '(unset)'
)
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
const ANALYTICS_INSIGHT_TIMEOUT_MS = Math.min(CHAT_REQUEST_TIMEOUT_MS, 10000)
const NUTRITION_CARDS_TIMEOUT_MS = Math.min(CHAT_REQUEST_TIMEOUT_MS, 8000)
const NUTRITION_TARGETS_TIMEOUT_MS = Math.min(CHAT_REQUEST_TIMEOUT_MS, 8000)
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
const CHAT_CJK_RE = /[\u4e00-\u9fff]/
const NUTRITION_ONLY_OVERRIDE_RE =
  /(?:只要(?:饮食|营养|餐单|食谱)|不要(?:训练|运动|健身)|仅(?:饮食|营养)|只回答(?:饮食|营养)|(?:只(?:谈|说|讲))(?:饮食|营养)|\b(?:nutrition only|diet only|no workout|no training)\b)/i
const WORKOUT_ONLY_OVERRIDE_RE =
  /(?:只要(?:训练|健身|动作)|不要(?:饮食|营养|餐单)|仅(?:训练|健身)|只回答(?:训练|健身)|(?:只(?:谈|说|讲))(?:训练|健身)|\b(?:workout only|training only|exercise only|no diet|no nutrition)\b)/i
const NUTRITION_INTENT_RE =
  /\b(?:calories?|kcal|protein|macro|diet|dietary|nutrition|meal(?:s)?|meal plan|diet plan|weekly meal plan|7[- ]day meal plan|seven day meal plan|meal prep|food|recipe|breakfast|lunch|dinner|snack|hydration|water)\b|(?:饮食|营养|热量|卡路里|蛋白|脂肪|碳水|饮食计划|食谱|餐单|菜谱|早餐|午餐|晚餐|加餐|零食|吃什么|食物|补水|喝水|一周饮食|七天饮食|一周餐单|七天餐单|一周食谱|七天食谱|饮食安排|营养安排)/i
const WORKOUT_INTENT_RE =
  /\b(?:workout|training|traing|trainig|exercise|excercise|sets?|reps?|bench|squat|deadlift|program|training plan|workout plan|strength|hypertrophy|1rm|gym|cardio|mobility|split)\b|(?:训练|健身|动作|组数|次数|卧推|深蹲|硬拉|力量|肌肥大|训练计划|健身计划|训练安排|动作安排|练胸|练背|练腿|有氧|活动度|分化训练)/i
const WORKOUT_BODY_PART_HINT_RE =
  /\b(?:advice|plan|routine|program|workout|training|traing|trainig|exercise|excercise)\b.{0,24}\b(?:back|chest|leg|legs|shoulder|shoulders|arm|arms|biceps|triceps|glutes?|lats?|core|abs|hamstrings?|quads?)\b|\b(?:back|chest|leg|legs|shoulder|shoulders|arm|arms|biceps|triceps|glutes?|lats?|core|abs|hamstrings?|quads?)\b.{0,24}\b(?:advice|plan|routine|program|workout|training|traing|trainig|exercise|excercise)\b|(?:背部|胸部|腿部|肩部|手臂|二头|三头|臀部|背阔肌|核心|腹肌|股四头|腘绳肌).{0,16}(?:训练|健身|动作|计划|安排|建议)/i
const BOTH_EXPLICIT_RE =
  /(?:训练.*饮食|饮食.*训练|营养.*训练|训练.*营养|\b(?:workout.*nutrition|nutrition.*workout|training.*diet|diet.*training|workout.*meal|meal.*workout|training.*meal|meal.*training)\b)/i
const ANALYTICS_DIRTY_TEXT_RE = /\b(?:WORKOUT ADVICE|NUTRITION ADVICE|Draft response|Key conclusions?|Risks?\s*\/\s*bottlenecks?|Next\s*7[- ]day action plan|Sources?)\b/i
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/
const USERNAME_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/
const LEGACY_VERIFICATION_TTL_MS = 10 * 60 * 1000
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000
const VERIFICATION_MAX_ATTEMPTS = 5
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000
const RESEND_API_ORIGIN = 'https://api.resend.com'
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

const AI_AGENT_TYPES = new Set(['chat', 'analytics', 'nutrition'])

function normalizeAiAgentType(value) {
  const text = String(value || '').trim().toLowerCase()
  return AI_AGENT_TYPES.has(text) ? text : ''
}

function normalizeLatencyMs(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return Math.min(parsed, 10 * 60 * 1000)
}

function normalizeAiAgentErrorMessage(value) {
  const text = String(value || '').trim()
  return text ? text.slice(0, 500) : null
}

async function recordAiAgentRun({
  userId = null,
  agentType = '',
  success = false,
  usedFallback = false,
  latencyMs = null,
  errorMessage = null
} = {}) {
  const normalizedAgentType = normalizeAiAgentType(agentType)
  if (!normalizedAgentType) return

  try {
    await prisma.aiAgentRun.create({
      data: {
        userId: Number.isInteger(userId) && userId > 0 ? userId : null,
        agentType: normalizedAgentType,
        success: Boolean(success),
        usedFallback: Boolean(usedFallback),
        latencyMs: normalizeLatencyMs(latencyMs),
        errorMessage: normalizeAiAgentErrorMessage(errorMessage)
      }
    })
  } catch (error) {
    console.error('Failed to record AI agent run', error)
  }
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

function createTemporaryResetToken() {
  return randomBytes(24).toString('hex')
}

function hashOpaqueToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex')
}

function normalizePurpose(value) {
  const purpose = String(value || '').trim().toUpperCase()
  if (purpose === 'LOGIN_CODE' || purpose === 'RESET_PASSWORD' || purpose === 'REGISTRATION') {
    return purpose
  }
  return 'REGISTRATION'
}

function extractRequestMetadata(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean)
  return {
    ipAddress: normalizeOptionalText(forwarded || req.ip || req.socket?.remoteAddress || null),
    userAgent: normalizeOptionalText(req.headers['user-agent'])
  }
}

function buildVerificationEmailTemplate({ code, purpose }) {
  const normalizedPurpose = normalizePurpose(purpose)
  if (normalizedPurpose === 'RESET_PASSWORD') {
    return {
      subject: 'Reset your Fitness AI Planner password',
      text: [
        `Your verification code is: ${code}`,
        'This code will expire in 10 minutes.',
        'If you did not request a password reset, you can ignore this email.',
        '',
        'For security, do not share this code with anyone.'
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>Your verification code is: <strong style="font-size:20px;letter-spacing:2px">${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request a password reset, you can ignore this email.</p>
          <p style="color:#6b7280;font-size:13px">For security, do not share this code with anyone.</p>
        </div>
      `
    }
  }

  return {
    subject: 'Your Fitness AI Planner sign-in code',
    text: [
      `Your verification code is: ${code}`,
      'This code will expire in 10 minutes.',
      'If you did not request this code, you can ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>Your verification code is: <strong style="font-size:20px;letter-spacing:2px">${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `
  }
}

async function sendVerificationEmailOrFallback({ email, code, purpose }) {
  try {
    return await sendVerificationEmail({ email, code, purpose })
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
    console.error('Verification email delivery failed, using development fallback', error)
    return {
      delivered: false,
      provider: 'debug',
      error: error?.message || 'Failed to send verification email.'
    }
  }
}

async function sendVerificationEmail({ email, code, purpose }) {
  const normalizedEmail = normalizeOptionalEmail(email)
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    return {
      delivered: false,
      provider: 'debug'
    }
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return {
      delivered: false,
      provider: 'debug'
    }
  }

  const template = buildVerificationEmailTemplate({ code, purpose })
  const payload = {
    from: RESEND_FROM_NAME
      ? `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`
      : RESEND_FROM_EMAIL,
    to: [normalizedEmail],
    subject: template.subject,
    html: template.html,
    text: template.text
  }
  if (RESEND_REPLY_TO) payload.reply_to = RESEND_REPLY_TO

  const response = await fetch(`${RESEND_API_ORIGIN}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || 'Failed to send verification email.')
  }

  return {
    delivered: true,
    provider: 'resend'
  }
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

async function findLatestVerificationRecord({ email = '', purpose = 'REGISTRATION', accountKey = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedPurpose = normalizePurpose(purpose)
  if (!normalizedEmail && !normalizedAccountKey) return null

  const rows = await prisma.$queryRawUnsafe(
    `
      select *
      from public.auth_verification_codes
      where purpose = $1
        and (
          ($2::text is not null and email = $2)
          or
          ($3::text is not null and account_key = $3)
        )
      order by created_at desc
      limit 1
    `,
    normalizedPurpose,
    normalizedEmail,
    normalizedAccountKey
  )
  return rows?.[0] || null
}

async function findLatestActiveVerificationRecord({ email = '', purpose = 'REGISTRATION', accountKey = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedPurpose = normalizePurpose(purpose)
  if (!normalizedEmail && !normalizedAccountKey) return null

  const rows = await prisma.$queryRawUnsafe(
    `
      select *
      from public.auth_verification_codes
      where purpose = $1
        and consumed_at is null
        and expires_at > now()
        and (
          ($2::text is not null and email = $2)
          or
          ($3::text is not null and account_key = $3)
        )
      order by created_at desc
      limit 1
    `,
    normalizedPurpose,
    normalizedEmail,
    normalizedAccountKey
  )
  return rows?.[0] || null
}

async function invalidateVerificationRecords({ email = '', purpose = 'REGISTRATION', accountKey = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedPurpose = normalizePurpose(purpose)
  if (!normalizedEmail && !normalizedAccountKey) return

  await prisma.$executeRawUnsafe(
    `
      update public.auth_verification_codes
      set consumed_at = now(),
          updated_at = now()
      where consumed_at is null
        and purpose = $1
        and (
          ($2::text is not null and email = $2)
          or
          ($3::text is not null and account_key = $3)
        )
    `,
    normalizedPurpose,
    normalizedEmail,
    normalizedAccountKey
  )
}

async function assertVerificationRateLimit({ email = '', purpose = 'REGISTRATION', accountKey = '', ipAddress = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedPurpose = normalizePurpose(purpose)

  const latest = await findLatestVerificationRecord({
    email: normalizedEmail,
    purpose: normalizedPurpose,
    accountKey: normalizedAccountKey
  })
  if (latest?.created_at) {
    const elapsed = Date.now() - new Date(latest.created_at).getTime()
    if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
      const err = new Error('Too many requests. Please try again later.')
      err.statusCode = 429
      err.retryAfterSeconds = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000)
      throw err
    }
  }

  if (normalizedEmail) {
    const emailRows = await prisma.$queryRawUnsafe(
      `
        select count(*)::int as count
        from public.auth_verification_codes
        where email = $1
          and purpose = $2
          and created_at > now() - interval '10 minutes'
      `,
      normalizedEmail,
      normalizedPurpose
    )
    if (Number(emailRows?.[0]?.count || 0) >= 6) {
      const err = new Error('Too many requests. Please try again later.')
      err.statusCode = 429
      throw err
    }
  }

  if (ipAddress) {
    const ipRows = await prisma.$queryRawUnsafe(
      `
        select count(*)::int as count
        from public.auth_verification_codes
        where ip_address = $1
          and purpose = $2
          and created_at > now() - interval '10 minutes'
      `,
      ipAddress,
      normalizedPurpose
    )
    if (Number(ipRows?.[0]?.count || 0) >= 12) {
      const err = new Error('Too many requests. Please try again later.')
      err.statusCode = 429
      throw err
    }
  }
}

async function createVerificationRecord({
  email = '',
  purpose = 'REGISTRATION',
  accountKey = '',
  codeHash = '',
  expiresAt,
  payload = {},
  ipAddress = '',
  userAgent = ''
} = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const normalizedAccountKey = normalizeAccountKey(accountKey)
  const normalizedPurpose = normalizePurpose(purpose)
  const latest = await findLatestVerificationRecord({
    email: normalizedEmail,
    purpose: normalizedPurpose,
    accountKey: normalizedAccountKey
  })

  await invalidateVerificationRecords({
    email: normalizedEmail,
    purpose: normalizedPurpose,
    accountKey: normalizedAccountKey
  })

  const rows = await prisma.$queryRawUnsafe(
    `
      insert into public.auth_verification_codes
        (email, purpose, account_key, code_hash, expires_at, resend_count, ip_address, user_agent, payload)
      values
        ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9::jsonb)
      returning *
    `,
    normalizedEmail || '',
    normalizedPurpose,
    normalizedAccountKey || null,
    String(codeHash || ''),
    expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt || Date.now()).toISOString(),
    latest ? Number(latest.resend_count || 0) + 1 : 0,
    normalizeOptionalText(ipAddress),
    normalizeOptionalText(userAgent),
    JSON.stringify(payload || {})
  )

  return rows?.[0] || null
}

async function incrementVerificationAttempt(recordId) {
  if (!recordId) return
  await prisma.$executeRawUnsafe(
    `
      update public.auth_verification_codes
      set attempt_count = attempt_count + 1,
          updated_at = now()
      where id = $1::uuid
    `,
    String(recordId)
  )
}

async function consumeVerificationRecord(recordId) {
  if (!recordId) return
  await prisma.$executeRawUnsafe(
    `
      update public.auth_verification_codes
      set consumed_at = now(),
          updated_at = now()
      where id = $1::uuid
    `,
    String(recordId)
  )
}

async function invalidatePasswordResetTokens(email) {
  const normalizedEmail = normalizeOptionalEmail(email)
  if (!normalizedEmail) return
  await prisma.$executeRawUnsafe(
    `
      update public.auth_password_reset_tokens
      set consumed_at = now(),
          updated_at = now()
      where email = $1
        and consumed_at is null
    `,
    normalizedEmail
  )
}

async function createPasswordResetToken({ email = '', ipAddress = '', userAgent = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  if (!normalizedEmail) return null

  await invalidatePasswordResetTokens(normalizedEmail)

  const rawToken = createTemporaryResetToken()
  const tokenHash = hashOpaqueToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  await prisma.$executeRawUnsafe(
    `
      insert into public.auth_password_reset_tokens
        (email, token_hash, expires_at, ip_address, user_agent)
      values
        ($1, $2, $3::timestamptz, $4, $5)
    `,
    normalizedEmail,
    tokenHash,
    expiresAt.toISOString(),
    normalizeOptionalText(ipAddress),
    normalizeOptionalText(userAgent)
  )

  return {
    rawToken,
    expiresAt
  }
}

async function findActivePasswordResetToken({ email = '', rawToken = '' } = {}) {
  const normalizedEmail = normalizeOptionalEmail(email)
  const tokenHash = hashOpaqueToken(rawToken)
  if (!normalizedEmail || !rawToken) return null
  const rows = await prisma.$queryRawUnsafe(
    `
      select *
      from public.auth_password_reset_tokens
      where email = $1
        and token_hash = $2
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1
    `,
    normalizedEmail,
    tokenHash
  )
  return rows?.[0] || null
}

async function consumePasswordResetToken(recordId) {
  if (!recordId) return
  await prisma.$executeRawUnsafe(
    `
      update public.auth_password_reset_tokens
      set consumed_at = now(),
          updated_at = now()
      where id = $1::uuid
    `,
    String(recordId)
  )
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

function resolveRedirectTarget(raw, req = null) {
  if (!raw || typeof raw !== 'string') return null
  let candidate = raw
  try {
    candidate = decodeURIComponent(raw)
  } catch (err) {
    candidate = raw
  }
  if (candidate.startsWith('/')) return `${resolveRequestAppOrigin(req)}${candidate}`
  try {
    const url = new URL(candidate)
    if (isAllowedAppOrigin(url.origin)) return url.toString()
  } catch (err) {
    return null
  }
  return null
}

function isAllowedAppOrigin(origin) {
  return ALLOWED_APP_ORIGINS.has(String(origin || '').trim())
}

function resolveRequestAppOrigin(req = null) {
  const requestOrigin = String(req?.headers?.origin || '').trim()
  if (isAllowedAppOrigin(requestOrigin)) return requestOrigin

  const referer = String(req?.headers?.referer || '').trim()
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (isAllowedAppOrigin(refererUrl.origin)) return refererUrl.origin
    } catch (err) {
      // Ignore malformed referer headers and fall back to the primary app origin.
    }
  }

  return APP_ORIGIN
}

function resolveTargetOrigin(target) {
  try {
    return new URL(String(target || '')).origin
  } catch {
    return ''
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedAppOrigin(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`))
    },
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

function normalizeBigIntId(value) {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value)
  const text = String(value || '').trim()
  if (!text || !/^\d+$/.test(text)) return null
  try {
    return BigInt(text)
  } catch (error) {
    return null
  }
}

function serializeId(value) {
  if (typeof value === 'bigint') {
    const asNumber = Number(value)
    if (Number.isSafeInteger(asNumber)) return asNumber
    return value.toString()
  }
  return value
}

function formatExercisePayload(exercise) {
  const equipments = exercise.equipments?.map((item) => item.equipment?.name).filter(Boolean) || []
  return {
    id: serializeId(exercise.id),
    name: exercise.name,
    slug: exercise.slug,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions,
    notes: exercise.notes,
    media: exercise.media,
    primaryMuscle: exercise.primaryMuscle
      ? {
          id: serializeId(exercise.primaryMuscle.id),
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
        id: serializeId(muscle.id),
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
        id: serializeId(equipment.id),
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
    const muscleId = normalizeBigIntId(muscle)

    const where = {}
    if (muscle) {
      where.OR = [
        { primaryMuscle: { slug: muscle } },
        { primaryMuscle: { name: { equals: muscle, mode: 'insensitive' } } }
      ]
      if (muscleId) {
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
  const id = normalizeBigIntId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid exercise id' })
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
  const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLIC_KEY
  if (!SUPABASE_URL || !apiKey) {
    throw new Error('Supabase auth environment variables are missing on the server.')
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
        apikey: apiKey,
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

async function lookupSupabaseAuthUserByEmail(email) {
  const normalizedEmail = normalizeOptionalEmail(email)
  if (!normalizedEmail) return null

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT
          id::text AS id,
          lower(email) AS email,
          email_confirmed_at IS NOT NULL AS confirmed
        FROM auth.users
        WHERE lower(email) = $1
        LIMIT 1
      `,
      normalizedEmail
    )
    const row = rows?.[0] || null
    if (!row) return null
    return {
      id: String(row.id || ''),
      email: String(row.email || normalizedEmail),
      confirmed: Boolean(row.confirmed)
    }
  } catch (error) {
    if (isMissingRelationError(error)) return null
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

function containsCjk(value) {
  return CHAT_CJK_RE.test(String(value || ''))
}

function detectRequestLanguage(value) {
  return containsCjk(value) ? 'zh' : 'en'
}

function detectChatIntent(value) {
  const text = String(value || '').trim()
  if (!text) return 'both'
  if (NUTRITION_ONLY_OVERRIDE_RE.test(text)) return 'nutrition'
  if (WORKOUT_ONLY_OVERRIDE_RE.test(text)) return 'workout'
  if (BOTH_EXPLICIT_RE.test(text)) return 'both'

  const hasNutrition = NUTRITION_INTENT_RE.test(text)
  const hasWorkout = WORKOUT_INTENT_RE.test(text) || WORKOUT_BODY_PART_HINT_RE.test(text)
  if (hasNutrition && !hasWorkout) return 'nutrition'
  if (hasWorkout && !hasNutrition) return 'workout'
  if (hasNutrition && hasWorkout) return 'both'
  return 'both'
}

function resolveChatApiUrl(rawValue = AI_CHAT_API_URL) {
  const endpoint = String(rawValue || '').trim()
  if (!endpoint) return ''
  try {
    const url = new URL(endpoint)
    if (!/\/chat\/?$/i.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/chat`
    }
    return url.toString()
  } catch {
    if (/\/chat\/?$/i.test(endpoint)) return endpoint
    return `${endpoint.replace(/\/$/, '')}/chat`
  }
}

function appendSourcesBlock(content, ragChunks, options = {}) {
  const body = normalizeMessageText(content)
  const sources = formatRagSources(ragChunks)
  if (!sources.length) return body
  const sourcesLabel = 'Sources'
  return `${body}\n\n${sourcesLabel}:\n${sources.join('\n')}`
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

function buildTemporaryUnavailableMessage({ language, intent, ragAvailable }) {
  const scopedIntent = intent === 'nutrition' ? 'nutrition' : intent === 'workout' ? 'workout' : 'both'
  if (scopedIntent === 'nutrition') {
    return ragAvailable
      ? 'The nutrition coach is temporarily unavailable. I found related reference material, but I cannot turn it into a stable final answer right now. Please try again shortly, or add your goal, time frame, dietary preferences, and restrictions so I can build the meal plan when the service recovers.'
      : 'The nutrition coach is temporarily unavailable right now. Please try again shortly, or add your goal, time frame, dietary preferences, and restrictions so I can build the meal plan when the service recovers.'
  }
  if (scopedIntent === 'workout') {
    return ragAvailable
      ? 'The workout coach is temporarily unavailable. I found related reference material, but I cannot turn it into a stable final answer right now. Please try again shortly, or add your goal, weekly training frequency, equipment, and injury limits so I can build the program when the service recovers.'
      : 'The workout coach is temporarily unavailable right now. Please try again shortly, or add your goal, weekly training frequency, equipment, and injury limits so I can build the program when the service recovers.'
  }
  return ragAvailable
    ? 'The coaching service is temporarily unavailable. I found related reference material, but I cannot turn it into a stable final answer right now. Please try again shortly, or separate your workout goal and nutrition goal in the next message so I can structure both sections when the service recovers.'
    : 'The coaching service is temporarily unavailable right now. Please try again shortly, or separate your workout goal and nutrition goal in the next message so I can structure both sections when the service recovers.'
}

function buildFallbackAssistantReply({ userMessage, user, ragChunks }) {
  const language = detectRequestLanguage(userMessage)
  const intent = detectChatIntent(userMessage)
  const helpChunks = (ragChunks || []).filter((chunk) => chunk.sourceType === 'product_help')

  if (language === 'zh') {
    return buildTemporaryUnavailableMessage({
      language,
      intent,
      ragAvailable: ragChunks.length > 0
    })
  }

  const name = user?.name || 'there'
  if (helpChunks.length) {
    const helpBody = helpChunks
      .map((chunk, index) => `${index + 1}. ${chunk.chunkText}`)
      .join('\n\n')
    return appendSourcesBlock(
      `Hi ${name}. I found a product usage answer for your question.\n\n${helpBody}\n\nIf this still does not solve the issue, share your exact error message and I will guide you step by step.`,
      ragChunks,
      { language }
    )
  }

  if (!ragChunks.length) {
    return buildTemporaryUnavailableMessage({
      language,
      intent,
      ragAvailable: false
    })
  }

  const topFindings = ragChunks.slice(0, 3).map((chunk, index) => {
    const snippet = chunk.chunkText.replace(/\s+/g, ' ').slice(0, 180)
    return `${index + 1}. ${snippet}`
  })
  const intro =
    intent === 'nutrition'
      ? `Hi ${name}. I found nutrition-related reference material while the live coach is temporarily unavailable.`
      : intent === 'workout'
      ? `Hi ${name}. I found training-related reference material while the live coach is temporarily unavailable.`
      : `Hi ${name}. I found related training and nutrition reference material while the live coach is temporarily unavailable.`
  const base = [
    intro,
    '',
    'Key findings:',
    ...topFindings,
    '',
    intent === 'nutrition'
      ? 'If you share your goal, time frame, dietary preferences, and restrictions, I can turn this into a structured meal plan when the service recovers.'
      : intent === 'workout'
      ? 'If you share your goal, training days per week, equipment, and injury limits, I can turn this into a structured workout plan when the service recovers.'
      : 'If you share your goal, training days per week, equipment, dietary preferences, and restrictions, I can turn this into a structured workout and nutrition plan when the service recovers.'
  ].join('\n')
  return appendSourcesBlock(base, ragChunks, { language })
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
  const endpoint = resolveChatApiUrl()
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

function buildAgentApiUrl(targetPath) {
  const endpoint = resolveChatApiUrl()
  const normalizedTargetPath = `/${String(targetPath || '')
    .trim()
    .replace(/^\/+/, '')}`
  if (!endpoint || normalizedTargetPath === '/') return ''
  try {
    const url = new URL(endpoint)
    url.pathname = /\/chat\/?$/i.test(url.pathname)
      ? url.pathname.replace(/\/chat\/?$/i, normalizedTargetPath)
      : `${url.pathname.replace(/\/$/, '')}${normalizedTargetPath}`
    url.search = ''
    return url.toString()
  } catch {
    if (/\/chat\/?$/i.test(endpoint)) {
      return endpoint.replace(/\/chat\/?$/i, normalizedTargetPath)
    }
    return `${endpoint.replace(/\/$/, '')}${normalizedTargetPath}`
  }
}

async function requestCustomAgentEndpoint({ path, payload, timeoutMs = CHAT_REQUEST_TIMEOUT_MS, label }) {
  const endpoint = buildAgentApiUrl(path)
  if (!endpoint) {
    throw new Error(`${label} endpoint is not configured.`)
  }

  const headers = { 'Content-Type': 'application/json' }
  if (AI_CHAT_API_KEY) {
    headers.Authorization = `Bearer ${AI_CHAT_API_KEY}`
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {})
    },
    timeoutMs,
    `${label} request`
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `${label} endpoint error: ${response.status}`)
  }

  return response.json().catch(() => ({}))
}

async function requestAnalyticsInsight({ summary, rangeDays, snapshotVersion, userProfile }) {
  const payload = await requestCustomAgentEndpoint({
    path: '/analytics/insight',
    payload: {
      summary,
      range_days: rangeDays,
      snapshot_version: snapshotVersion,
      user_profile: userProfile || null
    },
    timeoutMs: ANALYTICS_INSIGHT_TIMEOUT_MS,
    label: 'Analytics insight'
  })
  return payload?.insight || null
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
  const endpoint = resolveChatApiUrl()
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

function formatAnalyticsTimeRange(rangeDays) {
  return `Last ${rangeDays} days`
}

function buildAnalyticsSnapshotVersion(summary, rangeDays) {
  return createHash('sha256')
    .update(JSON.stringify({ rangeDays, summary: summary || {} }))
    .digest('hex')
    .slice(0, 16)
}

function normalizeAnalyticsText(value) {
  return normalizeMessageText(value)
    .replace(/\s+/g, ' ')
    .replace(/^[•\-]\s*/, '')
    .trim()
}

function hasDirtyAnalyticsText(value) {
  const text = normalizeAnalyticsText(value)
  return Boolean(text) && ANALYTICS_DIRTY_TEXT_RE.test(text)
}

function uniqueAnalyticsItems(values = []) {
  const seen = new Set()
  const items = []
  for (const value of values) {
    const key = String(value).toLowerCase()
    if (!value || seen.has(key)) continue
    seen.add(key)
    items.push(value)
  }
  return items
}

function normalizeAnalyticsList(value, limit = 3) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : []
  const cleaned = source
    .map((item) => normalizeAnalyticsText(item))
    .filter((item) => item && !hasDirtyAnalyticsText(item))
  return uniqueAnalyticsItems(cleaned).slice(0, limit)
}

function normalizeAnalyticsConfidence(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'high' || normalized === 'medium') return normalized
  return 'low'
}

function supportsNutritionAnalytics(summary) {
  const goal = String(summary?.goal?.primary || '').trim().toLowerCase()
  const intakeKcal = numericValue(summary?.nutrition?.intakeKcal, 0)
  const deficitKcal = numericValue(summary?.nutrition?.deficitKcal, 0)
  const intakeNote = normalizeAnalyticsText(summary?.nutrition?.intakeNote || '')
  const hasGoal = goal === 'fat-loss' || goal === 'muscle-gain' || goal === 'maintenance'
  const hasData = intakeKcal > 0 || Math.abs(deficitKcal) > 0 || Boolean(intakeNote)
  return hasGoal && hasData
}

function assessAnalyticsDataState(summary) {
  const sessions = numericValue(summary?.totals?.sessions, 0)
  const totalMinutes = numericValue(summary?.totals?.minutes, 0)
  const weightRecords = Array.isArray(summary?.body?.weightRecords) ? summary.body.weightRecords.length : 0
  const bodyFatRecords = Array.isArray(summary?.body?.bodyFatRecords) ? summary.body.bodyFatRecords.length : 0
  const circumferenceRecords = Array.isArray(summary?.body?.circumference) ? summary.body.circumference.length : 0
  const sparseSessions = sessions < 2 || totalMinutes < 30
  const sparseBody = weightRecords < 2 && bodyFatRecords < 2 && circumferenceRecords < 2
  return {
    sessions,
    totalMinutes,
    weightRecords,
    bodyFatRecords,
    circumferenceRecords,
    sparseSessions,
    sparseBody,
    insufficientData: sparseSessions || sparseBody
  }
}

function normalizeAnalyticsInsightPayload(payload, { rangeDays, snapshotVersion }) {
  if (!payload || typeof payload !== 'object') return null

  const keyInsight = normalizeAnalyticsText(payload.keyInsight || '')
  if (!keyInsight || hasDirtyAnalyticsText(keyInsight)) return null

  const risks = normalizeAnalyticsList(payload.risks, 3)
  const next7Days = normalizeAnalyticsList(payload.next7Days, 3)
  const confidence = normalizeAnalyticsConfidence(payload.confidence)

  return {
    keyInsight,
    risks,
    next7Days,
    confidence,
    insufficientData: Boolean(payload.insufficientData),
    basedOn: {
      timeRange: formatAnalyticsTimeRange(rangeDays),
      snapshotVersion
    }
  }
}

function buildLowDataAnalyticsInsight(summary, rangeDays, snapshotVersion) {
  const dataState = assessAnalyticsDataState(summary)
  const pendingSessions = numericValue(summary?.totals?.pending, 0)
  const risks = []
  const next7Days = []
  const missingWeightEntries = Math.max(0, 2 - dataState.weightRecords)
  const missingBodyFatEntries = Math.max(0, 2 - dataState.bodyFatRecords)

  if (dataState.sparseSessions) {
    risks.push('Training consistency is still too sparse for a reliable performance read.')
    next7Days.push(
      rangeDays <= 7
        ? 'Log 2 completed workouts on separate days this week.'
        : 'Log 2 completed workouts in separate weeks to unlock a reliable trend.'
    )
  }

  if (dataState.weightRecords < 2) {
    next7Days.push(`Record ${missingWeightEntries} more weigh-in${missingWeightEntries === 1 ? '' : 's'} to unlock a weight trend.`)
  } else if (dataState.bodyFatRecords < 2) {
    next7Days.push(`Record ${missingBodyFatEntries} more body fat ${missingBodyFatEntries === 1 ? 'entry' : 'entries'} to unlock a body fat trend.`)
  } else if (dataState.circumferenceRecords < 2) {
    next7Days.push('Record 1 more circumference measurement to unlock a comparison trend.')
  }

  if (pendingSessions > 0 && next7Days.length < 3) {
    next7Days.push('Convert 1 pending session into a completed workout.')
  }

  if (dataState.sparseBody) {
    risks.push('Body-metric coverage is too thin to confirm physical change yet.')
  }

  return {
    keyInsight: `Only ${dataState.sessions} session${dataState.sessions === 1 ? '' : 's'} and ${dataState.totalMinutes} total minutes are logged in ${formatAnalyticsTimeRange(rangeDays).toLowerCase()}, so this insight is based on limited data.`,
    risks: risks.slice(0, 3),
    next7Days: uniqueAnalyticsItems(next7Days).slice(0, 3),
    confidence: 'low',
    insufficientData: true,
    basedOn: {
      timeRange: formatAnalyticsTimeRange(rangeDays),
      snapshotVersion
    }
  }
}

function buildStructuredAnalyticsFallback(summary, rangeDays, snapshotVersion) {
  const totals = summary?.totals || {}
  const streaks = summary?.streaks || {}
  const challenges = Array.isArray(summary?.challenges) ? summary.challenges : []
  const muscles = Array.isArray(summary?.muscles) ? summary.muscles : []
  const weightRecords = Array.isArray(summary?.body?.weightRecords) ? summary.body.weightRecords : []
  const latestWeight = weightRecords.length ? numericValue(weightRecords[weightRecords.length - 1]?.value, 0) : null
  const previousWeight = weightRecords.length > 1 ? numericValue(weightRecords[weightRecords.length - 2]?.value, 0) : null
  const weightChange =
    latestWeight != null && previousWeight != null ? Number((latestWeight - previousWeight).toFixed(1)) : null

  const sessions = numericValue(totals.sessions, 0)
  const completionRate = numericValue(totals.completionRate, 0)
  const totalMinutes = numericValue(totals.minutes, 0)
  const avgDailyMinutes = numericValue(totals.avgDailyMinutes, 0)
  const currentStreak = numericValue(streaks.current, 0)
  const bestStreak = numericValue(streaks.best, 0)
  const pendingSessions = numericValue(totals.pending, 0)
  const topFocus = muscles[0]?.name || 'general training'
  const weeklyMinutesTarget = 180

  const weakChallenges = challenges
    .filter((item) => numericValue(item.progressPercent, 0) > 0 && numericValue(item.progressPercent, 0) < 70)
    .map((item) => item.title)
    .slice(0, 2)

  const risks = []
  if (completionRate < 65) {
    risks.push('Completion is below target, so the current workload or schedule may be too aggressive.')
  }
  if (avgDailyMinutes < 20) {
    risks.push('Daily movement volume is low for progression, so consistency is the main bottleneck.')
  }
  if (weakChallenges.length) {
    risks.push(`Lowest-adherence targets right now: ${weakChallenges.join(', ')}.`)
  }

  const next7Days = []
  if (pendingSessions > 0) {
    next7Days.push('Convert at least 1 pending session into a completed workout by midweek.')
  }
  if (totalMinutes < weeklyMinutesTarget) {
    next7Days.push(`Reach ${weeklyMinutesTarget} training minutes across at least 3 logged sessions this week.`)
  }
  if (weightRecords.length < 2) {
    next7Days.push('Record 1 more weigh-in to unlock a weight comparison.')
  }
  if (supportsNutritionAnalytics(summary) && next7Days.length < 3) {
    const goal = String(summary?.goal?.primary || '').trim().toLowerCase()
    if (goal === 'fat-loss') {
      next7Days.push('Keep a moderate calorie deficit and log intake on at least 5 days this week.')
    } else if (goal === 'muscle-gain') {
      next7Days.push('Support training days with a logged calorie surplus and keep protein consistent each day.')
    } else {
      next7Days.push('Keep calorie intake steady across the week and log meals on your busiest training days.')
    }
  }

  const weightClause =
    weightChange == null
      ? 'No previous comparison is available for body weight yet.'
      : weightChange === 0
        ? 'Body weight is stable versus the previous comparable entry.'
        : `Body weight is ${weightChange > 0 ? 'up' : 'down'} ${Math.abs(weightChange).toFixed(1)} kg versus the previous comparable entry.`

  return {
    keyInsight: `In ${formatAnalyticsTimeRange(rangeDays).toLowerCase()}, you logged ${sessions} sessions, completed ${completionRate}% of planned work, and accumulated ${totalMinutes} total minutes. Your current streak is ${currentStreak} days (best ${bestStreak}), and ${weightClause} Top focus area: ${topFocus}.`,
    risks: risks.slice(0, 3),
    next7Days: uniqueAnalyticsItems(next7Days).slice(0, 3),
    confidence: sessions >= 4 ? 'medium' : 'low',
    insufficientData: false,
    basedOn: {
      timeRange: formatAnalyticsTimeRange(rangeDays),
      snapshotVersion
    }
  }
}

async function findOrCreateUser(profile) {
  const normalizedEmail =
    typeof profile.email === 'string' && profile.email.trim()
      ? profile.email.trim().toLowerCase()
      : null
  const normalizedSex =
    String(profile.sex || '').trim().toLowerCase() === 'male'
      ? 'male'
      : String(profile.sex || '').trim().toLowerCase() === 'female'
        ? 'female'
        : undefined
  const normalizedBirthday = profile.birthday ? new Date(profile.birthday) : undefined
  const normalizedHeightCm = profile.heightCm !== undefined ? normalizeNumber(profile.heightCm) : undefined
  const normalizedWeightKg = profile.weightKg !== undefined ? normalizeNumber(profile.weightKg) : undefined
  const updateData = {
    email: normalizedEmail ?? undefined,
    name: profile.name ?? undefined,
    avatar: profile.avatar ?? undefined,
    username: profile.username ?? undefined,
    sex: normalizedSex,
    birthday: normalizedBirthday,
    heightCm: normalizedHeightCm,
    weightKg: normalizedWeightKg,
    onboardingCompleted:
      typeof profile.onboardingCompleted === 'boolean'
        ? profile.onboardingCompleted
        : undefined,
    onboardingAnswers: profile.onboardingAnswers ?? undefined
  }

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
      data: updateData
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
          ...updateData,
          email: normalizedEmail
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
      avatar: profile.avatar ?? null,
      username: profile.username ?? null,
      sex: normalizedSex ?? null,
      birthday: normalizedBirthday ?? null,
      heightCm: normalizedHeightCm ?? null,
      weightKg: normalizedWeightKg ?? null,
      onboardingCompleted: Boolean(profile.onboardingCompleted),
      onboardingAnswers: profile.onboardingAnswers ?? null
    }
  })
  return { user: createdUser, created: true }
}

function buildSupabaseServerProfile(authUser) {
  const metadata = authUser?.user_metadata && typeof authUser.user_metadata === 'object'
    ? authUser.user_metadata
    : {}
  const displayName =
    normalizeOptionalText(metadata.full_name || metadata.name) ||
    normalizeOptionalText(authUser?.email?.split?.('@')?.[0]) ||
    'User'

  return {
    provider: 'supabase',
    providerId: String(authUser?.id || ''),
    email: authUser?.email || null,
    name: displayName,
    avatar: normalizeOptionalText(metadata.avatar_url),
    username: normalizeOptionalText(metadata.username),
    sex: normalizeOptionalText(metadata.sex),
    birthday: normalizeOptionalText(metadata.birthday),
    heightCm: metadata.height_cm ?? metadata.height ?? null,
    weightKg: metadata.weight_kg ?? metadata.weight ?? null
  }
}

app.post('/auth/supabase/session', async (req, res) => {
  try {
    const accessToken = getBearerToken(req)
    const authUser = await getSupabaseAuthUser(accessToken)
    const { user } = await findOrCreateUser(buildSupabaseServerProfile(authUser))
    const sessionUser = buildLocalSessionUser(user, {
      account: authUser.email || user.email || authUser.id,
      email: authUser.email || user.email || null
    })
    const session = issueSession(sessionUser)
    setSessionCookie(res, session)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Supabase session sync failed', err)
    return res.status(Number(err?.statusCode) || 401).json({
      error: err?.message || 'Failed to create backend session from Supabase auth.'
    })
  }
})

// Legacy local registration endpoints retained for older clients.
// The current web frontend signs up with Supabase Auth email/password + OTP verification.
app.get('/auth/supabase/email-status', async (req, res) => {
  try {
    const email = normalizeOptionalEmail(req.query.email)
    if (!EMAIL_PATTERN.test(email || '')) {
      return res.status(400).json({ error: 'Invalid email address.' })
    }

    const authUser = await lookupSupabaseAuthUserByEmail(email)
    return res.json({
      exists: Boolean(authUser),
      confirmed: Boolean(authUser?.confirmed)
    })
  } catch (error) {
    console.error('Supabase email status lookup failed', error)
    return res.status(500).json({ error: 'Failed to check email status.' })
  }
})

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
    const { ipAddress, userAgent } = extractRequestMetadata(req)

    await assertVerificationRateLimit({
      email: normalized.email,
      purpose: 'REGISTRATION',
      accountKey: normalized.accountKey,
      ipAddress
    })

    const registrationPayload = {
      account: normalized.account,
      accountKey: normalized.accountKey,
      email: normalized.email,
      name: normalized.name,
      sex: normalized.sex,
      birthday: normalized.birthday,
      height: normalized.height,
      weight: normalized.weight,
      avatar: normalized.avatar,
      passwordHash: passwordSecret.hash,
      passwordSalt: passwordSecret.salt
    }

    await createVerificationRecord({
      email: normalized.email || normalized.accountKey,
      purpose: 'REGISTRATION',
      accountKey: normalized.accountKey,
      codeHash: verificationCodeHash,
      expiresAt,
      ipAddress,
      userAgent,
      payload: registrationPayload
    })

    const delivery = await sendVerificationEmailOrFallback({
      email: normalized.email,
      code: verificationCode,
      purpose: 'REGISTRATION'
    })

    return res.json({
      ok: true,
      deliveryTarget: normalized.email || normalized.account,
      expiresIn: Math.floor(LEGACY_VERIFICATION_TTL_MS / 1000),
      resendIn: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      debugCode: process.env.NODE_ENV === 'production' ? undefined : verificationCode,
      notice:
        delivery.delivered
          ? 'Verification code sent.'
          : process.env.NODE_ENV === 'production'
            ? 'Verification code generated.'
            : 'Verification code generated in cloud state. Email delivery was skipped in development, so the code is shown directly.'
    })
  } catch (err) {
    console.error('Local verification send failed', err)
    return res.status(err?.statusCode || 400).json({
      error: err?.message || 'Failed to create verification state.',
      retryAfter: err?.retryAfterSeconds || undefined
    })
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

    const verification = await findLatestActiveVerificationRecord({
      email: accountKey,
      purpose: 'REGISTRATION',
      accountKey
    })
    if (!verification) {
      return res.status(404).json({ error: 'No verification request was found for this account.' })
    }
    if (verification.consumed_at) {
      return res.status(400).json({ error: 'This verification code has already been used.' })
    }
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Please resend.' })
    }
    if (Number(verification.attempt_count || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Please request a new code.' })
    }
    if (hashVerificationCode(code) !== String(verification.code_hash || '')) {
      await incrementVerificationAttempt(verification.id)
      return res.status(400).json({ error: 'Incorrect verification code.' })
    }

    const payload = verification.payload && typeof verification.payload === 'object'
      ? verification.payload
      : {}
    if (!payload.passwordHash || !payload.passwordSalt) {
      return res.status(400).json({ error: 'Verification payload is incomplete. Please resend the code.' })
    }
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
      String(payload.passwordHash || ''),
      String(payload.passwordSalt || '')
    )

    await consumeVerificationRecord(verification.id)

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

// Legacy local password login endpoint retained for older clients.
// The current web frontend signs in with Supabase Auth `signInWithPassword`.
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

// Legacy password-reset endpoints retained temporarily for older clients.
// The current web frontend uses Supabase Auth recovery instead of these routes.
const PASSWORD_RESET_GENERIC_RESPONSE = {
  success: true,
  message: 'If an account exists for this email, a verification code has been sent.'
}

app.post('/api/auth/password-reset/send-code', async (req, res) => {
  try {
    const email = normalizeOptionalEmail(req.body?.email)
    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    const { ipAddress, userAgent } = extractRequestMetadata(req)
    await assertVerificationRateLimit({
      email,
      purpose: 'RESET_PASSWORD',
      ipAddress
    })

    const accountRow = await findLegacyLocalAccountByIdentifier(email)
    if (!accountRow || !normalizeOptionalEmail(accountRow.email)) {
      return res.json(PASSWORD_RESET_GENERIC_RESPONSE)
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)
    const expiresAt = new Date(Date.now() + LEGACY_VERIFICATION_TTL_MS)

    await createVerificationRecord({
      email,
      purpose: 'RESET_PASSWORD',
      accountKey: accountRow.account_key,
      codeHash: verificationCodeHash,
      expiresAt,
      ipAddress,
      userAgent,
      payload: {
        account: accountRow.account
      }
    })

    const delivery = await sendVerificationEmailOrFallback({
      email,
      code: verificationCode,
      purpose: 'RESET_PASSWORD'
    })

    return res.json({
      ...PASSWORD_RESET_GENERIC_RESPONSE,
      resendIn: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
      expiresIn: Math.floor(LEGACY_VERIFICATION_TTL_MS / 1000),
      debugCode: process.env.NODE_ENV === 'production' ? undefined : verificationCode,
      notice:
        delivery.delivered || process.env.NODE_ENV === 'production'
          ? PASSWORD_RESET_GENERIC_RESPONSE.message
          : `${PASSWORD_RESET_GENERIC_RESPONSE.message} Dev code: ${verificationCode}`
    })
  } catch (err) {
    console.error('Password reset send-code failed', err)
    return res.status(err?.statusCode || 500).json({
      error: err?.message || 'Failed to send verification code.',
      retryAfter: err?.retryAfterSeconds || undefined
    })
  }
})

app.post('/api/auth/password-reset/verify-code', async (req, res) => {
  try {
    const email = normalizeOptionalEmail(req.body?.email)
    const code = String(req.body?.code || '').trim()
    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    const verification = await findLatestActiveVerificationRecord({
      email,
      purpose: 'RESET_PASSWORD'
    })
    if (!verification) {
      return res.status(400).json({ error: 'Verification code expired' })
    }
    if (Number(verification.attempt_count || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' })
    }

    if (hashVerificationCode(code) !== String(verification.code_hash || '')) {
      await incrementVerificationAttempt(verification.id)
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    const { ipAddress, userAgent } = extractRequestMetadata(req)
    await consumeVerificationRecord(verification.id)
    const resetToken = await createPasswordResetToken({
      email,
      ipAddress,
      userAgent
    })

    return res.json({
      success: true,
      reset_token: resetToken?.rawToken || ''
    })
  } catch (err) {
    console.error('Password reset verify-code failed', err)
    return res.status(500).json({ error: err?.message || 'Failed to verify code.' })
  }
})

app.post('/api/auth/password-reset/confirm', async (req, res) => {
  try {
    const email = normalizeOptionalEmail(req.body?.email)
    const resetToken = String(req.body?.reset_token || '').trim()
    const newPassword = String(req.body?.new_password || '')
    const confirmPassword = String(req.body?.confirm_password || '')

    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }
    if (!resetToken) {
      return res.status(400).json({ error: 'Reset session expired. Please request a new code.' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must meet minimum security requirements' })
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' })
    }

    const tokenRecord = await findActivePasswordResetToken({
      email,
      rawToken: resetToken
    })
    if (!tokenRecord) {
      return res.status(400).json({ error: 'Reset session expired. Please request a new code.' })
    }

    const accountRow = await findLegacyLocalAccountByIdentifier(email)
    if (!accountRow || !normalizeOptionalEmail(accountRow.email)) {
      return res.status(400).json({ error: 'Reset session expired. Please request a new code.' })
    }

    const passwordSecret = await hashPasswordSecret(newPassword)
    await prisma.$executeRawUnsafe(
      `
        update public.legacy_local_auth_accounts
        set password_hash = $1,
            password_salt = $2,
            updated_at = now()
        where email = $3
      `,
      passwordSecret.hash,
      passwordSecret.salt,
      email
    )

    await consumePasswordResetToken(tokenRecord.id)
    await invalidatePasswordResetTokens(email)
    await invalidateVerificationRecords({
      email,
      purpose: 'RESET_PASSWORD'
    })
    clearSessionCookie(res)

    return res.json({
      success: true,
      message: 'Password updated. You can now sign in with your new password.'
    })
  } catch (err) {
    console.error('Password reset confirm failed', err)
    return res.status(500).json({ error: err?.message || 'Failed to update password.' })
  }
})

// Start Google OAuth flow
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(500).send('Google OAuth is not configured.')
  }
  const redirectTarget = resolveRedirectTarget(req.query.redirect, req)
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
    const { id_token: idToken, access_token: accessToken } = tokenJson
    if (!idToken) return res.status(401).send('Missing id_token from Google')

    await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    })
    const redirectTarget = resolveRedirectTarget(typeof state === 'string' ? state : redirect, req)
    const callbackOrigin = resolveTargetOrigin(redirectTarget) || APP_ORIGIN
    const appCallback = new URL('/auth/callback', callbackOrigin)
    if (redirectTarget) {
      appCallback.searchParams.set('redirect', redirectTarget)
    }

    const hashParams = new URLSearchParams({
      provider: 'google',
      google_id_token: idToken
    })
    if (accessToken) {
      hashParams.set('google_access_token', accessToken)
    }
    appCallback.hash = hashParams.toString()

    res.redirect(appCallback.toString())
  } catch (err) {
    console.error('Google callback error', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack
    })
    res.status(500).send('Google auth failed')
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

app.post('/api/ai/agent-runs', requireAuth, async (req, res) => {
  const userId = Number(req.session.id)
  const agentType = normalizeAiAgentType(req.body?.agentType)

  if (!agentType) {
    return res.status(400).json({ error: 'Invalid agentType.' })
  }

  await recordAiAgentRun({
    userId,
    agentType,
    success: Boolean(req.body?.success),
    usedFallback: Boolean(req.body?.usedFallback),
    latencyMs: req.body?.latencyMs,
    errorMessage: req.body?.errorMessage
  })

  return res.json({ ok: true })
})

app.get('/api/ai/agent-stats', requireAuth, async (req, res) => {
  const requestedDays = Number.parseInt(req.query.days, 10)
  const days =
    Number.isInteger(requestedDays) && requestedDays > 0
      ? Math.min(Math.max(requestedDays, 1), 90)
      : 7
  const scope = String(req.query.scope || 'global').trim().toLowerCase() === 'me' ? 'me' : 'global'
  const userId = scope === 'me' ? Number(req.session.id) : null
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const overallRows = await prisma.$queryRawUnsafe(
      `
        select
          count(*)::int as total,
          count(*) filter (where success)::int as success_count,
          count(*) filter (where not success)::int as failure_count,
          count(*) filter (where used_fallback)::int as fallback_count,
          count(*) filter (where success and not used_fallback)::int as direct_ai_count
        from public.ai_agent_runs
        where created_at >= $1
          and ($2::int is null or user_id = $2)
      `,
      since,
      Number.isInteger(userId) && userId > 0 ? userId : null
    )

    const agentRows = await prisma.$queryRawUnsafe(
      `
        select
          agent_type,
          count(*)::int as total,
          count(*) filter (where success)::int as success_count,
          count(*) filter (where not success)::int as failure_count,
          count(*) filter (where used_fallback)::int as fallback_count,
          count(*) filter (where success and not used_fallback)::int as direct_ai_count
        from public.ai_agent_runs
        where created_at >= $1
          and ($2::int is null or user_id = $2)
        group by agent_type
        order by agent_type asc
      `,
      since,
      Number.isInteger(userId) && userId > 0 ? userId : null
    )

    const overallRow = overallRows?.[0] || {}
    const overallTotal = Number(overallRow.total || 0)
    const overallSuccess = Number(overallRow.success_count || 0)
    const overallFailure = Number(overallRow.failure_count || 0)
    const overallFallback = Number(overallRow.fallback_count || 0)
    const overallDirectAi = Number(overallRow.direct_ai_count || 0)

    return res.json({
      ok: true,
      scope,
      days,
      overall: {
        total: overallTotal,
        successCount: overallSuccess,
        failureCount: overallFailure,
        fallbackCount: overallFallback,
        directAiCount: overallDirectAi,
        successRate: overallTotal ? overallSuccess / overallTotal : 0
      },
      agents: Array.isArray(agentRows)
        ? agentRows.map((row) => {
            const total = Number(row.total || 0)
            const successCount = Number(row.success_count || 0)
            const failureCount = Number(row.failure_count || 0)
            const fallbackCount = Number(row.fallback_count || 0)
            const directAiCount = Number(row.direct_ai_count || 0)
            return {
              agentType: String(row.agent_type || ''),
              total,
              successCount,
              failureCount,
              fallbackCount,
              directAiCount,
              successRate: total ? successCount / total : 0
            }
          })
        : []
    })
  } catch (err) {
    console.error('Failed to load AI agent stats', err)
    return res.status(500).json({ error: 'Failed to load AI agent stats.' })
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
  const startedAt = Date.now()

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

    await recordAiAgentRun({
      userId,
      agentType: 'chat',
      success: Boolean(String(assistantMessage?.content || '').trim()),
      usedFallback: Boolean(assistantReply.usedFallback),
      latencyMs: Date.now() - startedAt
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
    await recordAiAgentRun({
      userId,
      agentType: 'chat',
      success: false,
      usedFallback: false,
      latencyMs: Date.now() - startedAt,
      errorMessage: err?.message || 'Failed to send message.'
    })
    res.status(500).json({ error: 'Failed to send message' })
  }
})

app.post('/api/ai/analytics/insights', requireAuth, async (req, res) => {
  const userId = Number(req.session.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user session.' })
  }
  const startedAt = Date.now()

  try {
    const requestedRange = Number.parseInt(req.body?.rangeDays, 10)
    const rangeDays =
      Number.isInteger(requestedRange) && requestedRange > 0
        ? Math.min(Math.max(requestedRange, 7), 180)
        : 30
    const summary = req.body?.summary && typeof req.body.summary === 'object' ? req.body.summary : {}
    const requestedSnapshotVersion = normalizeAnalyticsText(req.body?.snapshotVersion || '')
    const snapshotVersion = requestedSnapshotVersion || buildAnalyticsSnapshotVersion(summary, rangeDays)
    const dataState = assessAnalyticsDataState(summary)

    let insight = dataState.insufficientData
      ? buildLowDataAnalyticsInsight(summary, rangeDays, snapshotVersion)
      : buildStructuredAnalyticsFallback(summary, rangeDays, snapshotVersion)
    let source = dataState.insufficientData ? 'low_data' : 'heuristic_fallback'
    let usedFallback = true
    let unavailable = false

    if (!dataState.insufficientData) {
      try {
        const user = await findUserById(userId)
        const agentInsight = await requestAnalyticsInsight({
          summary,
          rangeDays,
          snapshotVersion,
          userProfile: user
            ? {
                id: user.id,
                email: user.email || null,
                name: user.name || null,
                sex: user.sex || null,
                heightCm: user.heightCm ?? null,
                weightKg: user.weightKg ?? null,
                onboardingAnswers: user.onboardingAnswers ?? null
              }
            : null
        })
        const normalizedInsight = normalizeAnalyticsInsightPayload(agentInsight, {
          rangeDays,
          snapshotVersion
        })

        if (normalizedInsight) {
          insight = normalizedInsight
          source = 'ai'
          usedFallback = false
        } else {
          source = dataState.insufficientData ? 'low_data' : 'heuristic_fallback'
          usedFallback = true
          unavailable = false
        }
      } catch (err) {
        console.error('Failed to generate analytics insights', err)
      }
    }

    await recordAiAgentRun({
      userId,
      agentType: 'analytics',
      success: Boolean(insight),
      usedFallback,
      latencyMs: Date.now() - startedAt,
      errorMessage: !insight && unavailable ? 'Analytics insight unavailable.' : null
    })

    return res.json({
      ok: true,
      insight,
      meta: {
        source,
        usedFallback,
        unavailable,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (err) {
    console.error('Failed to generate analytics insight route', err)
    await recordAiAgentRun({
      userId,
      agentType: 'analytics',
      success: false,
      usedFallback: false,
      latencyMs: Date.now() - startedAt,
      errorMessage: err?.message || 'Failed to generate analytics insight.'
    })
    return res.status(500).json({ error: 'Failed to generate analytics insight.' })
  }
})

app.post('/api/ai/nutrition/cards', requireAuth, async (req, res) => {
  try {
    const payload = await requestCustomAgentEndpoint({
      path: '/nutrition/cards',
      payload: req.body && typeof req.body === 'object' ? req.body : {},
      timeoutMs: NUTRITION_CARDS_TIMEOUT_MS,
      label: 'Nutrition cards'
    })
    return res.json(payload)
  } catch (err) {
    console.error('Failed to load nutrition AI cards', err)
    return res.status(502).json({ error: err?.message || 'Failed to load nutrition AI cards.' })
  }
})

app.post('/api/ai/nutrition/targets', requireAuth, async (req, res) => {
  try {
    const payload = await requestCustomAgentEndpoint({
      path: '/nutrition/targets',
      payload: req.body && typeof req.body === 'object' ? req.body : {},
      timeoutMs: NUTRITION_TARGETS_TIMEOUT_MS,
      label: 'Nutrition targets'
    })
    return res.json(payload)
  } catch (err) {
    console.error('Failed to load nutrition AI targets', err)
    return res.status(502).json({ error: err?.message || 'Failed to load nutrition AI targets.' })
  }
})

app.post('/api/ai/nutrition/estimate-food', requireAuth, async (req, res) => {
  try {
    const payload = await requestCustomAgentEndpoint({
      path: '/nutrition/estimate-food',
      payload: req.body && typeof req.body === 'object' ? req.body : {},
      timeoutMs: CHAT_REQUEST_TIMEOUT_MS,
      label: 'Nutrition estimate'
    })
    return res.json(payload)
  } catch (err) {
    console.error('Failed to estimate nutrition food', err)
    return res.status(502).json({ error: err?.message || 'Failed to estimate nutrition food.' })
  }
})

const server = app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Auth server is already running on port ${PORT}. Stop the existing process before starting another one.`)
    process.exit(1)
  }
  throw err
})
