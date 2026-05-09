// Twilio Voice AI - Main Router
const express = require('express');
const router = express.Router();
const CONFIG = require('./config');

// TwiML Response helper
const twiml = (text, gather = true, end = false) => {
  if (gather) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/twilio-voice/process" method="POST" timeout="${CONFIG.GATHER_TIMEOUT}" speechTimeout="auto">
    <Say>${text}</Say>
  </Gather>
</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${text}</Say>
  <Hangup/>
</Response>`;
};

// In-memory conversation storage (use Redis for production)
const conversations = new Map();

module.exports = { router, twiml, conversations, CONFIG };