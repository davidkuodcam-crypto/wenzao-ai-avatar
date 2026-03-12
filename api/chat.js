/**
 * Vercel Serverless Function: api/chat.js
 * 修復說明：將模型名稱更改為正式環境支援的 'gemini-1.5-flash'
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '伺服器端未設定 GEMINI_API_KEY 環境變數。' });
  }

  const { contents, systemInstruction } = req.body;

  try {
    // 使用正式環境穩定的 gemini-1.5-flash 模型
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
              reply: { type: "STRING" },
              expression: { type: "STRING" },
              specialAction: { type: "STRING" },
              actionDuration: { type: "NUMBER" }
            },
            required: ["reply", "expression", "specialAction", "actionDuration"]
          }
        }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('AI 未能產生有效的回覆內容。');
    }

    const jsonResponse = JSON.parse(resultText);
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error('後端代理錯誤:', error.message);
    res.status(500).json({ error: '與 Gemini API 通訊失敗', details: error.message });
  }
}
