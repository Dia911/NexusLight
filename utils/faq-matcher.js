// utils/faq-matcher.js
import { normalizeText } from './text-utils.js';

export default class FAQMatcher {
  constructor(faqData) {
    this.faqData = faqData;
    this.minMatchThreshold = 0.65;
    this.weights = {
      question: 0.6,
      keywords: 0.3,
      answer: 0.1
    };
  }

  /**
   * Tìm câu trả lời phù hợp nhất
   * @param {string} userInput - Câu hỏi từ người dùng
   * @returns {Promise<MatchResult>}
   */
  async findBestMatch(userInput) {
    const normalizedInput = normalizeText(userInput);
    let bestMatch = null;
    let highestScore = 0;

    // Duyệt qua tất cả câu hỏi trong FAQ
    for (const category of this.faqData.categories) {
      for (const question of category.questions) {
        const score = this.calculateMatchScore(
          normalizedInput,
          question,
          category
        );

        if (score > highestScore) {
          highestScore = score;
          bestMatch = {
            ...question,
            category: category.title,
            categoryId: category.id
          };
        }
      }
    }

    return {
      success: highestScore >= this.minMatchThreshold,
      match: bestMatch,
      score: highestScore,
      threshold: this.minMatchThreshold
    };
  }

  /**
   * Tính điểm phù hợp tổng hợp
   */
  calculateMatchScore(input, question, category) {
    const normalizedQuestion = normalizeText(question.question);
    const normalizedAnswer = normalizeText(question.answer);
    const normalizedKeywords = (question.keywords || []).map(kw => normalizeText(kw));

    const scores = {
      question: this.calculateTextSimilarity(input, normalizedQuestion),
      keywords: this.calculateKeywordScore(input, normalizedKeywords),
      answer: this.calculateTextSimilarity(input, normalizedAnswer)
    };

    // Tính điểm tổng có trọng số
    return (
      scores.question * this.weights.question +
      scores.keywords * this.weights.keywords +
      scores.answer * this.weights.answer
    );
  }

  /**
   * Tính điểm tương đồng văn bản (nâng cao)
   */
  calculateTextSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const tokens1 = new Set(str1.split(/\s+/));
    const tokens2 = new Set(str2.split(/\s+/));
    
    const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
    const union = new Set([...tokens1, ...tokens2]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Tính điểm từ khóa
   */
  calculateKeywordScore(input, keywords) {
    if (!keywords || keywords.length === 0) return 0;
    
    const matchedKeywords = keywords.filter(kw => 
      input.includes(kw)
    ).length;
    
    return Math.min(0.3, matchedKeywords * 0.15);
  }

  /**
   * Lấy các câu hỏi gợi ý
   * @param {number} limit - Số lượng gợi ý
   * @returns {FAQItem[]}
   */
  getSuggestions(limit = 5) {
    return this.faqData.categories
      .flatMap(category => 
        category.questions
          .filter(q => q.isFrequent)
          .map(q => ({
            question: q.question,
            category: category.title,
            keywords: q.keywords || []
          }))
      )
      .slice(0, limit);
  }
}

/**
 * @typedef {Object} MatchResult
 * @property {boolean} success - Có tìm thấy kết quả phù hợp?
 * @property {FAQItem|null} match - Câu hỏi khớp nhất
 * @property {number} score - Độ khớp (0-1)
 * @property {number} threshold - Ngưỡng chấp nhận
 */

/**
 * @typedef {Object} FAQItem
 * @property {string} question - Câu hỏi gốc
 * @property {string} answer - Câu trả lời
 * @property {string[]} keywords - Từ khóa liên quan
 * @property {string} category - Danh mục
 * @property {string} categoryId - ID danh mục
 */