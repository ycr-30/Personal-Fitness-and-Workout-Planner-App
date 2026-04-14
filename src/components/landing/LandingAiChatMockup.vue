<template>
  <article class="chat-mockup" aria-hidden="true">
    <header class="chat-head">
      <div>
        <p class="chat-eyebrow">AI Coach</p>
        <strong>Chat Assistant</strong>
      </div>
      <span class="chat-status">Grounded</span>
    </header>

    <div class="chat-body">
      <article class="chat-message user">
        <p>How should I train back this week?</p>
      </article>

      <article class="chat-message assistant">
        <span class="assistant-kicker">AI Coach</span>
        <p>Bias upper-back and rear-delt volume. Keep one lighter recovery day.</p>
        <div class="assistant-tags">
          <span>Workouts</span>
          <span>Recovery</span>
          <span>Meals</span>
        </div>
      </article>
    </div>
  </article>
</template>

<style scoped>
.chat-mockup {
  border: 1px solid #e7ecf3;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(18, 24, 38, 0.06);
  padding: 16px;
  display: grid;
  gap: 14px;
}

.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.chat-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.chat-head strong {
  font-size: 16px;
  line-height: 1.2;
  color: #121826;
}

.chat-status {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(75, 123, 255, 0.1);
  color: #4b7bff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.chat-body {
  display: grid;
  gap: 10px;
}

.chat-message {
  border: 1px solid #e7ecf3;
  border-radius: 16px;
  padding: 11px 12px;
  display: grid;
  gap: 8px;
}

.chat-message p {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #121826;
}

.chat-message.user {
  justify-self: end;
  max-width: 84%;
  background: rgba(75, 123, 255, 0.08);
  border-color: transparent;
}

.chat-message.assistant {
  background: #f7f8fb;
}

.assistant-kicker {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
  font-weight: 700;
}

.assistant-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.assistant-tags span {
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(231, 236, 243, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
