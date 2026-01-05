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
      const prompt = `You are a computer vision AI specialized in OMR (Optical Mark Recognition) analysis.

Task: Analyze this OMR answer sheet image and detect filled circles for each question with EXACT PRECISION.

CRITICAL: VISUAL ANALYSIS METHOD
Look at the image exactly like a human would:
1. Find each question row (numbered 1, 2, 3, etc.)
2. In each row, look at the 5 circles from LEFT to RIGHT
3. Identify which circles are FILLED (dark/black) vs EMPTY (white with visible letters)

EXACT VISUAL IDENTIFICATION:
- FILLED CIRCLE = Completely dark/black circle (letter inside is hidden)
- EMPTY CIRCLE = White circle with clearly visible letter (A, B, C, D, E)

POSITION MAPPING (LEFT TO RIGHT):
Position 1 (LEFTMOST) = A
Position 2 = B
Position 3 (MIDDLE) = C  
Position 4 = D
Position 5 (RIGHTMOST) = E

STEP-BY-STEP ANALYSIS FOR EACH QUESTION:
1. Look at question row
2. Scan circles from LEFT to RIGHT
3. Identify which circle is FILLED (dark/black)
4. Map that position to letter:
   - If 1st circle (leftmost) is filled → "A"
   - If 2nd circle is filled → "B"
   - If 3rd circle (middle) is filled → "C"
   - If 4th circle is filled → "D"
   - If 5th circle (rightmost) is filled → "E"
   - If NO circles are filled → "BLANK"

EXAMPLE ANALYSIS:
Question 1: [●] [○] [○] [○] [○]  → Answer: "A" (1st position filled)
Question 2: [○] [●] [○] [○] [○]  → Answer: "B" (2nd position filled)
Question 3: [○] [○] [○] [○] [○]  → Answer: "BLANK" (no position filled)

VISUAL DETECTION RULES:
✓ Dark/black filled circle = FILLED
✓ White circle with visible letter = EMPTY
✓ Only count completely filled circles
✓ Ignore partial marks or light shading

SCANNING INSTRUCTIONS:
1. Start from top question (Question 1)
2. For each question, look at 5 circles from LEFT to RIGHT
3. Identify the FILLED (dark) circle
4. Determine its position (1st, 2nd, 3rd, 4th, or 5th)
5. Map position to letter (1=A, 2=B, 3=C, 4=D, 5=E)
6. Move to next question

ACCURACY REQUIREMENTS:
- Be as precise as a human examining the image
- Look for clear visual differences between filled and empty circles
- Count positions exactly from LEFT to RIGHT
- Map positions to letters correctly

OUTPUT FORMAT (JSON only):
{
  "answers": ["A", "B", "C", "BLANK", "D", ...],
  "confidence": 0.95,
  "imageQuality": 0.9,
  "totalQuestions": 10,
  "notes": "Detected X marked answers out of Y questions"
}

CRITICAL: Analyze each circle visually like a human would - look for dark filled circles vs white empty circles, then map the position to the correct letter.`

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
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: "json_object" }
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('AI javob bermadi')
      }

      console.log('=== AI RESPONSE DEBUG ===')
      console.log('Raw AI response:', response)
      console.log('Response length:', response.length)
      console.log('First 200 chars:', response.substring(0, 200))

      // JSON javobni parse qilish
      let aiResult
      try {
        aiResult = JSON.parse(response)
        console.log('Successfully parsed JSON:', aiResult)
        
        // Check if AI couldn't find OMR sheet
        if (aiResult.answers && aiResult.answers.length === 0) {
          console.log('AI could not detect OMR sheet, creating default response...')
          aiResult = {
            answers: Array(answerKey.length).fill('BLANK'),
            confidence: 0.3,
            imageQuality: 0.5,
            totalQuestions: answerKey.length,
            notes: 'OMR varaq aniqlanmadi yoki rasm sifati yomon. Qayta suratga oling.'
          }
        }
      } catch (parseError) {
        console.log('JSON parse error:', parseError)
        console.log('Trying to extract JSON from response...')
        
        // Try to find JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            aiResult = JSON.parse(jsonMatch[0])
            console.log('Successfully extracted and parsed JSON:', aiResult)
          } catch (extractError) {
            console.log('Failed to parse extracted JSON:', extractError)
            
            // Fallback: Create a basic response structure
            console.log('Creating fallback response...')
            aiResult = {
              answers: Array(answerKey.length).fill('UNCLEAR'),
              confidence: 0.5,
              imageQuality: 0.5,
              totalQuestions: answerKey.length,
              notes: 'AI javobini parse qilib bo\'lmadi, fallback javob yaratildi'
            }
          }
        } else {
          console.log('No JSON found in response, creating fallback...')
          // Fallback: Create a basic response structure
          aiResult = {
            answers: Array(answerKey.length).fill('UNCLEAR'),
            confidence: 0.5,
            imageQuality: 0.5,
            totalQuestions: answerKey.length,
            notes: 'AI javobida JSON topilmadi, fallback javob yaratildi'
          }
        }
      }

      const extractedAnswers = aiResult.answers || []
      const confidence = aiResult.confidence || 0.8

      // Javoblarni hisoblash
      let correctAnswers = 0
      let wrongAnswers = 0
      let blankAnswers = 0
      let totalScore = 0

      const detailedResults = extractedAnswers.map((studentAnswer: string, index: number) => {
        const questionNumber = index + 1
        const correctAnswer = answerKey[index] || ''
        
        let isCorrect = false
        let score = 0

        if (studentAnswer === 'BLANK' || studentAnswer === '') {
          blankAnswers++
          score = scoring.blank
        } else if (studentAnswer === 'UNCLEAR') {
          wrongAnswers++
          score = scoring.wrong
        } else if (studentAnswer === correctAnswer) {
          correctAnswers++
          isCorrect = true
          score = scoring.correct
        } else {
          wrongAnswers++
          score = scoring.wrong
        }

        totalScore += score

        return {
          questionNumber,
          studentAnswer: studentAnswer === 'BLANK' ? '' : studentAnswer,
          correctAnswer,
          isCorrect,
          score
        }
      })

      return {
        extractedAnswers,
        correctAnswers,
        wrongAnswers,
        blankAnswers,
        totalScore,
        confidence,
        detailedResults
      }

    } catch (error) {
      console.error('OMR tahlil xatosi:', error)
      throw new Error(`OMR tahlil xatosi: ${error instanceof Error ? error.message : 'Noma\'lum xato'}`)
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