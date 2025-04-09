// File: handlers/default.js

/**
 * Xử lý dữ liệu từ platform không xác định
 * @param {Object} data - Dữ liệu đầu vào từ webhook hoặc request
 * @returns {Object} - Phản hồi mẫu
 */
export async function process(data) {
    return {
      reply: `🤖 Xin chào! Hiện tại bot chưa hỗ trợ nền tảng này.`,
      originalData: data,
      status: 'unsupported_platform'
    };
  }
  
  /**
   * Định dạng phản hồi theo chuẩn text đơn giản
   * @param {Object} response - Phản hồi từ process()
   * @returns {Object} - Phản hồi được chuẩn hóa
   */
  export function formatResponse(response) {
    return {
      text: response.reply || 'OK'
    };
  }
  