// utils/text-utils.js

/**
 * Chuẩn hóa văn bản tiếng Việt cho tìm kiếm
 * @param {string} str - Chuỗi cần chuẩn hóa
 * @returns {string} - Chuỗi đã được chuẩn hóa
 */
export function normalizeText(str) {
    if (!str || typeof str !== 'string') return '';
    
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // Bỏ dấu
      .replace(/đ/g, 'd')               // Chuẩn hóa 'đ' -> 'd'
      .replace(/[^\w\sà-ỹ]/g, ' ')      // Giữ lại chữ cái tiếng Việt không dấu
      .replace(/\s+/g, ' ')             // Chuẩn hóa khoảng trắng
      .trim();
  }
  
  /**
   * Tính độ tương đồng giữa 2 chuỗi (0-1)
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number} - Điểm tương đồng
   */
  export function textSimilarity(str1, str2) {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);
    
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
  
    // Thuật toán Jaccard similarity
    const set1 = new Set(s1.split(/\s+/));
    const set2 = new Set(s2.split(/\s+/));
    
    const intersection = [...set1].filter(x => set2.has(x)).length;
    const union = new Set([...set1, ...set2]).size;
    
    return union > 0 ? intersection / union : 0;
  }
  
  /**
   * Tách từ khóa từ văn bản
   * @param {string} text 
   * @returns {string[]} - Mảng từ khóa
   */
  export function extractKeywords(text, minLength = 3) {
    const normalized = normalizeText(text);
    return [...new Set(
      normalized.split(/\s+/)
        .filter(word => word.length >= minLength)
    )];
  }
  
  /**
   * Tạo gợi ý từ dữ liệu FAQ (phiên bản ES Modules)
   * @param {object} faqData - Dữ liệu FAQ
   * @param {number} limit - Số lượng gợi ý
   * @returns {string[]} - Mảng câu hỏi gợi ý
   */
  export async function generateFAQSuggestions(faqData, limit = 5) {
    try {
      if (!faqData?.categories) return [];
      
      return faqData.categories
        .flatMap(c => 
          (c.questions || [])
            .filter(q => q.isFrequent !== false)
            .slice(0, limit)
            .map(q => q.question)
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Generate suggestions error:', error);
      return [];
    }
  }
  
  /**
   * Loại bỏ HTML tags và XSS prevention
   * @param {string} html 
   * @returns {string} - Text an toàn
   */
  export function sanitizeText(html) {
    return html.replace(/<[^>]*>?/gm, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/g, '');
  }
  
  /**
   * Rút gọn văn bản (dùng cho preview)
   * @param {string} text 
   * @param {number} maxLength 
   * @returns {string}
   */
  export function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }