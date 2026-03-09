import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
  if (!auth.user) auth.init()
  await auth.hydrateFromServer()

  if (to.meta.requiresAuth && !auth.isAuthed) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (auth.isAuthed && !auth.user?.onboarding?.completed && to.name !== 'onboarding') {
    return next({ name: 'onboarding' })
  }

  if (to.meta.guestOnly && auth.isAuthed) {
    if (auth.user?.onboarding?.completed) {
      return next({ name: 'dashboard' })
    }
    return next({ name: 'onboarding' })
  }

  if (to.name === 'onboarding' && auth.user?.onboarding?.completed) {
    return next({ name: 'dashboard' })
  }

  return next()
})

export default router
