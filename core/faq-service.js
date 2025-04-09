import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { 
  normalizeText,
  calculateSimilarity,
  findBestMatch 
} from '../utils/text-matcher.js';

// Cấu hình đường dẫn ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class FAQService {
  constructor() {
    this.faqData = null;
    this.faqIndex = [];
    this.minMatchScore = 0.65;
    this.weights = {
      question: 0.6,
      keywords: 0.3,
      answer: 0.1
    };
    this.init();
  }

  /**
   * Khởi tạo service
   */
  async init() {
    try {
      // Load dữ liệu từ file JSON
      this.faqData = await this.loadFAQData();
      this.faqIndex = this.buildIndex();
      console.log(`✅ Đã tải ${this.faqIndex.length} câu hỏi FAQ`);
    } catch (error) {
      console.error('❌ Khởi tạo FAQService thất bại:', error);
      throw error;
    }
  }

  /**
   * Tải dữ liệu FAQ từ file
   */
  async loadFAQData() {
    try {
      const rawData = await readFile(
        path.join(__dirname, '../config/faq.js'),
        'utf-8'
      );
      // Xử lý file JS module exports
      return eval(rawData.replace('export default', ''));
    } catch (error) {
      console.error('❌ Lỗi đọc file FAQ:', error);
      return { categories: [] };
    }
  }

  /**
   * Xây dựng chỉ mục tìm kiếm
   */
  buildIndex() {
    return this.faqData.categories.flatMap(category => 
      category.questions.map(question => ({
        ...question,
        categoryId: category.id,
        categoryTitle: category.title,
        normalizedQuestion: normalizeText(question.question),
        normalizedAnswer: normalizeText(question.answer),
        keywords: (question.keywords || []).map(kw => normalizeText(kw)),
        isFrequent: question.isFrequent || false
      }))
    );
  }

  /**
   * Tìm câu trả lời phù hợp nhất
   */
  async findAnswer(userQuery) {
    if (!userQuery?.trim()) {
      return this.buildResponse(
        false,
        null,
        0,
        'Vui lòng nhập câu hỏi của bạn'
      );
    }

    const normalizedQuery = normalizeText(userQuery);
    const { bestMatch, highestScore } = this.findBestMatch(normalizedQuery);

    if (highestScore >= this.minMatchScore) {
      return this.buildResponse(true, bestMatch, highestScore);
    }

    return this.buildResponse(
      false,
      null,
      highestScore,
      'Câu hỏi của bạn chưa có trong hệ thống',
      this.getSuggestions(normalizedQuery)
    );
  }

  /**
   * Tìm kết quả phù hợp nhất
   */
  findBestMatch(query) {
    let bestMatch = null;
    let highestScore = 0;

    for (const item of this.faqIndex) {
      const scores = {
        question: calculateSimilarity(query, item.normalizedQuestion),
        keywords: this.calculateKeywordScore(query, item.keywords),
        answer: calculateSimilarity(query, item.normalizedAnswer)
      };

      const totalScore = 
        scores.question * this.weights.question +
        scores.keywords * this.weights.keywords + 
        scores.answer * this.weights.answer;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestMatch = item;
      }
    }

    return { bestMatch, highestScore };
  }

  /**
   * Tính điểm từ khóa
   */
  calculateKeywordScore(query, keywords) {
    if (!keywords?.length) return 0;
    return keywords.some(kw => query.includes(kw)) ? 0.4 : 0;
  }

  /**
   * Tạo gợi ý tự động
   */
  getSuggestions(query = '') {
    // Gợi ý từ khóa phù hợp
    const keywordMatches = this.faqIndex
      .filter(item => 
        item.keywords.some(kw => query.includes(kw))
      )
      .slice(0, 3);

    // Gợi ý câu hỏi thường gặp
    const frequentQuestions = this.faqIndex
      .filter(item => item.isFrequent)
      .slice(0, 3);

    return keywordMatches.length > 0
      ? keywordMatches.map(item => item.question)
      : frequentQuestions.map(item => item.question);
  }

  /**
   * Tạo response chuẩn
   */
  buildResponse(success, data, score, message = '', suggestions = []) {
    return {
      success,
      data,
      score,
      message: message || (success ? '' : 'Không tìm thấy câu trả lời'),
      suggestions: suggestions.length > 0 
        ? suggestions 
        : this.getDefaultSuggestions(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gợi ý mặc định
   */
  getDefaultSuggestions() {
    return [
      "Cách trở thành cổ đông?",
      "Giấy phép kinh doanh?",
      "Liên hệ hỗ trợ thế nào?"
    ];
  }

  /**
   * Lấy danh sách câu hỏi cho giao diện
   */
  getFAQSuggestions(limit = 5) {
    return this.faqIndex
      .filter(item => item.isFrequent)
      .slice(0, limit)
      .map(item => ({
        question: item.question,
        category: item.categoryTitle,
        keywords: item.keywords
      }));
  }
}