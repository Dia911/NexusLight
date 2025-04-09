// server.js
import fs from 'fs';
import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Cấu hình đường dẫn
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '.env') });

// 2. Khởi tạo Express
const app = express();

// 3. Middleware cơ bản
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Cấu hình static files
const staticDir = path.join(__dirname, 'public');

// Kiểm tra thư mục public
if (!fs.existsSync(staticDir)) {
  console.error('❌ Lỗi: Thư mục public không tồn tại!');
  console.log('👉 Tạo thư mục public và các file HTML cần thiết:');
  console.log('mkdir public');
  console.log('touch public/index.html public/privacy.html public/terms.html public/404.html public/500.html');
  process.exit(1);
}

// 5. Cấu hình routes
app.use(express.static(staticDir, {
  extensions: ['html'],
  fallthrough: false // Không chuyển sang middleware tiếp theo nếu file không tồn tại
}));

// Route handler đơn giản
const servePage = (page) => (req, res) => {
  const filePath = path.join(staticDir, `${page}.html`);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`⚠️ Không tìm thấy file ${page}.html`);
      return res.status(404).sendFile(path.join(staticDir, '404.html'));
    }
    res.sendFile(filePath);
  });
};

// Routes chính
app.get('/', servePage('index'));
app.get('/privacy', servePage('privacy'));
app.get('/terms', servePage('terms'));

// 6. Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 7. Xử lý lỗi
app.use((req, res) => {
  res.status(404).sendFile(path.join(staticDir, '404.html'));
});

app.use((err, req, res, next) => {
  console.error('🔥 Lỗi server:', err.stack);
  res.status(500).sendFile(path.join(staticDir, '500.html'));
});

// 8. Khởi động server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server đã khởi động
  📌 Port: ${PORT}
  📂 Thư mục: ${__dirname}
  🕒 Thời gian: ${new Date().toLocaleString()}
  `);
  
  // Kiểm tra các file quan trọng
  const requiredFiles = ['index.html', '404.html', '500.html'];
  requiredFiles.forEach(file => {
    const filePath = path.join(staticDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Cảnh báo: Thiếu file ${file}`);
    }
  });
});

// 9. Xử lý shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Nhận tín hiệu SIGTERM, đang tắt server...');
  server.close(() => {
    console.log('✅ Server đã tắt');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Nhận tín hiệu SIGINT, đang tắt server...');
  server.close(() => {
    console.log('✅ Server đã tắt');
    process.exit(0);
  });
});