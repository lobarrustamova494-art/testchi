// OMR Processing utilities
// Bu haqiqiy OMR processing uchun mock implementation

export interface OMRResult {
  studentId: string
  answers: { [questionNumber: number]: string[] }
  confidence: number
  processingTime: number
}

export interface ProcessingOptions {
  totalQuestions: number
  answerOptions: string[]
  threshold?: number
}

// Test uchun realistik javoblar yaratish
export const generateRealisticAnswers = (
  totalQuestions: number,
  answerKey: string[],
  correctnessRate: number = 0.7 // 70% to'g'ri javob
): { [questionNumber: number]: string[] } => {
  const answers: { [questionNumber: number]: string[] } = {}
  const availableOptions = ['A', 'B', 'C', 'D']
  
  for (let i = 1; i <= totalQuestions; i++) {
    const correctAnswer = answerKey[i - 1]
    const randomValue = Math.random()
    
    if (randomValue < 0.05) {
      // 5% bo'sh javob
      answers[i] = []
    } else if (randomValue < correctnessRate) {
      // To'g'ri javob berish
      if (correctAnswer && correctAnswer.trim()) {
        const correctAnswers = correctAnswer.split(',').map(a => a.trim())
        answers[i] = correctAnswers
      } else {
        // Agar kalit javob bo'lmasa, tasodifiy javob
        answers[i] = [availableOptions[Math.floor(Math.random() * availableOptions.length)]]
      }
    } else {
      // Noto'g'ri javob berish
      const wrongOptions = availableOptions.filter(opt => {
        if (!correctAnswer) return true
        return !correctAnswer.split(',').map(a => a.trim().toUpperCase()).includes(opt)
      })
      
      if (wrongOptions.length > 0) {
        answers[i] = [wrongOptions[Math.floor(Math.random() * wrongOptions.length)]]
      } else {
        answers[i] = [availableOptions[Math.floor(Math.random() * availableOptions.length)]]
      }
    }
  }
  
  return answers
}

// Mock OMR processing function - haqiqiy skanerlash uchun
export const processOMRImage = async (
  _imageData: string, 
  options: ProcessingOptions,
  answerKey?: string[]
): Promise<OMRResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  // Mock student ID extraction
  const studentId = `STU${Math.floor(Math.random() * 9000) + 1000}`

  // Agar answer key mavjud bo'lsa, realistik javoblar yaratish
  let answers: { [questionNumber: number]: string[] }
  
  if (answerKey && answerKey.length > 0) {
    // 60-85% to'g'ri javob berish
    const correctnessRate = 0.6 + Math.random() * 0.25
    answers = generateRealisticAnswers(options.totalQuestions, answerKey, correctnessRate)
  } else {
    // Agar kalit javob bo'lmasa, tasodifiy javoblar
    answers = {}
    for (let i = 1; i <= options.totalQuestions; i++) {
      const randomValue = Math.random()
      
      if (randomValue < 0.05) {
        answers[i] = []
      } else if (randomValue < 0.02) {
        const answer1 = options.answerOptions[Math.floor(Math.random() * Math.min(4, options.answerOptions.length))]
        let answer2 = options.answerOptions[Math.floor(Math.random() * Math.min(4, options.answerOptions.length))]
        while (answer2 === answer1) {
          answer2 = options.answerOptions[Math.floor(Math.random() * Math.min(4, options.answerOptions.length))]
        }
        answers[i] = [answer1, answer2].sort()
      } else {
        const availableOptions = options.answerOptions.slice(0, 4)
        const randomAnswer = availableOptions[Math.floor(Math.random() * availableOptions.length)]
        answers[i] = [randomAnswer]
      }
    }
  }

  return {
    studentId,
    answers,
    confidence: 0.88 + Math.random() * 0.1, // 88-98% confidence
    processingTime: 2000 + Math.random() * 3000
  }
}

// Image preprocessing utilities
export const preprocessImage = (imageData: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(imageData)
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      
      // Draw original image
      ctx.drawImage(img, 0, 0)
      
      // Apply basic preprocessing (contrast, brightness)
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageDataObj.data
      
      // Simple contrast enhancement
      const contrast = 1.2
      const brightness = 10
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, contrast * data[i] + brightness))     // Red
        data[i + 1] = Math.min(255, Math.max(0, contrast * data[i + 1] + brightness)) // Green
        data[i + 2] = Math.min(255, Math.max(0, contrast * data[i + 2] + brightness)) // Blue
      }
      
      ctx.putImageData(imageDataObj, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    
    img.src = imageData
  })
}

// Validate OMR sheet structure
export const validateOMRSheet = (_imageData: string): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
}> => {
  return new Promise((resolve) => {
    // Mock validation (in real implementation, this would analyze the image)
    setTimeout(() => {
      const issues: string[] = []
      const suggestions: string[] = []
      
      // Random validation results for demo
      if (Math.random() < 0.1) {
        issues.push('Varaq qisman ko\'rinmoqda')
        suggestions.push('Varaqni to\'liq kadrga joylashtiring')
      }
      
      if (Math.random() < 0.15) {
        issues.push('Yorug\'lik yetarli emas')
        suggestions.push('Yaxshi yorug\'lik ostida suratga oling')
      }
      
      if (Math.random() < 0.05) {
        issues.push('Varaq egilgan yoki burilgan')
        suggestions.push('Varaqni tekis joylashtiring')
      }
      
      resolve({
        isValid: issues.length === 0,
        issues,
        suggestions
      })
    }, 1000)
  })
}

// Calculate score based on answer key
export const calculateScore = (
  studentAnswers: { [questionNumber: number]: string[] },
  answerKey: string[],
  scoring: { correct: number; wrong: number; blank: number }
): {
  score: number
  correctCount: number
  wrongCount: number
  blankCount: number
  details: { [questionNumber: number]: 'correct' | 'wrong' | 'blank' }
} => {
  console.log('=== BALL HISOBLASH BOSHLANDI ===')
  console.log('Student answers:', studentAnswers)
  console.log('Answer key:', answerKey)
  console.log('Scoring system:', scoring)
  
  let correctCount = 0
  let wrongCount = 0
  let blankCount = 0
  const details: { [questionNumber: number]: 'correct' | 'wrong' | 'blank' } = {}
  
  // Get total questions from answer key length or student answers
  const totalQuestions = Math.max(answerKey.length, Object.keys(studentAnswers).length)
  console.log('Total questions:', totalQuestions)
  
  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber++) {
    const studentAnswer = studentAnswers[questionNumber] || []
    const correctAnswerString = answerKey[questionNumber - 1] || ''
    
    console.log(`Savol ${questionNumber}:`, {
      studentAnswer,
      correctAnswerString,
      studentAnswerLength: studentAnswer.length
    })
    
    // Bo'sh javob tekshirish
    if (studentAnswer.length === 0) {
      blankCount++
      details[questionNumber] = 'blank'
      console.log(`  -> Bo'sh javob`)
      continue
    }
    
    // Agar javob kaliti bo'sh bo'lsa
    if (!correctAnswerString || correctAnswerString.trim() === '') {
      wrongCount++
      details[questionNumber] = 'wrong'
      console.log(`  -> Kalit javob yo'q, noto'g'ri deb belgilandi`)
      continue
    }
    
    // To'g'ri javoblarni parse qilish
    const correctAnswers = correctAnswerString
      .split(',')
      .map(a => a.trim().toUpperCase())
      .filter(a => a.length > 0)
    
    const studentAnswersUpper = studentAnswer.map(a => a.toUpperCase())
    
    console.log(`  -> Taqqoslash:`, {
      correctAnswers,
      studentAnswersUpper
    })
    
    // Javoblarni solishtirish
    const isCorrect = correctAnswers.length === studentAnswersUpper.length &&
      correctAnswers.every(answer => studentAnswersUpper.includes(answer)) &&
      studentAnswersUpper.every(answer => correctAnswers.includes(answer))
    
    if (isCorrect) {
      correctCount++
      details[questionNumber] = 'correct'
      console.log(`  -> To'g'ri javob!`)
    } else {
      wrongCount++
      details[questionNumber] = 'wrong'
      console.log(`  -> Noto'g'ri javob`)
    }
  }
  
  // Ball hisoblash
  const score = Math.max(0, 
    correctCount * scoring.correct + 
    wrongCount * scoring.wrong + 
    blankCount * scoring.blank
  )
  
  console.log('=== YAKUNIY NATIJA ===')
  console.log('Correct:', correctCount)
  console.log('Wrong:', wrongCount)
  console.log('Blank:', blankCount)
  console.log('Score:', score)
  
  return {
    score,
    correctCount,
    wrongCount,
    blankCount,
    details
  }
}