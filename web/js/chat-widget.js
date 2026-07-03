/* Floating chat popup with AutoHub Assistant chatbot */
(function () {
  let socket = null;
  let sessionId = null;
  let widgetOpen = false;
  let botTyping = false;
  let needsGuestInfo = false;

  const QUICK_PROMPTS = [
    'Browse cars',
    'Shop parts',
    'Book service',
    'Track my order',
    'Talk to agent',
  ];

  function injectWidget() {
    if (document.getElementById('chatWidget')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="chatWidget">
        <button id="chatToggle" class="chat-fab" aria-label="Open chat assistant">
          <svg class="chat-fab__icon chat-fab__icon--open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
          </svg>
          <svg class="chat-fab__icon chat-fab__icon--close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
          <span class="chat-fab__pulse" aria-hidden="true"></span>
        </button>

        <div id="chatPanel" class="chat-panel" hidden>
          <div class="chat-header">
            <div class="chat-header__info">
              <span class="chat-header__status"></span>
              <div>
                <strong>AutoHub Assistant</strong>
                <span class="chat-header__sub">AI chatbot · Human agents available</span>
              </div>
            </div>
            <button id="chatClose" class="chat-close" aria-label="Close chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>

          <div id="chatBox">
            <div id="chatMessages" class="chat-messages"></div>
            <div id="chatTyping" class="chat-typing" hidden>
              <span></span><span></span><span></span>
              Assistant is typing…
            </div>
            <div id="chatQuickReplies" class="chat-quick-replies"></div>

            <div id="chatGuestForm" class="chat-guest-form" hidden>
              <p class="chat-guest-form__hint">Share your details so a support agent can reach you.</p>
              <div class="form-group">
                <label for="chatGuestName">Your Name</label>
                <input type="text" id="chatGuestName" class="form-input" placeholder="Full name" />
              </div>
              <div class="form-group">
                <label for="chatGuestPhone">Mobile Number</label>
                <input type="tel" id="chatGuestPhone" class="form-input" placeholder="01712345678" />
              </div>
              <div id="chatGuestAlert"></div>
              <button id="chatGuestSubmit" class="btn btn-primary" style="width:100%">Connect to Agent</button>
            </div>

            <div class="chat-input-row">
              <input type="text" id="chatInput" class="form-input" placeholder="Ask about cars, parts, service…" autocomplete="off" />
              <button id="chatSendBtn" class="btn btn-primary chat-send-btn" aria-label="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById('chatToggle').addEventListener('click', toggleWidget);
    document.getElementById('chatClose').addEventListener('click', closeWidget);
    document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('chatGuestSubmit')?.addEventListener('click', submitGuestInfo);

    const user = typeof getUser === 'function' ? getUser() : null;
    if (user) {
      const nameEl = document.getElementById('chatGuestName');
      if (nameEl) nameEl.value = user.fullName || '';
      const phoneEl = document.getElementById('chatGuestPhone');
      if (phoneEl && user.phone) phoneEl.value = user.phone;
    }

    renderQuickReplies(QUICK_PROMPTS);
  }

  function renderQuickReplies(prompts) {
    const el = document.getElementById('chatQuickReplies');
    if (!el) return;
    el.innerHTML = prompts.map((p) =>
      `<button type="button" class="chat-quick-btn" data-prompt="${p}">${p}</button>`
    ).join('');
    el.querySelectorAll('.chat-quick-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.prompt;
        if (text === 'Talk to agent') {
          showGuestForm();
          return;
        }
        document.getElementById('chatInput').value = text;
        sendMessage();
      });
    });
  }

  function openWidget() {
    widgetOpen = true;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatToggle');
    if (panel) panel.hidden = false;
    if (fab) fab.classList.add('is-open');
    if (!sessionId) initSession();
    setTimeout(() => document.getElementById('chatInput')?.focus(), 200);
  }

  function closeWidget() {
    widgetOpen = false;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatToggle');
    if (panel) panel.hidden = true;
    if (fab) fab.classList.remove('is-open');
  }

  function toggleWidget() {
    if (widgetOpen) closeWidget();
    else openWidget();
  }

  function showGuestForm() {
    const form = document.getElementById('chatGuestForm');
    if (form) form.hidden = false;
    needsGuestInfo = true;
  }

  function hideGuestForm() {
    const form = document.getElementById('chatGuestForm');
    if (form) form.hidden = true;
    needsGuestInfo = false;
  }

  function appendMessage(msg) {
    const el = document.getElementById('chatMessages');
    if (!el) return;

    const isUser = msg.senderType === 'CUSTOMER';
    const isBot = msg.senderType === 'SYSTEM';
    const div = document.createElement('div');
    div.className = `chat-msg ${isUser ? 'chat-msg-user' : isBot ? 'chat-msg-bot' : 'chat-msg-agent'}`;
    div.innerHTML = `
      <span class="chat-msg-name">${msg.senderName}</span>
      <p>${escapeHtml(msg.content)}</p>
    `;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;

    if (isBot && /share your name|connect you with a support agent/i.test(msg.content)) {
      showGuestForm();
    }
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function setTyping(show) {
    botTyping = show;
    const el = document.getElementById('chatTyping');
    if (el) el.hidden = !show;
    const messages = document.getElementById('chatMessages');
    if (messages && show) messages.scrollTop = messages.scrollHeight;
  }

  function connectSocket() {
    if (typeof io === 'undefined') return;
    if (socket?.connected) return;

    socket = io(API_URL, {
      auth: {
        token: localStorage.getItem('accessToken') || '',
        chatToken: localStorage.getItem('chatSessionToken') || '',
      },
    });

    socket.on('chat:message', (msg) => {
      setTyping(false);
      appendMessage(msg);
    });

    socket.on('chat:typing', (payload) => {
      if (payload.isBot) setTyping(payload.isTyping);
    });

    socket.on('connect', () => {
      if (sessionId) socket.emit('chat:join', sessionId);
    });
  }

  async function initSession() {
    if (sessionId) return;
    try {
      const data = await api.startChatSession({});
      sessionId = data.session.id;
      if (data.session.chatToken) {
        localStorage.setItem('chatSessionToken', data.session.chatToken);
      }
      localStorage.setItem('chatSessionId', sessionId);

      const messagesEl = document.getElementById('chatMessages');
      if (messagesEl) messagesEl.innerHTML = '';
      data.messages.forEach(appendMessage);

      connectSocket();

      try {
        const replies = await api.getQuickReplies();
        if (replies.length) {
          renderQuickReplies(replies.map((r) => r.title));
        }
      } catch { /* use defaults */ }
    } catch (err) {
      const messagesEl = document.getElementById('chatMessages');
      if (messagesEl) {
        messagesEl.innerHTML = `<div class="chat-msg chat-msg-bot"><p>${escapeHtml(err.message || 'Could not start chat. Please try again.')}</p></div>`;
      }
    }
  }

  async function submitGuestInfo() {
    const alertEl = document.getElementById('chatGuestAlert');
    const name = document.getElementById('chatGuestName').value.trim();
    const phone = document.getElementById('chatGuestPhone').value.trim();

    clearAlert(alertEl);
    if (!sessionId) return;

    try {
      const data = await api.updateChatGuestInfo(sessionId, { guestName: name, guestPhone: phone });
      hideGuestForm();
      const messagesEl = document.getElementById('chatMessages');
      if (messagesEl) messagesEl.innerHTML = '';
      data.messages.forEach(appendMessage);
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  function sendMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    if (!content) return;

    if (!sessionId) {
      initSession().then(() => {
        input.value = content;
        sendMessage();
      });
      return;
    }

    if (!socket) connectSocket();

    const user = typeof getUser === 'function' ? getUser() : null;
    const name = user?.fullName || document.getElementById('chatGuestName')?.value?.trim() || 'Visitor';

    socket.emit('chat:message', { sessionId, content, senderName: name });
    input.value = '';

    if (/talk to agent|human|representative/i.test(content)) {
      showGuestForm();
    }
  }

  async function resumeSession() {
    const saved = localStorage.getItem('chatSessionId');
    const chatToken = localStorage.getItem('chatSessionToken');
    if (!saved || !chatToken || typeof api === 'undefined') return;

    try {
      const messages = await api.getChatMessages(saved);
      if (!messages.length) {
        localStorage.removeItem('chatSessionId');
        localStorage.removeItem('chatSessionToken');
        return;
      }
      sessionId = saved;
      messages.forEach(appendMessage);
      connectSocket();
    } catch {
      localStorage.removeItem('chatSessionId');
      localStorage.removeItem('chatSessionToken');
    }
  }

  window.openChatWidget = openWidget;

  document.addEventListener('DOMContentLoaded', () => {
    injectWidget();
    resumeSession();
  });
})();
