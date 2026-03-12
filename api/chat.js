/**
 * 根據使用者成功範例與正確白名單更新的 api/chat.js
 * * 修改重點：
 * 1. CORS 白名單：設定為 https://wenzao-ai-avatar.vercel.app/
 * 2. 模型：使用 gemini-2.5-flash (支援 Google Search 工具)
 * 3. 解析邏輯：從 Google 回傳的原始資料中擷取文字並解析為虛擬角色所需的 JSON 格式
 */

export default async function handler(req, res) {
  // ==========================================
  // 1. CORS 安全防護設定 (白名單機制)
  // ==========================================
  const allowedOrigins = [
    'https://wenzao-ai-avatar.vercel.app',   // 您的正式網址 (主要)
    'https://davidkuodcam-crypto.github.io', // 您的 GitHub Pages
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

  // 處理瀏覽器的 OPTIONS 預檢請求
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

    // 強制啟用 Google Search 工具，確保 AI 能獲得最新資訊
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
        console.error("Gemini API Error:", googleError);
        return res.status(500).json({ error: `Google API Error: ${googleError}` });
    }

    // ==========================================
    // 3. 解析內容並回傳
    // ==========================================
    // 取得模型生成的原始文字
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('AI 未回傳內容');
    }

    // 解析文字中的 JSON 部分 (確保 index.html 能直接獲取對話、表情等屬性)
    try {
        const jsonContent = resultText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
        const jsonResponse = JSON.parse(jsonContent);
        return res.status(200).json(jsonResponse);
    } catch (parseError) {
        // 如果 AI 回傳的不是 JSON，至少回傳原始文字給前端處理
        return res.status(200).json({ reply: resultText, expression: 'neutral', specialAction: 'none', actionDuration: 3 });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
