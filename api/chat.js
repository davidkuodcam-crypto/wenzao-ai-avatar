/**
 * 根據使用者成功範例修改的 api/chat.js
 * 1. 使用穩定版 gemini-2.5-flash 模型。
 * 2. 加入 https://wenzao-ai-avatar.vercel.app/ 至白名單。
 * 3. 支援 Google Search 工具。
 */

export default async function handler(req, res) {
  // ==========================================
  // 1. CORS 安全防護設定 (白名單機制)
  // ==========================================
  const allowedOrigins = [
    'https://wenzao-ai-avatar.vercel.app',   // 您的正式網址
    'https://davidkuodcam-crypto.github.io', // 您的 GitHub Pages
    'http://localhost:3000',
    'http://127.0.0.1:5500'
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
  // 2. 讀取 API KEY 與呼叫 Gemini
  // ==========================================
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing in Vercel env vars");
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

    // 依照範例回傳原始 Google 資料
    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
