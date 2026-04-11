import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getStableDeviceId, loadCloudClientState, saveCloudClientState } from '@/lib/cloudClientState'

// 按你当前的目录结构引入页面
import Landing from '@/pages/Landing.vue'
import Login from '@/pages/auth/Login.vue'
import Register from '@/pages/auth/Register.vue'
import Dashboard from '@/pages/app/Dashboard.vue'
import Plans from '@/pages/app/Plans.vue'
import Progress from '@/pages/app/Progress.vue'
import Schedule from '@/pages/app/Schedule.vue'
import Nutrition from '@/pages/app/Nutrition.vue'
import Logs from '@/pages/app/Logs.vue'
import MuscleMap from '@/pages/app/MuscleMap.vue'
import Profile from '@/pages/app/Profile.vue'
import Settings from '@/pages/app/Settings.vue'
import Onboarding from '@/pages/onboarding/Survey.vue'

const LAST_APP_ROUTE_KEY = 'pf_last_app_route'
let activeCloudRouteIdentity = ''

function readLastAppRoute() {
  if (typeof window === 'undefined') return ''
  const raw = window.localStorage.getItem(LAST_APP_ROUTE_KEY) || ''
  if (!raw.startsWith('/')) return ''
  if (raw === '/' || raw.startsWith('/login') || raw.startsWith('/register') || raw.startsWith('/onboarding')) {
    return ''
  }
  return raw
}

function writeLastAppRoute(route) {
  if (typeof window === 'undefined') return
  if (!route?.fullPath || !route?.meta?.requiresAuth) return
  window.localStorage.setItem(LAST_APP_ROUTE_KEY, route.fullPath)
}

async function hydrateLastAppRouteFromCloud(auth) {
  if (typeof window === 'undefined' || !auth?.user) return ''
  const identity = auth.user.id || auth.user.email || auth.user.account || auth.user.name || ''
  if (!identity || activeCloudRouteIdentity === identity) {
    return readLastAppRoute()
  }

  activeCloudRouteIdentity = identity
  try {
    const state = await loadCloudClientState({
      scope: 'device',
      deviceId: getStableDeviceId(),
      keys: ['last_app_route']
    })
    const route = String(state?.last_app_route?.value || '').trim()
    if (route.startsWith('/')) {
      window.localStorage.setItem(LAST_APP_ROUTE_KEY, route)
      return route
    }
  } catch (error) {
    console.error('Failed to hydrate last route from cloud', error)
  }

  return readLastAppRoute()
}

function syncLastAppRouteToCloud(route) {
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
  { path: '/', name: 'landing', component: Landing, meta: { hideShell: true } }, // 主页/介绍页
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true, hideShell: true } }, // 登录
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true, hideShell: true } }, // 注册
  { path: '/onboarding', name: 'onboarding', component: Onboarding, meta: { requiresAuth: true, hideShell: true } }, // 登录后信息调查
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } }, // 登录后主页
  { path: '/schedule', name: 'schedule', component: Schedule, meta: { requiresAuth: true } },
  { path: '/plan', name: 'plan', component: Plans, meta: { requiresAuth: true } },
  { path: '/plans', redirect: '/plan' },
  { path: '/progress', name: 'progress', component: Progress, meta: { requiresAuth: true } },
  { path: '/nutrition', name: 'nutrition', component: Nutrition, meta: { requiresAuth: true } },
  { path: '/logs', name: 'logs', component: Logs, meta: { requiresAuth: true } },
  { path: '/muscle-map', name: 'muscle-map', component: MuscleMap, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: Settings, meta: { requiresAuth: true } },
  // 兜底：未知路径 → 主页
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
  if (!auth.user) auth.init()
  await auth.hydrateFromServer()
  if (auth.isAuthed) {
    await auth.hydrateOnboardingFromSupabase()
  }

  if (to.meta.requiresAuth && !auth.isAuthed) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (auth.isAuthed && !auth.user?.onboarding?.completed && to.name !== 'onboarding') {
    return next({ name: 'onboarding' })
  }

  if (to.name === 'landing' && auth.isAuthed) {
    const lastAppRoute = await hydrateLastAppRouteFromCloud(auth)
    if (lastAppRoute) {
      return next(lastAppRoute)
    }
    return next({ name: 'dashboard' })
  }

  if (to.meta.guestOnly && auth.isAuthed) {
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
