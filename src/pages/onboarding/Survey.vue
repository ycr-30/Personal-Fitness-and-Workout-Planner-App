<template>
  <main class="survey-page">
    <section class="survey-card">
      <header class="header">
        <p class="eyebrow">{{ isEditMode ? 'Training Profile' : 'Welcome to Fitness AI Planner' }}</p>
        <h1>{{ isEditMode ? 'Update your onboarding answers.' : 'Let’s tailor your training experience.' }}</h1>
        <p class="lead">
          {{
            isEditMode
              ? 'Refresh your starting preferences if your first survey answers were too rough or no longer fit your goals.'
              : 'Answer a handful of questions so we can recommend the right focus, cadence, and nutrition prompts.'
          }}
        </p>
        <div v-if="isEditMode" class="header-actions">
          <RouterLink class="back-link" :to="returnTarget">Back</RouterLink>
        </div>
      </header>

      <form class="form" @submit.prevent="submit">
        <fieldset class="group">
          <legend>Training background</legend>
          <p class="hint">How familiar are you with structured strength or conditioning work?</p>
          <div class="options">
            <label v-for="option in experienceOptions" :key="option.value" class="option">
              <input v-model="form.experience" type="radio" name="experience" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Primary intention</legend>
          <p class="hint">Choose the focus that resonates most with your next 12 weeks.</p>
          <div class="options">
            <label v-for="option in goalOptions" :key="option.value" class="option">
              <input v-model="form.goal" type="radio" name="goal" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Weekly training rhythm</legend>
          <p class="hint">We’ll use this to shape volume and recovery reminders.</p>
          <div class="options">
            <label v-for="option in frequencyOptions" :key="option.value" class="option">
              <input v-model="form.frequency" type="radio" name="frequency" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Nutrition outlook</legend>
          <p class="hint">What best describes how you’d like to approach fueling?</p>
          <div class="options">
            <label v-for="option in nutritionOptions" :key="option.value" class="option">
              <input v-model="form.nutrition" type="radio" name="nutrition" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <button class="submit" type="submit" :disabled="!isComplete">
          {{ isEditMode ? 'Save onboarding answers' : 'Complete onboarding' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// 体验调查的选项（采用专业语气引导用户完成）
const experienceOptions = [
  {
    value: 'foundation',
    title: 'Foundation phase',
    caption: 'New to structured coaching, ready to learn key lifts and training language.'
  },
  {
    value: 'intermediate',
    title: 'Training consistently',
    caption: 'Comfortable with major movements, want sharper programming and feedback.'
  },
  {
    value: 'advanced',
    title: 'Performance focused',
    caption: 'Years of consistent training and looking for advanced progression models.'
  }
]

const goalOptions = [
  {
    value: 'fat-loss',
    title: 'Lean and athletic',
    caption: 'Prioritise fat loss while protecting strength and performance.'
  },
  {
    value: 'muscle-gain',
    title: 'Build muscle density',
    caption: 'Structured hypertrophy blocks with enough recovery to grow.'
  },
  {
    value: 'performance',
    title: 'Raise performance ceiling',
    caption: 'Blend strength, conditioning, and mobility for a complete engine.'
  }
]

const frequencyOptions = [
  {
    value: '2-sessions',
    title: '2 sessions / week',
    caption: 'Balanced progress alongside a busy calendar.'
  },
  {
    value: '3-4-sessions',
    title: '3–4 sessions / week',
    caption: 'Sweet spot for most strength and body composition goals.'
  },
  {
    value: '5-plus-sessions',
    title: '5+ sessions / week',
    caption: 'High frequency, best with dedicated recovery practices.'
  }
]

const nutritionOptions = [
  {
    value: 'calorie-deficit',
    title: 'Strategic deficit',
    caption: 'Measured energy deficit paired with high-quality protein.'
  },
  {
    value: 'maintenance',
    title: 'Maintenance',
    caption: 'Hold weight steady while elevating performance metrics.'
  },
  {
    value: 'calorie-surplus',
    title: 'Lean surplus',
    caption: 'Slight surplus to support muscle gain without unnecessary fat gain.'
  }
]

const form = reactive({
  experience: '',
  goal: '',
  frequency: '',
  nutrition: ''
})

const isEditMode = computed(() => String(route.query.edit || '') === '1')
const returnTarget = computed(() =>
  typeof route.query.returnTo === 'string' && route.query.returnTo ? route.query.returnTo : '/profile'
)
const existingAnswers = computed(() => auth.user?.onboarding?.answers || null)

watch(
  existingAnswers,
  (answers) => {
    if (!answers) return
    form.experience = answers.experience || ''
    form.goal = answers.goal || ''
    form.frequency = answers.frequency || ''
    form.nutrition = answers.nutrition || ''
  },
  { immediate: true }
)

const isComplete = computed(
  () => form.experience && form.goal && form.frequency && form.nutrition
)

async function submit() {
  if (!isComplete.value) return
  await auth.completeOnboarding({
    ...form,
    completedAt: existingAnswers.value?.completedAt || new Date().toISOString()
  })
  if (isEditMode.value) {
    router.push(returnTarget.value)
    return
  }
  router.push({ name: 'dashboard' })
}
</script>

<style scoped>
.survey-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 80px clamp(20px, 6vw, 96px);
  background: #f5f5f7;
  font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  color: #1d1d1f;
}

.survey-card {
  width: min(880px, 100%);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 36px;
  border: 1px solid rgba(210, 210, 215, 0.6);
  box-shadow: 0 40px 80px rgba(17, 17, 17, 0.08);
  padding: clamp(32px, 6vw, 64px);
  backdrop-filter: blur(18px);
  display: grid;
  gap: 36px;
}

.header {
  display: grid;
  gap: 12px;
}

.header-actions {
  display: flex;
  justify-content: flex-start;
}

.eyebrow {
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #0071e3;
  margin: 0;
}

.header h1 {
  margin: 0;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 600;
}

.lead {
  margin: 0;
  font-size: 18px;
  line-height: 1.6;
  color: #6e6e73;
}

.back-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(210, 210, 215, 0.8);
  background: rgba(255, 255, 255, 0.65);
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.form {
  display: grid;
  gap: 28px;
}

.group {
  margin: 0;
  padding: 0;
  border: none;
  display: grid;
  gap: 16px;
}

.group legend {
  font-size: 20px;
  font-weight: 600;
}

.hint {
  margin: 0;
  color: #6e6e73;
  font-size: 15px;
}

.options {
  display: grid;
  gap: 12px;
}

.option {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(210, 210, 215, 0.7);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.option:hover {
  border-color: rgba(0, 113, 227, 0.6);
  box-shadow: 0 16px 30px rgba(17, 17, 17, 0.08);
}

.option input {
  width: 18px;
  height: 18px;
}

.option input:checked + .label {
  color: #1d1d1f;
}

.option input:checked + .label strong {
  color: #0071e3;
}

.label {
  display: grid;
  gap: 4px;
  color: #6e6e73;
}

.label strong {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.label span {
  font-size: 14px;
  line-height: 1.6;
}

.submit {
  margin-top: 12px;
  border: none;
  border-radius: 18px;
  padding: 14px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(145deg, #111, #2d2d2f);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.submit:disabled {
  opacity: 0.4;
  cursor: default;
  box-shadow: none;
}

.submit:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(17, 17, 17, 0.15);
}

@media (max-width: 640px) {
  .survey-page {
    padding: 64px 18px;
  }

  .survey-card {
    border-radius: 26px;
    padding: 28px;
  }
}
</style>
