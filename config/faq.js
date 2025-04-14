// config/faq.js
const faqModule = {
  metadata: {
    version: "2.3.0",
    lastUpdated: "2024-04-15",
    totalQuestions: 0
  },

  config: {
    brand: {
      name: "OpenLive/Monbase",
      defaultGreeting: "Chào anh/chị, em là NexusOne - trợ lý của {brand}. Rất vui được hỗ trợ anh/chị!"
    },
    platforms: {
      facebook: "https://www.facebook.com/profile.php?id=61573597316758",
      zalo: "https://zalo.me/g/knzata264",
      registration: "https://bcc.monbase.com/sign-up?ref=4b396e3c20b39ee0728ca6ed101e9498",
      phone: "0913831686"
    },
    aiIntegration: {
      chatGPT: {
        promptURL: "https://chat.openai.com/?prompt={userQuestion}",
        fallbackMessage: "Hiện không kết nối được với AI, vui lòng thử lại sau!"
      }
    }
  },

  structure: [
    {
      id: "general",
      title: "🔍 Tìm hiểu về OpenLive",
      questions: [
        {
          id: "about-openlive",
          question: "OpenLive là gì?",
          answer: "OpenLive Group là tập đoàn công nghệ tiên phong...",
          keywords: ["giới thiệu", "tổng quan"],
          related: ["products", "investment"],
          popularity: 0
        }
      ]
    },
    {
      id: "products",
      title: "🏀 Sản phẩm & Dịch vụ",
      questions: [
        {
          id: "main-products",
          question: "OpenLive có những sản phẩm chính nào?",
          answer: "Các sản phẩm chủ lực của chúng tôi bao gồm...",
          keywords: ["dịch vụ", "offerings"],
          related: ["investment-process"],
          popularity: 0
        }
      ]
    },
    {
      id: "investment",
      title: "💰 Đầu tư với OpenLive",
      questions: [
        {
          id: "investment-process",
          question: "Quy trình đầu tư như thế nào?",
          answer: "3 bước đơn giản để bắt đầu đầu tư...",
          keywords: ["cách đầu tư", "lợi nhuận"],
          related: ["main-products"],
          popularity: 0
        }
      ]
    }
  ],

  getCategories(platform = 'default') {
    this._updateMetadata();
    return this.structure.map(category => ({
      id: category.id,
      title: category.title,
      questionCount: category.questions.length,
      platformFilter: platform
    }));
  },

  getQuestions(categoryId, platform = 'default', skip = 0, limit = 50) {
    const category = this.structure.find(c => c.id === categoryId);
    if (!category) throw new Error("Category not found");

    return category.questions
      .slice(skip, skip + limit)
      .map(q => ({
        ...q,
        _links: this._generateLinks(q.id, platform)
      }));
  },

  search(query, platform = 'default', options = {}) {
    const {
      threshold = 0.25,
      limit = 5,
      searchFields = ['question', 'answer', 'keywords']
    } = options;

    const results = [];
    const cleanQuery = query.toLowerCase().trim();

    this.structure.forEach(category => {
      category.questions.forEach(question => {
        let score = 0;

        if (searchFields.includes('question') &&
            question.question.toLowerCase().includes(cleanQuery)) {
          score += 0.4;
        }

        if (searchFields.includes('answer') &&
            question.answer.toLowerCase().includes(cleanQuery)) {
          score += 0.3;
        }

        if (searchFields.includes('keywords') &&
            question.keywords.some(kw => kw.toLowerCase() === cleanQuery)) {
          score += 0.3;
        }

        if (score >= threshold) {
          results.push({
            ...question,
            score,
            category: category.title,
            _links: this._generateLinks(question.id, platform)
          });
        }
      });
    });

    return results
      .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
      .slice(0, limit);
  },

  getQuestionDetail(questionId, platform = 'default') {
    for (const category of this.structure) {
      const question = category.questions.find(q => q.id === questionId);
      if (question) {
        question.popularity++;
        return {
          ...question,
          category: {
            id: category.id,
            title: category.title
          },
          _links: this._generateLinks(questionId, platform)
        };
      }
    }
    throw new Error("Question not found");
  },

  _updateMetadata() {
    this.metadata.totalQuestions = this.structure.reduce(
      (acc, curr) => acc + curr.questions.length, 0
    );
    this.metadata.lastUpdated = new Date().toISOString();
  },

  _generateLinks(questionId, platform) {
    return {
      self: `${this.config.platforms[platform]}/faq/${questionId}`,
      related: this.config.platforms[platform] + '/faq/related/' + questionId
    };
  },

  analytics: {
    googleSheetID: "YOUR_SHEET_ID",
    trackInteraction(interactionData) {
      // Implementation for Google Sheets integration
    }
  }
};

faqModule._updateMetadata();

// ✅ Export default để dùng được với `import faqModule from './faq.js'`
export default faqModule;
