// Twilio Voice AI - Configuration
// Replace with your actual credentials

const CONFIG = {
  // Twilio credentials
  ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'AC88f86fd497f66c2105342f249f40ee52',
  AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '344dc86b3a3571ad1a53d321c57d70ae',
  PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '+13366007937',
  
  // RAG Server (your existing legal AI)
  RAG_URL: process.env.RAG_URL || 'http://localhost:8000',
  
  // Gemini (fallback)
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'AIzaSyC4D8sZruZsKZKYJGOX4O8BoF9yFZfm6hU',
  
  // Call settings
  GATHER_TIMEOUT: 5,
  MAX_CONVERSATION_TURNS: 10,
  
  // Welcome message
  WELCOME_MESSAGE: 'Welcome to E-Bench Legal Assistant. Ask your legal question and I will help you with Indian law.',
  
  // Error message
  ERROR_MESSAGE: 'Sorry, I am having trouble processing your request. Please try again.'
};

module.exports = CONFIG;