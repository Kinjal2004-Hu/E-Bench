// Twilio Voice AI - Voice Endpoints
const express = require('express');
const { router, twiml, conversations, CONFIG } = require('./router');

const GOOGLE_API_KEY = CONFIG.GOOGLE_API_KEY;

// ========================================
// STEP 1: /voice - Incoming call handler
// ========================================
router.post('/voice', (req, res) => {
  const callSid = req.body?.CallSid || req.query?.CallSid || 'UNKNOWN';
  console.log(`📞 Incoming call: ${callSid}`);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  
  // Initialize conversation
  conversations.set(callSid, {
    turns: 0,
    history: [],
    startTime: Date.now()
  });
  
  res.type('text/xml').send(twiml(CONFIG.WELCOME_MESSAGE));
});

// ========================================
// Helper: Process query via RAG + Gemini
// ========================================
async function processLegalQuery(query, callSid) {
  const conv = conversations.get(callSid) || { turns: 0, history: [] };
  
  // Add to history
  conv.history.push({ role: 'user', content: query });
  
  let reply;
  
  try {
    // PRIMARY: Use RAG server
    console.log(`🔍 Querying RAG: ${query}`);
    const ragResponse = await fetch(`${CONFIG.RAG_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: query, 
        top_k: 5,
        conversation_id: callSid 
      })
    });
    
    if (ragResponse.ok) {
      const ragData = await ragResponse.json();
      reply = ragData.ai_answer || ragData.answer;
      
      // Add context if available
      if (ragData.supporting_sections?.length) {
        reply += `\n\nReferenced sections: ${ragData.supporting_sections.map(s => s.section_number).join(', ')}`;
      }
    } else {
      throw new Error('RAG failed');
    }
  } catch (ragErr) {
    console.log(`⚠️ RAG failed, trying Gemini: ${ragErr.message}`);
    
    // FALLBACK: Use Gemini
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a professional Indian legal assistant. Answer the user's question based on Indian law (IPC, CrPC, Constitution).
              
Previous conversation:
${conv.history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

User question: ${query}

Provide a concise, accurate answer. Cite relevant sections when possible.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });
      
      const geminiData = await geminiResponse.json();
      reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!reply) throw new Error('No Gemini response');
    } catch (geminiErr) {
      console.error(`❌ Gemini failed: ${geminiErr.message}`);
      reply = CONFIG.ERROR_MESSAGE;
    }
  }
  
  // Add to history
  conv.history.push({ role: 'assistant', content: reply });
  conv.turns++;
  conversations.set(callSid, conv);
  
  return reply;
}

// ========================================
// STEP 2: /process - Speech processing
// ========================================
router.post('/process', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult;
  const digests = req.body.Digits;
  
  console.log(`🗣️ Speech: "${speechResult}" | Call: ${callSid}`);
  
  const conv = conversations.get(callSid);
  
  // Handle no speech detected
  if (!speechResult || !speechResult.trim()) {
    console.log('❌ No speech detected');
    res.type('text/xml').send(twiml(
      "Sorry, I didn't catch that. Please ask your legal question again.",
      true // gather again
    ));
    return;
  }
  
  // Check conversation limits
  if (conv && conv.turns >= CONFIG.MAX_CONVERSATION_TURNS) {
    res.type('text/xml').send(twiml(
      "Thank you for using E-Bench Legal Assistant. Good luck with your case. Goodbye!",
      false, // end call
      true
    ));
    return;
  }
  
  try {
    // ProcessQuery(query)
    const reply = await processLegalQuery(speechResult, callSid);
    
    console.log(`🤖 AI Reply: ${reply?.slice(0, 100)}...`);
    
    // Ensure reply is valid string
    const safeReply = reply && reply.trim() ? reply : CONFIG.ERROR_MESSAGE;
    
    // Send TwiML with conversation loop
    res.type('text/xml').send(twiml(safeReply));
  } catch (err) {
    console.error(`❌ Process error: ${err.message}`);
    res.type('text/xml').send(twiml(CONFIG.ERROR_MESSAGE));
  }
});

// ========================================
// STEP 3: /status - Call status callback
// ========================================
router.post('/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  
  console.log(`📞 Call ${callSid}: ${callStatus}`);
  
  // Clean up conversation
  if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'no-answer') {
    conversations.delete(callSid);
  }
  
  res.type('text/xml').send('<Response/>');
});

// ========================================
// STEP 4: /fallback - Error handler
// ========================================
router.post('/fallback', (req, res) => {
  const callSid = req.body.CallSid;
  console.log(`❌ Fallback for call: ${callSid}`);
  
  res.type('text/xml').send(twiml(
    "I apologize, but I am unable to process your request at this time. Please try again later or visit our website at E-Bench dot in. Goodbye!",
    false,
    true
  ));
});

module.exports = router;