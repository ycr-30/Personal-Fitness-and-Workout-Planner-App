<template>
  <article class="chat-mockup" aria-hidden="true">
    <header class="chat-head">
      <div>
        <p class="chat-eyebrow">AI Coach</p>
        <strong>Chat Assistant</strong>
      </div>
    </header>

    <div class="chat-body">
      <article class="chat-message user">
        <p>How should I train back this week?</p>
      </article>

      <article class="chat-message assistant">
        <p>Bias upper-back and rear-delt volume. Keep one lighter recovery day.</p>
      </article>
    </div>
  </article>
</template>

<style scoped>
.chat-mockup {
  border: 1px solid #e7ecf3;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(18, 24, 38, 0.045);
  height: 100%;
  min-height: 100%;
  padding: 17px 16px;
  display: grid;
  gap: 13px;
}

.chat-head {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
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
  font-size: 15px;
  line-height: 1.2;
  color: #121826;
}

.chat-body {
  display: grid;
  gap: 10px;
  align-content: center;
}

.chat-message {
  border: 1px solid #e7ecf3;
  border-radius: 15px;
  padding: 10px 11px;
}

.chat-message p {
  margin: 0;
  font-size: 13px;
  line-height: 1.42;
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
</style>
