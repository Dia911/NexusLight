// server.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import faqModule from './config/faq.js';
import logger from './utils/logger.js';

// ==============================================
// 1. Cấu hình cơ bản
// ==============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

// ==============================================
// 2. Khởi tạo Express
// ==============================================
const app = express();

// ==============================================
// 3. Middleware
// ==============================================
app.use(cors({
  origin: isProduction ? process.env.CORS_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Platform']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Platform', req.headers['x-platform'] || 'default');
  next();
});

// ==============================================
// 4. Cấu hình file tĩnh
// ==============================================
const staticDir = path.join(__dirname, 'public');
const ensureStaticDir = () => {
  if (!fs.existsSync(staticDir)) {
    logger.error('Thư mục public không tồn tại', { dir: staticDir });
    process.exit(1);
  }
};
ensureStaticDir();

app.use(express.static(staticDir, {
  setHeaders: (res, path) => {
    const cacheControl = isProduction && !path.endsWith('.html') 
      ? 'public, max-age=31536000' 
      : 'no-store, no-cache';
    res.setHeader('Cache-Control', cacheControl);
  }
}));

// ==============================================
// 5. Khởi tạo Google Sheets API
// ==============================================
const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

// ==============================================
// 6. Routes API
// ==============================================
// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: faqModule.metadata.version,
    uptime: process.uptime(),
    sheetId: process.env.GOOGLE_SHEET_ID,
    platform: res.getHeader('X-Platform')
  });
});

// FAQ API
app.get('/api/faqs/:type(categories|questions|search)', async (req, res) => {
  try {
    const platform = res.getHeader('X-Platform');
    let data;

    switch(req.params.type) {
      case 'categories':
        data = faqModule.getCategories(platform);
        break;
      
      case 'questions':
        data = faqModule.getQuestions(
          req.query.categoryId,
          platform,
          parseInt(req.query.skip) || 0,
          parseInt(req.query.limit) || 50
        );
        break;
      
      case 'search':
        if (!req.query.q || req.query.q.length < 3) {
          return res.status(400).json({ error: 'Yêu cầu từ khóa tìm kiếm tối thiểu 3 ký tự' });
        }
        data = faqModule.search(req.query.q, platform);
        break;
    }

    res.json({ 
      success: true,
      data,
      metadata: faqModule.metadata
    });

  } catch (error) {
    logger.error('FAQ API Error', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

// Chat Processing
app.post('/api/chat', async (req, res) => {
  try {
    const { message, platform = 'default' } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        example: { message: "Your question here" }
      });
    }

    // Xử lý tin nhắn và phân tích
    const startTime = Date.now();
    const response = await processMessage(message, platform);
    const processingTime = Date.now() - startTime;

    // Log analytics
    logInteraction({
      type: 'chat_message',
      platform,
      message,
      responseType: response.type,
      processingTime,
      sentiment: analyzeSentiment(message)
    });

    res.json(response);

  } catch (error) {
    logger.error('Chat Processing Error', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: isProduction ? undefined : error.stack
    });
  }
});

// Analytics Logging
app.post('/api/analytics', async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Analytics!A:Z',
      valueInputOption: 'RAW',
      resource: {
        values: [Object.values(req.body)]
      }
    });

    res.json({ 
      success: true,
      updatedCells: result.data.updates.updatedCells
    });

  } catch (error) {
    logger.error('Google Sheets Error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log analytics'
    });
  }
});

// ==============================================
// 7. Business Logic
// ==============================================
async function processMessage(message, platform) {
  // 1. Check FAQ first
  const faqResults = faqModule.search(message, platform);
  if (faqResults.length > 0) {
    return {
      type: 'faq_answer',
      data: faqResults[0],
      suggested: getRelatedQuestions(faqResults[0].related)
    };
  }

  // 2. Xử lý AI
  return {
    type: 'ai_response',
    data: await generateAIResponse(message),
    quickReplies: getQuickReplies(platform)
  };
}

function logInteraction(data) {
  // Thêm metadata
  const fullData = {
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
    ...data
  };

  // Gửi đến Google Sheets và logger
  logger.info('Interaction Logged', fullData);
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullData)
  });
}

// ==============================================
// 8. Error Handling
// ==============================================
app.use((req, res) => {
  res.status(404).sendFile(path.join(staticDir, '404.html'));
});

app.use((err, req, res, next) => {
  logger.error('Server Error', {
    error: err.stack,
    url: req.originalUrl,
    headers: req.headers
  });

  res.status(500).format({
    json: () => res.json({
      error: 'Internal Server Error',
      requestId: req.id
    }),
    html: () => res.sendFile(path.join(staticDir, '500.html')),
    default: () => res.type('txt').send('Internal Server Error')
  });
});

// ==============================================
// 9. Khởi động Server
// ==============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server khởi động thành công`, {
    port: PORT,
    mode: process.env.NODE_ENV,
    sheetId: process.env.GOOGLE_SHEET_ID
  });
});

// ==============================================
// 10. Graceful Shutdown
// ==============================================
const shutdown = async (signal) => {
  logger.warn(`Nhận tín hiệu ${signal}, bắt đầu tắt server`);
  
  try {
    await new Promise((resolve) => server.close(resolve));
    await auth.cleanup();
    logger.info('Server đã tắt an toàn');
    process.exit(0);
  } catch (err) {
    logger.error('Lỗi khi tắt server', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));