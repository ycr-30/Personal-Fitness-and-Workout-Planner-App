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
  JWT_SECRET = 'replace-me'
} = process.env

const app = express()
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)
const secureCookie = process.env.NODE_ENV === 'production'

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

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
