/**
 * Vercel Serverless Function: api/chat.js
 * 修復說明：
 * 1. 將模型名稱更正為 'gemini-1.5-flash' 以確保在 v1beta 端點的相容性。
 * 2. 增加對 API 回傳內容的檢查，避免解析非 JSON 格式導致的錯誤。
 */

export default async function handler(req, res) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 從 Vercel 環境變數讀取 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器端未設定 GEMINI_API_KEY 環境變數。' });
  }

  const { contents, systemInstruction } = req.body;

  try {
    // 使用目前最穩定的 gemini-1.5-flash 模型識別碼
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: { type: "STRING", description: "回覆給使用者的文字" },
              expression: { type: "STRING", description: "情緒表情: neutral, happy, angry, sad, relaxed, surprised" },
              specialAction: { type: "STRING", description: "動作: none, blink, blinkLeft, blinkRight, aa" },
              actionDuration: { type: "NUMBER", description: "動作持續秒數" }
            },
            required: ["reply", "expression", "specialAction", "actionDuration"]
          }
        }
      })
    });

    // 取得原始回傳內容以進行檢查
    const data = await response.json();
    
    // 檢查 Google API 是否回傳錯誤訊息
    if (data.error) {
      console.error('Google API Error:', data.error);
      return res.status(response.status).json({ 
        error: `Google API 錯誤: ${data.error.message}`,
        details: data.error 
      });
    }

    // 取得 AI 生成的 JSON 字串
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('AI 未能產生有效的回覆內容。');
    }

    // 解析並回傳給前端
    const jsonResponse = JSON.parse(resultText);
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('後端代理錯誤:', error.message);
    res.status(500).json({ 
      error: '伺服器內部錯誤', 
      details: error.message 
    });
  }
}
