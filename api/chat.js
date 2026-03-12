export default async function handler(req, res) {
    // 1. 設定 CORS 標頭，嚴格限制來源 (白名單)
    const allowedOrigins = ['https://wenzao-ai-avatar.vercel.app'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin && origin.includes('localhost')) {
        // 為了方便您在本地開發測試，也允許 localhost 來源
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. 處理瀏覽器的預檢請求 (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只允許 POST 方法
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 3. 從 Vercel 環境變數讀取 API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("錯誤: 找不到 GEMINI_API_KEY 環境變數");
        return res.status(500).json({ error: '伺服器端環境變數設定錯誤' });
    }

    try {
        // 4. 將前端傳來的請求內容轉發給 Gemini 2.5 Flash
        const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // 直接將前端傳來的歷史紀錄與系統提示轉發
        });

        const data = await response.json();

        // 將 Google API 的回應轉發回給前端
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('向 Gemini API 請求時發生錯誤:', error);
        return res.status(500).json({ error: '後端伺服器發生未預期的錯誤' });
    }
}
