// Twilio Voice AI - Deploy to Twilio Functions
// Copy this to: Twilio Console → Functions → Create

exports.handler = function(context, event, callback) {
  const twiml = require('twilio').twiml;
  
  const GOOGLE_API_KEY = context.GOOGLE_API_KEY;
  const RAG_URL = context.RAG_URL;
  
  const path = event.REQUEST_URI || '';
  
  function respond(text, gather = true) {
    const response = new twiml();
    if (gather) {
      const gatherNode = response.gather({
        input: 'speech',
        action: '/process',
        method: 'POST',
        timeout: 5,
        speechTimeout: 'auto'
      });
      gatherNode.say(text);
    } else {
      response.say(text);
      response.hangup();
    }
    callback(null, response);
  }
  
  async function getLegalAnswer(query) {
    // Try RAG first
    try {
      const ragRes = await fetch(RAG_URL + '/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, top_k: 3 })
      });
      const data = await ragRes.json();
      if (data.ai_answer) {
        // Truncate to fit in TTS (keep under 1000 chars)
        return data.ai_answer.slice(0, 1000);
      }
    } catch (e) {
      console.log('RAG failed:', e.message);
    }
    
    // Fallback to Gemini
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are E-Bench Indian Legal Assistant. Answer concisely (2-3 sentences): ${query}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
          })
        }
      );
      const data = await geminiRes.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not find an answer.';
    } catch (e) {
      return 'I apologize. I am having trouble processing your request.';
    }
  }
  
  // Route handling
  if (path.includes('/voice')) {
    respond('Welcome to E-Bench Legal Assistant. Ask your legal question about Indian law.');
  } 
  else if (path.includes('/process')) {
    const speech = event.SpeechResult;
    if (!speech) {
      return respond('Sorry, I did not catch that. Please ask your legal question again.');
    }
    
    getLegalAnswer(speech)
      .then(reply => respond(reply))
      .catch(err => {
        console.error(err);
        respond('I apologize. I am having trouble processing your request.');
      });
  } 
  else {
    respond('Thank you for calling E-Bench. Goodbye.', false);
  }
};