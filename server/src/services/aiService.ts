import Groq from 'groq-sdk'

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

export class AIService {
  /**
   * Rasmdan matnni ajratib olish va tahlil qilish
   */
  static async analyzeImage(imageBase64: string, prompt?: string): Promise<ImageAnalysisResult> {
    const groq = getGroqClient()

    try {
      const defaultPrompt = `
        Bu rasmni tahlil qiling va quyidagi vazifalarni bajaring:
        1. Rasmdagi barcha matnni aniq va to'liq ajratib oling
        2. Matnning tilini aniqlang (o'zbek, rus, ingliz)
        3. Agar bu imtihon varaqasi bo'lsa, savol va javoblarni ajrating
        4. Matn sifatini baholang (1-10 ball)
        5. Agar xatolar bo'lsa, ularni ko'rsating
        6. Matnni yaxshilash bo'yicha takliflar bering

        Javobni JSON formatida bering:
        {
          "extractedText": "ajratilgan matn",
          "confidence": 0.95,
          "language": "uzbek",
          "suggestions": ["taklif1", "taklif2"],
          "errors": ["xato1", "xato2"]
        }
      `

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt || defaultPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.1,
        max_tokens: 2048
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AI javob bermadi')
      }

      // JSON javobni parse qilish
      try {
        const result = JSON.parse(response)
        return {
          extractedText: result.extractedText || '',
          confidence: result.confidence || 0,
          language: result.language || 'unknown',
          suggestions: result.suggestions || [],
          errors: result.errors || []
        }
      } catch (parseError) {
        // Agar JSON parse bo'lmasa, oddiy matn sifatida qaytarish
        return {
          extractedText: response,
          confidence: 0.8,
          language: 'unknown',
          suggestions: ['AI javobini JSON formatida parse qilib bo\'lmadi'],
          errors: []
        }
      }

    } catch (error) {
      console.error('AI tahlil xatosi:', error)
      throw new Error(`AI tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * Matnni tahlil qilish va yaxshilash
   */
  static async analyzeText(text: string, context?: string): Promise<{
    improvedText: string
    suggestions: string[]
    grammar: string[]
    style: string[]
  }> {
    const groq = getGroqClient()

    try {
      const prompt = `
        Quyidagi matnni tahlil qiling va yaxshilang:
        
        Matn: "${text}"
        Kontekst: ${context || 'Umumiy matn'}
        
        Vazifalar:
        1. Grammatik xatolarni toping va tuzating
        2. Matn uslubini yaxshilang
        3. Aniqroq va tushunarli qiling
        4. O'zbek tiliga mos qiling
        
        Javobni JSON formatida bering:
        {
          "improvedText": "yaxshilangan matn",
          "suggestions": ["umumiy takliflar"],
          "grammar": ["grammatik tuzatishlar"],
          "style": ["uslub takliflari"]
        }
      `

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.2,
        max_tokens: 1024
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
      throw new Error(`Matn tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * OMR varaqni tahlil qilish va natijalarni hisoblash
   */
  static async analyzeOMRSheet(
    imageBase64: string, 
    answerKey: string[], 
    scoring: { correct: number; wrong: number; blank: number }
  ): Promise<{
    extractedAnswers: string[]
    correctAnswers: number
    wrongAnswers: number
    blankAnswers: number
    totalScore: number
    confidence: number
    detailedResults: Array<{
      questionNumber: number
      studentAnswer: string
      correctAnswer: string
      isCorrect: boolean
      score: number
    }>
  }> {
    const groq = getGroqClient()

    try {
      console.log('=== AI ANALYSIS STARTED ===')
      console.log('Answer Key:', answerKey)
      console.log('Total Questions:', answerKey.length)
      console.log('Scoring System:', scoring)

      const prompt = `You are a PERFECT OMR analysis AI that MUST achieve 100% accuracy on every single analysis.

CRITICAL MISSION: Analyze this OMR sheet with ABSOLUTE PRECISION like a human expert.

EXAM CONTEXT:
- Total Questions: ${answerKey.length}
- Valid Answer Options: A, B, C, D, E only
- Expected Answer Key: ${answerKey.map((ans, i) => `Q${i+1}:${ans || 'ANY'}`).join(', ')}

EXACT METHODOLOGY (NEVER DEVIATE):

STEP 1: LOCATE OMR GRID
- Find the grid with question numbers 1, 2, 3, etc.
- Each question has exactly 5 circles in a horizontal row
- Circles represent answers A, B, C, D, E from LEFT to RIGHT

STEP 2: POSITION MAPPING (FIXED RULE - NEVER CHANGE)
Position 1 (LEFTMOST) = A
Position 2 (Second from left) = B  
Position 3 (MIDDLE) = C
Position 4 (Fourth from left) = D
Position 5 (RIGHTMOST) = E

STEP 3: DETECTION CRITERIA (HUMAN EXPERT METHOD)
FILLED CIRCLE: Letter inside is NOT VISIBLE (covered by dark marking)
EMPTY CIRCLE: Letter inside is CLEARLY VISIBLE (not marked)

STEP 4: SYSTEMATIC ANALYSIS
For EACH question (1 through ${answerKey.length}):
1. Locate the question number
2. Examine the 5 circles from LEFT to RIGHT
3. Identify which circle has the letter HIDDEN/COVERED
4. Map that position to the corresponding letter (1=A, 2=B, 3=C, 4=D, 5=E)
5. If NO circles are filled, answer is "BLANK"

CONSISTENCY REQUIREMENTS:
- Use IDENTICAL visual criteria for every question
- Apply SAME detection logic to all questions
- Never change position mapping between questions
- Be generous with light pencil marks (if letter is hidden, it's filled)

VALIDATION RULES:
- Only return answers A, B, C, D, E, or BLANK
- Never return invalid answers like F, G, etc.
- If uncertain, prefer BLANK over invalid answer
- Double-check position mapping for each question

QUALITY CONTROL:
- Verify each position count (1=A, 2=B, 3=C, 4=D, 5=E)
- Ensure visual consistency across all questions
- Validate all answers are within valid options

OUTPUT FORMAT (JSON ONLY):
{
  "answers": ["A", "A", "A", "B", "B", "B", "BLANK", "BLANK", "BLANK", "BLANK"],
  "confidence": 1.0,
  "imageQuality": 0.95,
  "totalQuestions": ${answerKey.length},
  "notes": "Consistent human-expert level analysis with validation",
  "analysisMethod": "Deterministic position mapping with answer validation"
}

ABSOLUTE REQUIREMENTS:
1. You MUST produce the SAME result every time for the SAME image
2. All answers must be A, B, C, D, E, or BLANK only
3. Answer count must equal ${answerKey.length}
4. Use consistent visual criteria for all questions
5. Never guess - if uncertain, use BLANK`

      // Multiple attempts for consistency validation
      const attempts = []
      for (let i = 0; i < 3; i++) {
        console.log(`=== AI ATTEMPT ${i + 1} ===`)
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          temperature: 0.0, // Completely deterministic
          max_tokens: 2048,
          response_format: { type: "json_object" },
          seed: 12345 // Fixed seed for consistency
        })

        const response = completion.choices[0]?.message?.content
        if (response) {
          try {
            const parsed = JSON.parse(response)
            attempts.push(parsed)
            console.log(`Attempt ${i + 1} result:`, parsed.answers)
          } catch (e) {
            console.log(`Attempt ${i + 1} failed to parse JSON`)
          }
        }
      }

      // Validate consistency
      if (attempts.length >= 2) {
        const firstResult = JSON.stringify(attempts[0].answers)
        const allConsistent = attempts.every(attempt => 
          JSON.stringify(attempt.answers) === firstResult
        )
        
        console.log('=== CONSISTENCY CHECK ===')
        console.log('All attempts consistent:', allConsistent)
        attempts.forEach((attempt, i) => {
          console.log(`Attempt ${i + 1}:`, attempt.answers)
        })

        if (!allConsistent) {
          console.log('WARNING: Inconsistent results detected, using majority vote')
          
          // Use majority vote for each question
          const finalAnswers = []
          for (let q = 0; q < answerKey.length; q++) {
            const votes = attempts.map(a => a.answers[q] || 'BLANK')
            const voteCount: { [key: string]: number } = {}
            votes.forEach(vote => {
              voteCount[vote] = (voteCount[vote] || 0) + 1
            })
            
            // Find most common answer
            const mostCommon = Object.entries(voteCount)
              .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'BLANK'
            
            finalAnswers.push(mostCommon)
          }
          
          console.log('Final answers (majority vote):', finalAnswers)
          
          // Use the corrected result
          const aiResult = {
            answers: finalAnswers,
            confidence: 0.8, // Lower confidence due to inconsistency
            imageQuality: 0.9,
            totalQuestions: answerKey.length,
            notes: 'Majority vote used due to initial inconsistency'
          }
          
          return this.processAIResult(aiResult, answerKey, scoring)
        }
      }

      // Use the first successful attempt
      const aiResult = attempts[0] || {
        answers: Array(answerKey.length).fill('BLANK'),
        confidence: 0.5,
        imageQuality: 0.5,
        totalQuestions: answerKey.length,
        notes: 'Fallback result - AI analysis failed'
      }

      
      console.log('=== FINAL AI RESULT ===')
      console.log('AI Answers:', aiResult.answers)
      console.log('Confidence:', aiResult.confidence)
      
      return this.processAIResult(aiResult, answerKey, scoring)

    } catch (error) {
      console.error('OMR tahlil xatosi:', error)
      throw new Error(`OMR tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }

  /**
   * AI natijasini qayta ishlash va hisoblash
   */
  private static processAIResult(
    aiResult: any,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ) {
    const extractedAnswers = aiResult.answers || []
    const confidence = aiResult.confidence || 0.8

    console.log('=== PROCESSING AI RESULT ===')
    console.log('Extracted answers:', extractedAnswers)
    console.log('Answer key:', answerKey)

    // Answer key validation
    if (!answerKey || answerKey.length === 0) {
      throw new Error('Answer key mavjud emas yoki bo\'sh')
    }

    if (extractedAnswers.length !== answerKey.length) {
      console.warn(`Question count mismatch: AI extracted ${extractedAnswers.length}, expected ${answerKey.length}`)
    }

    // Valid options
    const validOptions = ['A', 'B', 'C', 'D', 'E']

    // Javoblarni hisoblash
    let correctAnswers = 0
    let wrongAnswers = 0
    let blankAnswers = 0
    let totalScore = 0
    let suspiciousAnswers = 0

    const detailedResults = extractedAnswers.map((studentAnswer: string, index: number) => {
      const questionNumber = index + 1
      const correctAnswer = answerKey[index] || ''
      
      let isCorrect = false
      let score = 0
      let isSuspicious = false

      // Normalize student answer
      const normalizedStudentAnswer = (studentAnswer || '').toString().toUpperCase().trim()
      
      // Validate student answer
      if (normalizedStudentAnswer && 
          normalizedStudentAnswer !== 'BLANK' && 
          normalizedStudentAnswer !== 'UNCLEAR' &&
          !validOptions.includes(normalizedStudentAnswer)) {
        console.warn(`Q${questionNumber}: Invalid answer detected: "${normalizedStudentAnswer}"`)
        isSuspicious = true
        suspiciousAnswers++
      }

      // Normalize correct answer
      const normalizedCorrectAnswer = (correctAnswer || '').toString().toUpperCase().trim()

      if (normalizedStudentAnswer === 'BLANK' || normalizedStudentAnswer === '') {
        blankAnswers++
        score = scoring.blank
        console.log(`Q${questionNumber}: BLANK (score: ${score})`)
      } else if (normalizedStudentAnswer === 'UNCLEAR' || isSuspicious) {
        wrongAnswers++
        score = scoring.wrong
        console.log(`Q${questionNumber}: UNCLEAR/SUSPICIOUS -> WRONG (score: ${score})`)
      } else {
        // Multiple correct answers support
        const correctOptions = normalizedCorrectAnswer.split(',').map(a => a.trim()).filter(a => a)
        const isAnswerCorrect = correctOptions.includes(normalizedStudentAnswer)
        
        if (isAnswerCorrect) {
          correctAnswers++
          isCorrect = true
          score = scoring.correct
          console.log(`Q${questionNumber}: ${normalizedStudentAnswer} ∈ [${correctOptions.join(',')}] -> CORRECT (score: ${score})`)
        } else {
          wrongAnswers++
          score = scoring.wrong
          console.log(`Q${questionNumber}: ${normalizedStudentAnswer} ∉ [${correctOptions.join(',')}] -> WRONG (score: ${score})`)
        }
      }

      totalScore += score

      return {
        questionNumber,
        studentAnswer: normalizedStudentAnswer === 'BLANK' ? '' : normalizedStudentAnswer,
        correctAnswer: normalizedCorrectAnswer,
        isCorrect,
        score,
        isSuspicious
      }
    })

    console.log('=== FINAL SCORING ===')
    console.log(`Correct: ${correctAnswers}, Wrong: ${wrongAnswers}, Blank: ${blankAnswers}`)
    console.log(`Suspicious answers: ${suspiciousAnswers}`)
    console.log(`Total Score: ${totalScore}`)

    // Confidence adjustment based on suspicious answers
    let adjustedConfidence = confidence
    if (suspiciousAnswers > 0) {
      adjustedConfidence = Math.max(0.3, confidence - (suspiciousAnswers * 0.1))
      console.log(`Confidence adjusted due to ${suspiciousAnswers} suspicious answers: ${confidence} -> ${adjustedConfidence}`)
    }

    return {
      extractedAnswers,
      correctAnswers,
      wrongAnswers,
      blankAnswers,
      totalScore,
      confidence: adjustedConfidence,
      detailedResults,
      suspiciousAnswers
    }
  }

  /**
   * Imtihon savollarini tahlil qilish
   */
  static async analyzeExamQuestions(questions: string[]): Promise<{
    analysis: string
    difficulty: 'easy' | 'medium' | 'hard'
    suggestions: string[]
    improvedQuestions: string[]
  }> {
    const groq = getGroqClient()

    try {
      const prompt = `Quyidagi imtihon savollarini tahlil qiling:
        
Savollar:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Vazifalar:
1. Savollar qiyinlik darajasini baholang
2. Savollar sifatini tahlil qiling
3. Yaxshilash takliflarini bering
4. Savollarni yaxshilang

Javobni JSON formatida bering:
{
  "analysis": "umumiy tahlil",
  "difficulty": "medium",
  "suggestions": ["takliflar"],
  "improvedQuestions": ["yaxshilangan savollar"]
}`

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-70b-versatile",
        temperature: 0.3,
        max_tokens: 2048
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
      throw new Error(`Savol tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
    }
  }
}