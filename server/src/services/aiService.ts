import Groq from 'groq-sdk'

/**
 * AI SERVICE - READ_EXAM.MD GA ASOSLANGAN
 * 
 * ASOSIY QOIDALAR:
 * 1. Rasmiy imtihon tekshiruvchisi kabi ishlash
 * 2. Faqat to'ldirilgan aylanalarni o'qish
 * 3. Taxmin qilmaslik, aniq ko'ringanini aytish
 * 4. DTM uslubidagi layout (A, B, C, D)
 * 
 * BUBBLE DETECTION:
 * - FILLED: Aylana ichki qismi qora/to'ldirilgan
 * - BLANK: Hech qaysi aylana to'ldirilmagan
 * - INVALID: Bir nechta aylana to'ldirilgan
 * - UNCERTAIN: Noaniq belgilash
 * 
 * MODELS:
 * - Vision: meta-llama/llama-4-scout-17b-16e-instruct
 * - Text: llama-3.1-8b-instant
 */

let groq: Groq | null = null

// Lazy initialization of Groq client
function getGroqClient(): Groq {
  if (!groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('Groq API key sozlanmagan. Iltimos, GROQ_API_KEY environment variable ni qo\'shing.')
    }
    
    console.log('Creating Groq client...')
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
    console.log('Groq client created successfully')
  }
  return groq
}

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
   * Rasmni tahlil qilish - OPTIMIZATSIYA QILINGAN
   */
  static async analyzeImage(imageBase64: string, prompt?: string): Promise<ImageAnalysisResult> {
    const groq = getGroqClient()

    try {
      // OPTIMIZATSIYA: Qisqa prompt
      const defaultPrompt = prompt || `Rasmdagi matnni ajratib oling. JSON format: {"extractedText":"matn","confidence":0.9,"language":"uzbek","suggestions":[],"errors":[]}`

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: defaultPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Vision qo'llab-quvvatlaydigan model
        temperature: 0,
        max_tokens: 512
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AI javob bermadi')
      }

      try {
        const result = JSON.parse(response)
        return {
          extractedText: result.extractedText || '',
          confidence: result.confidence || 0.8,
          language: result.language || 'unknown',
          suggestions: result.suggestions || [],
          errors: result.errors || []
        }
      } catch (parseError) {
        return {
          extractedText: response,
          confidence: 0.8,
          language: 'unknown',
          suggestions: [],
          errors: []
        }
      }

    } catch (error) {
      console.error('Rasm tahlil xatosi:', error)
      throw new Error('Rasm tahlilida xatolik yuz berdi: ' + error)
    }
  }

  /**
   * OMR varaqni tahlil qilish - READ_EXAM.MD GA ASOSLANGAN
   */
  static async analyzeOMRSheet(
    imageBase64: string,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ): Promise<OMRAnalysisResult> {
    const groq = getGroqClient()

    if (!imageBase64 || !Array.isArray(answerKey) || answerKey.length === 0) {
      throw new Error('Invalid input data')
    }

    // READ_EXAM.MD ga asoslangan aniq prompt
    const prompt = `You are an official exam sheet verifier.

Context:
You are given an image of a completed OMR answer sheet with a fixed DTM-style layout.
The sheet contains numbered questions (1 to ${answerKey.length}).
Each question has exactly four options: A, B, C, D.
Each option is represented by a circular bubble.

Your task:
Read the answer sheet exactly like an official examiner.

Strict procedure:
1. Process questions sequentially from top to bottom.
2. For each question:
   - Inspect only the four bubbles belonging to that question.
   - Determine which bubbles are visibly filled.
3. A bubble is considered FILLED only if:
   - The interior of the circle is mostly dark.
   - Minor dots, scratches, or thin lines are ignored.
4. Apply strict rules:
   - If exactly ONE bubble is filled → that option is the marked answer.
   - If MORE THAN ONE bubble is filled → status = INVALID.
   - If NO bubble is clearly filled → status = BLANK.
   - If marking is messy or unclear → status = UNCERTAIN.
5. Do NOT guess.
6. Do NOT infer intention.
7. Treat this as a high-stakes official exam.

Output format (JSON only):
{
  "results": [
    { "question": 1, "marked": "B" },
    { "question": 2, "marked": "BLANK" },
    { "question": 3, "marked": "INVALID" }
  ]
}

Rules:
- Never correct mistakes.
- Never assume.
- Never explain reasoning.
- Be strict, consistent, and repeatable.
- Process ALL ${answerKey.length} questions.`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0, // Deterministic results
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty AI response')

    const aiResult = JSON.parse(raw)

    if (!Array.isArray(aiResult.results)) {
      throw new Error('Invalid AI result format')
    }

    const extractedAnswers = aiResult.results.map((r: any) =>
      r.marked ?? 'BLANK'
    )

    const confidence = 0.95 // Static confidence

    return this.processAIResult(
      { answers: extractedAnswers, confidence },
      answerKey,
      scoring
    )
  }

  /**
   * AI natijasini qayta ishlash
   */
  private static processAIResult(
    aiResult: { answers: string[]; confidence: number },
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ): OMRAnalysisResult {
    const detailedResults = []
    let correctAnswers = 0
    let wrongAnswers = 0
    let blankAnswers = 0
    let totalScore = 0

    for (let i = 0; i < answerKey.length; i++) {
      const studentAnswer = aiResult.answers[i] || 'BLANK'
      const correctAnswer = answerKey[i] || ''
      const isCorrect = studentAnswer === correctAnswer
      
      let score = 0
      if (studentAnswer === 'BLANK') {
        blankAnswers++
        score = scoring.blank
      } else if (isCorrect) {
        correctAnswers++
        score = scoring.correct
      } else {
        wrongAnswers++
        score = scoring.wrong
      }

      totalScore += score

      detailedResults.push({
        questionNumber: i + 1,
        studentAnswer,
        correctAnswer,
        isCorrect,
        score
      })
    }

    return {
      extractedAnswers: aiResult.answers,
      correctAnswers,
      wrongAnswers,
      blankAnswers,
      totalScore,
      confidence: aiResult.confidence,
      detailedResults
    }
  }

  /**
   * Matnni tahlil qilish - OPTIMIZATSIYA QILINGAN
   */
  static async analyzeText(text: string, context?: string): Promise<TextAnalysisResult> {
    const groq = getGroqClient()

    try {
      // OPTIMIZATSIYA: Qisqa prompt
      const prompt = `Matnni yaxshilang: "${text}". JSON: {"improvedText":"yaxshilangan","suggestions":[],"grammar":[],"style":[]}`

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant", // Yangi ishlaydigan model
        temperature: 0.1,
        max_tokens: 512
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AI javob bermadi')
      }

      try {
        const result = JSON.parse(response)
        return {
          improvedText: result.improvedText || text,
          suggestions: result.suggestions || [],
          grammar: result.grammar || [],
          style: result.style || []
        }
      } catch (parseError) {
        return {
          improvedText: response,
          suggestions: [],
          grammar: [],
          style: []
        }
      }

    } catch (error) {
      console.error('Matn tahlil xatosi:', error)
      throw new Error('Matn tahlil qilishda xatolik yuz berdi: ' + error)
    }
  }

  /**
   * Savollarni tahlil qilish - OPTIMIZATSIYA QILINGAN
   */
  static async analyzeQuestions(questions: string[]): Promise<QuestionAnalysisResult> {
    const groq = getGroqClient()

    try {
      // OPTIMIZATSIYA: Qisqa prompt
      const prompt = `Savollarni tahlil qiling: ${questions.slice(0, 3).join('; ')}... JSON: {"analysis":"tahlil","difficulty":"medium","suggestions":[],"improvedQuestions":[]}`

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant", // Yangi ishlaydigan model
        temperature: 0.1,
        max_tokens: 512
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AI javob bermadi')
      }

      try {
        const result = JSON.parse(response)
        return {
          analysis: result.analysis || 'Tahlil mavjud emas',
          difficulty: result.difficulty || 'medium',
          suggestions: result.suggestions || [],
          improvedQuestions: result.improvedQuestions || questions
        }
      } catch (parseError) {
        return {
          analysis: response,
          difficulty: 'medium',
          suggestions: [],
          improvedQuestions: questions
        }
      }

    } catch (error) {
      console.error('Savol tahlil xatosi:', error)
      throw new Error('Savol tahlil qilishda xatolik yuz berdi: ' + error)
    }
  }

  /**
   * AI xizmatining holatini tekshirish - OPTIMIZATSIYA QILINGAN
   */
  static async getStatus(): Promise<AIStatus> {
    try {
      // OPTIMIZATSIYA: Oddiy test so'rovi
      const groq = getGroqClient()
      
      const testCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Hi" }],
        model: "llama-3.1-8b-instant",
        max_tokens: 5
      })

      return {
        available: !!testCompletion,
        provider: 'Groq',
        models: [
          'llama-3.1-8b-instant', 
          'meta-llama/llama-4-scout-17b-16e-instruct'
        ],
        features: ['Image Analysis', 'OMR Analysis', 'Text Analysis', 'Question Analysis']
      }
    } catch (error) {
      return {
        available: false,
        provider: 'Groq',
        models: [],
        features: []
      }
    }
  }
}