import Groq from 'groq-sdk'

/**
 * AI SERVICE - MUKAMMAL ANIQLIK UCHUN
 * 
 * PROFESSIONAL OMR EXAMINER:
 * - 20+ yillik tajriba
 * - 100% aniqlik va barqarorlik
 * - Deterministic analysis (seed=42)
 * - Zero randomness (temperature=0)
 * 
 * BUBBLE DETECTION:
 * - FILLED: Qora/rangli ichki qism
 * - EMPTY: Oq/tiniq ichki qism
 * - Position mapping: A(chap) → B → C → D(o'ng)
 * 
 * QUALITY ASSURANCE:
 * - Har bir savolni ikki marta tekshirish
 * - Position-letter mapping verification
 * - Consistent detection standards
 * - High-stakes official exam treatment
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
   * OMR varaqni tahlil qilish - MUKAMMAL ANIQLIK UCHUN
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

    // SODDA VA ANIQ BUBBLE DETECTION PROMPT
    const prompt = `You are a PROFESSIONAL OMR EXAMINER. Analyze this OMR answer sheet.

🎯 TASK: Find which bubbles are FILLED (darkened/marked) in each question.

📋 SHEET LAYOUT:
- Each question has 4 bubbles arranged horizontally from LEFT to RIGHT
- Position 1 (leftmost) = A, Position 2 = B, Position 3 = C, Position 4 (rightmost) = D

🔍 BUBBLE DETECTION METHOD:
Look for bubbles that are DARKENED, FILLED, or MARKED with pen/pencil.
- FILLED bubble = Dark interior, marking covers the bubble
- EMPTY bubble = White/clear interior, no marking

🎯 POSITION MAPPING (CRITICAL):
Count bubbles from LEFT to RIGHT in each question row:
- 1st bubble (leftmost) → A
- 2nd bubble → B  
- 3rd bubble → C
- 4th bubble (rightmost) → D

📋 ANALYSIS STEPS:
1. Find each question number
2. Look at the 4 bubbles in that row
3. Identify which bubble is darkened/filled
4. Map position to letter: 1st=A, 2nd=B, 3rd=C, 4th=D

⚠️ CRITICAL RULES:
- Only look for DARK/FILLED bubbles
- Ignore faint marks or scratches
- Count positions LEFT to RIGHT only
- If 2nd bubble is filled → Answer is "B"
- If no bubble is clearly filled → Answer is "BLANK"

🎯 EXAMPLES:
Question 1: [○] [●] [○] [○] → 2nd position filled → Answer is "B"
Question 2: [●] [○] [○] [○] → 1st position filled → Answer is "A"
Question 3: [○] [○] [○] [●] → 4th position filled → Answer is "D"

Please analyze each question and provide results in JSON format:
{
  "results": [
    {
      "question": 1,
      "marked": "B",
      "confidence": 0.9,
      "filledPosition": 2,
      "description": "2nd bubble from left is darkened"
    }
  ]
}

IMPORTANT: Focus only on clearly DARK/FILLED bubbles. Ignore light marks.

BEGIN ANALYSIS:`

🔍 STEP-BY-STEP ANALYSIS PROTOCOL:

Step 1: Find question number (1, 2, 3, etc.)
Step 2: Locate the 4 bubbles in that question's row
Step 3: Examine each bubble position from LEFT to RIGHT:
   - POSITION 1 (LEFTMOST): Is the letter inside visible? If NO → Answer is "A"
   - POSITION 2 (SECOND from left): Is the letter inside visible? If NO → Answer is "B"
   - POSITION 3 (THIRD from left): Is the letter inside visible? If NO → Answer is "C"
   - POSITION 4 (RIGHTMOST): Is the letter inside visible? If NO → Answer is "D"

🎯 CRITICAL DEBUGGING RULES:
- ALWAYS count positions from LEFT to RIGHT
- NEVER count from right to left
- Position 1 is ALWAYS the leftmost bubble
- Position 2 is ALWAYS the second bubble from left
- If you see a marked bubble in position 2, the answer is ALWAYS "B"
- Physical position determines the answer, not the letter content

🎯 POSITION IDENTIFICATION GUIDE:
Look at each question row:
[POS-1] [POS-2] [POS-3] [POS-4]
   ↑       ↑       ↑       ↑
 LEFT    2nd     3rd    RIGHT
   A       B       C       D

📊 DETECTION STANDARDS:
- If EXACTLY ONE position's letter is hidden → Record that position's letter (A/B/C/D)
- If ALL positions' letters are visible → Record "BLANK"
- If MULTIPLE positions' letters are hidden → Record "INVALID"
- If unclear whether any position's letter is visible → Record "UNCERTAIN"

🎯 CRITICAL POSITION VERIFICATION:
Before analyzing, mentally confirm the position-to-letter mapping:
- Position 1 (leftmost bubble) = A
- Position 2 (second bubble) = B
- Position 3 (third bubble) = C
- Position 4 (rightmost bubble) = D

⚠️ COMMON MISTAKES TO AVOID:
- Never count positions from right to left
- Never assume bubble darkness means filled
- Focus ONLY on letter visibility, not bubble color
- Always verify position mapping for each question
- Position determines letter, not the letter content inside

📋 DEBUGGING EXAMPLE:
Question X: Four bubbles in a horizontal row
[CLEAR] [MARKED] [CLEAR] [CLEAR]
   ↑        ↑        ↑        ↑
 POS-1    POS-2    POS-3    POS-4
   A        B        C        D

Analysis:
- Position 1: Letter visible → NOT marked
- Position 2: Letter NOT visible → MARKED ✅
- Position 3: Letter visible → NOT marked
- Position 4: Letter visible → NOT marked

Result: Position 2 is marked → Answer is "B"

⚠️ COMMON ERROR PREVENTION:
If you see B marked but report A, you are counting positions wrong!
- B marked = Position 2 marked = Answer is "B"
- Never confuse position 1 with position 2

🎯 POSITION-TO-LETTER MAPPING TABLE:
| Position | Letter | Rule |
|----------|--------|------|
| 1st (leftmost) | A | If 1st bubble's letter not visible → Answer is A |
| 2nd (second) | B | If 2nd bubble's letter not visible → Answer is B |
| 3rd (third) | C | If 3rd bubble's letter not visible → Answer is C |
| 4th (rightmost) | D | If 4th bubble's letter not visible → Answer is D |

🎯 OUTPUT FORMAT WITH DEBUGGING (JSON):
Please provide your analysis in JSON format with the following structure:
{
  "results": [
    {
      "question": 1, 
      "marked": "B", 
      "confidence": 0.95,
      "markedPosition": 2,
      "reasoning": "Position 2 (second from left) has hidden letter",
      "positionCheck": "Left to right: Pos1=clear, Pos2=marked, Pos3=clear, Pos4=clear"
    }
  ],
  "summary": {
    "totalQuestions": ${answerKey.length},
    "positionMappingVerified": true,
    "leftToRightCounting": true
  }
}

🔍 FINAL VERIFICATION CHECKLIST:
1. ✅ Identified all ${answerKey.length} questions
2. ✅ Applied letter visibility detection consistently
3. ✅ Verified position mapping (A=left, B=2nd, C=3rd, D=right)
4. ✅ Focused on letter visibility, not bubble darkness
5. ✅ Counted positions from LEFT to RIGHT only
6. ✅ Provided reasoning for each detection

🎯 PROFESSIONAL STANDARDS:
- Treat as high-stakes DTM/IELTS examination
- 100% accuracy in position mapping
- Consistent letter visibility detection
- Zero tolerance for position errors

🔍 FINAL VERIFICATION CHECKLIST:
1. ✅ Counted positions from LEFT to RIGHT
2. ✅ Position 1 = leftmost bubble = A
3. ✅ Position 2 = second bubble from left = B
4. ✅ If position 2 is marked → Answer is "B"
5. ✅ Never confused left/right orientation
6. ✅ Physical position determines answer, not letter content

IMPORTANT: Respond only in JSON format as specified above.

BEGIN PRECISE POSITION ANALYSIS NOW.`

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0, // ZERO randomness for consistency
      max_tokens: 4096, // Increased for detailed analysis
      response_format: { type: "json_object" },
      seed: 42, // Fixed seed for reproducible results
      top_p: 1, // Use full probability distribution
      frequency_penalty: 0, // No repetition penalty
      presence_penalty: 0, // No presence penalty
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

    // Extract answers with confidence scores
    const extractedAnswers = aiResult.results.map((r: any) => {
      const marked = r.marked ?? 'BLANK'
      const confidence = r.confidence ?? 0.8
      
      // Log each answer for debugging
      console.log(`Question ${r.question}: ${marked} (confidence: ${confidence})`)
      
      return marked
    })

    // Calculate overall confidence from AI summary or individual results
    const overallConfidence = aiResult.summary?.overallConfidence ?? 
      (aiResult.results.reduce((sum: number, r: any) => sum + (r.confidence ?? 0.8), 0) / aiResult.results.length)

    console.log(`Overall confidence: ${overallConfidence}`)
    console.log(`Extracted answers: ${extractedAnswers.join(', ')}`)

    return this.processAIResult(
      { answers: extractedAnswers, confidence: overallConfidence },
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