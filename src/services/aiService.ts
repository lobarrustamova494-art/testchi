import { apiService } from './api'

export interface ImageAnalysisResult {
  extractedText: string
  confidence: number
  language: string
  suggestions: string[]
  errors?: string[]
}

export interface TextAnalysisResult {
  improvedText: string
  suggestions: string[]
  grammar: string[]
  style: string[]
}

export interface OMRAnalysisResult {
  extractedAnswers: string[]
  correctAnswers: number
  wrongAnswers: number
  blankAnswers: number
  totalScore: number
  confidence: number
  suspiciousAnswers?: number
  matchesExpectedPattern?: boolean
  humanAnalysisScore?: number
  detailedResults: Array<{
    questionNumber: number
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
    score: number
    isSuspicious?: boolean
  }>
}

export interface QuestionAnalysisResult {
  analysis: string
  difficulty: 'easy' | 'medium' | 'hard'
  suggestions: string[]
  improvedQuestions: string[]
}

export interface AIStatus {
  available: boolean
  provider: string
  models: string[]
  features: string[]
}

export class AIService {
  /**
   * Rasmni base64 formatiga o'tkazish
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Return the full data URL (we'll extract base64 part in other methods)
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Rasmni tahlil qilish
   */
  static async analyzeImage(
    image: File | string, 
    prompt?: string
  ): Promise<ImageAnalysisResult> {
    try {
      let base64Image: string

      if (typeof image === 'string') {
        // If it's a data URL, extract just the base64 part
        if (image.startsWith('data:')) {
          base64Image = image.split(',')[1]
        } else {
          base64Image = image
        }
      } else {
        const fullDataUrl = await this.fileToBase64(image)
        // Extract base64 part from data URL
        base64Image = fullDataUrl.split(',')[1]
      }

      const response = await apiService.request<ImageAnalysisResult>('/ai/analyze-image', {
        method: 'POST',
        body: JSON.stringify({
          image: base64Image,
          prompt
        })
      })

      return response.data || {} as ImageAnalysisResult
    } catch (error) {
      console.error('Rasm tahlil xatosi:', error)
      throw new Error('Rasmni tahlil qilishda xatolik yuz berdi')
    }
  }

  /**
   * OMR varaqni tahlil qilish va natijalarni hisoblash
   */
  static async analyzeOMRSheet(
    image: File | string,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ): Promise<OMRAnalysisResult> {
    try {
      console.log('=== FRONTEND AI SERVICE DEBUG ===')
      console.log('Image type:', typeof image)
      console.log('Image length/size:', typeof image === 'string' ? image.length : image.size)
      console.log('Answer key:', answerKey)
      console.log('Answer key type:', Array.isArray(answerKey))
      console.log('Answer key length:', answerKey?.length)
      console.log('Scoring:', scoring)
      console.log('Scoring type:', typeof scoring)
      
      // Validate inputs
      if (!answerKey || !Array.isArray(answerKey)) {
        throw new Error('Answer key array formatida bo\'lishi kerak')
      }
      
      if (answerKey.length === 0) {
        throw new Error('Answer key bo\'sh bo\'lmasligi kerak')
      }
      
      if (!scoring || typeof scoring !== 'object') {
        throw new Error('Scoring obyekt formatida bo\'lishi kerak')
      }
      
      if (typeof scoring.correct !== 'number' || typeof scoring.wrong !== 'number' || typeof scoring.blank !== 'number') {
        throw new Error('Scoring qiymatlari raqam bo\'lishi kerak')
      }
      
      let base64Image: string

      if (typeof image === 'string') {
        // If it's a data URL, extract just the base64 part
        if (image.startsWith('data:')) {
          base64Image = image.split(',')[1]
        } else {
          base64Image = image
        }
      } else {
        const fullDataUrl = await this.fileToBase64(image)
        // Extract base64 part from data URL
        base64Image = fullDataUrl.split(',')[1]
      }

      // Validate base64 format
      if (!base64Image || base64Image.length < 100) {
        throw new Error('Base64 rasm ma\'lumotlari noto\'g\'ri yoki juda qisqa')
      }

      console.log('=== SENDING TO BACKEND ===')
      console.log('Base64 image length:', base64Image.length)
      console.log('Answer key type:', Array.isArray(answerKey))
      console.log('Answer key valid:', answerKey && answerKey.length > 0)
      console.log('Scoring valid:', scoring && typeof scoring.correct === 'number')

      // Ensure answerKey is properly formatted
      const normalizedAnswerKey = answerKey.map(answer => {
        if (!answer || answer.trim() === '') return ''
        return answer.toString().trim().toUpperCase()
      })

      // Ensure scoring has proper number values
      const normalizedScoring = {
        correct: Number(scoring.correct) || 1,
        wrong: Number(scoring.wrong) || 0,
        blank: Number(scoring.blank) || 0
      }

      const requestBody = {
        image: base64Image,
        answerKey: normalizedAnswerKey,
        scoring: normalizedScoring
      }

      console.log('Request body structure:', {
        image: `[base64 string of ${base64Image.length} chars]`,
        answerKey: normalizedAnswerKey,
        scoring: normalizedScoring
      })

      const response = await apiService.request<OMRAnalysisResult>('/ai/analyze-omr', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      return response.data || {} as OMRAnalysisResult
    } catch (error) {
      console.error('OMR tahlil xatosi:', error)
      throw new Error('Test varaqni tahlil qilishda xatolik yuz berdi')
    }
  }

  /**
   * Matnni tahlil qilish va yaxshilash
   */
  static async analyzeText(
    text: string, 
    context?: string
  ): Promise<TextAnalysisResult> {
    try {
      const response = await apiService.request<TextAnalysisResult>('/ai/analyze-text', {
        method: 'POST',
        body: JSON.stringify({
          text,
          context
        })
      })

      return response.data || {} as TextAnalysisResult
    } catch (error) {
      console.error('Matn tahlil xatosi:', error)
      throw new Error('Matnni tahlil qilishda xatolik yuz berdi')
    }
  }

  /**
   * Imtihon savollarini tahlil qilish
   */
  static async analyzeQuestions(
    questions: string[]
  ): Promise<QuestionAnalysisResult> {
    try {
      const response = await apiService.request<QuestionAnalysisResult>('/ai/analyze-questions', {
        method: 'POST',
        body: JSON.stringify({
          questions
        })
      })

      return response.data || {} as QuestionAnalysisResult
    } catch (error) {
      console.error('Savol tahlil xatosi:', error)
      throw new Error('Savollarni tahlil qilishda xatolik yuz berdi')
    }
  }

  /**
   * AI service holatini tekshirish
   */
  static async getStatus(): Promise<AIStatus> {
    try {
      const response = await apiService.request<{ data: AIStatus }>('/ai/status')
      return response.data?.data || {} as AIStatus
    } catch (error) {
      console.error('AI status xatosi:', error)
      throw new Error('AI service holatini tekshirishda xatolik yuz berdi')
    }
  }

  /**
   * Rasm formatini tekshirish
   */
  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  /**
   * Rasm hajmini tekshirish (maksimal 10MB)
   */
  static isValidImageSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024 // 10MB
    return file.size <= maxSize
  }

  /**
   * Rasm validatsiyasi
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    if (!this.isValidImageFile(file)) {
      return {
        valid: false,
        error: 'Faqat JPEG, PNG va WebP formatdagi rasmlar qo\'llab-quvvatlanadi'
      }
    }

    if (!this.isValidImageSize(file)) {
      return {
        valid: false,
        error: 'Rasm hajmi 10MB dan oshmasligi kerak'
      }
    }

    return { valid: true }
  }
}