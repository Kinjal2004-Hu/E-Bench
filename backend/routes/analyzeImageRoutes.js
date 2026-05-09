// Image Analysis Router - NVIDIA LLM Direct
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';
const RAG_URL = process.env.RAG_URL || 'http://localhost:8000';

const LEGAL_SYSTEM_PROMPT = `You are a professional legal document analyzer. 
Analyze any text from a webpage or document and provide:
1. Summary of the content
2. Key clauses and their meanings
3. Any legal risks or concerns
4. Recommendations

Be concise, clear, and helpful. Use plain language.`;

router.post('/analyze-image', async (req, res) => {
  console.log('[E-Bench Backend] Request received');
  console.log('[E-Bench Backend] Body keys:', Object.keys(req.body || {}));
  
  try {
    const { image, question } = req.body;
    
    console.log('[E-Bench Backend] image:', image ? 'present' : 'missing');
    console.log('[E-Bench Backend] question:', question ? question.substring(0, 100) : 'missing');
    
    if (!image && !question) {
      console.log('[E-Bench Backend] No image or question provided');
      return res.json({ success: false, error: 'No image or question provided' });
    }
    
    console.log('[E-Bench Backend] 📷 Analyzing screenshot...');
    
    // If only question (follow-up chat), use RAG directly
    if (!image && question) {
      console.log('💬 Follow-up question, using RAG...');
      try {
        const ragRes = await fetch(`${RAG_URL}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question.slice(0, 2000), top_k: 5 })
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          return res.json({
            success: true,
            result: ragData.ai_answer || ragData.answer || 'No response'
          });
        }
      } catch (e) {
        return res.json({ success: false, error: e.message });
      }
    }
    
// For screenshot analysis - pass image to multimodal LLM
    let imageBase64 = '';
    let imageUrl = '';
    
    if (image.startsWith('data:')) {
      // Keep full base64 for multimodal model
      imageBase64 = image;
    } else {
      imageUrl = image;
    }
    
    let legalAnalysis = '';
    
    // Use multimodal model with image
    const userPrompt = question 
      ? `Based on this screenshot, answer: ${question}`
      : `Analyze this screenshot and provide:\n1. Summary\n2. Key legal points\n3. Any concerns\n4. Recommendations`;
    
    console.log('[E-Bench Backend] 🤖 Calling NVIDIA LLM with vision...');
    
    // Build messages - with image base64 as content
    const messages = [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT }
    ];
    
    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userPrompt });
    }
    
    const llmResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        extra_body: {
          chat_template_kwargs: { enable_thinking: true },
          reasoning_budget: 16384
        }
      })
    });
    
    if (llmResponse.ok) {
      const llmData = await llmResponse.json();
      legalAnalysis = llmData.choices?.[0]?.message?.content || '';
      console.log('✅ Analysis complete');
    } else {
      // Fallback to RAG
      console.log('📚 Falling back to RAG...');
      try {
        const ragRes = await fetch(`${RAG_URL}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: textToAnalyze.slice(0, 2000), top_k: 3 })
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          legalAnalysis = ragData.ai_answer || ragData.answer || '';
        }
      } catch (e) {
        console.log('RAG also failed');
      }
    }
    
    if (!legalAnalysis) {
      legalAnalysis = 'Could not analyze this content. Please try again.';
    }
    
    res.json({
      success: true,
      result: legalAnalysis
    });
    
  } catch (error) {
    console.error('❌ Analyze error:', error.message);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;