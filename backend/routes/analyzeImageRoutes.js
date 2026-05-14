const express = require('express');
const router = express.Router();
const Tesseract = require('tesseract.js');

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

const LEGAL_SYSTEM_PROMPT = `You are a professional legal document analyzer. 
Analyze any text from a webpage or document and provide:
1. Summary of the content
2. Key clauses and their meanings
3. Any legal risks or concerns
4. Recommendations
Be concise, clear, and helpful. Use plain language.`;

function base64ToBuffer(dataUri) {
  const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) return null;
  return Buffer.from(matches[2], 'base64');
}

router.post('/analyze-image', async (req, res) => {
  try {
    const { image, question } = req.body;
    if (!image && !question) {
      return res.json({ success: false, error: 'No image or question provided' });
    }

    // If only text question (no image), forward to RAG
    if (!image && question) {
      const ragRes = await fetch(`${process.env.RAG_URL || 'http://localhost:8000'}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.slice(0, 2000), top_k: 5 })
      });
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        return res.json({ success: true, result: ragData.ai_answer || ragData.answer || 'No response' });
      }
      return res.json({ success: false, error: 'RAG server unavailable' });
    }

    // Step 1: OCR — extract text from image
    const buffer = base64ToBuffer(image);
    if (!buffer) return res.json({ success: false, error: 'Invalid image data' });

    const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'eng');

    if (!ocrText.trim()) {
      return res.json({ success: true, result: 'No readable text could be extracted from this image.' });
    }

    // Step 2: Send extracted text to NVIDIA LLM for legal analysis
    const userPrompt = question
      ? `The user uploaded a screenshot of a legal document. Extracted text:\n${ocrText.slice(0, 8000)}\n\nAnswer this question: ${question}`
      : `The user uploaded a screenshot of a legal document. Extracted text:\n${ocrText.slice(0, 8000)}\n\nAnalyze this document and provide:\n1. Summary\n2. Key legal points\n3. Any concerns\n4. Recommendations`;

    const llmRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NVIDIA_API_KEY}` },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b',
        messages: [
          { role: 'system', content: LEGAL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2048,
      })
    });

    if (llmRes.ok) {
      const llmData = await llmRes.json();
      const analysis = llmData.choices?.[0]?.message?.content || '';
      return res.json({ success: true, result: analysis });
    }

    // Fallback: return OCR text if LLM fails
    res.json({ success: true, result: `[OCR Extracted Text]\n${ocrText.slice(0, 2000)}\n\n(NVIDIA analysis unavailable — showing raw extracted text.)` });

  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;