import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import appleSignin from 'apple-signin-auth'
import { PrismaClient } from '@prisma/client'
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
  AI_CHAT_API_URL = '',
  AI_CHAT_API_KEY = '',
  AI_CHAT_API_FORMAT = 'custom',
  AI_CHAT_MODEL = '',
  AI_CHAT_SYSTEM_PROMPT = '',
  AI_CHAT_TEMPERATURE = '0.2',
  AI_CHAT_MAX_TOKENS = '700',
  AI_EMBEDDING_API_URL = '',
  AI_EMBEDDING_API_KEY = '',
  AI_EMBEDDING_API_FORMAT = 'openai',
  AI_EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5',
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  })
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  })
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
app.get('/me', (req, res) => {
  const token = req.cookies.session
  if (!token) return res.status(401).json({ error: 'No session' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    res.json({ ok: true, user: decoded })
  } catch (err) {
    res.status(401).json({ error: 'Session invalid' })
  }
})

app.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
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

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
