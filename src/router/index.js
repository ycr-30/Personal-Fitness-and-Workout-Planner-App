import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getStableDeviceId, saveCloudClientState } from '@/lib/cloudClientState'

const Landing = () => import('@/pages/Landing.vue')
const Privacy = () => import('@/pages/Privacy.vue')
const Terms = () => import('@/pages/Terms.vue')
const Disclaimer = () => import('@/pages/Disclaimer.vue')
const Login = () => import('@/pages/auth/Login.vue')
const Register = () => import('@/pages/auth/Register.vue')
const OAuthCallback = () => import('@/pages/auth/OAuthCallback.vue')
const Dashboard = () => import('@/pages/app/Dashboard.vue')
const Plans = () => import('@/pages/app/Plans.vue')
const Progress = () => import('@/pages/app/Progress.vue')
const Schedule = () => import('@/pages/app/Schedule.vue')
const Nutrition = () => import('@/pages/app/Nutrition.vue')
const Logs = () => import('@/pages/app/Logs.vue')
const MuscleMap = () => import('@/pages/app/MuscleMap.vue')
const Profile = () => import('@/pages/app/Profile.vue')
const Settings = () => import('@/pages/app/Settings.vue')
const Onboarding = () => import('@/pages/onboarding/Survey.vue')

const LAST_APP_ROUTE_KEY = import.meta.env.DEV ? 'pf_last_app_route_dev' : 'pf_last_app_route'
const ENABLE_CLOUD_LAST_ROUTE_SYNC = !import.meta.env.DEV

function writeLastAppRoute(route) {
  if (typeof window === 'undefined') return
  if (!route?.fullPath || !route?.meta?.requiresAuth) return
  window.localStorage.setItem(LAST_APP_ROUTE_KEY, route.fullPath)
}

function syncLastAppRouteToCloud(route) {
  if (!ENABLE_CLOUD_LAST_ROUTE_SYNC) return
  if (typeof window === 'undefined' || !route?.fullPath || !route?.meta?.requiresAuth) return
  saveCloudClientState({
    scope: 'device',
    deviceId: getStableDeviceId(),
    stateKey: 'last_app_route',
    stateValue: {
      value: route.fullPath
    }
  }).catch((error) => {
    console.error('Failed to save last route to cloud', error)
  })
}

const routes = [
  {
    path: '/',
    name: 'landing',
    component: Landing,
    meta: {
      hideShell: true,
      publicGuestRoute: true,
      pageTitle: 'Fitness AI Planner',
      pageDescription:
        'Plan smarter training, track real progress, and get grounded AI guidance from your workouts, body data, and nutrition logs.'
    }
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: Privacy,
    meta: {
      hideShell: true,
      publicGuestRoute: true,
      publicInfoPage: true,
      pageTitle: 'Privacy Policy | Fitness AI Planner',
      pageDescription:
        'Read how Fitness AI Planner handles account, workout, body, nutrition, hydration, and technical information.'
    }
  },
  {
    path: '/terms',
    name: 'terms',
    component: Terms,
    meta: {
      hideShell: true,
      publicGuestRoute: true,
      publicInfoPage: true,
      pageTitle: 'Terms of Service | Fitness AI Planner',
      pageDescription:
        'Review the core service terms, account responsibilities, AI-output limits, and acceptable-use expectations for Fitness AI Planner.'
    }
  },
  {
    path: '/disclaimer',
    name: 'disclaimer',
    component: Disclaimer,
    meta: {
      hideShell: true,
      publicGuestRoute: true,
      publicInfoPage: true,
      pageTitle: 'Disclaimer | Fitness AI Planner',
      pageDescription:
        'Understand the health, AI, and training limitations of Fitness AI Planner guidance before relying on recommendations.'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      guestOnly: true,
      hideShell: true,
      publicGuestRoute: true,
      pageTitle: 'Sign In | Fitness AI Planner',
      pageDescription:
        'Sign in to Fitness AI Planner to access your training plans, progress analytics, nutrition logs, and grounded AI guidance.'
    }
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      guestOnly: true,
      hideShell: true,
      publicGuestRoute: true,
      pageTitle: 'Create Account | Fitness AI Planner',
      pageDescription:
        'Create your Fitness AI Planner account to build training plans, log nutrition data, track progress, and receive grounded AI guidance.'
    }
  },
  {
    path: '/auth/callback',
    name: 'oauth-callback',
    component: OAuthCallback,
    meta: {
      hideShell: true,
      publicGuestRoute: true,
      pageTitle: 'Signing In | Fitness AI Planner',
      pageDescription: 'Completing secure sign-in.'
    }
  },
  { path: '/onboarding', name: 'onboarding', component: Onboarding, meta: { requiresAuth: true, hideShell: true } }, // Post-sign-in onboarding
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } }, // Main authenticated home
  { path: '/schedule', name: 'schedule', component: Schedule, meta: { requiresAuth: true } },
  { path: '/plan', name: 'plan', component: Plans, meta: { requiresAuth: true } },
  { path: '/plans', redirect: '/plan' },
  { path: '/progress', name: 'progress', component: Progress, meta: { requiresAuth: true } },
  { path: '/nutrition', name: 'nutrition', component: Nutrition, meta: { requiresAuth: true } },
  { path: '/logs', name: 'logs', component: Logs, meta: { requiresAuth: true } },
  { path: '/muscle-map', name: 'muscle-map', component: MuscleMap, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: Settings, meta: { requiresAuth: true } },
  // Fallback: route unknown paths to the landing page
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  const isOnboardingEdit = to.name === 'onboarding' && String(to.query.edit || '') === '1'
  const isRecoveryRoute = to.name === 'login' && String(to.query.mode || '') === 'recovery'
  const isPublicInfoPage = to.meta?.publicInfoPage === true
  const isLoggingOut = auth.isLoggingOut
  const shouldHydrateAuth = Boolean(to.meta.requiresAuth || to.meta.guestOnly || auth.user)

  if (!auth.user) auth.init()
  if (isLoggingOut) {
    if (to.meta.requiresAuth) {
      return next({ name: 'login' })
    }
    return next()
  }
  if (shouldHydrateAuth) {
    await auth.hydrateFromServer({
      maxAgeMs: to.meta.requiresAuth ? 60000 : 30000
    })
  }

  if (!auth.isAuthed && shouldHydrateAuth && !isRecoveryRoute) {
    await auth.hydrateFromSupabaseSession()
  }

  if (to.meta.requiresAuth && !auth.isAuthed) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (auth.isAuthed && !auth.user?.onboarding?.completed && to.name !== 'onboarding' && !isPublicInfoPage) {
    return next({ name: 'onboarding' })
  }

  if (to.name === 'landing' && auth.isAuthed) {
    return next({ name: 'dashboard' })
  }

  if (to.meta.guestOnly && auth.isAuthed && !isRecoveryRoute) {
    if (auth.user?.onboarding?.completed) {
      return next({ name: 'dashboard' })
    }
    return next({ name: 'onboarding' })
  }

  if (to.name === 'onboarding' && auth.user?.onboarding?.completed && !isOnboardingEdit) {
    return next({ name: 'dashboard' })
  }

  return next()
})

router.afterEach((to) => {
  writeLastAppRoute(to)
  syncLastAppRouteToCloud(to)
})

export default router
