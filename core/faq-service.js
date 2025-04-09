import { readFile } from 'fs/promises';
import { normalizeText } from '../utils/text-matcher.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Config ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tải dữ liệu FAQ
const faqData = JSON.parse(
  await readFile(path.join(__dirname, '../data/faq.json'), 'utf-8')
);

export default class FAQService {
  constructor() {
    this.faqIndex = this.buildIndex();
    this.minMatchScore = 0.7; // Ngưỡng điểm tối thiểu
  }

  /**
   * Xây dựng chỉ mục tìm kiếm
   */
  buildIndex() {
    try {
      return faqData.categories.flatMap(category => 
        category.questions.map(question => ({
          ...question,
          category: category.name,
          normalizedQuestion: normalizeText(question.question),
          normalizedAnswer: normalizeText(question.answer),
          keywords: (question.keywords || []).map(kw => normalizeText(kw))
        }))
      );
    } catch (error) {
      console.error('❌ Lỗi khi xây dựng chỉ mục FAQ:', error);
      return [];
    }
  }

  /**
   * Tìm câu trả lời phù hợp nhất
   * @param {string} userQuery - Câu hỏi từ người dùng
   * @returns {Promise<FAQResponse>}
   */
  async findAnswer(userQuery) {
    if (!userQuery?.trim()) {
      return this.getFallbackResponse('Vui lòng nhập câu hỏi');
    }

    const normalizedQuery = normalizeText(userQuery);
    let bestMatch = null;
    let highestScore = 0;

    // Tìm kiếm tuyến tính (có thể thay bằng thuật toán nâng cao)
    for (const item of this.faqIndex) {
      const scores = {
        question: this.calculateMatchScore(normalizedQuery, item.normalizedQuestion),
        keywords: this.calculateKeywordScore(normalizedQuery, item.keywords),
        answer: this.calculateMatchScore(normalizedQuery, item.normalizedAnswer) * 0.5
      };

      const totalScore = scores.question * 0.6 + scores.keywords * 0.3 + scores.answer * 0.1;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestMatch = item;
      }
    }

    return {
      success: highestScore >= this.minMatchScore,
      data: bestMatch,
      score: highestScore,
      ...(highestScore < this.minMatchScore && this.getFallbackResponse(normalizedQuery))
    };
  }

  /**
   * Tính điểm khớp câu hỏi
   */
  calculateMatchScore(query, target) {
    if (!query || !target) return 0;
    
    const queryWords = new Set(query.split(/\s+/));
    const targetWords = new Set(target.split(/\s+/));
    
    const intersection = [...queryWords].filter(w => targetWords.has(w)).length;
    return intersection / Math.max(queryWords.size, 1);
  }

  /**
   * Tính điểm từ khóa
   */
  calculateKeywordScore(query, keywords) {
    if (!keywords?.length) return 0;
    return keywords.some(kw => query.includes(kw)) ? 0.4 : 0;
  }

  /**
   * Trả về câu trả lời dự phòng
   */
  getFallbackResponse(query = '') {
    // Lấy các câu hỏi thường gặp
    const frequentQuestions = this.faqIndex
      .filter(item => item.isFrequent)
      .slice(0, 3)
      .map(item => item.question);

    // Gợi ý từ khóa nếu có
    const keywordSuggestions = this.faqIndex
      .flatMap(item => item.keywords)
      .filter(kw => query.includes(kw))
      .slice(0, 2);

    return {
      message: keywordSuggestions.length > 0
        ? `Bạn muốn tìm hiểu về "${keywordSuggestions.join(', ')}"?`
        : 'Câu hỏi thường gặp:',
      suggestions: keywordSuggestions.length > 0 
        ? keywordSuggestions 
        : frequentQuestions
    };
  }
}

// Type Definitions (cho IDE hỗ trợ)
/**
 * @typedef {Object} FAQResponse
 * @property {boolean} success - Khớp câu trả lời?
 * @property {FAQItem|null} data - Câu trả lời khớp nhất
 * @property {number} score - Độ khớp (0-1)
 * @property {string} [message] - Tin nhắn gợi ý
 * @property {string[]} [suggestions] - Danh sách gợi ý
 */

/**
 * @typedef {Object} FAQItem
 * @property {string} question - Câu hỏi gốc
 * @property {string} answer - Câu trả lời
 * @property {string} category - Danh mục
 * @property {string[]} keywords - Từ khóa liên quan
 */