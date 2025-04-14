# ✨ NexusLight – FAQ Chatbot ESM

**NexusLight** là hệ thống chatbot đơn giản, nhẹ nhàng, hỗ trợ đa nền tảng như Facebook, Zalo, Telegram... sử dụng Google Sheets làm nguồn dữ liệu chính. Dự án được viết theo chuẩn **ES Modules (ESM)** để dễ mở rộng và bảo trì.

---

## 🚀 Cài đặt

```bash
git clone https://github.com/your-repo-name/NexusLight.git
cd NexusLight
npm install
.
├── adapters
│   └── platform-adapter.js       # Adapter điều phối handler theo nền tảng
├── config.js                     # Cấu hình chung (Google Sheet ID)
├── core
│   └── add.js                    # Xử lý thêm câu hỏi
├── data
│   └── faq.json                  # Dữ liệu FAQ cache từ Google Sheets
├── google-sheets.js             # Lấy dữ liệu từ Google Sheets
├── handlers                     # Các nền tảng hỗ trợ
│   ├── Facebook.js
│   ├── Telegram.js
│   ├── Tiktok.js
│   ├── Weibo.js
│   ├── Zalo.js
│   └── default.js
├── service-account.js           # Thông tin tài khoản dịch vụ Google
├── server.js                    # Điểm khởi chạy
├── utils
│   └── logger.js                # Ghi log có màu & lưu file
├── package.json
└── README.md
đọc kỹ chính sách và quyền riêng tư ,  hãy liên hệ với sđt và email được ghi trong Điền Khoản (Terms)
bản cập nhật mới nhất sẽ được update theo quy trình 
Chúc các bạn vui vẻ
