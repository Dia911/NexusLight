// public/js/chat.js
import { FAQRenderer } from './faq-renderer.js';

export class ChatManager {
  constructor() {
    this.chatContainer = document.getElementById('chat-container');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.faqRenderer = new FAQRenderer('faq-container');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupFAQToggle();
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  setupFAQToggle() {
    const faqToggle = document.getElementById('toggle-faq');
    if (faqToggle) {
      faqToggle.addEventListener('click', () => {
        document.getElementById('faq-section').classList.toggle('hidden');
        faqToggle.textContent = document.getElementById('faq-section').classList.contains('hidden') 
          ? 'Hiện FAQ' 
          : 'Ẩn FAQ';
      });
    }
  }

  async sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    this.showLoading(true);
    this.addMessage(message, 'user');
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      this.handleResponse(data);
      
    } catch (error) {
      this.addMessage('⚠️ Lỗi kết nối với server. Vui lòng thử lại sau.', 'bot', true);
      console.error('Chat Error:', error);
    } finally {
      this.showLoading(false);
      this.inputField.value = '';
      this.inputField.focus();
    }
  }

  handleResponse(response) {
    if (response.type === 'faq_answer') {
      this.addMessage(response.data.answer, 'bot');
    } else {
      this.addMessage(response.data.message, 'bot');
      if (response.data.suggestions) {
        this.showSuggestions(response.data.suggestions);
      }
    }
  }

  addMessage(content, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender} ${isError ? 'error' : ''}`;
    messageDiv.innerHTML = content;
    this.chatContainer.appendChild(messageDiv);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  showSuggestions(suggestions) {
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'suggestions';
    
    suggestions.forEach(suggestion => {
      const suggestionBtn = document.createElement('button');
      suggestionBtn.className = 'suggestion-btn';
      suggestionBtn.textContent = suggestion.question || suggestion;
      suggestionBtn.addEventListener('click', () => {
        this.inputField.value = suggestion.question || suggestion;
        suggestionBox.remove();
      });
      suggestionBox.appendChild(suggestionBtn);
    });
    
    this.chatContainer.appendChild(suggestionBox);
  }

  showLoading(show) {
    this.loadingIndicator.style.display = show ? 'block' : 'none';
    this.sendButton.disabled = show;
  }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
  new ChatManager();
});