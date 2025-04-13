export class FAQRenderer {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.answerContainer = document.getElementById('faq-answer');
      this.init();
    }
  
    async init() {
      await this.loadFAQs();
      this.setupEventListeners();
    }
  
    async loadFAQs() {
      try {
        const response = await fetch('/api/faq');
        if (!response.ok) throw new Error('Failed to load FAQs');
        
        const { data } = await response.json();
        this.renderCategories(data);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        this.showError();
      }
    }
  
    renderCategories(categories) {
      this.container.innerHTML = `
        <div class="faq-header">
          <h2>📚 Câu hỏi thường gặp</h2>
        </div>
        ${categories.map(category => `
          <div class="faq-category">
            <h3>${category.title}</h3>
            <ul class="faq-list">
              ${category.questions.map(question => `
                <li class="faq-item" data-id="${question.id}">
                  ${question.question}
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      `;
    }
  
    setupEventListeners() {
      this.container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('faq-item')) {
          const questionId = e.target.dataset.id;
          await this.loadAnswer(questionId);
        }
      });
    }
  
    async loadAnswer(questionId) {
      try {
        const response = await fetch(`/api/faq/${questionId}`);
        if (!response.ok) throw new Error('Failed to load answer');
        
        const { data } = await response.json();
        this.showAnswer(data);
      } catch (error) {
        console.error('Error loading answer:', error);
        this.showAnswerError();
      }
    }
  
    showAnswer(data) {
      this.answerContainer.innerHTML = `
        <div class="faq-answer-card">
          <h4>${data.question}</h4>
          <div class="faq-answer-content">${data.answer}</div>
        </div>
      `;
      this.answerContainer.classList.add('show');
    }
  
    showError() {
      this.container.innerHTML = `
        <div class="faq-error">
          <p>Không thể tải danh sách câu hỏi</p>
          <button onclick="location.reload()">Thử lại</button>
        </div>
      `;
    }
  
    showAnswerError() {
      this.answerContainer.innerHTML = `
        <div class="faq-error">
          <p>Không thể tải câu trả lời</p>
        </div>
      `;
      this.answerContainer.classList.add('show');
    }
  }
  import { getCategories, getQuestions, search } from '../../config/faq.js';

export class FAQRenderer {
  constructor() {
    this.categoriesContainer = document.getElementById('faq-categories');
    this.questionsContainer = document.getElementById('faq-questions');
    this.searchInput = document.getElementById('faq-search-input');
    this.loader = document.getElementById('faq-loader');

    this.initEventListeners();
    this.loadInitialFAQs();
  }

  initEventListeners() {
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
  }

  async loadInitialFAQs() {
    this.showLoader();
    try {
      const categories = await getCategories();
      this.renderCategories(categories);
    } catch (error) {
      console.error('FAQ Load Error:', error);
    } finally {
      this.hideLoader();
    }
  }

  renderCategories(categories) {
    this.categoriesContainer.innerHTML = categories.map(cat => `
      <div class="faq-category" data-id="${cat.id}">
        <h3>${cat.title}</h3>
        <span>${cat.questionCount} câu hỏi</span>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.faq-category').forEach(category => {
      category.addEventListener('click', async (e) => {
        const categoryId = e.currentTarget.dataset.id;
        this.showCategoryQuestions(categoryId);
      });
    });
  }

  async showCategoryQuestions(categoryId) {
    this.showLoader();
    try {
      const questions = await getQuestions(categoryId);
      this.renderQuestions(questions);
    } catch (error) {
      console.error('Category Load Error:', error);
    } finally {
      this.hideLoader();
    }
  }

  renderQuestions(questions) {
    this.questionsContainer.innerHTML = questions.map(q => `
      <div class="faq-question" data-id="${q.id}">
        <div class="question-text">${q.question}</div>
        <div class="question-meta">Cập nhật: ${q.lastUpdated}</div>
      </div>
    `).join('');

    // Add question click handlers
    document.querySelectorAll('.faq-question').forEach(question => {
      question.addEventListener('click', async (e) => {
        const questionId = e.currentTarget.dataset.id;
        this.showQuestionDetail(questionId);
      });
    });
  }

  async handleSearch(e) {
    const query = e.target.value.trim();
    if (query.length > 2) {
      this.showLoader();
      try {
        const results = await search(query);
        this.renderSearchResults(results);
      } catch (error) {
        console.error('Search Error:', error);
      } finally {
        this.hideLoader();
      }
    }
  }

  // ... Các phương thức khác
}

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.faqRenderer = new FAQRenderer();
});
export class FAQRenderer {
    constructor() {
      this.baseTemplate = this.loadBaseTemplate();
    }
  
    loadBaseTemplate() {
      return `
        <div class="chat-container">
          ${/* Template chung */''}
        </div>
      `;
    }
  
    renderFacebookUI() {
      // Platform-specific template
      document.getElementById('chat-root').innerHTML = `
        ${this.baseTemplate}
        <div class="fb-custom-elements">
          ${/* Thêm các element đặc thù của Facebook */''}
        </div>
      `;
    }
  
    renderZaloUI() {
      // Template riêng cho Zalo
    }
  }