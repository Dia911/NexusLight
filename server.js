// server.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

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
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ==============================================
// 4. Static Files Configuration
// ==============================================
const staticDir = path.join(__dirname, 'public');

// Kiểm tra thư mục public tồn tại
if (!fs.existsSync(staticDir)) {
  console.error('❌ Thư mục public không tồn tại!');
  process.exit(1);
}

app.use(express.static(staticDir, {
  extensions: ['html'],
  index: 'index.html',
  maxAge: isProduction ? '1d' : '0', // Cache trong production
  setHeaders: (res, filePath) => {
    // Disable caching cho HTML trong development
    if (filePath.endsWith('.html') && !isProduction) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
  }
}));

// ==============================================
// 5. Routes
// ==============================================
// Health check endpoint (QUAN TRỌNG cho deployment)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// HTML Pages
const htmlPages = {
  '/': 'index.html',
  '/privacy': 'Privacy.html',
  '/terms': 'Terms.html'
};

Object.entries(htmlPages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    const filePath = path.join(staticDir, file);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error(`⚠️ Không tìm thấy file ${file}`);
        return res.status(404).sendFile(path.join(staticDir, '404.html'));
      }
      res.sendFile(filePath);
    });
  });
});

// API Endpoint
app.post('/ask', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required',
        example: { message: "Your question here" }
      });
    }

    // Xử lý logic tại đây
    res.json({ 
      reply: `Received: ${message}`,
      status: 'success'
    });

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
// 404 Not Found
app.use((req, res) => {
  res.status(404).sendFile(path.join(staticDir, '404.html'));
});

// 500 Internal Server Error
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(500).sendFile(path.join(staticDir, '500.html'));
});

// ==============================================
// 7. Khởi động Server
// ==============================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Kiểm tra file error pages
[404, 500].forEach(code => {
  const filePath = path.join(staticDir, `${code}.html`);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Cảnh báo: Thiếu file ${code}.html`);
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`
  🚀 Server đã khởi động
  ⚙️ Chế độ: ${isProduction ? 'Production' : 'Development'}
  🌐 Địa chỉ: http://${HOST}:${PORT}
  📂 Thư mục public: ${staticDir}
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

  // Force shutdown sau 5s nếu có kết nối treo
  setTimeout(() => {
    console.error('❌ Buộc tắt server do timeout');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));