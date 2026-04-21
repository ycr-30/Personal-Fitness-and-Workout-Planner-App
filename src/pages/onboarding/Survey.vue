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
              : 'Answer a handful of questions so we can recommend the right focus, cadence, setup, and nutrition prompts.'
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
          <legend>Training setup</legend>
          <p class="hint">What setup do you reliably have access to for most sessions?</p>
          <div class="options">
            <label v-for="option in trainingSetupOptions" :key="option.value" class="option">
              <input v-model="form.trainingSetup" type="radio" name="trainingSetup" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Movement limitations</legend>
          <p class="hint">Select all that apply so early training recommendations stay realistic and conservative.</p>
          <div class="options">
            <label v-for="option in movementLimitationOptions" :key="option.value" class="option">
              <input
                type="checkbox"
                name="movementLimitations"
                :checked="form.movementLimitations.includes(option.value)"
                @change="toggleMovementLimitation(option.value, $event.target.checked)"
              />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Session length</legend>
          <p class="hint">What is a realistic single-session training window for you right now?</p>
          <div class="options">
            <label v-for="option in sessionDurationOptions" :key="option.value" class="option">
              <input v-model="form.sessionDuration" type="radio" name="sessionDuration" :value="option.value" />
              <span class="label">
                <strong>{{ option.title }}</strong>
                <span>{{ option.caption }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="group">
          <legend>Nutrition goal</legend>
          <p class="hint">Which one fits you best right now?</p>
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
import {
  experienceOptions,
  frequencyOptions,
  goalOptions,
  movementLimitationOptions,
  nutritionOptions,
  sessionDurationOptions,
  trainingSetupOptions
} from '@/lib/onboardingOptions'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  experience: '',
  goal: '',
  frequency: '',
  trainingSetup: '',
  movementLimitations: [],
  sessionDuration: '',
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
    form.trainingSetup = answers.trainingSetup || ''
    form.movementLimitations = Array.isArray(answers.movementLimitations) ? [...answers.movementLimitations] : []
    form.sessionDuration = answers.sessionDuration || ''
    form.nutrition = answers.nutrition || ''
  },
  { immediate: true }
)

const isComplete = computed(
  () =>
    form.experience &&
    form.goal &&
    form.frequency &&
    form.trainingSetup &&
    form.movementLimitations.length &&
    form.sessionDuration &&
    form.nutrition
)

function toggleMovementLimitation(value, checked) {
  const next = new Set(form.movementLimitations)
  if (checked) {
    if (value === 'none') {
      form.movementLimitations = ['none']
      return
    }
    next.delete('none')
    next.add(value)
    form.movementLimitations = [...next]
    return
  }

  next.delete(value)
  form.movementLimitations = next.size ? [...next] : ['none']
}

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
