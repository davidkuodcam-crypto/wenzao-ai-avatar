/**
 * Vercel Serverless Function: api/chat.js
 * * 功能：
 * 1. 保護 API Key：將金鑰留在伺服器端，避免前端外洩。
 * 2. 格式化回應：要求 Gemini 回傳結構化 JSON，方便控制虛擬角色的表情與動作。
 */

export default async function handler(req, res) {
  // 僅允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '不允許此請求方法 (Method Not Allowed)' });
  }

  // 從 Vercel 環境變數讀取 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器未設定 GEMINI_API_KEY 環境變數。' });
  }

  const { contents, systemInstruction } = req.body;

  try {
    // 呼叫 Gemini 2.5 Flash API (預覽版)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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
              actionDuration: { type: "NUMBER", description: "特殊動作持續秒數" }
            },
            required: ["reply", "expression", "specialAction", "actionDuration"]
          }
        }
      })
    });

    const data = await response.json();
    
    // 錯誤檢查
    if (data.error) {
      throw new Error(data.error.message);
    }

    // 取得模型生成的文字 (JSON 字串)
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Gemini 未回傳有效的內容。');
    }

    // 解析 JSON 並回傳給 Canvas 中的前端
    const jsonResponse = JSON.parse(resultText);
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('後端代理錯誤:', error.message);
    res.status(500).json({ 
      error: '與 Gemini 通訊失敗', 
      details: error.message 
    });
  }
}