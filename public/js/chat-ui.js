class ChatUI {
    constructor() {
      this.chatContainer = document.getElementById('chat-container');
      this.initGreeting();
    }
  
    initGreeting() {
      const greetingHTML = `
        <div class="greeting-message">
          <p>${faqConfig.brand.defaultGreeting.replace('{brand}', faqConfig.brand.name)}</p>
          
          <div class="quick-actions">
            <button class="faq-btn" data-category="general">🔍 Về OpenLive</button>
            <button class="faq-btn" data-category="products">🏀 Sản phẩm</button>
            <button class="faq-btn" data-category="investment">💰 Đầu tư</button>
            <button class="ai-chat-btn">🤖 Chat với AI</button>
          </div>
  
          <div class="contact-info">
            <a href="${faqConfig.platforms.facebook}" target="_blank">📘 Facebook</a>
            <a href="${faqConfig.platforms.zalo}" target="_blank">💬 Zalo</a>
            <a href="tel:${faqConfig.platforms.phone}">📞 ${faqConfig.platforms.phone}</a>
            <a href="${faqConfig.platforms.registration}" class="register-btn">⚡ Đăng ký ngay</a>
          </div>
        </div>
      `;
      
      this.chatContainer.innerHTML = greetingHTML;
      this.bindEvents();
    }
  
    bindEvents() {
      // Handle FAQ buttons
      document.querySelectorAll('.faq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = e.target.dataset.category;
          this.showFAQCategory(category);
        });
      });
  
      // AI Chat button
      document.querySelector('.ai-chat-btn').addEventListener('click', () => {
        window.open(faqConfig.aiIntegration.chatGPT.promptURL, '_blank');
      });
    }
  
    showFAQCategory(categoryId) {
      const category = faqConfig.faqStructure.find(c => c.id === categoryId);
      let questionsHTML = category.questions.map(q => `
        <div class="faq-item" data-id="${q.id}">
          <div class="question">${q.question}</div>
          <div class="answer">${q.answer}</div>
        </div>
      `).join('');
  
      this.chatContainer.innerHTML = `
        <div class="faq-category">
          <button class="back-btn">← Quay lại</button>
          <h3>${category.title}</h3>
          ${questionsHTML}
        </div>
      `;
  
      this.addFAQItemListeners();
    }
  
    addFAQItemListeners() {
      document.querySelectorAll('.faq-item').forEach(item => {
        item.addEventListener('click', () => {
          const questionId = item.dataset.id;
          this.logInteraction(questionId);
        });
      });
    }
  
    logInteraction(questionId) {
      // Gửi data đến Google Sheets
      const analyticsData = {
        timestamp: new Date().toISOString(),
        questionId,
        platform: window.location.hostname
      };
      
      fetch('/api/analytics', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(analyticsData)
      });
    }
  }
  
  // Khởi tạo khi trang load
  document.addEventListener('DOMContentLoaded', () => new ChatUI());