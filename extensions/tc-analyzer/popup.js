let API_BASE = 'http://localhost:4000/api/extension';

// Load API URL from storage
chrome.storage.local.get('apiUrl', (data) => {
  if (data.apiUrl) {
    API_BASE = data.apiUrl + '/api/extension';
  }
});

// ── State ──
let chatHistory = [];
let ocrText = '';
let ocrImageFile = null;
const MAX_HISTORY = 50;

// ── DOM refs ──
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const uploadBtn = document.getElementById('upload-btn');
const ocrPreview = document.getElementById('ocr-preview');
const ocrTextEl = document.getElementById('ocr-text');
const ocrRemoveBtn = document.getElementById('ocr-remove-btn');
const analyzeNowBtn = document.getElementById('analyze-now-btn');
const analyzeResult = document.getElementById('analyze-result');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingsUrl = document.getElementById('settings-url');
const settingsSave = document.getElementById('settings-save');
const settingsStatus = document.getElementById('settings-status');

// ── Tab switching ──
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Add message to chat ──
function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  div.appendChild(bubble);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Send chat message ──
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text && !ocrText) return;

  const userMsg = text || '(Analyzing uploaded document...)';
  addMessage('user', userMsg);

  if (text) {
    chatHistory.push({ role: 'user', content: text });
  }
  chatInput.value = '';

  // Show typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg msg-ai';
  typingDiv.innerHTML = '<div class="msg-bubble typing-dots"><span></span><span></span><span></span></div>';
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch(`${API_BASE}/legal-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        ocrText: ocrText || undefined,
        history: chatHistory.slice(-10)
      })
    });

    const data = await res.json();

    typingDiv.remove();

    if (data.reply) {
      addMessage('ai', data.reply);
      chatHistory.push({ role: 'assistant', content: data.reply });
      // Save
      if (chatHistory.length > MAX_HISTORY) {
        chatHistory = chatHistory.slice(-MAX_HISTORY);
      }
      chrome.storage.local.set({ chatHistory });
    } else {
      addMessage('ai', 'Sorry, I could not process your request. Error: ' + (data.error || 'Unknown'));
    }
  } catch (e) {
    typingDiv.remove();
    addMessage('ai', 'Connection error. Make sure the backend server is running.');
  }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

// ── Image upload + OCR ──
uploadBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    ocrImageFile = file;

    const formData = new FormData();
    formData.append('image', file);

    ocrPreview.classList.remove('hidden');
    ocrTextEl.textContent = 'Extracting text from image...';

    try {
      const res = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.text) {
        ocrText = data.text;
        ocrTextEl.textContent = ocrText || '(No text could be extracted)';

        // Only upload to Cloudinary if OCR succeeded
        try {
          await fetch(`${API_BASE}/upload-image`, {
            method: 'POST',
            body: formData,
          });
        } catch (cloudErr) {
          // Non-critical
        }
      } else {
        ocrTextEl.textContent = 'OCR failed: ' + (data.error || 'Unknown error');
      }
    } catch (err) {
      ocrTextEl.textContent = 'OCR failed: ' + err.message;
    }
  };
  input.click();
});

ocrRemoveBtn.addEventListener('click', () => {
  ocrPreview.classList.add('hidden');
  ocrText = '';
  ocrImageFile = null;
});

// ── Analyze current page ──
analyzeNowBtn.addEventListener('click', async () => {
  analyzeResult.classList.remove('hidden');
  analyzeResult.innerHTML = '<div class="spinner"></div><div class="loading-title">Analyzing page content...</div>';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'analyzeNow' });
    analyzeResult.innerHTML = '<div class="analyze-success">✅ Analysis banner injected. Check the bottom-right corner.</div>';
  } catch (e) {
    analyzeResult.innerHTML = `<div class="analyze-error">⚠️ Could not analyze. Try reloading the page and clicking again.<br><small>${e.message}</small></div>`;
  }
});

// ── Restore chat history from storage ──
chrome.storage.local.get('chatHistory', (data) => {
  if (data.chatHistory && data.chatHistory.length > 0) {
    chatHistory = data.chatHistory;
    chatMessages.innerHTML = '';
    for (const msg of chatHistory) {
      addMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
    }
  }
});

// ── Handle messages from content script ──
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'tcAnalysisDone') {
    // Could show badge or notification
  }
});

// ── Settings modal ──
chrome.runtime.sendMessage({ action: 'getApiUrl' }, (response) => {
  if (response?.apiUrl) {
    const base = response.apiUrl.replace(/\/api\/extension\/?$/, '');
    settingsUrl.value = base || 'http://localhost:4000';
    API_BASE = base + '/api/extension';
  }
});

settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
});

settingsClose.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

settingsSave.addEventListener('click', () => {
  const url = settingsUrl.value.trim();
  if (!url) {
    settingsStatus.textContent = 'Please enter a URL.';
    settingsStatus.style.color = '#dc2626';
    return;
  }
  const cleanUrl = url.replace(/\/api\/extension\/?$/, '').replace(/\/+$/, '');
  chrome.runtime.sendMessage({ action: 'setApiUrl', apiUrl: cleanUrl }, (response) => {
    if (response?.success) {
      settingsStatus.textContent = 'Saved! Restart popup to apply.';
      settingsStatus.style.color = '#16a34a';
      API_BASE = cleanUrl + '/api/extension';
    } else {
      settingsStatus.textContent = 'Failed to save.';
      settingsStatus.style.color = '#dc2626';
    }
  });
});
