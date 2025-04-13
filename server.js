// server.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import faqModule from './config/faq.js';

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
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ==============================================
// 4. Static Files Configuration
// ==============================================
const staticDir = path.join(__dirname, 'public');

if (!fs.existsSync(staticDir)) {
  console.error('❌ Thư mục public không tồn tại!');
  process.exit(1);
}

app.use(express.static(staticDir, {
  extensions: ['html'],
  index: 'index.html',
  maxAge: isProduction ? '7d' : '0',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') && !isProduction) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
  }
}));

// ==============================================
// 5. Routes
// ==============================================
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: faqModule.metadata.version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// FAQ API Endpoints
app.get('/api/faqs/categories', async (req, res) => {
  try {
    const categories = faqModule.getCategories();
    res.json({
      success: true,
      data: categories,
      metadata: faqModule.metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Lỗi tải danh mục FAQ'
    });
  }
});

app.get('/api/faqs/questions/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const questions = faqModule.getQuestions(categoryId, {
      skip: parseInt(req.query.skip) || 0,
      limit: parseInt(req.query.limit) || 50
    });
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy danh mục'
      });
    }

    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Lỗi tải câu hỏi'
    });
  }
});

app.get('/api/faqs/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Yêu cầu từ khóa tìm kiếm tối thiểu 3 ký tự'
      });
    }

    const results = faqModule.search(query, {
      threshold: 0.3,
      limit: 10,
      searchFields: ['question', 'answer', 'keywords']
    });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Lỗi tìm kiếm'
    });
  }
});

app.get('/api/faqs/:id', async (req, res) => {
  try {
    const question = faqModule.getQuestionDetail(req.params.id);
    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy câu hỏi'
      });
    }
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Lỗi tải chi tiết câu hỏi'
    });
  }
});

// Existing Ask Endpoint
app.post('/ask', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        example: { message: "Your question here" }
      });
    }

    // Integration with FAQ system
    const faqResults = faqModule.search(message, {
      threshold: 0.5,
      limit: 1
    });

    const response = faqResults.length > 0 
      ? { 
          reply: faqResults[0].answerPreview,
          source: 'faq',
          reference: faqResults[0].id
        }
      : {
          reply: `Received: ${message}`,
          source: 'ai'
        };

    res.json(response);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: isProduction ? undefined : error.message
    });
  }
});

// ==============================================
// 6. Error Handling
// ==============================================
app.use((req, res) => {
  res.status(404).sendFile(path.join(staticDir, '404.html'));
});

app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(500).sendFile(path.join(staticDir, '500.html'));
});

// ==============================================
// 7. Khởi động Server
// ==============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`
  🚀 Server đã khởi động
  ⚙️ Chế độ: ${isProduction ? 'Production' : 'Development'}
  🌐 Địa chỉ: http://${HOST}:${PORT}
  📂 FAQ Version: ${faqModule.metadata.version}
  ⏰ Thời gian: ${new Date().toLocaleString()}
  `);
});

// ==============================================
// 8. Graceful Shutdown
// ==============================================
const shutdown = (signal) => {
  console.log(`\n🛑 Nhận tín hiệu ${signal}, đang tắt server...`);
  server.close(() => {
    console.log('✅ Server đã tắt an toàn');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Buộc tắt server do timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));