const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const LEGAL_SYSTEM_PROMPT = `You are IndianLegal Chat, an AI legal assistant specializing in Indian law. 
You answer questions about Indian legal rights, procedures, sections from BNS, BNSS, BSA, and other Indian statutes.
When OCR text from a document screenshot is provided, use it to give specific advice based on the document content.
Always clarify you are not a substitute for a licensed lawyer.
Keep answers concise, practical, and grounded in Indian law.`;

const ANALYZE_SYSTEM_PROMPT = `You are an expert legal document analyzer for Terms & Conditions.
Return JSON:
{"riskLevel":"Low|Medium|High","summary":"2-3 sentences","redFlags":["clause1","clause2"],"recommendation":"Accept|Review Carefully|Do Not Accept"}
Analyze: data collection, termination, auto-renewal, hidden fees, arbitration, data sharing, modification rights, deletion.`;

async function callNVIDIA(messages) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-super-120b-a12b',
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      extra_body: {
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384
      }
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

router.post('/extension/analyze-tc', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText || documentText.length < 100) {
      return res.status(400).json({ error: 'Document text too short' });
    }
    const content = await callNVIDIA([
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze this Terms & Conditions document:\n\n${documentText.slice(0, 15000)}` }
    ]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return res.json(JSON.parse(jsonMatch[0]));
    res.json({
      riskLevel: 'Medium',
      summary: content.slice(0, 200),
      redFlags: ['Could not parse analysis'],
      recommendation: 'Review Carefully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/extension/legal-chat', async (req, res) => {
  try {
    const { message, ocrText, imageUrl, history } = req.body;
    if (!message && !ocrText) {
      return res.status(400).json({ error: 'Message or OCR text required' });
    }

    const messages = [{ role: 'system', content: LEGAL_SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    let userContent = message || '';
    if (ocrText) {
      userContent += `\n\n[OCR text extracted from uploaded document screenshot]:\n${ocrText}`;
    }
    if (imageUrl) {
      userContent += `\n\n[Referenced image: ${imageUrl}]`;
    }

    messages.push({ role: 'user', content: userContent });

    const reply = await callNVIDIA(messages);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/extension/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const b64 = req.file.buffer.toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'extension_uploads',
      resource_type: 'image',
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const Tesseract = require('tesseract.js');

router.post('/extension/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');

    res.json({ text: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
