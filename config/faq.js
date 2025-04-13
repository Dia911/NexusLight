// config/faq.js
const faqData = {
  categories: [
    {
      id: "general",
      title: "🔍 Tìm hiểu về OpenLive",
      questions: [
        {
          id: "what-is-openlive",
          question: "OpenLive là gì?",
          answer: "OpenLive Group là một tập đoàn công nghệ tiên phong...",
          keywords: ["giới thiệu", "tổng quan", "công ty"],
          related: ["business-license", "sub-companies"],
          lastUpdated: "2024-06-20"
        },
        {
          id: "business-license",
          question: "Giấy phép Đăng Ký Kinh Doanh của OpenLive tại Việt Nam?",
          answer: "OpenLive có đầy đủ giấy tờ pháp lý...",
          keywords: ["pháp lý", "giấy phép"],
          related: ["what-is-openlive"],
          lastUpdated: "2024-06-20"
        },
        {
          id: "sub-companies",
          question: "OpenLive có những công ty thành viên nào?",
          answer: "Hệ sinh thái OpenLive gồm 5 công ty chính...",
          keywords: ["công ty con", "hệ sinh thái"],
          related: ["what-is-openlive"],
          lastUpdated: "2024-06-20"
        }
      ]
    },
    // ... (other categories remain similar with added metadata)
  ],
  metadata: {
    lastUpdated: new Date().toISOString(),
    version: "2.0.0",
    systemInfo: {
      schemaVersion: 2,
      maxQuestions: 1000
    }
  }
};

// ================= UTILITY FUNCTIONS =================
const findQuestion = (id) => {
  for (const category of faqData.categories) {
    const question = category.questions.find(q => q.id === id);
    if (question) return { category, question };
  }
  return null;
};

// ================= CORE API =================
export const getCategories = () => {
  return faqData.categories.map(c => ({
    id: c.id,
    title: c.title,
    questionCount: c.questions.length
  }));
};

export const getQuestions = (categoryId, options = {}) => {
  const { skip = 0, limit = 50 } = options;
  const category = faqData.categories.find(c => c.id === categoryId);
  if (!category) return [];
  
  return category.questions
    .slice(skip, skip + limit)
    .map(q => ({
      id: q.id,
      question: q.question,
      lastUpdated: q.lastUpdated
    }));
};

export const getQuestionDetail = (id) => {
  const result = findQuestion(id);
  if (!result) return null;
  
  return {
    ...result.question,
    category: {
      id: result.category.id,
      title: result.category.title
    }
  };
};

// ================= SEARCH =================
export const search = (query, options = {}) => {
  const {
    threshold = 0.2,
    limit = 5,
    searchFields = ['question', 'answer', 'keywords']
  } = options;

  const lowerQuery = query.toLowerCase();
  const results = [];

  faqData.categories.forEach(category => {
    category.questions.forEach(question => {
      let score = 0;
      
      if (searchFields.includes('question') && 
          question.question.toLowerCase().includes(lowerQuery)) {
        score += 0.5;
      }
      
      if (searchFields.includes('answer') && 
          question.answer.toLowerCase().includes(lowerQuery)) {
        score += 0.3;
      }
      
      if (searchFields.includes('keywords') && 
          question.keywords?.some(kw => kw.toLowerCase().includes(lowerQuery))) {
        score += 0.2;
      }

      if (score >= threshold) {
        results.push({
          id: question.id,
          question: question.question,
          category: category.title,
          score,
          answerPreview: question.answer.substring(0, 100) + '...'
        });
      }
    });
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// ================= ADMIN FUNCTIONS =================
export const addQuestion = (categoryId, newQuestion) => {
  const category = faqData.categories.find(c => c.id === categoryId);
  if (!category) return { error: "Category not found" };

  const id = `${categoryId}-${Date.now()}`;
  const question = {
    id,
    ...newQuestion,
    lastUpdated: new Date().toISOString(),
    keywords: newQuestion.keywords || [],
    related: newQuestion.related || []
  };

  category.questions.push(question);
  updateMetadata();
  
  return { id, ...question };
};

export const updateQuestion = (id, updates) => {
  const result = findQuestion(id);
  if (!result) return { error: "Question not found" };

  Object.assign(result.question, {
    ...updates,
    lastUpdated: new Date().toISOString()
  });
  updateMetadata();
  
  return getQuestionDetail(id);
};

const updateMetadata = () => {
  faqData.metadata = {
    ...faqData.metadata,
    lastUpdated: new Date().toISOString(),
    version: incrementVersion(faqData.metadata.version)
  };
};

const incrementVersion = (version) => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

// ================= EXPORT =================
export default {
  // Data
  data: faqData,
  metadata: faqData.metadata,
  
  // Core functions
  getCategories,
  getQuestions,
  getQuestionDetail,
  search,
  
  // Admin functions
  addQuestion,
  updateQuestion,
  
  // Utility
  findQuestion
};