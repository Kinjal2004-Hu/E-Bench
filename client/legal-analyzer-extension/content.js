// E-Bench Legal Analyzer - Content Script
(function() {
  console.log('[E-Bench] Starting...');
  
  const FLOATING_ID = 'ebench-legal-fab';
  const BOX_ID = 'ebench-legal-box';
  
  if (document.getElementById(FLOATING_ID)) {
    console.log('[E-Bench] Already exists');
    return;
  }

  const API_URL = 'http://localhost:4000/api/analyze-image';
  const RAG_URL = 'http://localhost:8000/ask';

  // FAB button
  const fab = document.createElement('div');
  fab.id = FLOATING_ID;
  fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48"><circle cx="20" cy="20" r="14" fill="none" stroke="white" stroke-width="3"/><line x1="28" y1="28" x2="44" y2="44" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>';
  fab.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;background:linear-gradient(135deg,#e94560,#c73e54);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:move;box-shadow:0 4px 20px rgba(233,69,96,0.5);z-index:2147483647;transition:transform 0.2s;';
  fab.title = 'E-Bench Legal Analyzer';

  // FAB hover effect
  fab.onmouseenter = function() { this.style.transform = 'scale(1.1)'; };
  fab.onmouseleave = function() { this.style.transform = 'scale(1)'; };

  // FAB drag logic
  let fabDragging = false, fx = 0, fy = 0;
  fab.onmousedown = function(e) { fabDragging = false; fx = e.clientX - this.offsetLeft; fy = e.clientY - this.offsetTop; };
  document.onmousemove = function(e) { 
    if (e.buttons !== 1) { fabDragging = true; return; }
    if (fabDragging) return;
    fab.style.left = (e.clientX - fx) + 'px';
    fab.style.top = (e.clientY - fy) + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  };
  document.onmouseup = function() { fabDragging = false; };

  // Chat box
  const chatBox = document.createElement('div');
  chatBox.id = BOX_ID;
  chatBox.innerHTML = '<style>' +
    '#' + BOX_ID + '{width:300px;height:450px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.5);display:none;flex-direction:column;overflow:hidden;font-family:sans-serif;z-index:2147483647;}' +
    '#' + BOX_ID + ' .header{display:flex;align-items:center;gap:10px;padding:10px;background:#2a2a4e;cursor:move;border-radius:12px 12px 0 0;}' +
    '#' + BOX_ID + ' .logo{width:28px;height:28px;background:linear-gradient(135deg,#e94560,#c73e54);border-radius:6px;display:flex;align-items:center;justify-content:center;}' +
    '#' + BOX_ID + ' .title{font-size:13px;font-weight:600;color:#fff;flex:1;}' +
    '#' + BOX_ID + ' .close{background:transparent;border:none;color:#888;font-size:18px;cursor:pointer;}' +
    '#' + BOX_ID + ' .close:hover{color:#fff;}' +
    '#' + BOX_ID + ' .preview{width:100%;height:100px;object-fit:cover;display:none;border-bottom:1px solid #3a3a5e;}' +
    '#' + BOX_ID + ' .preview.v{display:block;}' +
    '#' + BOX_ID + ' .msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;}' +
    '#' + BOX_ID + ' .msg{padding:8px 10px;border-radius:10px;font-size:12px;max-width:90%;word-wrap:break-word;}' +
    '#' + BOX_ID + ' .msg.user{background:#e94560;align-self:flex-end;border-bottom-right-radius:4px;}' +
    '#' + BOX_ID + ' .msg.ai{background:#2a2a4e;align-self:flex-start;border-bottom-left-radius:4px;}' +
    '#' + BOX_ID + ' .msg.system{background:transparent;color:#888;font-size:11px;text-align:center;}' +
    '#' + BOX_ID + ' .loading{display:none;text-align:center;padding:8px;color:#e94560;font-size:11px;}' +
    '#' + BOX_ID + ' .loading.v{display:block;}' +
    '#' + BOX_ID + ' .input{display:flex;gap:8px;padding:10px;border-top:1px solid #3a3a5e;}' +
    '#' + BOX_ID + ' .input input{flex:1;padding:8px 10px;border:1px solid #3a3a5e;border-radius:15px;background:#1a1a2e;color:#fff;font-size:12px;outline:none;}' +
    '#' + BOX_ID + ' .input input:focus{border-color:#e94560;}' +
    '#' + BOX_ID + ' .input button{width:32px;height:32px;border:none;border-radius:50%;background:linear-gradient(135deg,#e94560,#c73e54);color:white;cursor:pointer;}' +
    '#' + BOX_ID + ' .input button:disabled{background:#444;cursor:not-allowed;}' +
    '</style>' +
    '<div class="header">' +
      '<div class="logo"><svg viewBox="0 0 48 48" width="16"><circle cx="20" cy="20" r="14" stroke="white" stroke-width="3"/><line x1="28" y1="28" x2="44" y2="44" stroke="white" stroke-width="4"/></svg></div>' +
      '<div class="title">E-Bench Legal AI</div>' +
      '<button class="close" id="eb-close">×</button>' +
    '</div>' +
    '<img class="preview" id="eb-preview">' +
    '<div class="msgs" id="eb-msgs"><div class="msg system">Click button to capture page</div></div>' +
    '<div class="loading" id="eb-load">Analyzing...</div>' +
    '<div class="input">' +
      '<input type="text" id="eb-input" placeholder="Ask about this page...">' +
      '<button id="eb-send">➤</button>' +
    '</div>';

  let screenshot = null;
  let boxDrag = false, bx = 0, by = 0;

  // Get elements from chatBox
  const closeBtn = chatBox.querySelector('#eb-close');
  const preview = chatBox.querySelector('#eb-preview');
  const msgs = chatBox.querySelector('#eb-msgs');
  const input = chatBox.querySelector('#eb-input');
  const sendBtn = chatBox.querySelector('#eb-send');
  const loading = chatBox.querySelector('#eb-load');
  const header = chatBox.querySelector('.header');

  // Close box
  closeBtn.onclick = function() { chatBox.style.display = 'none'; };

  // Move box
  header.onmousedown = function(e) { 
    if (e.target === closeBtn) return;
    boxDrag = true; 
    bx = e.clientX - chatBox.offsetLeft; 
    by = e.clientY - chatBox.offsetTop; 
  };
  document.onmousemove = function(e) { 
    if (!boxDrag) return;
    chatBox.style.left = (e.clientX - bx) + 'px';
    chatBox.style.top = (e.clientY - by) + 'px';
  };
  document.onmouseup = function() { boxDrag = false; };

  // FAB click - capture via background script and show
  fab.onclick = async function() {
    if (fabDragging) return;
    try {
      fab.style.opacity = '0.5';
      
      // Request screenshot from background script
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (resp) => {
          console.log('[E-Bench] SendMessage callback, lastError:', chrome.runtime.lastError);
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(resp || { success: false, error: 'No response' });
          }
        });
      });
      console.log('[E-Bench] Capture response:', response);
      
      if (!response || !response.success || !response.image) {
        throw new Error(response?.error || 'Failed to capture screenshot');
      }
      
      const img = response.image;
      
      console.log('[E-Bench] Screenshot:', img.length);
      screenshot = img;
      
      // Position box near FAB
      let x = fab.offsetLeft - 320;
      let y = fab.offsetTop;
      if (x < 10) x = fab.offsetLeft + 60;
      if (y + 450 > window.innerHeight) y = window.innerHeight - 460;
      
      chatBox.style.left = x + 'px';
      chatBox.style.top = y + 'px';
      chatBox.style.display = 'flex';
      
      preview.src = img;
      preview.className = 'preview v';
      msgs.innerHTML = '';
      addMsg('user', '📸 Screenshot captured!');
      addMsg('ai', 'Analyzing...');
      
      await analyzeScreenshot(img);
      fab.style.opacity = '1';
    } catch(err) {
      console.error('[E-Bench] Error:', err);
      fab.style.opacity = '1';
      addMsg('ai', 'Error: ' + err.message);
    }
  };

  // Send message
  sendBtn.onclick = sendMessage;
  input.onkeypress = function(e) { if (e.key === 'Enter') sendMessage(); };

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    await chatWithAI(text, screenshot);
  }

  async function analyzeScreenshot(img) {
    loading.className = 'loading v';
    sendBtn.disabled = true;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({image: img})
      });
      console.log('[E-Bench] API response:', res.status);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      console.log('[E-Bench] Data:', data);
      
      const last = msgs.lastElementChild;
      if (last && last.textContent.includes('Analyzing')) last.remove();
      
      if (data.success && data.result) {
        addMsg('ai', data.result);
      } else {
        addMsg('ai', 'Could not analyze. Try asking a question.');
      }
    } catch(err) {
      const last = msgs.lastElementChild;
      if (last && last.textContent.includes('Analyzing')) last.remove();
      addMsg('ai', 'Error: ' + err.message);
    } finally {
      loading.className = 'loading';
      sendBtn.disabled = false;
    }
  }

  async function chatWithAI(question, img) {
    loading.className = 'loading v';
    sendBtn.disabled = true;
    try {
      if (img) {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({image: img, question: question})
        });
        if (res.ok) {
          const d = await res.json();
          if (d.success && d.result) {
            addMsg('ai', d.result);
            loading.className = 'loading';
            sendBtn.disabled = false;
            return;
          }
        }
      }
      const res = await fetch(RAG_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({question: question, top_k: 5})
      });
      if (res.ok) {
        const d = await res.json();
        addMsg('ai', d.ai_answer || d.answer || 'No response');
      } else {
        addMsg('ai', 'Please try again.');
      }
    } catch(err) {
      addMsg('ai', 'Error: ' + err.message);
    } finally {
      loading.className = 'loading';
      sendBtn.disabled = false;
    }
  }

  function addMsg(type, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    div.textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Add to page
  document.body.appendChild(fab);
  document.body.appendChild(chatBox);
  console.log('[E-Bench] FAB and chat box added');
})();