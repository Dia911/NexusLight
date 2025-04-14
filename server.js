// server.js (bản hoàn chỉnh)
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import faqModule from './config/faq.js';
import { google } from 'googleapis';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());
app.use(cors());
app.use(express.json());

// 📁 Giao diện tĩnh nếu có
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// 📦 Google Sheets config
const auth = new google.auth.GoogleAuth({
  keyFile: './config/google_credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = '1_1eihNOHfcrCdXf3SyQz_FUt2C0tJTEGOPLxrO7DTsY';

// ✅ Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: faqModule?.metadata?.version || '1.0',
    lastUpdated: faqModule?.metadata?.lastUpdated || null,
    sheet: SHEET_ID,
  });
});

// 🤖 API chat
app.post('/api/chat', async (req, res) => {
  try {
    const { question, platform = 'web', userId = 'anonymous' } = req.body;
    const matches = faqModule.search(question, platform, { limit: 1 });

    const response = matches.length > 0
      ? matches[0].answer
      : `Xin lỗi, em chưa có thông tin này. Em sẽ gửi câu hỏi của anh/chị đến bộ phận AI xử lý thêm.`;

    await logInteraction({ userId, platform, question, response });
    res.json({ answer: response });
  } catch (err) {
    console.error('❌ Chat Error:', err);
    res.status(500).json({ error: 'Lỗi xử lý yêu cầu' });
  }
});

// 📊 Ghi log vào Google Sheet
async function logInteraction({ userId, platform, question, response }) {
  const timestamp = new Date().toISOString();
  const values = [[timestamp, userId, platform, question, response]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Logs!A1:E1',
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

// 🚀 Khởi chạy
app.listen(PORT, () => {
  console.log(`✅ TerozChat server running on port ${PORT}`);
});
