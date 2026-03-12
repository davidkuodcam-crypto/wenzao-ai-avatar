/**
 * 根據使用者要求更新 CORS 白名單的 api/chat.js
 */

export default async function handler(req, res) {
  // ==========================================
  // 1. CORS 安全防護設定
  // ==========================================
  const allowedOrigins = [
    'https://wenzao-ai-avatar.vercel.app',   // 您的正式網址
    'https://davidkuodcam-crypto.github.io', // GitHub 網域
    'http://localhost:3000',                 // 本機測試
    'http://127.0.0.1:5500'                  // Live Server 測試
  ];

  const requestOrigin = req.headers.origin;
  if (allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ==========================================
  // 2. 呼叫 Gemini
  // ==========================================
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vercel 環境變數中找不到 GEMINI_API_KEY。' });
  }

  try {
    const GEMINI_MODEL = "gemini-2.5-flash"; 
    const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const requestBody = req.body;

    // 強制啟用 Google Search 工具
    if (!requestBody.tools) {
        requestBody.tools = [{ google_search: {} }];
    }

    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
        const googleError = data.error?.message || 'Unknown Gemini API Error';
        return res.status(500).json({ error: `Google API Error: ${googleError}` });
    }

    // ==========================================
    // 3. 解析 JSON 回傳給前端
    // ==========================================
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('AI 未回傳內容');
    }

    // 解析模型產生的 JSON 字串並直接回傳物件
    const jsonResponse = JSON.parse(resultText);
    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
