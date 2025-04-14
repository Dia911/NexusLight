import { 
    getCategories,
    getQuestions,
    getQuestionDetail,
    search 
  } from '../../config/faq.js';
  
  export class FAQRenderer {
    constructor(platform) {
      this.platform = platform;
      this.container = document.getElementById('faq-container');
      this.init();
    }
  
    async init() {
      await this.loadConfig();
      this.renderBaseUI();
      this.setupEventListeners();
    }
  
    async loadConfig() {
      const response = await fetch(`/config/${this.platform}.json`);
      this.config = await response.json();
    }
  
    renderBaseUI() {
      this.container.innerHTML = `
        <div class="faq-header">
          <h2>${this.config.faqTitle}</h2>
          <div class="search-box">
            <input type="text" id="faq-search" placeholder="${this.config.searchPlaceholder}">
          </div>
        </div>
        <div class="faq-content">
          <div id="faq-categories" class="categories-list"></div>
          <div id="faq-questions" class="questions-list"></div>
          <div id="faq-detail" class="question-detail"></div>
        </div>
      `;
    }
  
    setupEventListeners() {
      // Search handler
      document.getElementById('faq-search').addEventListener('input', (e) => 
        this.handleSearch(e.target.value)
      );
  
      // Platform-specific event handlers
      if(this.platform === 'facebook') {
        this.setupFacebookEvents();
      }
      // Thêm handlers cho các platform khác
    }
  
    async handleSearch(query) {
      if (query.length > 2) {
        const results = await search(query);
        this.renderSearchResults(results);
      }
    }
  
    async renderCategories() {
      const categories = await getCategories();
      document.getElementById('faq-categories').innerHTML = categories
        .map(cat => `
          <div class="category-item" data-id="${cat.id}">
            <h3>${cat.title}</h3>
            <p>${cat.questionCount} ${this.config.questionsText}</p>
          </div>
        `).join('');
      
      this.addCategoryHandlers();
    }
  
    addCategoryHandlers() {
      document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', async () => {
          const questions = await getQuestions(item.dataset.id);
          this.renderQuestions(questions);
        });
      });
    }
  
    renderQuestions(questions) {
      document.getElementById('faq-questions').innerHTML = questions
        .map(q => `
          <div class="question-item" data-id="${q.id}">
            <div class="question-text">${q.question}</div>
            <div class="question-meta">
              <span>${this.config.lastUpdated}: ${q.lastUpdated}</span>
            </div>
          </div>
        `).join('');
      
      this.addQuestionHandlers();
    }
  
    addQuestionHandlers() {
      document.querySelectorAll('.question-item').forEach(item => {
        item.addEventListener('click', async () => {
          const detail = await getQuestionDetail(item.dataset.id);
          this.renderQuestionDetail(detail);
        });
      });
    }
  
    renderQuestionDetail(detail) {
      document.getElementById('faq-detail').innerHTML = `
        <div class="detail-card">
          <button class="back-btn">${this.config.backButtonText}</button>
          <h3>${detail.question}</h3>
          <div class="answer-content">${detail.answer}</div>
          ${this.renderRelatedQuestions(detail.related)}
        </div>
      `;
  
      this.addBackButtonHandler();
    }
  
    renderRelatedQuestions(related) {
      if (!related.length) return '';
      return `
        <div class="related-questions">
          <h4>${this.config.relatedQuestionsText}</h4>
          ${related.map(id => `
            <div class="related-item" data-id="${id}">
              ${this.getQuestionTextById(id)}
            </div>
          `).join('')}
        </div>
      `;
    }
  
    setupFacebookEvents() {
      // Facebook-specific event handlers
      window.FB.Event.subscribe('message', (event) => {
        this.handleFBMessage(event);
      });
    }
  
    handleFBMessage(event) {
      // Xử lý tin nhắn từ Facebook
      this.logInteraction({
        type: 'facebook_message',
        data: event
      });
    }
  
    logInteraction(data) {
      // Gửi analytics đến Google Sheets
      fetch('/api/analytics', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...data,
          platform: this.platform,
          timestamp: new Date().toISOString()
        })
      });
    }
  }