// E-Bench Legal Analyzer - Popup Script
console.log('[E-Bench Popup] Script loaded');

const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const previewImg = document.getElementById('previewImg');
const loadingEl = document.getElementById('loading');

const API_URL = 'http://localhost:4000/api/analyze-image';
const RAG_URL = 'http://localhost:8000/ask';

let currentScreenshot = null;

// Initialize on popup open
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[E-Bench Popup] DOM ready, loading screenshot...');
  const data = await chrome.storage.local.get(['currentScreenshot', 'capturedAt']);
  console.log('[E-Bench Popup] Storage data:', data);
  
  if (data.currentScreenshot) {
    console.log('[E-Bench Popup] Screenshot found, length:', data.currentScreenshot.length);
    currentScreenshot = data.currentScreenshot;
    previewImg.src = currentScreenshot;
    previewImg.classList.add('visible');
    
    addMessage('user', '📸 Screenshot captured. Ask me anything about this page!');
    
    // Auto-analyze the screenshot
    analyzeScreenshot(currentScreenshot);
  } else {
    console.log('[E-Bench Popup] No screenshot found');
  }
});

// Send button click
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  
  userInput.value = '';
  addMessage('user', text);
  
  if (currentScreenshot) {
    await chatWithAI(text, currentScreenshot);
  } else {
    await chatWithAI(text, null);
  }
}

async function analyzeScreenshot(imageData) {
  console.log('[E-Bench Popup] analyzeScreenshot called');
  showLoading(true);
  
  try {
    console.log('[E-Bench Popup] Calling API:', API_URL);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });
    
    console.log('[E-Bench Popup] Response status:', response.status);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    
    const data = await response.json();
    console.log('[E-Bench Popup] Response data:', data);
    
    if (data.success && data.result) {
      addMessage('ai', data.result);
    } else {
      addMessage('ai', 'Could not analyze. Try asking a specific question.');
    }
  } catch (err) {
    console.error('[E-Bench Popup] Error:', err);
    addMessage('ai', 'Error: ' + err.message);
  } finally {
    showLoading(false);
  }
}

async function chatWithAI(question, imageData) {
  showLoading(true);
  
  try {
    // First try to analyze the screenshot if provided
    if (imageData) {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: imageData,
            question: question
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.result) {
            addMessage('ai', data.result);
            showLoading(false);
            return;
          }
        }
      } catch (e) {
        // Fall through to RAG
      }
    }
    
    // Fallback to RAG for general legal Q&A
    const ragResponse = await fetch(RAG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: question,
        top_k: 5
      })
    });
    
    if (ragResponse.ok) {
      const ragData = await ragResponse.json();
      const answer = ragData.ai_answer || ragData.answer || 'No response available.';
      addMessage('ai', answer);
    } else {
      addMessage('ai', 'Sorry, I could not process your request. Please try again.');
    }
  } catch (err) {
    addMessage('ai', 'Error: ' + err.message);
  } finally {
    showLoading(false);
  }
}

function addMessage(type, text) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showLoading(show) {
  loadingEl.classList.toggle('visible', show);
  sendBtn.disabled = show;
}