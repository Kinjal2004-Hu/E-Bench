// Auto-detect T&C and analyze on page load

let EXTENSION_API_URL = "http://localhost:4000";

chrome.storage.local.get("apiUrl", (data) => {
  if (data.apiUrl) EXTENSION_API_URL = data.apiUrl;
});

const TC_KEYWORDS = ["terms", "conditions", "privacy", "policy", "agreement", "consent", "cookies"];

function isTermsPage(text) {
  const lower = text.slice(0, 1000).toLowerCase();
  return TC_KEYWORDS.some(k => lower.includes(k));
}

function extractPageText() {
  const selectors = ["article", "main", ".terms", "#terms", ".privacy-policy", ".terms-conditions", "section.legal", '[role="main"]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText?.length > 200) return el.innerText.slice(0, 20000);
  }
  return document.body.innerText?.slice(0, 20000);
}

function closeBanner() {
  const banner = document.getElementById("tc-analyzer-banner");
  if (banner) banner.remove();
}

async function analyzeAndShow() {
  closeBanner();

  const text = extractPageText();
  if (!text || !isTermsPage(text)) return;

  const banner = document.createElement("div");
  banner.id = "tc-analyzer-banner";
  banner.innerHTML = `
    <div class="tc-header">
      <span class="tc-icon">⚖️</span>
      <span class="tc-title">T&C Analysis</span>
      <button id="tc-close-btn" class="tc-close-btn" title="Dismiss">&times;</button>
    </div>
    <div class="tc-analyzing">Analyzing Terms & Conditions...</div>
  `;
  document.body.appendChild(banner);
  injectStyles();

  document.getElementById("tc-close-btn").addEventListener("click", closeBanner);

  try {
    const res = await fetch(`${EXTENSION_API_URL}/api/extension/analyze-tc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentText: text }),
    });

    const data = await res.json();

    if (data.error) {
      banner.innerHTML = `
        <div class="tc-header">
          <span class="tc-icon">⚖️</span>
          <span class="tc-title">T&C Analysis</span>
          <button class="tc-close-btn" onclick="document.getElementById('tc-analyzer-banner').remove()">&times;</button>
        </div>
        <div class="tc-error">${data.error}</div>
      `;
    } else {
      banner.innerHTML = `
        <div class="tc-header">
          <span class="tc-icon">⚖️</span>
          <span class="tc-title">T&C Analysis</span>
          <button class="tc-close-btn" onclick="document.getElementById('tc-analyzer-banner').remove()">&times;</button>
        </div>
        <div class="tc-risk" data-level="${data.riskLevel}">${data.riskLevel} Risk</div>
        <div class="tc-summary">${data.summary}</div>
        <div class="tc-flags">${data.redFlags?.map(f => `<div class="tc-flag">⚠️ ${f}</div>`).join("") || ""}</div>
        <div class="tc-rec" data-rec="${data.recommendation}">${data.recommendation}</div>
      `;
    }
  } catch (e) {
    banner.innerHTML = `
      <div class="tc-header">
        <span class="tc-icon">⚖️</span>
        <span class="tc-title">T&C Analysis</span>
        <button class="tc-close-btn" onclick="document.getElementById('tc-analyzer-banner').remove()">&times;</button>
      </div>
      <div class="tc-error">Error: ${e.message}</div>
    `;
  }
}

function injectStyles() {
  if (document.getElementById("tc-analyzer-styles")) return;
  const style = document.createElement("style");
  style.id = "tc-analyzer-styles";
  style.textContent = `
    #tc-analyzer-banner {
      position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
      background: linear-gradient(145deg, #1a1a2e, #252542); color: #fff;
      padding: 20px; border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4); font-family: -apple-system,system-ui,sans-serif;
      animation: tcSlideIn 0.4s cubic-bezier(0.16,1,0.3,1); max-width: 380px;
      max-height: 70vh; overflow-y: auto;
    }
    #tc-analyzer-banner::-webkit-scrollbar { width: 6px; }
    #tc-analyzer-banner::-webkit-scrollbar-track { background: #1a1a2e; }
    #tc-analyzer-banner::-webkit-scrollbar-thumb { background: #C8B48A; border-radius: 3px; }
    @keyframes tcSlideIn { from{transform:translateY(30px);opacity:0} }
    .tc-close-btn {
      background: rgba(255,255,255,0.1); border: none; color: #fff; cursor: pointer;
      font-size: 20px; width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-left: auto;
    }
    .tc-close-btn:hover { background: rgba(255,255,255,0.2); }
    .tc-analyzing { color: #C8B48A; animation: tcPulse 1.5s infinite; }
    @keyframes tcPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .tc-results { font-size: 13px; line-height: 1.5; }
    .tc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .tc-header .tc-title:last-child { margin-left: 0; }
    .tc-icon { font-size: 24px; }
    .tc-title { font-size: 18px; font-weight: 700; }
    .tc-risk {
      font-size: 22px; font-weight: 800; text-align: center; padding: 12px; border-radius: 10px; margin-bottom: 16px;
    }
    .tc-risk[data-level="High"] { background: linear-gradient(135deg, #dc2626, #991b1b); }
    .tc-risk[data-level="Medium"] { background: linear-gradient(135deg, #d97706, #b45309); }
    .tc-risk[data-level="Low"] { background: linear-gradient(135deg, #16a34a, #15803d); }
    .tc-summary { color: #d1d5db; margin-bottom: 16px; font-size: 14px; }
    .tc-flags { margin-bottom: 16px; }
    .tc-flag { padding: 10px 12px; background: rgba(220,38,38,0.15); border-left: 3px solid #ef4444; margin: 6px 0; border-radius: 0 8px 8px 0; }
    .tc-rec {
      font-weight: 700; padding-top: 14px; border-top: 1px solid #374151; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .tc-rec[data-rec="Accept"] { color: #4ade80; }
    .tc-rec[data-rec="Review Carefully"] { color: #fbbf24; }
    .tc-rec[data-rec="Do Not Accept"] { color: #f87171; }
    .tc-error { color: #f87171; }
  `;
  document.head.appendChild(style);
}

// Quick check before full extraction — bail early if page has no keywords
const bodyText = document.body.innerText || "";
const quickCheck = bodyText.slice(0, 1000).toLowerCase();
const hasKeywords = TC_KEYWORDS.some(k => quickCheck.includes(k));

if (hasKeywords) {
  const fullText = extractPageText();
  if (fullText && isTermsPage(fullText)) {
    analyzeAndShow();
  }
}

// Handle popup messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "analyzeNow") {
    analyzeAndShow().then(() => sendResponse({ message: "Analysis complete!" }));
    return true;
  }
});
