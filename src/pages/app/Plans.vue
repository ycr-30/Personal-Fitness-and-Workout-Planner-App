<template>
  <section class="plans-page">
    <header class="plans-header">
      <div class="header-left">
        <p class="eyebrow">Workout Plan</p>
        <h1>My Plan</h1>
        <p class="subtitle">Set a goal, track daily challenges, and stay consistent.</p>
      </div>
      <div class="header-right">
        <div class="plan-time">{{ currentTime }}</div>
        <button class="activity-pill" type="button" @click="openGoalModal(1)">
          <div class="activity-text">
            <span>Daily Activity Burn</span>
            <strong>{{ activityBurnSummary }}</strong>
            <em>{{ activityMinutes }} min · Today</em>
          </div>
          <div class="activity-ring" :style="{ '--progress': activityProgress }"></div>
        </button>
      </div>
    </header>

    <section v-if="!selectedGoal" class="card empty-state">
      <h2>No goal selected yet</h2>
      <p>Tap the activity card to choose your workout goal.</p>
      <article v-if="initialPlanRecommendation" class="onboarding-recommendation">
        <div class="recommendation-head">
          <span class="recommendation-badge">Onboarding Match</span>
          <h3>{{ initialPlanRecommendation.title }}</h3>
          <p>{{ initialPlanRecommendation.summary }}</p>
        </div>

        <div class="recommendation-metrics">
          <span class="recommendation-chip">{{ initialPlanRecommendation.frequencyLabel }}</span>
          <span class="recommendation-chip">{{ initialPlanRecommendation.sessionDurationLabel }}</span>
          <span class="recommendation-chip">{{ initialPlanRecommendation.trainingSetupLabel }}</span>
        </div>

        <ul class="recommendation-list">
          <li>{{ initialPlanRecommendation.setupNote }}</li>
          <li>{{ initialPlanRecommendation.limitationNote }}</li>
          <li>{{ initialPlanRecommendation.challengeNote }}</li>
        </ul>

        <div class="recommendation-actions">
          <button class="btn primary" type="button" @click="applyOnboardingRecommendation">
            Use onboarding recommendation
          </button>
          <button class="btn ghost" type="button" @click="openGoalModal(1)">
            Choose manually
          </button>
        </div>
      </article>

      <button v-else class="btn primary" type="button" @click="openGoalModal(1)">Choose Goal</button>
    </section>

    <template v-else>
      <section v-if="isWeightLoss" class="card goal-summary">
        <div class="goal-title-row">
          <div class="goal-title">
            <span class="goal-icon">{{ selectedGoal?.icon || '⚖️' }}</span>
            <div>
              <p class="eyebrow">My Goal</p>
              <h2>Weight Loss</h2>
            </div>
          </div>
        </div>

        <div class="weight-stats">
          <div>
            <span>Start</span>
            <strong>{{ formatNumber(planState.weight.start, 2) }}</strong>
            <small>kg</small>
          </div>
          <div class="current">
            <span>Current</span>
            <strong>{{ formatNumber(planState.weight.current, 2) }}</strong>
            <small>kg</small>
          </div>
          <div>
            <span>Target</span>
            <strong>{{ formatNumber(planState.weight.target, 2) }}</strong>
            <small>kg</small>
          </div>
        </div>

        <div class="progress-track">
          <div class="progress-bar" :style="{ width: weightProgressPercent }"></div>
        </div>
        <div class="progress-foot">
          <span>{{ formatShortDate(weightStartDate) }}</span>
          <span>{{ formatShortDate(planState.weight.targetDate) }}</span>
        </div>

        <button class="btn ghost full" type="button" @click="openUpdateSheet">Update current data</button>
        <p v-if="weightUpdated" class="update-toast">Updated.</p>
      </section>

      <section v-else class="card goal-summary">
        <div class="goal-title-row">
          <div class="goal-title">
            <span class="goal-icon">{{ selectedGoal?.icon || '🎯' }}</span>
            <div>
              <p class="eyebrow">My Goal</p>
              <h2>{{ selectedGoal.shortTitle }}</h2>
              <p class="subtitle">{{ selectedGoal.description }}</p>
            </div>
          </div>
        </div>
        <div class="goal-meta">
          <div>
            <span>Target date</span>
            <strong>{{ formattedTargetDate }}</strong>
          </div>
          <div>
            <span>Days left</span>
            <strong>{{ daysRemainingLabel }}</strong>
          </div>
          <div>
            <span>Weekly change</span>
            <strong>{{ weeklyChangeLabel }}</strong>
          </div>
        </div>
      </section>

      <section class="card challenge-summary">
        <div class="section-head">
          <div>
            <h3>Daily Challenges</h3>
            <p>Track 1-4 targets that matter most to your goal.</p>
          </div>
          <button class="chip" type="button" @click="openGoalModal(4)">Adjust</button>
        </div>

        <div class="daily-list">
          <article
            v-for="challenge in selectedChallengesData"
            :key="challenge.id"
            class="daily-card"
            :class="{ clickable: isChallengeModal(challenge.id) }"
            @click="openChallengeModal(challenge.id)"
          >
            <div class="daily-head">
              <div class="daily-title">
                <span class="daily-icon">{{ challenge.icon }}</span>
                <span>{{ challenge.title }}</span>
              </div>
              <span class="arrow">›</span>
            </div>
            <div class="daily-value">
              <strong>{{ formatChallengeCurrent(challenge.id) }}</strong>
              <span>/ {{ planState.challengeValues[challenge.id] }} {{ challenge.unit }}</span>
            </div>
            <div class="daily-meta">
              <span>{{ cadenceLabel(challenge.cadence) }}</span>
              <span v-if="challenge.id === 'intake'" class="status">{{ intakeStatus }}</span>
            </div>
          </article>
        </div>

        <p v-if="showDeficitNotice" class="info-banner">
          No intake logged yet. Calorie deficit cannot be calculated.
        </p>
      </section>

      <section v-if="isWeightLoss" class="ability-section">
        <h3>Muscle Ability</h3>
        <div class="ability-grid">
          <article class="ability-card editable">
            <span>Max Strength · Push (kg)</span>
            <input v-model.number="planState.muscleAbility.push" type="number" placeholder="Please input" />
            <p>Bench press 1RM</p>
          </article>
          <article class="ability-card editable">
            <span>Max Strength · Pull (kg)</span>
            <input v-model.number="planState.muscleAbility.pull" type="number" placeholder="Please input" />
            <p>Row or pull-up equivalent</p>
          </article>
          <article class="ability-card editable">
            <span>Max Strength · Legs (kg)</span>
            <input v-model.number="planState.muscleAbility.legs" type="number" placeholder="Please input" />
            <p>Squat 1RM</p>
          </article>
          <article class="ability-card editable">
            <span>Max Strength · Posterior (kg)</span>
            <input v-model.number="planState.muscleAbility.posterior" type="number" placeholder="Please input" />
            <p>Deadlift 1RM</p>
          </article>
        </div>
      </section>

      <section v-if="isWeightLoss" class="related-section">
        <div class="section-head">
          <div>
            <h3>Related Data</h3>
            <p>Recent snapshots and related indicators.</p>
          </div>
          <button class="chip" type="button" @click="openModal('filters')">Sort</button>
        </div>

        <div class="related-list">
          <article
            v-if="isRelatedVisible('fatEfficiency')"
            class="related-card clickable"
            @click="openModal('fatEfficiency')"
          >
            <div>
              <strong>Fat Loss Efficiency</strong>
              <p>{{ fatEfficiencyDisplay }}</p>
            </div>
            <span class="arrow">›</span>
          </article>
          <article
            v-if="isRelatedVisible('weight')"
            class="related-card clickable"
            @click="openModal('weightDetails')"
          >
            <div>
              <strong>Weight</strong>
              <p>{{ formatNumber(planState.weight.current, 2) }} kg</p>
            </div>
            <span class="mini-chart" :class="weightLevelTone"></span>
          </article>
          <article
            v-if="isRelatedVisible('circumference')"
            class="related-card clickable"
            @click="openModal('circumference')"
          >
            <div>
              <strong>Body Circumference</strong>
              <p>{{ circumferenceDisplay }}</p>
            </div>
            <span class="arrow">›</span>
          </article>
          <article
            v-if="isRelatedVisible('bodyProfile')"
            class="related-card clickable"
            @click="openModal('bodyProfile')"
          >
            <div>
              <strong>Body Profile</strong>
              <p>{{ bodyProfileDisplay }}</p>
            </div>
            <span class="avatar"></span>
          </article>
          <article
            v-if="isRelatedVisible('nutrition')"
            class="related-card clickable"
            @click="openModal('intake')"
          >
            <div>
              <strong>Nutrition</strong>
              <p>{{ intakeDisplay }} · Target {{ planState.challengeValues.intake }} kcal</p>
            </div>
            <span class="mini-track"></span>
          </article>
          <article v-if="isRelatedVisible('trainingStatus')" class="related-card">
            <div>
              <strong>Training Status</strong>
              <p>{{ trainingStatusMessage }}</p>
            </div>
            <span class="status-bars"></span>
          </article>
          <article
            v-if="isRelatedVisible('sleep')"
            class="related-card clickable"
            @click="openModal('sleep')"
          >
            <div>
              <strong>Sleep</strong>
              <p>{{ sleepDisplay }}</p>
            </div>
            <span class="arrow">›</span>
          </article>
        </div>
      </section>
    </template>

    <transition name="fade">
      <div v-if="showGoalModal" class="modal-backdrop" @click.self="closeGoalModal">
        <div class="modal-sheet">
          <header class="modal-header">
            <p class="eyebrow">My Goal</p>
            <h2>{{ modalTitle }}</h2>
            <p class="subtitle">{{ modalSubtitle }}</p>
            <span class="step-indicator">Step {{ modalStep }} of 4</span>
          </header>

          <div class="modal-body">
            <section v-if="modalStep === 1" class="goal-step">
              <button
                v-for="goal in goalOptions"
                :key="goal.id"
                class="goal-option"
                :class="{ active: planState.goalId === goal.id }"
                type="button"
                @click="selectGoal(goal.id)"
              >
                <span class="goal-icon">{{ goal.icon }}</span>
                <div>
                  <strong>{{ goal.title }}</strong>
                  <span>{{ goal.subtitle }}</span>
                </div>
              </button>
            </section>

            <section v-else-if="modalStep === 2" class="detail-step">
              <div v-if="focusOptions.length" class="focus-row">
                <p class="label">Choose your focus</p>
                <div class="chip-row">
                  <button
                    v-for="option in focusOptions"
                    :key="option.id"
                    class="chip"
                    :class="{ active: planState.focusId === option.id }"
                    type="button"
                    @click="selectFocus(option.id)"
                  >
                    {{ option.title }}
                  </button>
                </div>
              </div>

              <div v-if="activeDetailType === 'weight-loss'" class="detail-card">
                <h3>Weight Loss</h3>
                <div class="detail-grid">
                  <label class="field">
                    <span>Start (kg)</span>
                    <input v-model.number="planState.weight.start" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target (kg)</span>
                    <input v-model.number="planState.weight.target" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field span-2">
                    <span>Target date</span>
                    <input v-model="planState.weight.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
                <div class="detail-meta">
                  <span>{{ daysRemainingLabel }}</span>
                  <span>{{ weeklyChangeLabel }}</span>
                </div>
              </div>

              <div v-else-if="activeDetailType === 'weight-gain'" class="detail-card">
                <h3>Weight Gain</h3>
                <div class="detail-grid">
                  <label class="field">
                    <span>Start (kg)</span>
                    <input v-model.number="planState.weight.start" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target (kg)</span>
                    <input v-model.number="planState.weight.target" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field span-2">
                    <span>Target date</span>
                    <input v-model="planState.weight.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>

              <div v-else-if="activeDetailType === 'circumference-reduce' || activeDetailType === 'circumference-increase'" class="detail-card">
                <h3>Body Circumference</h3>
                <div class="chip-row">
                  <button
                    v-for="part in circumferenceParts"
                    :key="part.id"
                    class="chip"
                    :class="{ active: planState.circumference.part === part.id }"
                    type="button"
                    @click="planState.circumference.part = part.id"
                  >
                    {{ part.label }}
                  </button>
                </div>
                <div class="detail-grid">
                  <label class="field">
                    <span>Start (cm)</span>
                    <input v-model.number="planState.circumference.start" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target (cm)</span>
                    <input v-model.number="planState.circumference.target" type="number" step="0.1" placeholder="Please input" />
                  </label>
                  <label class="field span-2">
                    <span>Target date</span>
                    <input v-model="planState.circumference.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>

              <div v-else-if="activeDetailType === 'posture'" class="detail-card">
                <h3>Posture Score</h3>
                <div class="chip-row">
                  <button
                    v-for="area in postureAreas"
                    :key="area.id"
                    class="chip"
                    :class="{ active: planState.posture.area === area.id }"
                    type="button"
                    @click="planState.posture.area = area.id"
                  >
                    {{ area.label }}
                  </button>
                </div>
                <div class="detail-grid">
                  <label class="field">
                    <span>Start (score)</span>
                    <input v-model.number="planState.posture.start" type="number" min="60" max="100" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target (score)</span>
                    <input v-model.number="planState.posture.target" type="number" min="60" max="100" placeholder="Please input" />
                  </label>
                  <label class="field span-2">
                    <span>Target date</span>
                    <input v-model="planState.posture.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>

              <div v-else-if="activeDetailType === 'running'" class="detail-card">
                <h3>Running Focus</h3>
                <div class="detail-grid">
                  <label class="field">
                    <span>Weekly distance (km)</span>
                    <input v-model.number="planState.running.weeklyDistance" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>5K target time (min)</span>
                    <input v-model="planState.running.fiveKTime" type="text" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Longest run (min)</span>
                    <input v-model.number="planState.running.longRunTime" type="number" min="0" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target date</span>
                    <input v-model="planState.running.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>

              <div v-else-if="activeDetailType && activeDetailType.startsWith('health-')" class="detail-card">
                <h3>Stay Healthy</h3>
                <div class="detail-grid">
                  <label v-if="activeDetailType === 'health-frequency'" class="field">
                    <span>Sessions per week</span>
                    <input v-model.number="planState.health.frequency" type="number" min="1" max="7" placeholder="Please input" />
                  </label>
                  <label v-if="activeDetailType === 'health-frequency'" class="field">
                    <span>Minutes per session</span>
                    <input v-model.number="planState.health.sessionMinutes" type="number" min="10" step="5" placeholder="Please input" />
                  </label>
                  <label v-if="activeDetailType === 'health-running'" class="field">
                    <span>Run distance (km/week)</span>
                    <input v-model.number="planState.health.runDistance" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label v-if="activeDetailType === 'health-cycling'" class="field">
                    <span>Ride distance (km/week)</span>
                    <input v-model.number="planState.health.rideDistance" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label v-if="activeDetailType === 'health-sleep'" class="field">
                    <span>Sleep hours/night</span>
                    <input v-model.number="planState.health.sleepHours" type="number" min="5" max="10" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field span-2">
                    <span>Target date</span>
                    <input v-model="planState.health.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>

              <div v-else-if="activeDetailType === 'strength' || activeDetailType === 'endurance'" class="detail-card">
                <h3>Performance Upgrade</h3>
                <div v-if="activeDetailType === 'strength'" class="detail-grid">
                  <label class="field">
                    <span>Bench 1RM (kg)</span>
                    <input v-model.number="planState.performance.strength.bench" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Squat 1RM (kg)</span>
                    <input v-model.number="planState.performance.strength.squat" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Deadlift 1RM (kg)</span>
                    <input v-model.number="planState.performance.strength.deadlift" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target date</span>
                    <input v-model="planState.performance.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
                <div v-else class="detail-grid">
                  <label class="field">
                    <span>Plank (sec)</span>
                    <input v-model.number="planState.performance.endurance.plank" type="number" min="0" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Push-ups</span>
                    <input v-model.number="planState.performance.endurance.pushups" type="number" min="0" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Row 2KM (min)</span>
                    <input v-model.number="planState.performance.endurance.rowTime" type="number" min="0" step="0.5" placeholder="Please input" />
                  </label>
                  <label class="field">
                    <span>Target date</span>
                    <input v-model="planState.performance.targetDate" type="date" placeholder="Please input" />
                  </label>
                </div>
              </div>
            </section>

            <section v-else-if="modalStep === 3" class="combo-step">
              <h3>Best Daily Challenge Combo</h3>
              <p>
                Based on your goal, we recommend combining calorie deficit, activity burn, and intake
                targets for sustainable progress.
              </p>
              <div class="combo-grid">
                <div class="combo-card purple">
                  <span>Burn {{ comboRecommendation.burnTotal }} kcal</span>
                  <small>Activity burn + resting burn</small>
                </div>
                <div class="combo-card green">
                  <span>Intake {{ comboRecommendation.intake }} kcal</span>
                  <small>Balanced fueling</small>
                </div>
                <div class="combo-card outline">
                  <span>Deficit {{ comboRecommendation.deficit }} kcal</span>
                  <small>Burn > Intake</small>
                </div>
              </div>
              <div class="combo-flow">Burn → Intake → Weight Loss</div>
            </section>

            <section v-else-if="modalStep === 4" class="challenge-step">
              <h3>Daily Challenges</h3>
              <p>Select 1-4 metrics and adjust the targets.</p>
              <p v-if="selectionNotice" class="notice">{{ selectionNotice }}</p>
              <div class="challenge-grid">
                <button
                  v-for="challenge in challengeOptions"
                  :key="challenge.id"
                  class="challenge-card"
                  :class="{ selected: isChallengeSelected(challenge.id) }"
                  type="button"
                  @click="toggleChallenge(challenge.id)"
                >
                  <div class="challenge-head">
                    <span class="challenge-icon">{{ challenge.icon }}</span>
                    <div>
                      <strong>{{ challenge.title }}</strong>
                      <span v-if="isRecommended(challenge)" class="badge">Recommended</span>
                    </div>
                    <span class="check">{{ isChallengeSelected(challenge.id) ? '✓' : '' }}</span>
                  </div>
                  <p>{{ challenge.description }}</p>
                  <div class="challenge-input" @click.stop>
                    <span>{{ cadenceLabel(challenge.cadence) }}</span>
                    <input
                      v-model.number="planState.challengeValues[challenge.id]"
                      type="number"
                      min="0"
                      step="1"
                      @input="onChallengeValueInput"
                    />
                    <span>{{ challenge.unit }}</span>
                  </div>
                </button>
              </div>
            </section>
          </div>

          <footer class="modal-actions">
            <button class="btn ghost" type="button" @click="goPrevStep">
              {{ modalStep === 1 ? 'Close' : 'Back' }}
            </button>
            <button
              v-if="modalStep > 1"
              class="btn primary"
              type="button"
              @click="goNextStep"
            >
              {{ modalStep === 4 ? 'Confirm' : 'Next' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showUpdateSheet" class="modal-backdrop" @click.self="closeUpdateSheet">
        <div class="update-modal">
          <header class="update-header">
            <div>
              <h2>Update current data</h2>
              <p>Used for calorie estimates, body analysis, and workout suggestions.</p>
            </div>
            <button class="close" type="button" @click="closeUpdateSheet">X</button>
          </header>
          <div class="detail-card">
            <div class="detail-grid">
              <label class="field">
                <span>Weight (kg)</span>
                <input v-model.number="updateForm.weight" type="number" step="0.1" placeholder="Please input" />
              </label>
              <label class="field">
                <span>BMI</span>
                <input type="text" :value="bmiDisplay" readonly />
              </label>
              <label class="field">
                <span>Body fat (%)</span>
                <input v-model.number="updateForm.bodyFat" type="number" step="0.1" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Height (cm)</span>
                <input v-model.number="updateForm.height" type="number" step="0.1" placeholder="Please input" />
              </label>
            </div>
          </div>
          <footer class="update-actions">
            <button class="btn ghost" type="button" @click="closeUpdateSheet">Cancel</button>
            <button class="btn primary" type="button" @click="saveUpdateSheet">Save</button>
          </footer>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="activeModal" class="modal-backdrop" @click.self="closeModal">
        <div class="update-modal" :class="{ 'weight-details-modal': activeModal === 'weightDetails' }">
          <header class="update-header">
            <div>
              <h2>{{ modalCopy.title }}</h2>
              <p>{{ modalCopy.subtitle }}</p>
            </div>
            <button class="close" type="button" @click="closeModal">X</button>
          </header>
          <div class="detail-card">
            <div v-if="activeModal === 'intake'" class="detail-grid">
              <label class="field">
                <span>Food intake (kcal)</span>
                <input v-model.number="modalForm.intakeKcal" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Notes</span>
                <input v-model.trim="modalForm.intakeNote" type="text" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'deficit'" class="detail-grid">
              <label class="field">
                <span>Calorie deficit (kcal)</span>
                <input v-model.number="modalForm.deficitKcal" type="number" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'sleep'" class="detail-grid">
              <label class="field">
                <span>Sleep hours</span>
                <input v-model.number="modalForm.sleepHours" type="number" step="0.1" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Sleep quality</span>
                <input v-model.trim="modalForm.sleepQuality" type="text" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'circumference'" class="detail-grid">
              <label class="field">
                <span>Measurement date</span>
                <input v-model="modalForm.circumferenceDate" type="date" />
              </label>
              <label class="field">
                <span>Chest (cm)</span>
                <input v-model.number="modalForm.circumference.chest" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Waist (cm)</span>
                <input v-model.number="modalForm.circumference.waist" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Hip (cm)</span>
                <input v-model.number="modalForm.circumference.hip" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Left thigh (cm)</span>
                <input v-model.number="modalForm.circumference.leftThigh" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Right thigh (cm)</span>
                <input v-model.number="modalForm.circumference.rightThigh" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Left calf (cm)</span>
                <input v-model.number="modalForm.circumference.leftCalf" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Right calf (cm)</span>
                <input v-model.number="modalForm.circumference.rightCalf" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Left arm (cm)</span>
                <input v-model.number="modalForm.circumference.leftArm" type="number" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Right arm (cm)</span>
                <input v-model.number="modalForm.circumference.rightArm" type="number" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'fatEfficiency'" class="detail-grid">
              <label class="field">
                <span>Fat loss efficiency (%)</span>
                <input v-model.number="modalForm.fatEfficiency" type="number" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'bodyProfile'" class="detail-grid">
              <label class="field">
                <span>Body profile</span>
                <input v-model.trim="modalForm.bodyProfile" type="text" placeholder="Please input" />
              </label>
              <label class="field">
                <span>Notes</span>
                <input v-model.trim="modalForm.bodyProfileNote" type="text" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'filters'" class="detail-grid">
              <label v-for="filter in filterOptions" :key="filter.id" class="field checkbox">
                <input v-model="modalForm.filters[filter.id]" type="checkbox" />
                <span>{{ filter.label }}</span>
              </label>
            </div>
            <div v-else-if="activeModal === 'challengeTarget'" class="detail-grid">
              <label class="field">
                <span>{{ activeChallenge?.title }} target ({{ activeChallenge?.unit }})</span>
                <input v-model.number="modalForm.challengeTarget" type="number" min="0" step="1" placeholder="Please input" />
              </label>
            </div>
            <div v-else-if="activeModal === 'weightDetails'" class="weight-detail">
              <div class="weight-top">
                <div class="weight-title">
                  <button class="icon-circle" type="button" @click="openUpdateSheetFromDetails">+</button>
                </div>
                <div class="metric-tabs">
                  <button
                    v-for="metric in weightMetricOptions"
                    :key="metric.id"
                    type="button"
                    class="metric-tab"
                    :class="{ active: weightDetailMetric === metric.id }"
                    @click="weightDetailMetric = metric.id"
                  >
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                  </button>
                </div>
              </div>

              <div class="metric-summary">
                <div class="summary-left">
                  <span>Current / Target {{ weightMetricLabel }}</span>
                  <strong>
                    {{ weightMetricCurrent }}
                    <em>/ {{ weightMetricTarget }}</em>
                  </strong>
                </div>
                <div class="summary-right">
                  <span v-if="showLevelIndicator">Level</span>
                  <div class="level-bar">
                    <span class="bar under"></span>
                    <span class="bar normal"></span>
                    <span class="bar high"></span>
                    <span class="bar obese"></span>
                    <span
                      v-if="showLevelIndicator"
                      class="marker-label"
                      :style="{ left: weightMetricLevel.position }"
                    >
                      {{ weightMetricLevel.label }}
                    </span>
                    <span
                      v-if="showLevelIndicator"
                      class="marker"
                      :style="{ left: weightMetricLevel.position }"
                    ></span>
                  </div>
                </div>
              </div>

              <div class="range-tabs">
                <button
                  v-for="range in weightRangeOptions"
                  :key="range.id"
                  type="button"
                  class="range-tab"
                  :class="{ active: weightDetailRange === range.id }"
                  @click="weightDetailRange = range.id"
                >
                  {{ range.label }}
                </button>
              </div>

              <div class="range-dates">
                <button class="range-nav" type="button" :disabled="rangeNavPrevDisabled" @click="shiftWeightRange(-1)">
                  ‹
                </button>
                <span>{{ rangeLabel }}</span>
                <button class="range-nav" type="button" :disabled="rangeNavNextDisabled" @click="shiftWeightRange(1)">
                  ›
                </button>
              </div>

              <div class="weight-chart">
                <div class="chart-label">{{ weightMetricLabel }}</div>
                <div class="chart-canvas">
                  <span
                    v-if="chartTargetLabel && !weightChartSummaryState"
                    class="target-label"
                    :style="{ top: chartTargetOffset }"
                  >
                    {{ chartTargetLabel }}
                  </span>
                  <div class="chart-grid-layout">
                    <div class="y-axis">
                      <span v-for="label in weightChartAxis.yLabels" :key="label">{{ label }}</span>
                    </div>
                    <div class="chart-plot">
                      <div v-if="weightChartSummaryState" class="weight-chart-summary">
                        <div class="summary-card primary">
                          <span>Current</span>
                          <strong>{{ weightChartSummaryState.currentLabel }}</strong>
                          <small>{{ weightChartSummaryState.meta }}</small>
                        </div>
                        <div v-if="weightChartSummaryState.previousLabel" class="summary-card">
                          <span>Previous</span>
                          <strong>{{ weightChartSummaryState.previousLabel }}</strong>
                          <small :class="weightChartSummaryState.deltaTone">{{ weightChartSummaryState.deltaLabel }}</small>
                        </div>
                        <p class="summary-message">{{ weightChartSummaryState.message }}</p>
                      </div>
                      <svg v-else viewBox="0 0 360 120" preserveAspectRatio="none">
                        <g class="chart-grid-lines">
                          <line x1="0" y1="30" x2="360" y2="30" />
                          <line x1="0" y1="60" x2="360" y2="60" />
                          <line x1="0" y1="90" x2="360" y2="90" />
                          <line x1="0" y1="120" x2="360" y2="120" />
                        </g>
                        <line
                          v-if="chartTargetLabel"
                          class="target-line"
                          x1="0"
                          :y1="chartTargetY"
                          x2="360"
                          :y2="chartTargetY"
                        />
                        <path class="chart-area" :d="weightChartArea"></path>
                        <path class="chart-line" :d="weightChartPath"></path>
                        <circle
                          v-for="point in weightChartPoints"
                          :key="point.x"
                          class="chart-point"
                          :cx="point.x"
                          :cy="point.y"
                          r="3.2"
                        />
                      </svg>
                      <div v-if="!weightChartSummaryState" class="chart-labels">
                        <span v-for="(label, index) in weightChartAxis.xLabels" :key="index">{{ label }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="record-list">
                <article v-for="(record, index) in recentWeightRecords" :key="weightRecordKey(record, index)" class="record-item">
                  <div>
                    <strong>{{ recordValue(record) }}</strong>
                    <p>Manual entry</p>
                  </div>
                  <span>{{ formatShortDate(record.date) }} ›</span>
                </article>
                <button
                  v-if="showViewMoreRecords"
                  class="view-more"
                  type="button"
                  @click="openModal('weightRecords')"
                >
                  View more records
                </button>
              </div>

              <button class="btn primary full" type="button" @click="openUpdateSheetFromDetails">
                Add data
              </button>

              <div class="about-section">
                <h3>{{ weightAboutTitle }}</h3>
                <p>{{ weightAboutCopy }}</p>
                <h4>Level reference</h4>
                <div class="level-ref">
                  <div class="level-legend">
                    <span>{{ weightLevelLabels[0] }}</span>
                    <span>{{ weightLevelLabels[1] }}</span>
                    <span>{{ weightLevelLabels[2] }}</span>
                    <span>{{ weightLevelLabels[3] }}</span>
                  </div>
                  <div class="level-bar">
                    <span class="segment under"></span>
                    <span class="segment normal"></span>
                    <span class="segment high"></span>
                    <span class="segment obese"></span>
                  </div>
                  <div class="level-scale">
                    <span>{{ weightLevelNumbers[0] }}</span>
                    <span>{{ weightLevelNumbers[1] }}</span>
                    <span>{{ weightLevelNumbers[2] }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="activeModal === 'weightRecords'" class="weight-records">
              <div class="records-header">
                <h3>All records</h3>
                <p>{{ weightMetricLabel }}</p>
              </div>
              <div class="record-list">
                <article v-for="(record, index) in weightRecordsInRange" :key="weightRecordKey(record, index)" class="record-item">
                  <div>
                    <strong>{{ recordValue(record) }}</strong>
                    <p>Manual entry</p>
                  </div>
                  <span>{{ formatShortDate(record.date) }} ›</span>
                </article>
              </div>
            </div>
          </div>
          <footer v-if="activeModal !== 'weightDetails'" class="update-actions">
            <button class="btn ghost" type="button" @click="closeModal">Cancel</button>
            <button class="btn primary" type="button" @click="saveModal">Save</button>
          </footer>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { syncNutritionGoalsWithPlan } from '@/lib/nutritionGoalSync'
import {
  formatMovementLimitationLabels,
  frequencySessionCountMap,
  onboardingLabelMaps,
  sessionDurationMinutesMap
} from '@/lib/onboardingOptions'
import {
  buildPlanWeightRecord,
  getPlanWeightRecordTime,
  sanitizePlanStateSnapshot,
  sanitizePlanWeightRecords
} from '@/lib/planWeightRecords'
import { useMealEntries } from '@/composables/useMealEntries'
import { getVisibleWorkoutLogs } from '@/lib/restDayState'
import { getUserStorageKey } from '@/lib/userStorage'

const auth = useAuthStore()
const storageKey = computed(() => getUserStorageKey('pf_plan_state', auth.user))
const logsKey = computed(() => getUserStorageKey('pf_workout_logs', auth.user))
const restKey = computed(() => getUserStorageKey('pf_rest_days', auth.user))
const CALORIES_PER_MINUTE = 6

const showGoalModal = ref(false)
const showUpdateSheet = ref(false)
const modalStep = ref(1)
const weightUpdated = ref(false)
const selectionNotice = ref('')
const lastRecommendationSignature = ref('')
const workoutMinutesToday = ref(0)
const workoutCaloriesToday = ref(0)
const weeklyWorkoutMinutes = ref(0)
const weeklyStrengthSets = ref(0)
const weeklyWorkoutCount = ref(0)
const updateForm = reactive({
  weight: '',
  bodyFat: '',
  height: ''
})
const defaultRelatedFilters = {
  fatEfficiency: true,
  weight: true,
  circumference: true,
  bodyProfile: true,
  nutrition: true,
  trainingStatus: true,
  sleep: true
}
const activeModal = ref(null)
const activeChallengeId = ref(null)
const weightDetailMetric = ref('weight')
const weightDetailRange = ref('total')
const weightRangeOffset = ref(0)
const modalForm = reactive({
  intakeKcal: '',
  intakeNote: '',
  deficitKcal: '',
  sleepHours: '',
  sleepQuality: '',
  circumferenceDate: '',
  circumference: {
    chest: '',
    waist: '',
    hip: '',
    leftThigh: '',
    rightThigh: '',
    leftCalf: '',
    rightCalf: '',
    leftArm: '',
    rightArm: ''
  },
  fatEfficiency: '',
  bodyProfile: '',
  bodyProfileNote: '',
  challengeTarget: '',
  filters: { ...defaultRelatedFilters }
})
const planNutritionDate = ref(new Date())
const { entries: planMealEntries, refresh: refreshPlanMealEntries } = useMealEntries(planNutritionDate)

const goalOptions = [
  {
    id: 'weight-loss',
    title: 'Full-body fat loss',
    shortTitle: 'Weight Loss',
    icon: '⚖️',
    subtitle: 'Reduce overall body fat and weight',
    description: 'Focus on a sustainable calorie deficit and steady activity.',
    detailType: 'weight-loss',
    recommendedChallenges: ['activity', 'intake', 'deficit', 'strengthSets']
  },
  {
    id: 'local-slim',
    title: 'Tone specific areas',
    shortTitle: 'Body Circumference',
    icon: '🎯',
    subtitle: 'Tighten and sculpt targeted zones',
    description: 'Track circumference changes and targeted training volume.',
    detailType: 'circumference-reduce',
    recommendedChallenges: ['activity', 'burn', 'fatBurn', 'strengthSets']
  },
  {
    id: 'muscle',
    title: 'Build muscle definition',
    shortTitle: 'Muscle Gain',
    icon: '💪',
    subtitle: 'Increase muscle size and strength',
    description: 'Prioritize progressive overload and nutrition support.',
    detailType: 'focus',
    defaultFocusId: 'circumference-increase',
    focusOptions: [
      { id: 'circumference-increase', title: 'Increase body circumference' },
      { id: 'weight-gain', title: 'Overall weight gain' }
    ],
    recommendedChallenges: ['activity', 'intake', 'strengthSets', 'duration']
  },
  {
    id: 'health',
    title: 'Stay healthy',
    shortTitle: 'Healthy Routine',
    icon: '🧘',
    subtitle: 'Build sustainable movement and recovery',
    description: 'Keep balanced routines with activity and sleep focus.',
    detailType: 'focus',
    defaultFocusId: 'health-frequency',
    focusOptions: [
      { id: 'health-frequency', title: 'Weekly activity frequency' },
      { id: 'health-running', title: 'Running habit' },
      { id: 'health-cycling', title: 'Cycling habit' },
      { id: 'health-sleep', title: 'Sleep consistency' }
    ],
    recommendedChallenges: ['duration', 'steps', 'activity']
  },
  {
    id: 'running',
    title: 'Running performance',
    shortTitle: 'Running Focus',
    icon: '🏃',
    subtitle: 'Improve endurance and pace',
    description: 'Increase weekly distance and speed steadily.',
    detailType: 'running',
    recommendedChallenges: ['runDistance', 'duration', 'activity']
  },
  {
    id: 'posture',
    title: 'Posture & physique',
    shortTitle: 'Posture Score',
    icon: '🧍',
    subtitle: 'Improve alignment and mobility',
    description: 'Track posture scores and corrective training.',
    detailType: 'posture',
    recommendedChallenges: ['duration', 'strengthSets', 'activity']
  }
]

const goalMap = Object.fromEntries(goalOptions.map((goal) => [goal.id, goal]))

const circumferenceParts = [
  { id: 'chest', label: 'Chest' },
  { id: 'waist', label: 'Waist' },
  { id: 'hip', label: 'Hip' },
  { id: 'leftThigh', label: 'Left thigh' },
  { id: 'rightThigh', label: 'Right thigh' },
  { id: 'leftCalf', label: 'Left calf' },
  { id: 'rightCalf', label: 'Right calf' },
  { id: 'leftArm', label: 'Left arm' },
  { id: 'rightArm', label: 'Right arm' }
]

function normalizeCircumferenceLog(raw = {}) {
  const normalized = {
    chest: raw?.chest ?? '',
    waist: raw?.waist ?? '',
    hip: raw?.hip ?? '',
    leftThigh: raw?.leftThigh ?? raw?.thigh ?? '',
    rightThigh: raw?.rightThigh ?? raw?.thigh ?? '',
    leftCalf: raw?.leftCalf ?? raw?.calf ?? '',
    rightCalf: raw?.rightCalf ?? raw?.calf ?? '',
    leftArm: raw?.leftArm ?? raw?.arm ?? '',
    rightArm: raw?.rightArm ?? raw?.arm ?? ''
  }
  return normalized
}

function hasCircumferenceValues(raw = {}) {
  return Object.values(normalizeCircumferenceLog(raw)).some((value) => {
    const numeric = toNumber(value)
    return numeric != null && numeric > 0
  })
}

const postureAreas = [
  { id: 'whole', label: 'Whole body' },
  { id: 'arch', label: 'Foot arch' },
  { id: 'leg', label: 'Leg alignment' },
  { id: 'neck', label: 'Neck & shoulders' },
  { id: 'pelvis', label: 'Pelvis' }
]

const challengeOptions = [
  {
    id: 'activity',
    title: 'Activity burn',
    icon: '🔥',
    unit: 'kcal',
    cadence: 'daily',
    description: 'Total calories from workouts and daily movement.'
  },
  {
    id: 'intake',
    title: 'Food intake',
    icon: '🍽️',
    unit: 'kcal',
    cadence: 'daily',
    description: 'Recommended calories to fuel training and recovery.'
  },
  {
    id: 'deficit',
    title: 'Calorie deficit',
    icon: '📉',
    unit: 'kcal',
    cadence: 'daily',
    description: 'Burned minus intake for fat loss progress.'
  },
  {
    id: 'duration',
    title: 'Workout duration',
    icon: '⏱️',
    unit: 'min',
    cadence: 'daily',
    description: 'Daily training time goal for consistency.'
  },
  {
    id: 'burn',
    title: 'Exercise burn',
    icon: '🔥',
    unit: 'kcal',
    cadence: 'daily',
    description: 'Calories burned specifically in workouts.'
  },
  {
    id: 'fatBurn',
    title: 'Fat burn',
    icon: '🔥',
    unit: 'kcal',
    cadence: 'daily',
    description: 'Calories burned in the fat oxidation zone.'
  },
  {
    id: 'runDistance',
    title: 'Running distance',
    icon: '🏃',
    unit: 'km',
    cadence: 'weekly',
    description: 'Weekly running distance goal.'
  },
  {
    id: 'walkDistance',
    title: 'Walking distance',
    icon: '🚶',
    unit: 'km',
    cadence: 'weekly',
    description: 'Weekly walking distance goal.'
  },
  {
    id: 'rideDistance',
    title: 'Cycling distance',
    icon: '🚴',
    unit: 'km',
    cadence: 'weekly',
    description: 'Weekly cycling distance goal.'
  },
  {
    id: 'steps',
    title: 'Step count',
    icon: '👣',
    unit: 'steps',
    cadence: 'daily',
    description: 'Daily step target to keep moving.'
  },
  {
    id: 'strengthSets',
    title: 'Strength sets',
    icon: '🏋️',
    unit: 'sets',
    cadence: 'weekly',
    description: 'Weekly strength training volume.'
  }
]

const challengeMap = Object.fromEntries(challengeOptions.map((item) => [item.id, item]))

const filterOptions = [
  { id: 'fatEfficiency', label: 'Fat Loss Efficiency' },
  { id: 'weight', label: 'Weight' },
  { id: 'circumference', label: 'Body Circumference' },
  { id: 'bodyProfile', label: 'Body Profile' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'trainingStatus', label: 'Training Status' },
  { id: 'sleep', label: 'Sleep' }
]

const weightMetricOptions = computed(() => [
  {
    id: 'weight',
    label: 'Weight (kg)',
    value: formatNumber(planState.weight.current, 1)
  },
  {
    id: 'bmi',
    label: 'BMI',
    value: bmiCurrentDisplay.value
  },
  {
    id: 'bodyFat',
    label: 'Body fat (%)',
    value: formatNumber(planState.bodyMetrics.bodyFat, 1)
  },
  {
    id: 'height',
    label: 'Height (cm)',
    value: formatNumber(planState.bodyMetrics.heightCm, 1)
  }
])

const weightRangeOptions = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'total', label: 'Total' }
]

function createEmptyPlanState() {
  return {
    goalId: '',
    focusId: null,
    autoRecommend: true,
    weight: {
      start: '',
      current: '',
      target: '',
      startDate: '',
      targetDate: ''
    },
    bodyMetrics: {
      heightCm: '',
      bodyFat: ''
    },
    weightRecords: [],
    dailyLogs: {
      intakeKcal: '',
      intakeNote: '',
      deficitKcal: '',
      sleepHours: '',
      sleepQuality: ''
    },
    bodyCircumferenceLog: {
      chest: '',
      waist: '',
      hip: '',
      leftThigh: '',
      rightThigh: '',
      leftCalf: '',
      rightCalf: '',
      leftArm: '',
      rightArm: ''
    },
    circumferenceRecords: [],
    fatLossEfficiency: '',
    bodyProfile: {
      summary: '',
      note: ''
    },
    relatedFilters: { ...defaultRelatedFilters },
    muscleAbility: {
      push: '',
      pull: '',
      legs: '',
      posterior: ''
    },
    circumference: {
      part: 'chest',
      start: '',
      target: '',
      targetDate: ''
    },
    posture: {
      area: 'whole',
      start: '',
      target: '',
      targetDate: ''
    },
    running: {
      weeklyDistance: '',
      fiveKTime: '',
      longRunTime: '',
      targetDate: ''
    },
    health: {
      frequency: '',
      sessionMinutes: '',
      runDistance: '',
      rideDistance: '',
      sleepHours: '',
      targetDate: ''
    },
    performance: {
      strength: { bench: '', squat: '', deadlift: '' },
      endurance: { plank: '', pushups: '', rowTime: '' },
      targetDate: ''
    },
    challengeValues: {
      activity: 0,
      intake: 0,
      deficit: 0,
      duration: 0,
      burn: 0,
      fatBurn: 0,
      runDistance: 0,
      walkDistance: 0,
      rideDistance: 0,
      steps: 0,
      strengthSets: 0
    },
    selectedChallenges: []
  }
}

const planState = reactive(createEmptyPlanState())

const activityCalories = ref(0)
const activityMinutes = ref(0)
const currentTime = ref('')
let timeTicker = null
let nutritionSyncTimer = null

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const selectedGoal = computed(() => goalMap[planState.goalId] || null)
const focusOptions = computed(() => selectedGoal.value?.focusOptions ?? [])
const selectedChallengesData = computed(() =>
  planState.selectedChallenges.map((id) => challengeMap[id]).filter(Boolean)
)
const activeChallenge = computed(() => challengeMap[activeChallengeId.value] || null)

const activeDetailType = computed(() => {
  if (!selectedGoal.value) return null
  if (selectedGoal.value.detailType !== 'focus') return selectedGoal.value.detailType
  return planState.focusId || selectedGoal.value.defaultFocusId || null
})

const isWeightLoss = computed(() => activeDetailType.value === 'weight-loss')
const onboardingAnswers = computed(() => auth.user?.onboarding?.answers || null)

const activityProgress = computed(() => {
  const target = Number(planState.challengeValues.activity) || 0
  if (!target) return 0
  return Math.min(activityCalories.value / target, 1)
})

const activityBurnSummary = computed(() => {
  const goal = Number(planState.challengeValues.activity) || 0
  const actual = Number(activityCalories.value) || 0
  if (!goal) return `Actual ${actual} kcal`
  return `Goal ${goal} kcal · Actual ${actual} kcal`
})

const activeCircumferenceLabel = computed(() => {
  const part = circumferenceParts.find((item) => item.id === planState.circumference.part)
  return part?.label || 'Unknown'
})

const weightStartDate = computed(() => planState.weight.startDate || getTodayISO())

const formattedTargetDate = computed(() => formatDateLong(targetDateIso.value))

const daysRemaining = computed(() => {
  if (!targetDateIso.value) return null
  const target = parseISODate(targetDateIso.value)
  if (!target) return null
  const today = parseISODate(getTodayISO())
  if (!today) return null
  const diff = target.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / 86400000))
})

const daysRemainingLabel = computed(() => {
  if (daysRemaining.value == null) return '--'
  return `${daysRemaining.value} days`
})

const weeklyChange = computed(() => {
  if (!daysRemaining.value || daysRemaining.value <= 0) return null
  const weeks = daysRemaining.value / 7
  if (activeDetailType.value === 'weight-loss' || activeDetailType.value === 'weight-gain') {
    const delta = Number(planState.weight.target) - Number(planState.weight.start)
    if (!Number.isFinite(delta)) return null
    return Math.abs(delta) / weeks
  }
  if (
    activeDetailType.value === 'circumference-reduce' ||
    activeDetailType.value === 'circumference-increase'
  ) {
    const delta = Number(planState.circumference.target) - Number(planState.circumference.start)
    if (!Number.isFinite(delta)) return null
    return Math.abs(delta) / weeks
  }
  return null
})

const weeklyChangeLabel = computed(() => {
  if (!weeklyChange.value) return '--'
  const unit =
    activeDetailType.value === 'weight-loss' || activeDetailType.value === 'weight-gain'
      ? 'kg/week'
      : 'cm/week'
  return `${weeklyChange.value.toFixed(1)} ${unit}`
})

const weightProgress = computed(() => {
  const start = Number(planState.weight.start)
  const current = Number(planState.weight.current)
  const target = Number(planState.weight.target)
  return computeProgress(start, current, target)
})

const weightProgressPercent = computed(() => `${Math.round(weightProgress.value * 100)}%`)

const targetDateIso = computed(() => {
  switch (activeDetailType.value) {
    case 'weight-loss':
    case 'weight-gain':
      return planState.weight.targetDate
    case 'circumference-reduce':
    case 'circumference-increase':
      return planState.circumference.targetDate
    case 'posture':
      return planState.posture.targetDate
    case 'running':
      return planState.running.targetDate
    case 'health-frequency':
    case 'health-running':
    case 'health-cycling':
    case 'health-sleep':
      return planState.health.targetDate
    case 'strength':
    case 'endurance':
      return planState.performance.targetDate
    default:
      return null
  }
})

const comboRecommendation = computed(() => {
  if (!isWeightLoss.value) {
    return {
      burnTotal: planState.challengeValues.activity,
      intake: planState.challengeValues.intake,
      deficit: planState.challengeValues.deficit
    }
  }
  return getWeightLossRecommendation()
})

const initialPlanRecommendation = computed(() => {
  const onboarding = onboardingAnswers.value
  if (!onboarding) return null

  const recommendedGoal = resolveOnboardingGoalRecommendation(onboarding)
  const weeklySessions = frequencySessionCountMap[onboarding.frequency] || 4
  const sessionMinutes = sessionDurationMinutesMap[onboarding.sessionDuration] || 55
  const movementLabels = formatMovementLimitationLabels(onboarding.movementLimitations || [])
  const recommendedChallenges = (goalMap[recommendedGoal.goalId]?.recommendedChallenges || [])
    .map((id) => challengeMap[id]?.title)
    .filter(Boolean)

  const goalLabel = goalMap[recommendedGoal.goalId]?.shortTitle || 'Training plan'
  const trainingSetupLabel = onboardingLabelMaps.trainingSetup[onboarding.trainingSetup] || 'Mixed setup'
  const frequencyLabel = onboardingLabelMaps.frequency[onboarding.frequency] || `${weeklySessions} sessions per week`
  const sessionDurationLabel =
    onboardingLabelMaps.sessionDuration[onboarding.sessionDuration] || `${sessionMinutes} min`

  return {
    goalId: recommendedGoal.goalId,
    focusId: recommendedGoal.focusId,
    weeklySessions,
    sessionMinutes,
    goalLabel,
    frequencyLabel,
    sessionDurationLabel,
    trainingSetupLabel,
    title: `${goalLabel} starting point`,
    summary: `Start with a ${goalLabel.toLowerCase()} block shaped around ${weeklySessions} sessions per week, ${sessionMinutes}-minute sessions, and your current setup.`,
    setupNote: describeTrainingSetupRecommendation(onboarding.trainingSetup, recommendedGoal.goalId),
    limitationNote: describeMovementRecommendation(movementLabels),
    challengeNote: recommendedChallenges.length
      ? `Suggested tracking focus: ${recommendedChallenges.join(', ')}.`
      : 'Suggested tracking focus will be added after you pick a goal.',
    movementLabels
  }
})

const bmiDisplay = computed(() => {
  const weight = Number(updateForm.weight)
  const height = Number(updateForm.height)
  if (!Number.isFinite(weight) || !Number.isFinite(height) || height <= 0) return '--'
  const heightMeters = height / 100
  const bmi = weight / (heightMeters * heightMeters)
  if (!Number.isFinite(bmi)) return '--'
  return bmi.toFixed(1)
})

const bmiCurrent = computed(() => calcBmi(planState.weight.current, planState.bodyMetrics.heightCm))
const bmiTarget = computed(() => calcBmi(planState.weight.target, planState.bodyMetrics.heightCm))

const bmiCurrentDisplay = computed(() => (bmiCurrent.value ? bmiCurrent.value.toFixed(1) : '--'))

const weightLevelTone = computed(() => {
  const label = getBmiLevel(bmiCurrent.value).label
  if (label === 'Underweight') return 'under'
  if (label === 'Normal') return 'normal'
  if (label === 'Overweight') return 'high'
  if (label === 'Obese') return 'obese'
  return 'neutral'
})

const weightMetricLabel = computed(() => {
  if (weightDetailMetric.value === 'weight') return 'Weight (kg)'
  if (weightDetailMetric.value === 'bmi') return 'BMI'
  if (weightDetailMetric.value === 'bodyFat') return 'Body fat (%)'
  return 'Height (cm)'
})

const weightMetricCurrent = computed(() => {
  if (weightDetailMetric.value === 'weight') return formatNumber(planState.weight.current, 1)
  if (weightDetailMetric.value === 'bmi') return bmiCurrentDisplay.value
  if (weightDetailMetric.value === 'bodyFat') return formatNumber(planState.bodyMetrics.bodyFat, 1)
  return formatNumber(planState.bodyMetrics.heightCm, 1)
})

const weightMetricTarget = computed(() => {
  if (weightDetailMetric.value === 'weight') return formatNumber(planState.weight.target, 1)
  if (weightDetailMetric.value === 'bmi') return bmiTarget.value ? bmiTarget.value.toFixed(1) : '--'
  if (weightDetailMetric.value === 'bodyFat') return '--'
  return '--'
})

const weightMetricLevel = computed(() => {
  if (weightDetailMetric.value === 'bodyFat') {
    return getBodyFatLevel(toNumber(planState.bodyMetrics.bodyFat))
  }
  if (weightDetailMetric.value === 'height') {
    return { label: 'Reference', position: '50%' }
  }
  return getBmiLevel(bmiCurrent.value)
})

const showLevelIndicator = computed(() => weightMetricLevel.value.label !== '--')

const weightLevelLabels = computed(() => {
  if (weightDetailMetric.value === 'bodyFat') {
    return ['Low', 'Healthy', 'High', 'Very high']
  }
  if (weightDetailMetric.value === 'height') {
    return ['Short', 'Average', 'Tall', 'Very tall']
  }
  return ['Underweight', 'Normal', 'Overweight', 'Obese']
})

const weightLevelNumbers = computed(() => {
  if (weightDetailMetric.value === 'bodyFat') {
    return ['11%', '22%', '27%']
  }
  if (weightDetailMetric.value === 'bmi') {
    return ['18.5', '24.0', '28.0']
  }
  if (weightDetailMetric.value === 'weight') {
    const heightValue = planState.bodyMetrics.heightCm || 175
    const height = Number(heightValue)
    if (!Number.isFinite(height) || height <= 0) return ['--', '--', '--']
    const meters = height / 100
    const thresholds = [18.5, 24, 28].map((bmi) => (bmi * meters * meters).toFixed(1))
    return thresholds
  }
  return ['--', '--', '--']
})

const weightAboutTitle = computed(() => {
  if (weightDetailMetric.value === 'weight') return 'Weight overview'
  if (weightDetailMetric.value === 'bmi') return 'BMI overview'
  if (weightDetailMetric.value === 'bodyFat') return 'Body fat overview'
  return 'Height overview'
})

const weightAboutCopy = computed(() => {
  if (weightDetailMetric.value === 'weight') {
    return 'Weight is a key indicator of overall health. Keeping weight within a healthy range supports better energy levels and long-term wellness.'
  }
  if (weightDetailMetric.value === 'bmi') {
    return 'BMI (Body Mass Index) reflects weight relative to height. It helps estimate whether your weight is in a healthy range.'
  }
  if (weightDetailMetric.value === 'bodyFat') {
    return 'Body fat percentage indicates the proportion of fat in the body. It is useful for tracking composition changes over time.'
  }
  return 'Height is used together with weight to estimate BMI and track body composition metrics.'
})

const rangeBounds = computed(() => getRangeBounds(weightDetailRange.value, weightRangeOffset.value))

const weightRecordsChart = computed(() => {
  const records = Array.isArray(planState.weightRecords) ? planState.weightRecords : []
  const filtered = filterRecordsByRange(records, weightDetailRange.value, weightRangeOffset.value)
  return filtered.slice().sort((a, b) => getPlanWeightRecordTime(a) - getPlanWeightRecordTime(b))
})

const weightMetricRecordsChart = computed(() =>
  weightRecordsChart.value.filter((record) => getRecordMetric(record, weightDetailMetric.value) != null)
)

const weightRecordsInRange = computed(() => {
  return weightMetricRecordsChart.value.slice().sort((a, b) => getPlanWeightRecordTime(b) - getPlanWeightRecordTime(a))
})

const recentWeightRecords = computed(() => weightRecordsInRange.value.slice(0, 3))
const showViewMoreRecords = computed(() => weightRecordsInRange.value.length > 3)

const rangeLabel = computed(() => {
  if (!rangeBounds.value) return '--'
  return `${formatDateLong(rangeBounds.value.start)} - ${formatDateLong(rangeBounds.value.end)}`
})

const rangeNavDisabled = computed(() => weightDetailRange.value === 'total')
const rangeNavPrevDisabled = computed(
  () => rangeNavDisabled.value || weightRangeOffset.value === 0
)
const rangeNavNextDisabled = computed(() => rangeNavDisabled.value)

const chartTargetValue = computed(() => {
  if (weightDetailMetric.value === 'weight') return toNumber(planState.weight.target)
  if (weightDetailMetric.value === 'bmi') return bmiTarget.value
  return null
})

const weightChart = computed(() =>
  buildChart(weightMetricRecordsChart.value, weightDetailMetric.value, chartTargetValue.value)
)
const weightChartPath = computed(() => weightChart.value.line)
const weightChartArea = computed(() => weightChart.value.area)
const weightChartPoints = computed(() => weightChart.value.points)
const chartTargetY = computed(() => weightChart.value.targetY)
const weightChartSummaryState = computed(() => {
  const records = weightMetricRecordsChart.value
  if (!records.length) return null
  const values = records
    .map((record) => getRecordMetric(record, weightDetailMetric.value))
    .filter((value) => value != null)
  if (!values.length) return null
  if (values.length > 2) return null
  const uniqueValues = new Set(values.map((value) => value.toFixed(2)))

  const latest = records[records.length - 1]
  const previous = records.length > 1 ? records[records.length - 2] : null
  const latestValue = getRecordMetric(latest, weightDetailMetric.value)
  const previousValue = previous ? getRecordMetric(previous, weightDetailMetric.value) : null
  const delta =
    latestValue != null && previousValue != null ? Number((latestValue - previousValue).toFixed(2)) : null

  let deltaLabel = 'First logged record'
  let deltaTone = 'neutral'
  if (delta != null) {
    if (Math.abs(delta) < 0.01) {
      deltaLabel = 'Stable versus previous record'
    } else {
      const unit =
        weightDetailMetric.value === 'weight'
          ? 'kg'
          : weightDetailMetric.value === 'height'
            ? 'cm'
            : weightDetailMetric.value === 'bodyFat'
              ? '%'
              : ''
      deltaLabel = `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)}${unit ? ` ${unit}` : ''}`
      deltaTone = delta > 0 ? 'positive' : 'negative'
    }
  }

  return {
    currentLabel: recordValue(latest),
    previousLabel: previous ? recordValue(previous) : '',
    deltaLabel,
    deltaTone,
    meta: `${formatShortDate(records[0].date)} - ${formatShortDate(latest.date)} · ${records.length} record${records.length > 1 ? 's' : ''}`,
    message:
      uniqueValues.size === 1
        ? `All logged ${weightMetricLabel.value.toLowerCase()} values are unchanged in this range.`
        : `Only ${records.length} logged record${records.length > 1 ? 's are' : ' is'} available in this range. Add one more entry to reveal the trend curve.`
  }
})
const weightChartAxis = computed(() => {
  const labels = getAxisLabels(weightChart.value.min, weightChart.value.max)
  const xLabels =
    weightMetricRecordsChart.value.length > 0 && weightMetricRecordsChart.value.length <= 4
      ? (() => {
          const duplicateDates = new Set(
            weightMetricRecordsChart.value
              .map((record) => String(record?.date || '').trim())
              .filter((date, index, list) => date && list.indexOf(date) !== index)
          )
          return weightMetricRecordsChart.value.map((record) => formatWeightAxisLabel(record, duplicateDates))
        })()
      : getRangeLabels(rangeBounds.value)
  return { yLabels: labels, xLabels }
})
const chartTargetOffset = computed(() => {
  if (chartTargetY.value == null) return '0%'
  const percent = (chartTargetY.value / 120) * 100
  return `${Math.min(Math.max(percent, 0), 100)}%`
})
const chartTargetLabel = computed(() => {
  if (!chartTargetValue.value) return ''
  if (weightDetailMetric.value === 'weight') return `Target ${chartTargetValue.value.toFixed(1)}`
  if (weightDetailMetric.value === 'bmi') return `Target ${chartTargetValue.value.toFixed(1)}`
  return ''
})

const trainingStatusMessage = computed(() => {
  const weeklyTargetMinutes = Number(planState.challengeValues.duration || 0) * 7
  const minutes = weeklyWorkoutMinutes.value
  const target = weeklyTargetMinutes || 150
  const ratio = target ? minutes / target : 0
  if (ratio >= 1) return `On track · ${minutes} min this week`
  if (ratio >= 0.6) return `Improving · ${minutes} min this week`
  return `Needs improvement · ${minutes} min this week`
})

const loggedNutritionIntakeKcal = computed(() =>
  (planMealEntries.value || []).reduce((total, entry) => total + (toNumber(entry?.calories) || 0), 0)
)

const effectiveIntakeKcal = computed(() => {
  if (loggedNutritionIntakeKcal.value > 0) return loggedNutritionIntakeKcal.value
  return toNumber(planState.dailyLogs.intakeKcal) || 0
})

const intakeDisplay = computed(() => {
  const value = effectiveIntakeKcal.value
  return value > 0 ? `${Math.round(value)} kcal` : 'Please input'
})

const sleepDisplay = computed(() => {
  const hours = toNumber(planState.dailyLogs.sleepHours)
  if (!hours || hours <= 0) return 'Please input'
  const quality = planState.dailyLogs.sleepQuality?.trim()
  return quality ? `${hours} h · ${quality}` : `${hours} h`
})

const fatEfficiencyDisplay = computed(() => {
  const value = toNumber(planState.fatLossEfficiency)
  return value && value > 0 ? `${value}%` : 'Please input'
})

const bodyProfileDisplay = computed(() => {
  const summary = planState.bodyProfile.summary?.trim()
  return summary ? summary : 'Please input'
})

const circumferenceDisplay = computed(() => {
  const labels = {
    chest: 'Chest',
    waist: 'Waist',
    hip: 'Hip',
    leftThigh: 'Left thigh',
    rightThigh: 'Right thigh',
    leftCalf: 'Left calf',
    rightCalf: 'Right calf',
    leftArm: 'Left arm',
    rightArm: 'Right arm'
  }
  const entries = Object.entries(normalizeCircumferenceLog(planState.bodyCircumferenceLog))
    .map(([key, value]) => [key, toNumber(value)])
    .filter(([, value]) => value && value > 0)
  if (!entries.length) return 'Please input'
  return entries
    .slice(0, 2)
    .map(([key, value]) => `${labels[key]} ${value} cm`)
    .join(' · ')
})

const intakeStatus = computed(() => {
  const target = toNumber(planState.challengeValues.intake)
  if (!target || target <= 0) return ''
  const intake = effectiveIntakeKcal.value
  if (!intake || intake <= 0) return 'Below target'
  if (intake < target * 0.9) return 'Below target'
  if (intake <= target * 1.1) return 'On target'
  return 'Above target'
})

const showDeficitNotice = computed(() => {
  if (!planState.selectedChallenges.includes('deficit')) return false
  const intake = effectiveIntakeKcal.value
  const deficit = toNumber(planState.dailyLogs.deficitKcal)
  return !intake && !deficit
})

const modalTitle = computed(() => {
  if (modalStep.value === 1) return 'Choose your workout goal'
  if (modalStep.value === 2) return 'Set your goal details'
  if (modalStep.value === 3) return 'Daily challenge combo'
  return 'Select your daily challenges'
})

const modalSubtitle = computed(() => {
  if (modalStep.value === 1) return 'Pick the goal that matches your plan.'
  if (modalStep.value === 2) return 'Fill in the details to personalize your plan.'
  if (modalStep.value === 3) return 'Smart suggestions based on your target.'
  return 'Choose 1-4 metrics and adjust the targets.'
})

const modalCopy = computed(() => {
  if (activeModal.value === 'challengeTarget' && activeChallenge.value) {
    return {
      title: activeChallenge.value.title,
      subtitle: `Adjust your ${cadenceLabel(activeChallenge.value.cadence).toLowerCase()} target.`
    }
  }

  const copyMap = {
    intake: {
      title: 'Food intake',
      subtitle: 'Log your total calories for today.'
    },
    deficit: {
      title: 'Calorie deficit',
      subtitle: 'Log the deficit you want to track for today.'
    },
    sleep: {
      title: 'Sleep',
      subtitle: 'Record your sleep duration and quality.'
    },
    circumference: {
      title: 'Body circumference',
      subtitle: 'Log your latest measurements.'
    },
    fatEfficiency: {
      title: 'Fat loss efficiency',
      subtitle: 'Add your current efficiency score.'
    },
    bodyProfile: {
      title: 'Body profile',
      subtitle: 'Add a short summary and notes.'
    },
    weightDetails: {
      title: 'Height & weight',
      subtitle: 'Review your weight-related metrics and history.'
    },
    weightRecords: {
      title: 'Full records',
      subtitle: 'View all of your logged measurements.'
    },
    filters: {
      title: 'Sort & filter',
      subtitle: 'Select the data cards you want to see.'
    }
  }
  return copyMap[activeModal.value] || { title: '', subtitle: '' }
})

function resolveOnboardingGoalRecommendation(onboarding) {
  if (!onboarding) return { goalId: 'health', focusId: 'health-frequency' }
  if (onboarding.goal === 'fat-loss') return { goalId: 'weight-loss', focusId: null }
  if (onboarding.goal === 'muscle-gain') return { goalId: 'muscle', focusId: 'weight-gain' }
  return { goalId: 'health', focusId: 'health-frequency' }
}

function describeTrainingSetupRecommendation(trainingSetup, goalId) {
  if (trainingSetup === 'home-bodyweight') {
    return goalId === 'weight-loss'
      ? 'Bias the first block toward brisk, low-complexity full-body work and low-impact conditioning you can repeat consistently at home.'
      : 'Bias the first block toward bodyweight circuits, tempo work, and repeatable movement quality before chasing volume.'
  }
  if (trainingSetup === 'home-basic-kit') {
    return 'Use dumbbells, bands, or kettlebells as the main progression tools and keep exercise selection compact and repeatable.'
  }
  if (trainingSetup === 'gym-full-access') {
    return 'Use full gym access to anchor the plan around compound lifts, accessories, and better load progression from week to week.'
  }
  return 'Keep the first block flexible enough to work across home, gym, and travel days without changing the core weekly structure.'
}

function describeMovementRecommendation(labels = []) {
  const filtered = Array.isArray(labels)
    ? labels.filter((label) => label && label !== 'No current restrictions')
    : []
  if (!filtered.length) {
    return 'No current movement limitations were flagged, so the recommendation can progress normally and tighten based on logged training.'
  }
  return `Start conservatively around ${filtered.join(', ').toLowerCase()} and use exercise substitutions or load limits where needed.`
}

function resolveInitialIntakeMultiplier(goalId, nutrition) {
  if (goalId === 'muscle') {
    if (nutrition === 'calorie-surplus') return 34
    if (nutrition === 'maintenance') return 32
    return 31
  }
  if (goalId === 'weight-loss') {
    if (nutrition === 'maintenance') return 30
    return 29
  }
  if (nutrition === 'calorie-surplus') return 33
  if (nutrition === 'maintenance') return 31
  return 29
}

function buildInitialChallengeTargets(onboarding, { goalId, weeklySessions, sessionMinutes, currentWeight }) {
  const limitationValues = Array.isArray(onboarding?.movementLimitations) ? onboarding.movementLimitations : []
  const hasRestrictions = limitationValues.some((item) => item && item !== 'none')
  const lowImpactBias = limitationValues.includes('impact') || limitationValues.includes('knees')

  const dailyDuration = clamp(Math.round((weeklySessions * sessionMinutes) / 7), 20, 75)
  const activityMultiplier =
    onboarding?.trainingSetup === 'home-bodyweight'
      ? 5
      : onboarding?.trainingSetup === 'gym-full-access'
        ? 6.5
        : 6
  const rawActivity = Math.round((weeklySessions * sessionMinutes * activityMultiplier) / 7)
  const activity = clamp(lowImpactBias ? Math.round(rawActivity * 0.9) : rawActivity, 140, 420)
  const stepsBase = hasRestrictions ? 6500 : 7500
  const steps = clamp(stepsBase + (weeklySessions - 2) * 750, 6000, 12000)

  const setsPerSession =
    onboarding?.trainingSetup === 'gym-full-access'
      ? 5
      : onboarding?.trainingSetup === 'home-basic-kit'
        ? 4
        : 3
  const strengthSets = clamp(
    weeklySessions * setsPerSession - (hasRestrictions ? 2 : 0),
    8,
    28
  )

  const safeWeight = currentWeight || 70
  const intakeMultiplier = resolveInitialIntakeMultiplier(goalId, onboarding?.nutrition)
  const intake = clamp(Math.round(safeWeight * intakeMultiplier), 1600, 3600)

  return {
    duration: dailyDuration,
    activity,
    steps,
    strengthSets,
    intake
  }
}

function hydratePlanMetricsFromProfile() {
  const nextHeight = toNumber(planState.bodyMetrics.heightCm) ?? toNumber(auth.user?.height ?? auth.user?.heightCm)
  const nextBodyFat = toNumber(planState.bodyMetrics.bodyFat) ?? toNumber(auth.user?.bodyFat)
  if (nextHeight != null) {
    planState.bodyMetrics.heightCm = Number(nextHeight)
  }
  if (nextBodyFat != null) {
    planState.bodyMetrics.bodyFat = Number(nextBodyFat)
  }
}

function applyOnboardingRecommendation() {
  const recommendation = initialPlanRecommendation.value
  const onboarding = onboardingAnswers.value
  if (!recommendation || !onboarding) {
    openGoalModal(1)
    return
  }

  const today = getTodayISO()
  const targetDate = addDays(today, 84)
  const currentWeight =
    toNumber(planState.weight.current) ??
    toNumber(planState.weight.start) ??
    toNumber(auth.user?.weight ?? auth.user?.weightKg) ??
    70

  hydratePlanMetricsFromProfile()

  selectGoal(recommendation.goalId)
  if (recommendation.focusId) {
    planState.focusId = recommendation.focusId
  }

  const targets = buildInitialChallengeTargets(onboarding, {
    goalId: recommendation.goalId,
    weeklySessions: recommendation.weeklySessions,
    sessionMinutes: recommendation.sessionMinutes,
    currentWeight
  })

  if (recommendation.goalId === 'weight-loss') {
    planState.weight.start = currentWeight
    planState.weight.current = currentWeight
    planState.weight.startDate = today
    planState.weight.target = Number((currentWeight - Math.min(6, Math.max(3, recommendation.weeklySessions))).toFixed(1))
    planState.weight.targetDate = targetDate
    planState.autoRecommend = true
    lastRecommendationSignature.value = ''
    applyWeightLossRecommendations()
    addOrUpdateWeightRecord()
    return
  }

  if (recommendation.goalId === 'muscle') {
    planState.focusId = recommendation.focusId || 'weight-gain'
    planState.weight.start = currentWeight
    planState.weight.current = currentWeight
    planState.weight.startDate = today
    planState.weight.target = Number((currentWeight + 2.5).toFixed(1))
    planState.weight.targetDate = targetDate
    planState.autoRecommend = false
    planState.challengeValues.activity = targets.activity
    planState.challengeValues.duration = targets.duration
    planState.challengeValues.intake = targets.intake
    planState.challengeValues.strengthSets = targets.strengthSets
    addOrUpdateWeightRecord()
    return
  }

  planState.autoRecommend = false
  planState.focusId = recommendation.focusId || 'health-frequency'
  planState.health.frequency = recommendation.weeklySessions
  planState.health.sessionMinutes = recommendation.sessionMinutes
  planState.health.targetDate = targetDate
  planState.challengeValues.duration = targets.duration
  planState.challengeValues.steps = targets.steps
  planState.challengeValues.activity = targets.activity
}

function openGoalModal(step = 1) {
  showGoalModal.value = true
  modalStep.value = step
  selectionNotice.value = ''
  if (step === 3 && isWeightLoss.value) applyWeightLossRecommendations()
}

function closeGoalModal() {
  showGoalModal.value = false
  selectionNotice.value = ''
}

function openUpdateSheet() {
  updateForm.weight = planState.weight.current || ''
  updateForm.bodyFat = planState.bodyMetrics.bodyFat || ''
  updateForm.height = planState.bodyMetrics.heightCm || ''
  showUpdateSheet.value = true
}

function closeUpdateSheet() {
  showUpdateSheet.value = false
}

function saveUpdateSheet() {
  if (updateForm.weight !== '' && Number.isFinite(Number(updateForm.weight))) {
    planState.weight.current = Number(updateForm.weight)
  }
  if (updateForm.height !== '' && Number.isFinite(Number(updateForm.height))) {
    planState.bodyMetrics.heightCm = Number(updateForm.height)
  }
  if (updateForm.bodyFat !== '' && Number.isFinite(Number(updateForm.bodyFat))) {
    planState.bodyMetrics.bodyFat = Number(updateForm.bodyFat)
  }
  showUpdateSheet.value = false
  markWeightUpdated()
  addOrUpdateWeightRecord()
  savePlan()
}

function openUpdateSheetFromDetails() {
  closeModal()
  openUpdateSheet()
}

function isChallengeModal(id) {
  return Boolean(challengeMap[id])
}

function openChallengeModal(id) {
  if (!isChallengeModal(id)) return
  openModal('challengeTarget', id)
}

function openModal(type, challengeId = null) {
  activeModal.value = type
  if (type !== 'challengeTarget') {
    activeChallengeId.value = null
  }
  if (type === 'challengeTarget') {
    const challenge = challengeMap[challengeId]
    if (!challenge) {
      activeModal.value = null
      return
    }
    activeChallengeId.value = challengeId
    modalForm.challengeTarget = normalizeNumber(planState.challengeValues[challengeId])
    return
  }
  if (type === 'intake') {
    modalForm.intakeKcal = planState.dailyLogs.intakeKcal ?? ''
    modalForm.intakeNote = planState.dailyLogs.intakeNote ?? ''
  }
  if (type === 'deficit') {
    modalForm.deficitKcal = planState.dailyLogs.deficitKcal ?? ''
  }
  if (type === 'sleep') {
    modalForm.sleepHours = planState.dailyLogs.sleepHours ?? ''
    modalForm.sleepQuality = planState.dailyLogs.sleepQuality ?? ''
  }
  if (type === 'circumference') {
    modalForm.circumferenceDate = getTodayISO()
    Object.assign(modalForm.circumference, normalizeCircumferenceLog(planState.bodyCircumferenceLog))
  }
  if (type === 'fatEfficiency') {
    modalForm.fatEfficiency = planState.fatLossEfficiency ?? ''
  }
  if (type === 'bodyProfile') {
    modalForm.bodyProfile = planState.bodyProfile.summary ?? ''
    modalForm.bodyProfileNote = planState.bodyProfile.note ?? ''
  }
  if (type === 'filters') {
    Object.assign(modalForm.filters, defaultRelatedFilters, planState.relatedFilters || {})
  }
  if (type === 'weightDetails') {
    ensureWeightRecords()
    weightDetailMetric.value = 'weight'
    weightDetailRange.value = 'total'
    weightRangeOffset.value = 0
  }
}

function closeModal() {
  activeModal.value = null
  activeChallengeId.value = null
}

function saveModal() {
  if (!activeModal.value) return
  if (activeModal.value === 'challengeTarget') {
    const challenge = activeChallenge.value
    if (challenge) {
      const target = toNumber(modalForm.challengeTarget)
      planState.challengeValues[challenge.id] = target != null ? Math.max(0, target) : 0
      onChallengeValueInput()
    }
    closeModal()
    return
  }
  if (activeModal.value === 'intake') {
    planState.dailyLogs.intakeKcal = normalizeNumber(modalForm.intakeKcal)
    planState.dailyLogs.intakeNote = (modalForm.intakeNote || '').trim()
  }
  if (activeModal.value === 'deficit') {
    planState.dailyLogs.deficitKcal = normalizeNumber(modalForm.deficitKcal)
  }
  if (activeModal.value === 'sleep') {
    planState.dailyLogs.sleepHours = normalizeNumber(modalForm.sleepHours)
    planState.dailyLogs.sleepQuality = (modalForm.sleepQuality || '').trim()
  }
  if (activeModal.value === 'circumference') {
    Object.keys(planState.bodyCircumferenceLog).forEach((key) => {
      planState.bodyCircumferenceLog[key] = normalizeNumber(modalForm.circumference[key])
    })
    if (!Array.isArray(planState.circumferenceRecords)) {
      planState.circumferenceRecords = []
    }
    if (hasCircumferenceValues(planState.bodyCircumferenceLog)) {
      const snapshot = {
        date: modalForm.circumferenceDate || getTodayISO(),
        recordedAt: new Date().toISOString(),
        measurements: normalizeCircumferenceLog(planState.bodyCircumferenceLog)
      }
      const latest = planState.circumferenceRecords[planState.circumferenceRecords.length - 1]
      const sameAsLatest =
        latest?.date === snapshot.date &&
        JSON.stringify(normalizeCircumferenceLog(latest?.measurements || {})) === JSON.stringify(snapshot.measurements)
      if (!sameAsLatest) {
        planState.circumferenceRecords.push(snapshot)
        planState.circumferenceRecords.sort((a, b) => {
          const aTime = new Date(a?.recordedAt || a?.date || 0).getTime()
          const bTime = new Date(b?.recordedAt || b?.date || 0).getTime()
          return aTime - bTime
        })
      }
    }
  }
  if (activeModal.value === 'fatEfficiency') {
    planState.fatLossEfficiency = normalizeNumber(modalForm.fatEfficiency)
  }
  if (activeModal.value === 'bodyProfile') {
    planState.bodyProfile.summary = (modalForm.bodyProfile || '').trim()
    planState.bodyProfile.note = (modalForm.bodyProfileNote || '').trim()
  }
  if (activeModal.value === 'filters') {
    planState.relatedFilters = { ...defaultRelatedFilters, ...modalForm.filters }
  }
  closeModal()
}

function isRelatedVisible(id) {
  if (!planState.relatedFilters) return true
  return planState.relatedFilters[id] !== false
}

function selectGoal(goalId) {
  planState.goalId = goalId
  const goal = goalMap[goalId]
  if (goal?.detailType === 'focus') {
    planState.focusId = goal.defaultFocusId || goal.focusOptions?.[0]?.id || null
    applyFocusDefaults(planState.focusId)
  } else {
    planState.focusId = null
  }
  if (goalId === 'weight-loss' || goalId === 'weight-gain') {
    planState.weight.startDate = getTodayISO()
  }
  if (goal?.recommendedChallenges) {
    planState.selectedChallenges = [...goal.recommendedChallenges].slice(0, 4)
  }
  modalStep.value = 2
  if (goalId === 'weight-loss') {
    planState.autoRecommend = true
    applyWeightLossRecommendations()
  }
}

function selectFocus(focusId) {
  planState.focusId = focusId
  applyFocusDefaults(focusId)
}

function isValueMissing(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  return false
}

function getGoalDetailMissingFields() {
  const missing = []
  const detailType = activeDetailType.value

  const requireField = (label, value) => {
    if (isValueMissing(value)) missing.push(label)
  }

  if (focusOptions.value.length && !planState.focusId) {
    requireField('Focus', planState.focusId)
  }

  if (detailType === 'weight-loss' || detailType === 'weight-gain') {
    requireField('Start (kg)', planState.weight.start)
    requireField('Target (kg)', planState.weight.target)
    requireField('Target date', planState.weight.targetDate)
    return missing
  }

  if (detailType === 'circumference-reduce' || detailType === 'circumference-increase') {
    requireField('Start (cm)', planState.circumference.start)
    requireField('Target (cm)', planState.circumference.target)
    requireField('Target date', planState.circumference.targetDate)
    return missing
  }

  if (detailType === 'posture') {
    requireField('Start (score)', planState.posture.start)
    requireField('Target (score)', planState.posture.target)
    requireField('Target date', planState.posture.targetDate)
    return missing
  }

  if (detailType === 'running') {
    requireField('Weekly distance (km)', planState.running.weeklyDistance)
    requireField('5K target time (min)', planState.running.fiveKTime)
    requireField('Longest run (min)', planState.running.longRunTime)
    requireField('Target date', planState.running.targetDate)
    return missing
  }

  if (detailType === 'health-frequency') {
    requireField('Sessions per week', planState.health.frequency)
    requireField('Minutes per session', planState.health.sessionMinutes)
    requireField('Target date', planState.health.targetDate)
    return missing
  }

  if (detailType === 'health-running') {
    requireField('Run distance (km/week)', planState.health.runDistance)
    requireField('Target date', planState.health.targetDate)
    return missing
  }

  if (detailType === 'health-cycling') {
    requireField('Ride distance (km/week)', planState.health.rideDistance)
    requireField('Target date', planState.health.targetDate)
    return missing
  }

  if (detailType === 'health-sleep') {
    requireField('Sleep hours/night', planState.health.sleepHours)
    requireField('Target date', planState.health.targetDate)
    return missing
  }

  if (detailType === 'strength') {
    requireField('Bench 1RM (kg)', planState.performance.strength.bench)
    requireField('Squat 1RM (kg)', planState.performance.strength.squat)
    requireField('Deadlift 1RM (kg)', planState.performance.strength.deadlift)
    requireField('Target date', planState.performance.targetDate)
    return missing
  }

  if (detailType === 'endurance') {
    requireField('Plank (sec)', planState.performance.endurance.plank)
    requireField('Push-ups', planState.performance.endurance.pushups)
    requireField('Row 2KM (min)', planState.performance.endurance.rowTime)
    requireField('Target date', planState.performance.targetDate)
    return missing
  }

  return missing
}

function showMissingFieldsAlert(fields) {
  if (!fields.length) return
  const message = `Please complete: ${fields.join(', ')}`
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message)
  }
}

function goPrevStep() {
  if (modalStep.value === 1) {
    closeGoalModal()
    return
  }
  modalStep.value -= 1
}

function goNextStep() {
  if (modalStep.value === 4) {
    confirmChallenges()
    return
  }
  if (modalStep.value === 2) {
    const missingFields = getGoalDetailMissingFields()
    if (missingFields.length) {
      showMissingFieldsAlert(missingFields)
      return
    }
    if (isWeightLoss.value) {
      applyWeightLossRecommendations()
    }
  }
  modalStep.value += 1
}

function confirmChallenges() {
  if (!planState.selectedChallenges.length) {
    selectionNotice.value = 'Please select at least 1 challenge.'
    return
  }
  closeGoalModal()
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function toggleChallenge(id) {
  selectionNotice.value = ''
  const selected = planState.selectedChallenges
  if (selected.includes(id)) {
    if (selected.length === 1) {
      selectionNotice.value = 'Keep at least 1 challenge.'
      return
    }
    planState.selectedChallenges = selected.filter((item) => item !== id)
    return
  }
  if (selected.length >= 4) {
    selectionNotice.value = 'You can select up to 4 challenges.'
    return
  }
  planState.selectedChallenges = [...selected, id]
}

function isChallengeSelected(id) {
  return planState.selectedChallenges.includes(id)
}

function isRecommended(challenge) {
  return selectedGoal.value?.recommendedChallenges?.includes(challenge.id)
}

function onChallengeValueInput() {
  planState.autoRecommend = false
}

function markWeightUpdated() {
  weightUpdated.value = true
  setTimeout(() => {
    weightUpdated.value = false
  }, 2000)
}

function applyFocusDefaults(focusId) {
  if (!focusId) return
  if (focusId === 'weight-gain') applyWeightDefaults('gain')
  if (focusId === 'circumference-increase') applyCircumferenceDefaults('increase')
}

function applyWeightDefaults(mode) {
  const start = Number(planState.weight.start) || 70
  if (mode === 'loss' && planState.weight.target >= start) {
    planState.weight.target = Number((start - 6).toFixed(1))
  }
  if (mode === 'gain' && planState.weight.target <= start) {
    planState.weight.target = Number((start + 6).toFixed(1))
  }
}

function applyCircumferenceDefaults(mode) {
  const start = Number(planState.circumference.start) || 90
  planState.circumference.start = start
  if (mode === 'reduce' && planState.circumference.target >= start) {
    planState.circumference.target = Number((start - 4).toFixed(1))
  }
  if (mode === 'increase' && planState.circumference.target <= start) {
    planState.circumference.target = Number((start + 4).toFixed(1))
  }
}

function getWeightLossRecommendation() {
  const current = Number(planState.weight.current || planState.weight.start || 70)
  const target = Number(planState.weight.target || current - 4)
  const height = Number(planState.bodyMetrics.heightCm || 0)
  const days = Math.max(daysRemaining.value || 42, 7)
  const totalLoss = Math.max(current - target, 0)
  const weeklyLoss = totalLoss / (days / 7)
  const dailyDeficit = clamp(Math.round((weeklyLoss * 7700) / 7), 300, 900)
  const onboarding = onboardingAnswers.value
  const preferredWeeklySessions = frequencySessionCountMap[onboarding?.frequency] || 4
  const preferredSessionMinutes = sessionDurationMinutesMap[onboarding?.sessionDuration] || 55
  const seededWeeklyMinutes = weeklyWorkoutMinutes.value || preferredWeeklySessions * preferredSessionMinutes
  const seededMovementLimits = Array.isArray(onboarding?.movementLimitations) ? onboarding.movementLimitations : []
  const lowImpactBias = seededMovementLimits.includes('impact') || seededMovementLimits.includes('knees')

  const baseBmr = height
    ? Math.round(10 * current + 6.25 * height - 150)
    : Math.round(current * 22)
  const activityFactor = 1.2 + Math.min(0.4, seededWeeklyMinutes / 420)
  const maintenance = Math.round(baseBmr * activityFactor)

  const activityTarget = clamp(Math.round(maintenance * 0.25), 250, 700)
  const exerciseTarget = clamp(Math.round(activityTarget * 0.6), 120, 500)
  const preferredDailyDuration = clamp(Math.round((preferredWeeklySessions * preferredSessionMinutes) / 7), 20, 75)
  const durationTarget = clamp(
    Math.round((Math.round(activityTarget / CALORIES_PER_MINUTE) + preferredDailyDuration) / 2),
    25,
    90
  )
  const strengthTarget = weeklyStrengthSets.value
    ? clamp(Math.round(weeklyStrengthSets.value * 1.15), 8, 40)
    : clamp(preferredWeeklySessions * 4 - (lowImpactBias ? 2 : 0), 8, 28)

  const intake = Math.max(1200, maintenance - dailyDeficit)
  const burnTotal = maintenance

  return {
    burnTotal,
    activity: activityTarget,
    exercise: exerciseTarget,
    duration: durationTarget,
    intake,
    deficit: dailyDeficit,
    strengthSets: strengthTarget
  }
}

function applyWeightLossRecommendations() {
  if (!planState.autoRecommend) return
  const onboardingSignature = JSON.stringify({
    frequency: onboardingAnswers.value?.frequency || '',
    sessionDuration: onboardingAnswers.value?.sessionDuration || '',
    movementLimitations: onboardingAnswers.value?.movementLimitations || []
  })
  const signature = `${planState.weight.current}-${planState.weight.target}-${planState.weight.targetDate}-${planState.bodyMetrics.heightCm}-${weeklyWorkoutMinutes.value}-${weeklyStrengthSets.value}-${onboardingSignature}`
  if (signature === lastRecommendationSignature.value) return
  const rec = getWeightLossRecommendation()
  planState.challengeValues.activity = rec.activity
  planState.challengeValues.burn = rec.exercise
  planState.challengeValues.duration = rec.duration
  planState.challengeValues.intake = rec.intake
  planState.challengeValues.deficit = rec.deficit
  planState.challengeValues.strengthSets = rec.strengthSets
  lastRecommendationSignature.value = signature
}

function loadPlan() {
  if (typeof window === 'undefined') return
  Object.assign(planState, createEmptyPlanState())
  const raw = window.localStorage.getItem(storageKey.value)
  if (!raw) {
    return
  }
  try {
    const data = sanitizePlanStateSnapshot(JSON.parse(raw)) || {}
    if (data.goalId) planState.goalId = data.goalId
    if (data.focusId) planState.focusId = data.focusId
    if (data.autoRecommend !== undefined) planState.autoRecommend = data.autoRecommend
    if (data.weight) Object.assign(planState.weight, data.weight)
    if (data.circumference) Object.assign(planState.circumference, data.circumference)
    if (data.posture) Object.assign(planState.posture, data.posture)
    if (data.running) Object.assign(planState.running, data.running)
    if (data.health) Object.assign(planState.health, data.health)
    if (data.performance) Object.assign(planState.performance, data.performance)
    if (data.bodyMetrics) Object.assign(planState.bodyMetrics, data.bodyMetrics)
    if (Array.isArray(data.weightRecords)) {
      planState.weightRecords = sanitizePlanWeightRecords(data.weightRecords)
    } else {
      planState.weightRecords = []
    }
    if (Array.isArray(data.circumferenceRecords)) {
      planState.circumferenceRecords = data.circumferenceRecords
        .map((item) => ({
          date: item?.date || '',
          recordedAt: item?.recordedAt || item?.date || '',
          measurements: normalizeCircumferenceLog(item?.measurements || item || {})
        }))
        .filter((item) => item.date)
    }
    if (data.muscleAbility) Object.assign(planState.muscleAbility, data.muscleAbility)
    if (data.dailyLogs) Object.assign(planState.dailyLogs, data.dailyLogs)
    if (data.bodyCircumferenceLog) {
      Object.assign(planState.bodyCircumferenceLog, normalizeCircumferenceLog(data.bodyCircumferenceLog))
    }
    if (data.fatLossEfficiency !== undefined) planState.fatLossEfficiency = data.fatLossEfficiency
    if (data.bodyProfile) Object.assign(planState.bodyProfile, data.bodyProfile)
    if (data.relatedFilters) planState.relatedFilters = { ...defaultRelatedFilters, ...data.relatedFilters }
    if (data.challengeValues) Object.assign(planState.challengeValues, data.challengeValues)
    if (Array.isArray(data.selectedChallenges)) {
      planState.selectedChallenges = data.selectedChallenges
    }
  } catch (error) {
    console.error('Failed to load plan state', error)
  }
}

function savePlan() {
  if (typeof window === 'undefined') return
  const sanitizedWeightRecords = sanitizePlanWeightRecords(planState.weightRecords)
  const normalizedWeight = sanitizePlanStateSnapshot({
    goalId: planState.goalId,
    focusId: planState.focusId,
    weight: planState.weight,
    weightRecords: sanitizedWeightRecords
  })?.weight || planState.weight
  const payload = {
    goalId: planState.goalId,
    focusId: planState.focusId,
    autoRecommend: planState.autoRecommend,
    weight: normalizedWeight,
    circumference: planState.circumference,
    posture: planState.posture,
    running: planState.running,
    health: planState.health,
    performance: planState.performance,
    challengeValues: planState.challengeValues,
    selectedChallenges: planState.selectedChallenges,
    bodyMetrics: planState.bodyMetrics,
    weightRecords: sanitizedWeightRecords,
    circumferenceRecords: planState.circumferenceRecords,
    muscleAbility: planState.muscleAbility,
    dailyLogs: planState.dailyLogs,
    bodyCircumferenceLog: planState.bodyCircumferenceLog,
    fatLossEfficiency: planState.fatLossEfficiency,
    bodyProfile: planState.bodyProfile,
    relatedFilters: planState.relatedFilters
  }
  window.localStorage.setItem(storageKey.value, JSON.stringify(payload))
  window.dispatchEvent(new Event('pf_plan_updated'))
  scheduleNutritionGoalSync(payload)
}

function scheduleNutritionGoalSync(planPayload) {
  if (nutritionSyncTimer) {
    clearTimeout(nutritionSyncTimer)
  }
  nutritionSyncTimer = setTimeout(async () => {
    try {
      await syncNutritionGoalsWithPlan({
        authUser: auth.user,
        planState: planPayload
      })
    } catch (error) {
      console.error('Failed to sync nutrition goals from plan', error)
    }
  }, 600)
}

function loadWorkouts() {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(logsKey.value)
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    const workouts = Array.isArray(data) ? data : []
    const restRaw = window.localStorage.getItem(restKey.value)
    const restDays = restRaw ? JSON.parse(restRaw) : []
    return getVisibleWorkoutLogs(workouts, Array.isArray(restDays) ? restDays : [])
  } catch (error) {
    console.error('Failed to parse workouts', error)
    return []
  }
}

function parseDuration(text) {
  if (!text) return 0
  const hoursMatch = text.match(/(\d+)\s*h/)
  const minutesMatch = text.match(/(\d+)\s*m/)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0
  return hours * 60 + minutes
}

function calcActivity() {
  const workouts = loadWorkouts()
  const today = getTodayISO()
  const todayDate = parseISODate(today)
  const weekStart = new Date(todayDate || new Date())
  weekStart.setDate(weekStart.getDate() - 6)

  let totalMinutesToday = 0
  let totalWorkoutMinutesToday = 0
  let totalWeeklyMinutes = 0
  let totalWeeklySets = 0
  let totalWeeklyWorkouts = 0

  workouts.forEach((workout) => {
    const workoutDate = parseISODate(workout.date)
    if (!workoutDate) return
    const isCompleted = String(workout.status || '').toLowerCase() === 'completed'

    const minutesFromExercises = Array.isArray(workout.exercises)
      ? workout.exercises.reduce((acc, exercise) => {
          const hours = Number(exercise.durationHours) || 0
          const mins = Number(exercise.durationMinutes) || 0
          return acc + hours * 60 + mins
        }, 0)
      : 0

    const minutes = minutesFromExercises || parseDuration(workout.duration)
    const sets = Array.isArray(workout.exercises)
      ? workout.exercises.reduce((acc, exercise) => acc + (Number(exercise.sets) || 0), 0)
      : 0

    if (isCompleted && workout.date === today) {
      totalMinutesToday += minutes
      totalWorkoutMinutesToday += minutes
    }

    if (isCompleted && workoutDate >= weekStart) {
      totalWeeklyMinutes += minutes
      totalWeeklySets += sets
      totalWeeklyWorkouts += 1
    }
  })

  activityMinutes.value = totalMinutesToday
  activityCalories.value = Math.round(totalMinutesToday * CALORIES_PER_MINUTE)
  workoutMinutesToday.value = totalWorkoutMinutesToday
  workoutCaloriesToday.value = Math.round(totalWorkoutMinutesToday * CALORIES_PER_MINUTE)
  weeklyWorkoutMinutes.value = Math.round(totalWeeklyMinutes)
  weeklyStrengthSets.value = Math.round(totalWeeklySets)
  weeklyWorkoutCount.value = totalWeeklyWorkouts
}

function calcBmi(weight, heightCm) {
  const w = Number(weight)
  const h = Number(heightCm)
  if (!Number.isFinite(w) || !Number.isFinite(h) || h <= 0) return null
  const meters = h / 100
  const bmi = w / (meters * meters)
  return Number.isFinite(bmi) ? bmi : null
}

function getBmiLevel(bmi) {
  if (!bmi) return { label: '--', position: '0%' }
  const thresholds = [18.5, 24, 28]
  const labels = ['Underweight', 'Normal', 'Overweight', 'Obese']
  const position = levelPosition(bmi, thresholds)
  let label = labels[3]
  if (bmi < thresholds[0]) label = labels[0]
  else if (bmi < thresholds[1]) label = labels[1]
  else if (bmi < thresholds[2]) label = labels[2]
  return { label, position }
}

function getBodyFatLevel(value) {
  if (!value) return { label: '--', position: '0%' }
  const thresholds = [18, 24, 30]
  const labels = ['Low', 'Healthy', 'High', 'Very high']
  const position = levelPosition(value, thresholds)
  let label = labels[3]
  if (value < thresholds[0]) label = labels[0]
  else if (value < thresholds[1]) label = labels[1]
  else if (value < thresholds[2]) label = labels[2]
  return { label, position }
}

function levelPosition(value, thresholds) {
  const [t1, t2, t3] = thresholds
  if (value <= t1) return `${(value / t1) * 25}%`
  if (value <= t2) return `${25 + ((value - t1) / (t2 - t1)) * 25}%`
  if (value <= t3) return `${50 + ((value - t2) / (t3 - t2)) * 25}%`
  return `${75 + Math.min((value - t3) / t3, 1) * 25}%`
}

function getRangeBounds(range, offset) {
  const today = parseISODate(getTodayISO()) || new Date()
  if (range === 'total') {
    return getTotalRangeBounds()
  }
  const daysMap = { day: 1, week: 7, month: 30, year: 365 }
  const days = daysMap[range] || 365
  const end = new Date(today)
  end.setDate(end.getDate() - offset * days)
  const start = new Date(end)
  start.setDate(end.getDate() - (days - 1))
  return {
    start: toISO(start),
    end: toISO(end)
  }
}

function getTotalRangeBounds() {
  const records = Array.isArray(planState.weightRecords) ? planState.weightRecords : []
  if (!records.length) {
    const today = getTodayISO()
    return { start: today, end: today }
  }
  const dates = records.map((record) => record.date).sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

function filterRecordsByRange(records, range, offset = 0) {
  if (!records.length) return []
  if (range === 'total') return records
  const bounds = getRangeBounds(range, offset)
  if (!bounds) return records
  const start = parseISODate(bounds.start)
  const end = parseISODate(bounds.end)
  return records.filter((record) => {
    const date = parseISODate(record.date)
    return date && start && end && date >= start && date <= end
  })
}

function getRecordMetric(record, metric) {
  const value =
    metric === 'weight'
      ? toNumber(record.weight)
      : metric === 'bmi'
        ? toNumber(record.bmi)
        : metric === 'bodyFat'
          ? toNumber(record.bodyFat)
          : metric === 'height'
            ? toNumber(record.height)
            : null
  if (value == null || value <= 0) return null
  return value
}

function buildChart(records, metric, targetValue) {
  const empty = {
    line: 'M0 120 L360 120',
    area: 'M0 120 L360 120 L360 160 L0 160 Z',
    points: [],
    targetY: null,
    min: 0,
    max: 0
  }
  if (!records.length) return empty
  const values = records
    .map((record) => getRecordMetric(record, metric))
    .filter((value) => value != null)
  if (!values.length) return empty
  const allValues = targetValue != null ? [...values, targetValue] : values
  const actualMin = Math.min(...allValues)
  const actualMax = Math.max(...allValues)
  const min = actualMin === actualMax ? actualMin - 0.5 : actualMin
  const max = actualMin === actualMax ? actualMax + 0.5 : actualMax
  const range = max - min || 1
  const width = 360
  const height = 120
  const paddingTop = 10
  const paddingBottom = 20
  const paddingLeft = 10
  const paddingRight = 10
  const usableHeight = height - paddingTop - paddingBottom
  const usableWidth = width - paddingLeft - paddingRight
  const step = values.length > 1 ? usableWidth / (values.length - 1) : 0

  const points = values.map((value, index) => {
    const x = values.length === 1 ? paddingLeft + usableWidth / 2 : paddingLeft + index * step
    const y = paddingTop + (1 - (value - min) / range) * usableHeight
    return { x, y }
  })

  const line =
    points.length === 1
      ? (() => {
          const point = points[0]
          const startX = Math.max(paddingLeft, point.x - 28)
          const endX = Math.min(width - paddingRight, point.x + 28)
          return `M${startX} ${point.y} L${endX} ${point.y}`
        })()
      : points
          .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
          .join(' ')

  const area =
    points.length === 1
      ? (() => {
          const point = points[0]
          const startX = Math.max(paddingLeft, point.x - 28)
          const endX = Math.min(width - paddingRight, point.x + 28)
          return `M${startX} ${point.y} L${endX} ${point.y} L${endX} ${height} L${startX} ${height} Z`
        })()
      : `${line} L${width - paddingRight} ${height} L${paddingLeft} ${height} Z`
  const targetY =
    targetValue != null
      ? paddingTop + (1 - (targetValue - min) / range) * usableHeight
      : null
  return { line, area, points, targetY, min, max }
}

function shiftWeightRange(direction) {
  if (weightDetailRange.value === 'total') return
  weightRangeOffset.value = Math.max(0, weightRangeOffset.value + direction)
}

function toISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getAxisLabels(minValue, maxValue) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return ['--', '--', '--', '--']
  const range = maxValue - minValue || 1
  const paddedMin = minValue - range * 0.2
  const paddedMax = maxValue + range * 0.2
  const step = (paddedMax - paddedMin) / 3
  return [
    paddedMax,
    paddedMax - step,
    paddedMax - step * 2,
    paddedMin
  ].map((value) => value.toFixed(1))
}

function getRangeLabels(bounds) {
  if (!bounds) return []
  const start = parseISODate(bounds.start)
  const end = parseISODate(bounds.end)
  if (!start || !end) return []
  const labels = []
  const total = end.getTime() - start.getTime()
  for (let i = 0; i < 4; i += 1) {
    const date = new Date(start.getTime() + (total * i) / 3)
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`)
  }
  return labels
}

function weightRecordKey(record, index = 0) {
  return record?.recordedAt || `${record?.date || 'unknown'}-${record?.weight || 'na'}-${index}`
}

function formatWeightAxisLabel(record, duplicateDates = new Set()) {
  const date = parseISODate(record?.date)
  if (!date) return '--'
  if (duplicateDates.has(record?.date) && record?.recordedAt) {
    const recordedAt = new Date(record.recordedAt)
    if (!Number.isNaN(recordedAt.getTime())) {
      return `${String(recordedAt.getHours()).padStart(2, '0')}:${String(recordedAt.getMinutes()).padStart(2, '0')}`
    }
  }
  return formatShortDate(record.date)
}

function recordValue(record) {
  const metric = weightDetailMetric.value
  const value = getRecordMetric(record, metric)
  if (value == null) return '--'
  if (metric === 'weight') return `${value.toFixed(1)} kg`
  if (metric === 'bmi') return value.toFixed(1)
  if (metric === 'bodyFat') return `${value.toFixed(1)}%`
  return `${value.toFixed(1)} cm`
}

function ensureWeightRecords() {
  planState.weightRecords = sanitizePlanWeightRecords(planState.weightRecords)
  if (planState.weightRecords.length) return
  planState.weightRecords = sanitizePlanWeightRecords([
    buildPlanWeightRecord({
      date: planState.weight.startDate || getTodayISO(),
      weight: planState.weight.start,
      bmi: calcBmi(planState.weight.start, planState.bodyMetrics.heightCm),
      bodyFat: planState.bodyMetrics.bodyFat,
      height: planState.bodyMetrics.heightCm
    }),
    buildPlanWeightRecord({
      date: getTodayISO(),
      weight: planState.weight.current,
      bmi: calcBmi(planState.weight.current, planState.bodyMetrics.heightCm),
      bodyFat: planState.bodyMetrics.bodyFat,
      height: planState.bodyMetrics.heightCm
    })
  ])
}

function addOrUpdateWeightRecord() {
  const date = getTodayISO()
  const record = buildPlanWeightRecord({
    date,
    recordedAt: new Date().toISOString(),
    weight: planState.weight.current,
    bmi: calcBmi(planState.weight.current, planState.bodyMetrics.heightCm),
    bodyFat: planState.bodyMetrics.bodyFat,
    height: planState.bodyMetrics.heightCm
  })
  if (!record) {
    planState.weightRecords = sanitizePlanWeightRecords(planState.weightRecords)
    return
  }
  const nextRecords = sanitizePlanWeightRecords(planState.weightRecords)
  const latest = nextRecords[nextRecords.length - 1]
  const sameAsLatest =
    latest &&
    latest.date === record.date &&
    Number(latest.weight) === Number(record.weight) &&
    Number(latest.height ?? -1) === Number(record.height ?? -1) &&
    Number(latest.bodyFat ?? -1) === Number(record.bodyFat ?? -1)
  if (sameAsLatest) {
    nextRecords.splice(nextRecords.length - 1, 1, {
      ...latest,
      bmi: record.bmi,
      bodyFat: record.bodyFat,
      height: record.height
    })
  } else {
    nextRecords.push(record)
  }
  planState.weightRecords = sanitizePlanWeightRecords(nextRecords)
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeNumber(value) {
  if (value === '' || value === null || value === undefined) return ''
  const num = Number(value)
  return Number.isFinite(num) ? num : ''
}

function formatNumber(value, digits = 1) {
  const num = toNumber(value)
  if (num == null) return '--'
  return num.toFixed(digits)
}

function formatDateLong(iso) {
  if (!iso) return '--'
  const date = parseISODate(iso)
  if (!date) return '--'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(date)
}

function formatShortDate(iso) {
  if (!iso) return '--'
  const date = parseISODate(iso)
  if (!date) return '--'
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric'
  }).format(date)
}

function formatChallengeCurrent(id) {
  if (id === 'activity') return activityCalories.value
  if (id === 'burn') return workoutCaloriesToday.value
  if (id === 'fatBurn') return Math.round(workoutCaloriesToday.value * 0.6)
  if (id === 'duration') return activityMinutes.value
  if (id === 'strengthSets') return weeklyStrengthSets.value
  if (id === 'intake') {
    return Math.round(effectiveIntakeKcal.value)
  }
  if (id === 'deficit') {
    const deficit = toNumber(planState.dailyLogs.deficitKcal)
    return deficit ?? 0
  }
  return 0
}

function cadenceLabel(cadence) {
  return cadence === 'weekly' ? 'Weekly' : 'Daily'
}

function computeProgress(start, current, target) {
  if (!Number.isFinite(start) || !Number.isFinite(current) || !Number.isFinite(target)) return 0
  if (start === target) return 0
  const progress = (current - start) / (target - start)
  return Math.min(1, Math.max(0, progress))
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getTodayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseISODate(iso) {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(iso, days) {
  const date = parseISODate(iso) || new Date()
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  const year = next.getFullYear()
  const month = String(next.getMonth() + 1).padStart(2, '0')
  const day = String(next.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

watch(
  planState,
  () => {
    savePlan()
  },
  { deep: true }
)

watch(
  () => [
    planState.weight.current,
    planState.weight.target,
    planState.weight.targetDate,
    planState.bodyMetrics.heightCm,
    planState.bodyMetrics.bodyFat,
    weeklyWorkoutMinutes.value,
    weeklyStrengthSets.value,
    onboardingAnswers.value?.frequency,
    onboardingAnswers.value?.sessionDuration,
    JSON.stringify(onboardingAnswers.value?.movementLimitations || [])
  ],
  () => {
    if (isWeightLoss.value) applyWeightLossRecommendations()
  }
)

watch(weightDetailRange, () => {
  weightRangeOffset.value = 0
})

function refreshPlanNutritionEntries() {
  planNutritionDate.value = new Date()
  refreshPlanMealEntries()
}

onMounted(() => {
  loadPlan()
  ensureWeightRecords()
  calcActivity()
  refreshPlanNutritionEntries()
  currentTime.value = formatClock(new Date())
  timeTicker = setInterval(() => {
    currentTime.value = formatClock(new Date())
  }, 1000)
  if (selectedGoal.value?.detailType === 'focus' && !planState.focusId) {
    planState.focusId = selectedGoal.value.defaultFocusId || selectedGoal.value.focusOptions?.[0]?.id || null
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pf_logs_updated', calcActivity)
    window.addEventListener('pf_rest_updated', calcActivity)
    window.addEventListener('pf_nutrition_updated', refreshPlanNutritionEntries)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pf_logs_updated', calcActivity)
    window.removeEventListener('pf_rest_updated', calcActivity)
    window.removeEventListener('pf_nutrition_updated', refreshPlanNutritionEntries)
  }
  if (timeTicker) {
    clearInterval(timeTicker)
    timeTicker = null
  }
  if (nutritionSyncTimer) {
    clearTimeout(nutritionSyncTimer)
    nutritionSyncTimer = null
  }
})

watch(
  storageKey,
  () => {
    loadPlan()
    ensureWeightRecords()
  },
  { immediate: true }
)

watch(
  logsKey,
  () => {
    calcActivity()
  },
  { immediate: true }
)

watch(
  restKey,
  () => {
    calcActivity()
  },
  { immediate: true }
)
</script>

<style scoped>
.plans-page {
  padding: 32px clamp(18px, 4vw, 64px) 80px;
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: var(--surface);
}

.plans-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.plan-time {
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-display);
  line-height: 1.1;
}

.header-left h1 {
  margin: 6px 0 8px;
  font-size: clamp(26px, 4vw, 36px);
  font-family: var(--font-display);
}

.subtitle {
  margin: 0;
  color: var(--text-muted);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.activity-pill {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px 16px;
  min-width: 280px;
  box-shadow: var(--shadow-soft);
}

.activity-text span {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
}

.activity-text strong {
  display: block;
  font-size: 18px;
  margin-top: 2px;
}

.activity-text em {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  font-style: normal;
}

.activity-ring {
  --progress: 0;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--progress) * 1turn), var(--surface-track) 0);
  display: grid;
  place-items: center;
}

.activity-ring::after {
  content: '';
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--surface);
  border: 1px solid var(--border);
}

.card {
  background: var(--surface);
  border-radius: 20px;
  border: 1px solid var(--border);
  padding: clamp(20px, 3vw, 32px);
  box-shadow: var(--shadow-soft);
}

.btn {
  border-radius: 999px;
  padding: 10px 18px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.btn.primary {
  background: var(--accent);
  color: var(--surface);
  border-color: transparent;
}

.btn.ghost {
  background: var(--surface-muted);
}

.btn.full {
  width: 100%;
}

.empty-state {
  text-align: center;
  display: grid;
  gap: 12px;
}

.onboarding-recommendation {
  text-align: left;
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid var(--border);
  background:
    linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.96)),
    var(--surface);
}

.recommendation-head {
  display: grid;
  gap: 8px;
}

.recommendation-head h3,
.recommendation-head p {
  margin: 0;
}

.recommendation-head p {
  color: var(--text-secondary);
}

.recommendation-badge {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.recommendation-metrics,
.recommendation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.recommendation-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.recommendation-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  display: grid;
  gap: 8px;
}

.goal-summary {
  display: grid;
  gap: 16px;
}

.goal-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.goal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.goal-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 20px;
}

.icon-btn {
  border: none;
  background: var(--surface-muted);
  border-radius: 999px;
  width: 36px;
  height: 36px;
  font-weight: 700;
}

.weight-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: center;
}

.weight-stats span {
  font-size: 12px;
  color: var(--text-muted);
}

.weight-stats small {
  color: var(--text-muted);
  font-size: 12px;
}

.weight-stats strong {
  display: block;
  font-size: 20px;
}

.weight-stats .current strong {
  font-size: 26px;
}

.progress-track {
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-soft));
}

.progress-foot {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}

.update-toast {
  text-align: center;
  color: var(--accent);
  font-size: 12px;
}

.goal-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.goal-meta span {
  color: var(--text-muted);
  font-size: 12px;
}

.goal-meta strong {
  display: block;
  margin-top: 4px;
}

.challenge-summary .section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.section-head h3 {
  margin: 0 0 6px;
}

.section-head p {
  margin: 0;
  color: var(--text-muted);
}

.chip {
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 8px 14px;
  background: var(--surface);
  font-weight: 600;
}

.daily-list {
  display: grid;
  gap: 12px;
}

.daily-card {
  background: var(--surface-muted);
  border-radius: 18px;
  padding: 16px;
  display: grid;
  gap: 6px;
  border: 1px solid var(--border);
}

.daily-card.clickable {
  cursor: pointer;
}

.daily-card.clickable:hover {
  border-color: var(--accent);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.daily-head {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 14px;
}

.daily-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.daily-icon {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: grid;
  place-items: center;
  font-size: 14px;
}

.daily-value strong {
  font-size: 20px;
}

.daily-value span {
  color: var(--text-muted);
  margin-left: 6px;
}

.daily-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}

.status {
  color: var(--accent);
}

.info-banner {
  margin-top: 16px;
  background: #fef3c7;
  color: #92400e;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 13px;
}

.ability-section {
  display: grid;
  gap: 12px;
}

.ability-section h3 {
  margin: 0 0 6px;
}

.ability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.ability-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  display: grid;
  gap: 8px;
}

.ability-card strong {
  font-size: 20px;
}

.ability-card.editable input {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 16px;
}

.ability-card.editable p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.ghost-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--border);
}

.multi-bar {
  display: flex;
  gap: 4px;
}

.multi-bar .bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
}

.multi-bar .red { background: #fca5a5; }
.multi-bar .orange { background: #fdba74; }
.multi-bar .green { background: #86efac; }
.multi-bar .teal { background: #5eead4; }
.multi-bar .blue { background: #93c5fd; }

.related-section {
  display: grid;
  gap: 12px;
}

.related-list {
  display: grid;
  gap: 12px;
}

.related-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.related-card.clickable {
  cursor: pointer;
}

.related-card.clickable:hover {
  border-color: var(--accent);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.related-card strong {
  display: block;
  margin-bottom: 4px;
}

.related-card p {
  margin: 0;
  color: var(--text-muted);
}

.mini-chart {
  width: 60px;
  height: 20px;
  background: linear-gradient(90deg, var(--border), var(--text-muted));
  border-radius: 999px;
}

.mini-chart.under {
  background: linear-gradient(90deg, #fde68a, #facc15);
}

.mini-chart.normal {
  background: linear-gradient(90deg, #a7f3d0, #34d399);
}

.mini-chart.high {
  background: linear-gradient(90deg, #fca5a5, #f87171);
}

.mini-chart.obese {
  background: linear-gradient(90deg, #f87171, #ef4444);
}

.mini-track {
  width: 60px;
  height: 6px;
  background: var(--border);
  border-radius: 999px;
}

.status-bars {
  width: 60px;
  height: 6px;
  background: linear-gradient(90deg, #a5b4fc, #34d399, #facc15, #fca5a5);
  border-radius: 999px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--border);
}

.arrow {
  color: var(--text-muted);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: grid;
  place-items: center;
  z-index: 40;
  padding: 0;
}

.modal-sheet {
  background: var(--surface);
  border-radius: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: none;
}

.modal-header {
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--surface-muted);
}

.modal-header h2 {
  margin: 6px 0 6px;
  font-size: clamp(22px, 4vw, 28px);
}

.step-indicator {
  font-size: 12px;
  color: var(--text-muted);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: grid;
  gap: 16px;
  flex: 1;
}

.goal-step {
  display: grid;
  gap: 14px;
}

.goal-option {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px 20px;
  text-align: left;
  width: 100%;
}

.goal-option strong {
  display: block;
  margin-bottom: 4px;
}

.goal-option span {
  color: var(--text-muted);
  font-size: 12px;
}

.goal-option .goal-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-size: 22px;
}

.goal-option.active {
  border-color: var(--accent);
  background: var(--surface);
}

.detail-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.field input {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 10px;
}

.field.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.field.checkbox input {
  width: 16px;
  height: 16px;
}

.field input::placeholder {
  color: #c0c4cc;
}

.field.span-2 {
  grid-column: span 2;
}

.detail-meta {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip.active {
  background: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}

.combo-grid {
  display: grid;
  gap: 12px;
}

.combo-card {
  padding: 16px;
  border-radius: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.combo-card small {
  display: block;
  font-weight: 400;
  margin-top: 6px;
}

.combo-card.purple {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.combo-card.green {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.combo-card.outline {
  background: var(--surface);
  color: var(--text-primary);
  border: 1px dashed var(--border);
}

.combo-flow {
  text-align: center;
  font-weight: 700;
  color: var(--accent);
}

.challenge-grid {
  display: grid;
  gap: 12px;
}

.challenge-card {
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  display: grid;
  gap: 10px;
}

.challenge-card.selected {
  border-color: var(--accent);
  background: var(--surface);
}

.challenge-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.challenge-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  display: grid;
  place-items: center;
  font-weight: 700;
}

.badge {
  display: inline-flex;
  padding: 2px 6px;
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
  margin-left: 6px;
}

.check {
  color: var(--accent);
  font-weight: 700;
}


.challenge-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.challenge-input input {
  width: 90px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 8px;
  background: var(--surface);
}

.notice {
  color: #ef4444;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--surface-muted);
  background: var(--surface);
}

.update-modal {
  background: var(--surface);
  border-radius: 24px;
  width: min(760px, 94vw);
  padding: 24px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.2);
  display: grid;
  gap: 20px;
}

.weight-details-modal {
  width: min(980px, 94vw);
  max-height: 90vh;
  overflow: hidden;
}

.update-modal .detail-card {
  max-height: 70vh;
  overflow-y: auto;
}

.weight-details-modal .detail-card {
  border: none;
  padding: 0;
  max-height: none;
  overflow: visible;
}

.weight-detail {
  display: grid;
  gap: 16px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
  padding-right: 8px;
}

.weight-top {
  display: grid;
  gap: 12px;
}

.weight-title {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.weight-title h2 {
  margin: 0;
}

.icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  font-weight: 700;
}

.metric-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.metric-tab {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--surface);
  text-align: left;
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.metric-tab strong {
  font-size: 16px;
  color: var(--text-primary);
}

.metric-tab.active {
  border-color: var(--accent);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.metric-summary {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  background: var(--surface-muted);
}

.summary-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.metric-summary strong {
  font-size: 18px;
  font-weight: 600;
}

.metric-summary em {
  font-style: normal;
  color: var(--text-muted);
  font-size: 16px;
  margin-left: 6px;
}

.level-bar {
  position: relative;
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.level-bar .bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
}

.level-bar .under { background: #fde68a; }
.level-bar .normal { background: #a7f3d0; }
.level-bar .high { background: #fca5a5; }
.level-bar .obese { background: #f87171; }

.level-bar .marker-label {
  position: absolute;
  top: -22px;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.level-bar .marker {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  background: var(--text-primary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.range-tabs {
  display: flex;
  gap: 8px;
  background: var(--surface-muted);
  border-radius: 999px;
  padding: 4px;
}

.range-tab {
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
  color: var(--text-muted);
}

.range-tab.active {
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}

.range-dates {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 12px;
}

.range-nav {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 50%;
  width: 28px;
  height: 28px;
}

.range-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.weight-chart {
  min-height: 180px;
  background: var(--surface-muted);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 12px;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 6px;
}

.chart-label {
  font-size: 12px;
  color: var(--text-muted);
}

.chart-canvas {
  position: relative;
  width: 100%;
}

.chart-canvas svg {
  width: 100%;
  display: block;
}

.chart-canvas .chart-grid-layout {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-height: 180px;
}

.chart-canvas .y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
  min-height: 140px;
  padding: 4px 0 22px;
}

.chart-canvas .chart-plot {
  position: relative;
  min-height: 162px;
  padding-bottom: 18px;
}

.chart-canvas .chart-plot svg {
  width: 100%;
  height: 140px;
}

.chart-canvas .chart-labels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
  height: 18px;
  line-height: 18px;
}

.weight-chart-summary {
  min-height: 120px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.weight-chart-summary .summary-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-muted);
  padding: 12px 14px;
  display: grid;
  gap: 4px;
}

.weight-chart-summary .summary-card.primary {
  background: color-mix(in srgb, #34d399 10%, var(--surface-muted));
}

.weight-chart-summary .summary-card span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.weight-chart-summary .summary-card strong {
  font-size: 30px;
  line-height: 1;
}

.weight-chart-summary .summary-card small {
  font-size: 12px;
  color: var(--text-muted);
}

.weight-chart-summary .summary-card small.positive {
  color: #16a34a;
}

.weight-chart-summary .summary-card small.negative {
  color: #dc2626;
}

.weight-chart-summary .summary-message {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
}

.target-label {
  position: absolute;
  left: 12px;
  transform: translateY(-50%);
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 999px;
  pointer-events: none;
}

.chart-line {
  fill: none;
  stroke: #34d399;
  stroke-width: 3;
}

.chart-area {
  fill: rgba(52, 211, 153, 0.12);
}

.chart-grid-lines line {
  stroke: var(--border);
  stroke-dasharray: 4 4;
}

.chart-point {
  fill: var(--surface);
  stroke: #34d399;
  stroke-width: 2;
}

.target-line {
  stroke: #a7f3d0;
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.target-text {
  fill: #10b981;
  font-size: 10px;
}

.record-list {
  display: grid;
  gap: 12px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.record-item p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.view-more {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--surface-muted);
  font-weight: 600;
  color: var(--text-muted);
}

.about-section {
  display: grid;
  gap: 8px;
}

.about-section h3,
.about-section h4 {
  margin: 0;
}

.about-section p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.level-legend {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.level-ref {
  display: grid;
  gap: 8px;
}

.level-ref .level-bar {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.level-ref .level-bar .segment {
  height: 8px;
  border-radius: 999px;
}

.level-ref .level-bar .under {
  background: #fde68a;
}

.level-ref .level-bar .normal {
  background: #a7f3d0;
}

.level-ref .level-bar .high {
  background: #fbcfe8;
}

.level-ref .level-bar .obese {
  background: #fca5a5;
}

.level-scale {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.level-scale span {
  justify-self: end;
}

.update-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.weight-details-modal .update-header {
  align-items: center;
  border-bottom: 1px solid var(--surface-muted);
  padding-bottom: 16px;
}

.weight-details-modal .update-header p {
  display: none;
}

.update-header h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.update-header p {
  margin: 0;
  color: var(--text-muted);
}

.update-header .close {
  border: none;
  background: var(--surface-muted);
  border-radius: 12px;
  width: 36px;
  height: 36px;
  font-weight: 700;
}

.update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn,
.activity-pill,
.goal-option,
.challenge-card,
.chip,
.icon-btn,
.metric-tab,
.range-tab,
.range-nav,
.icon-circle,
.update-header .close {
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (min-width: 1280px) {
  .plans-page {
    padding: 26px clamp(18px, 3vw, 40px) 52px;
    gap: 16px;
  }

  .plans-header {
    gap: 14px;
  }

  .header-right {
    gap: 8px;
  }

  .plan-time {
    font-size: clamp(20px, 2.6vw, 28px);
  }

  .header-left h1 {
    margin: 4px 0 6px;
    font-size: clamp(24px, 3vw, 32px);
  }

  .activity-pill {
    gap: 14px;
    min-width: 248px;
    padding: 12px 14px;
    border-radius: 16px;
  }

  .activity-ring {
    width: 48px;
    height: 48px;
  }

  .activity-ring::after {
    width: 34px;
    height: 34px;
  }

  .plans-page > .card {
    padding: 16px;
    border-radius: 16px;
  }

  .btn {
    padding: 9px 14px;
  }

  .goal-summary,
  .challenge-summary,
  .related-section,
  .ability-section {
    gap: 10px;
  }

  .challenge-summary .section-head {
    margin-bottom: 12px;
  }

  .goal-title {
    gap: 10px;
  }

  .goal-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    font-size: 18px;
  }

  .weight-stats .current strong {
    font-size: 23px;
  }

  .chip {
    padding: 7px 12px;
  }

  .daily-list,
  .related-list,
  .ability-grid {
    gap: 8px;
  }

  .daily-card,
  .related-card,
  .ability-card {
    padding: 10px 12px;
    border-radius: 14px;
  }

  .daily-icon {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    font-size: 12px;
  }

  .ability-card {
    gap: 6px;
  }

  .ability-card.editable input {
    padding: 7px 10px;
  }

  .weight-chart {
    height: 156px;
    padding: 10px;
  }

  .record-item {
    padding: 10px 12px;
  }

  .view-more {
    padding: 8px 12px;
  }
}

@media (max-width: 640px) {
  .plans-header {
    flex-direction: column;
    align-items: stretch;
  }

  .activity-pill {
    width: 100%;
    justify-content: space-between;
  }

  .weight-stats {
    grid-template-columns: 1fr;
  }
}
</style>
