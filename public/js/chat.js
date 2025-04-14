import { FAQRenderer } from './faq-renderer.js';

export class ChatManager {
  constructor(platform = 'default') {
    this.platform = platform;
    this.initElements();
    this.initFAQ();
    this.setupEventListeners();
  }

  initElements() {
    this.chatContainer = document.getElementById('chat-container');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
  }

  initFAQ() {
    this.faqRenderer = new FAQRenderer(this.platform);
    this.toggleFAQ(true);
  }

  setupEventListeners() {
    // Send message handlers
    this.sendButton.addEventListener('click', () => this.processMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) this.processMessage();
    });

    // FAQ toggle
    document.getElementById('toggle-faq').addEventListener('click', () => 
      this.toggleFAQ()
    );
  }

  async processMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    this.showLoading(true);
    this.addMessage(message, 'user');

    try {
      const response = await this.sendToBackend(message);
      this.handleResponse(response);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.resetInput();
    }
  }

  async sendToBackend(message) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        platform: this.platform
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }

  handleResponse(response) {
    if (response.type === 'faq') {
      this.faqRenderer.renderQuestionDetail(response.data);
    } else {
      this.addMessage(response.data.text, 'bot');
      if (response.data.quick_replies) {
        this.showQuickReplies(response.data.quick_replies);
      }
    }
  }

  addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = content;
    this.chatContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showQuickReplies(replies) {
    const replyContainer = document.createElement('div');
    replyContainer.className = 'quick-replies';
    
    replies.forEach(reply => {
      const button = document.createElement('button');
      button.textContent = reply.title;
      button.addEventListener('click', () => 
        this.handleQuickReply(reply.payload)
      );
      replyContainer.appendChild(button);
    });
    
    this.chatContainer.appendChild(replyContainer);
  }

  handleQuickReply(payload) {
    this.inputField.value = payload;
    this.processMessage();
  }

  toggleFAQ(force) {
    const faqSection = document.getElementById('faq-section');
    faqSection.classList.toggle('hidden', force);
  }

  showLoading(show) {
    this.loadingIndicator.style.display = show ? 'block' : 'none';
    this.sendButton.disabled = show;
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  resetInput() {
    this.inputField.value = '';
    this.showLoading(false);
    this.inputField.focus();
  }

  handleError(error) {
    console.error('Chat Error:', error);
    this.addMessage(this.platformConfig.errorMessage, 'bot', true);
  }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  const platform = document.body.dataset.platform || 'default';
  window.chatManager = new ChatManager(platform);
});