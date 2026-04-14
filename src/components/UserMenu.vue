<template>
  <div ref="root" class="user-menu">
    <button class="trigger" type="button" @click="toggleMenu">
      <span class="avatar" :style="avatarStyle">
        <span v-if="!avatar" class="initials">{{ initials }}</span>
      </span>
      <span class="details">
        <span class="name">{{ auth.user?.name || 'Member' }}</span>
        <span class="meta">Pro Member</span>
      </span>
      <span class="icon" aria-hidden="true">▾</span>
    </button>

    <transition name="fade">
      <div v-if="open" class="dropdown">
        <RouterLink class="item" to="/profile" @click="closeMenu">
          Edit profile
        </RouterLink>
        <button class="item" type="button" @click="switchAccount">
          Switch account
        </button>
        <button class="item danger" type="button" @click="signOut">
          Sign out
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const open = ref(false)
const root = ref(null)

// 计算头像样式（有上传头像则显示背景图）
const avatar = computed(() => auth.avatar)
const avatarStyle = computed(() =>
  avatar.value
    ? {
        backgroundImage: `url('${avatar.value}')`
      }
    : {}
)

// 根据姓名生成默认首字母
const initials = computed(() => {
  const name = auth.user?.name || 'User'
  const parts = name.trim().split(' ')
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'US'
})

function toggleMenu() {
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

// 监听点击区域以关闭菜单
function handleClickOutside(event) {
  if (!root.value) return
  if (!root.value.contains(event.target)) {
    closeMenu()
  }
}

async function signOut() {
  await auth.logout()
  closeMenu()
  router.replace({ name: 'login' })
}

async function switchAccount() {
  await auth.logout()
  closeMenu()
  router.replace({ name: 'login', query: { mode: 'switch' } })
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.user-menu {
  position: relative;
}

.trigger {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: var(--shadow-soft);
}

.trigger:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-strong);
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(140deg, rgba(239, 68, 68, 0.25), rgba(17, 17, 17, 0.1));
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}

.details {
  display: grid;
  gap: 2px;
  text-align: left;
}

.name {
  font-size: 14px;
  font-weight: 700;
}

.meta {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.initials {
  text-transform: uppercase;
}

.icon {
  font-size: 12px;
  color: var(--text-muted);
}

.dropdown {
  position: absolute;
  right: 0;
  bottom: calc(100% + 12px);
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-strong);
  display: grid;
  overflow: hidden;
  backdrop-filter: blur(10px);
  z-index: 30;
}

.item {
  padding: 12px 16px;
  text-align: left;
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease;
}

.item:hover {
  background: var(--accent-soft);
}

.item.danger {
  color: #d70015;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (min-width: 1280px) {
  .trigger {
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
  }

  .avatar {
    width: 38px;
    height: 38px;
    font-size: 12px;
  }

  .name {
    font-size: 13px;
  }

  .meta,
  .item {
    font-size: 12px;
  }

  .item {
    padding: 10px 14px;
  }
}

@media (max-width: 980px) {
  .trigger {
    width: auto;
    padding: 8px 10px;
  }

  .details {
    display: none;
  }

  .dropdown {
    top: calc(100% + 12px);
    bottom: auto;
  }
}
</style>
