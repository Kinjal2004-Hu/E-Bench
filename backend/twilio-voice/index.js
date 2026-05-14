// Twilio Voice AI - Functions Version
// Deploy to Twilio Console → Functions → Global

exports.handler = function(context, event, callback) {
  const twiml = require('twilio').twiml;
  const GOOGLE_API_KEY = context.GOOGLE_API_KEY || '';
  const RAG_URL = context.RAG_URL || 'http://localhost:8000';
  
  // In-memory conversation (use Redis for production)
  const conversations = new Map();
  
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
  
  function processLegalQuery(query) {
    return new Promise(async (resolve, reject) => {
      // Try RAG first
      try {
        const ragRes = await fetch(RAG_URL + '/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: query, top_k: 5 })
        });
        const ragData = await ragRes.json();
        if (ragData.ai_answer) {
          return resolve(ragData.ai_answer);
        }
      } catch (e) {
        console.log('RAG failed, trying Gemini');
      }
      
      // Fallback: Gemini
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a professional Indian legal assistant. Answer based on IPC, CrPC, Constitution.
                
User: ${query}
Provide concise answer with section citations.`
              }]
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          })
        });
        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        resolve(reply || 'I apologize, but I could not find a suitable answer.');
      } catch (e) {
        reject(e);
      }
    });
  }
  
  // Routes
  const path = event.REQUEST_URI || '';
  
  if (path.includes('/voice')) {
    // Incoming call
    respond('Welcome to E-Bench Legal Assistant. Ask your legal question.');
  } 
  else if (path.includes('/process')) {
    // Process speech
    const speech = event.SpeechResult;
    if (!speech) {
      return respond('Sorry, I did not catch that. Please ask your legal question again.');
    }
    
    processLegalQuery(speech)
      .then(reply => respond(reply))
      .catch(err => {
        console.error(err);
        respond('I apologize, but I am having trouble processing your request.');
      });
  } 
  else if (path.includes('/fallback')) {
    respond('Something went wrong. Please try again later.', false);
  }
  else {
    respond('Thank you for calling E-Bench. Goodbye.', false);
  }
};