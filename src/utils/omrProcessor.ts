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

// Mock OMR processing function
export const processOMRImage = async (
  _imageData: string, 
  options: ProcessingOptions
): Promise<OMRResult> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

  // Mock student ID extraction (in real implementation, this would analyze the image)
  const studentId = `STU${Math.floor(Math.random() * 9000) + 1000}`

  // Mock answer extraction (in real implementation, this would process the image)
  const answers: { [questionNumber: number]: string[] } = {}
  
  for (let i = 1; i <= options.totalQuestions; i++) {
    // Randomly generate answers for demo
    const numAnswers = Math.random() < 0.1 ? 0 : Math.random() < 0.05 ? 2 : 1 // 10% blank, 5% multiple, 85% single
    
    if (numAnswers === 0) {
      answers[i] = []
    } else if (numAnswers === 1) {
      const randomAnswer = options.answerOptions[Math.floor(Math.random() * options.answerOptions.length)]
      answers[i] = [randomAnswer]
    } else {
      // Multiple answers
      const answer1 = options.answerOptions[Math.floor(Math.random() * options.answerOptions.length)]
      let answer2 = options.answerOptions[Math.floor(Math.random() * options.answerOptions.length)]
      while (answer2 === answer1) {
        answer2 = options.answerOptions[Math.floor(Math.random() * options.answerOptions.length)]
      }
      answers[i] = [answer1, answer2].sort()
    }
  }

  return {
    studentId,
    answers,
    confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
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
  
  // Get total questions from student answers
  const totalQuestions = Math.max(...Object.keys(studentAnswers).map(k => parseInt(k)), answerKey.length)
  console.log('Total questions:', totalQuestions)
  
  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber++) {
    const studentAnswer = studentAnswers[questionNumber] || []
    const correctAnswer = answerKey[questionNumber - 1]
    
    console.log(`Savol ${questionNumber}:`, {
      studentAnswer,
      correctAnswer,
      studentAnswerLength: studentAnswer.length
    })
    
    if (studentAnswer.length === 0) {
      blankCount++
      details[questionNumber] = 'blank'
      console.log(`  -> Bo'sh javob`)
    } else if (!correctAnswer) {
      // No answer key for this question, mark as wrong
      wrongCount++
      details[questionNumber] = 'wrong'
      console.log(`  -> Kalit javob yo'q, noto'g'ri deb belgilandi`)
    } else {
      // Parse correct answer (could be single answer or multiple answers separated by comma)
      const correctAnswers = correctAnswer.split(',').map(a => a.trim().toUpperCase())
      const studentAnswersUpper = studentAnswer.map(a => a.toUpperCase())
      
      console.log(`  -> Taqqoslash:`, {
        correctAnswers,
        studentAnswersUpper
      })
      
      // Check if student answers match correct answers
      const isCorrect = correctAnswers.length === studentAnswersUpper.length &&
        correctAnswers.every(answer => studentAnswersUpper.includes(answer))
      
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
  }
  
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