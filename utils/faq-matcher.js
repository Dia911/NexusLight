// utils/faq-matcher.js
import { normalizeText, calculateSimilarity } from './text-utils.js';
import logger from './logger.js';

export class FAQMatcher {
  /**
   * Khởi tạo FAQ Matcher
   * @param {object} faqData - Dữ liệu FAQ từ config/faq.js
   */
  constructor(faqData) {
    if (!faqData?.categories) {
      logger.error('Invalid FAQ data structure', { faqData });
      throw new Error('FAQ data must contain categories array');
    }

    this.faqData = faqData;
    this.config = {
      minMatchThreshold: 0.65,
      weights: {
        question: 0.6,
        keywords: 0.3,
        answer: 0.1
      },
      maxSuggestions: 5
    };
  }

  /**
   * Tìm câu trả lời phù hợp nhất
   * @param {string} userInput - Câu hỏi từ người dùng
   * @returns {Promise<MatchResult>} - Kết quả tìm kiếm
   */
  async findBestMatch(userInput) {
    if (!userInput?.trim()) {
      logger.warn('Empty user input received');
      return this.emptyResult();
    }

    try {
      const normalizedInput = normalizeText(userInput);
      let bestMatch = null;
      let highestScore = 0;

      // Duyệt qua tất cả câu hỏi
      for (const category of this.faqData.categories) {
        for (const question of category.questions) {
          const score = this.calculateMatchScore(normalizedInput, question);
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = this.formatMatchResult(question, category);
          }
        }
      }

      return this.formatFinalResult(highestScore, bestMatch);
    } catch (error) {
      logger.error('Failed to find FAQ match', { error, userInput });
      return this.emptyResult();
    }
  }

  /**
   * Lấy các câu hỏi gợi ý
   * @param {number} [limit] - Số lượng gợi ý
   * @returns {Promise<FAQItem[]>} - Danh sách gợi ý
   */
  async getSuggestions(limit = this.config.maxSuggestions) {
    try {
      return this.faqData.categories
        .flatMap(category => 
          category.questions
            .filter(q => q.isFrequent)
            .map(q => this.formatSuggestion(q, category))
        )
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get suggestions', { error });
      return [];
    }
  }

  // ========== Internal Methods ==========
  
  /**
   * Tính điểm phù hợp tổng hợp
   * @private
   */
  calculateMatchScore(input, question) {
    const { weights } = this.config;
    return (
      calculateSimilarity(input, normalizeText(question.question)) * weights.question +
      this.calculateKeywordScore(input, question.keywords) * weights.keywords +
      calculateSimilarity(input, normalizeText(question.answer)) * weights.answer
    );
  }

  /**
   * Tính điểm từ khóa
   * @private
   */
  calculateKeywordScore(input, keywords = []) {
    const matchedKeywords = keywords
      .map(kw => normalizeText(kw))
      .filter(kw => input.includes(kw))
      .length;
    
    return Math.min(0.3, matchedKeywords * 0.15);
  }

  /**
   * Định dạng kết quả
   * @private
   */
  formatMatchResult(question, category) {
    return {
      id: question.id,
      question: question.question,
      answer: question.answer,
      category: category.title,
      categoryId: category.id,
      metadata: {
        lastUpdated: question.lastUpdated || category.lastUpdated,
        keywords: question.keywords || []
      }
    };
  }

  /**
   * Định dạng gợi ý
   * @private
   */
  formatSuggestion(question, category) {
    return {
      id: question.id,
      question: question.question,
      category: category.title,
      preview: question.answer.substring(0, 100) + '...'
    };
  }

  /**
   * Định dạng kết quả cuối cùng
   * @private
   */
  formatFinalResult(score, match) {
    const isMatch = score >= this.config.minMatchThreshold;
    logger.debug('Match evaluation completed', { 
      score: score.toFixed(2), 
      threshold: this.config.minMatchThreshold,
      matchedId: match?.id 
    });
    
    return {
      success: isMatch,
      match: isMatch ? match : null,
      score: Number(score.toFixed(2)),
      threshold: this.config.minMatchThreshold
    };
  }

  /**
   * Trả về kết quả rỗng
   * @private
   */
  emptyResult() {
    return {
      success: false,
      match: null,
      score: 0,
      threshold: this.config.minMatchThreshold
    };
  }
}

// ========== Type Definitions ==========
/**
 * @typedef {Object} MatchResult
 * @property {boolean} success - Có tìm thấy kết quả phù hợp?
 * @property {FAQItem|null} match - Câu hỏi khớp nhất
 * @property {number} score - Độ chính xác (0-1)
 * @property {number} threshold - Ngưỡng chấp nhận
 */

/**
 * @typedef {Object} FAQItem
 * @property {string} id - ID câu hỏi
 * @property {string} question - Nội dung câu hỏi
 * @property {string} answer - Câu trả lời
 * @property {string} category - Danh mục
 * @property {string} categoryId - ID danh mục
 * @property {Object} metadata - Thông tin bổ sung
 */