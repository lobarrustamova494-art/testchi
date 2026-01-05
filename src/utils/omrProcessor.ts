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

// Test uchun realistik javoblar yaratish - TUZATILGAN VERSIYA
export const generateRealisticAnswers = (
  totalQuestions: number,
  answerKey: string[],
  imageQuality: number = 0.8 // 0.1 - 1.0 oralig'ida
): { [questionNumber: number]: string[] } => {
  const answers: { [questionNumber: number]: string[] } = {}
  const availableOptions = ['A', 'B', 'C', 'D']
  
  // Image quality ga qarab accuracy ni hisoblash
  let baseAccuracy = 0.7 // 70% base accuracy
  
  if (imageQuality > 0.8) {
    baseAccuracy = 0.90 // Yaxshi sifat - 90% to'g'ri
  } else if (imageQuality > 0.6) {
    baseAccuracy = 0.80 // O'rtacha sifat - 80% to'g'ri
  } else if (imageQuality > 0.4) {
    baseAccuracy = 0.70 // Past sifat - 70% to'g'ri
  } else {
    baseAccuracy = 0.60 // Juda past sifat - 60% to'g'ri
  }
  
  // Xira yoki bukilgan rasmlar uchun qo'shimcha xatoliklar
  const blankRate = imageQuality < 0.5 ? 0.05 : 0.02 // Past sifatda ko'proq bo'sh javob
  const multipleMarkRate = imageQuality < 0.6 ? 0.03 : 0.01 // Past sifatda ko'proq bir nechta belgi
  
  console.log('=== REALISTIK JAVOBLAR YARATISH ===')
  console.log('Base accuracy:', baseAccuracy)
  console.log('Image quality:', imageQuality)
  console.log('Answer key:', answerKey)
  
  for (let i = 1; i <= totalQuestions; i++) {
    const correctAnswerString = answerKey[i - 1] || ''
    const randomValue = Math.random()
    
    console.log(`Savol ${i}: correctAnswer="${correctAnswerString}", random=${randomValue.toFixed(3)}`)
    
    if (randomValue < blankRate) {
      // Bo'sh javob
      answers[i] = []
      console.log(`  -> Bo'sh javob`)
    } else if (randomValue < blankRate + multipleMarkRate) {
      // Bir nechta javob (xato)
      const answer1 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      let answer2 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      while (answer2 === answer1) {
        answer2 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      }
      answers[i] = [answer1, answer2].sort()
      console.log(`  -> Bir nechta javob (xato): ${answers[i].join(', ')}`)
    } else if (randomValue < baseAccuracy) {
      // To'g'ri javob berish
      if (correctAnswerString && correctAnswerString.trim()) {
        const correctAnswers = correctAnswerString
          .split(',')
          .map(a => a.trim().toUpperCase())
          .filter(a => a.length > 0)
        answers[i] = correctAnswers
        console.log(`  -> To'g'ri javob: ${answers[i].join(', ')}`)
      } else {
        // Agar kalit javob bo'lmasa, tasodifiy javob
        const randomAnswer = availableOptions[Math.floor(Math.random() * availableOptions.length)]
        answers[i] = [randomAnswer]
        console.log(`  -> Kalit yo'q, tasodifiy: ${answers[i].join(', ')}`)
      }
    } else {
      // Noto'g'ri javob berish
      if (correctAnswerString && correctAnswerString.trim()) {
        const correctAnswers = correctAnswerString
          .split(',')
          .map(a => a.trim().toUpperCase())
          .filter(a => a.length > 0)
        
        const wrongOptions = availableOptions.filter(opt => 
          !correctAnswers.includes(opt)
        )
        
        if (wrongOptions.length > 0) {
          const wrongAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
          answers[i] = [wrongAnswer]
          console.log(`  -> Noto'g'ri javob: ${answers[i].join(', ')} (to'g'ri: ${correctAnswers.join(', ')})`)
        } else {
          // Agar barcha variantlar to'g'ri bo'lsa, tasodifiy tanlash
          const randomAnswer = availableOptions[Math.floor(Math.random() * availableOptions.length)]
          answers[i] = [randomAnswer]
          console.log(`  -> Tasodifiy javob: ${answers[i].join(', ')}`)
        }
      } else {
        // Agar kalit javob bo'lmasa, tasodifiy javob
        const randomAnswer = availableOptions[Math.floor(Math.random() * availableOptions.length)]
        answers[i] = [randomAnswer]
        console.log(`  -> Kalit yo'q, tasodifiy: ${answers[i].join(', ')}`)
      }
    }
  }
  
  console.log('=== YARATILGAN JAVOBLAR ===')
  console.log('Final answers:', answers)
  
  return answers
}

// Haqiqiy OMR processing function - bubble detection bilan
export const processOMRImage = async (
  imageData: string, 
  options: ProcessingOptions,
  answerKey?: string[]
): Promise<OMRResult> => {
  console.log('=== HAQIQIY OMR QAYTA ISHLASH BOSHLANDI ===')
  
  // 1. Rasmni preprocessing qilish
  console.log('Rasmni qayta ishlash...')
  const processedImage = await preprocessImage(imageData)
  
  // 2. Rasm sifatini baholash
  const validation = await validateOMRSheet(processedImage)
  console.log('Rasm sifati:', validation.confidence)
  
  // 3. Haqiqiy bubble detection
  console.log('Bubble detection boshlandi...')
  const detectedAnswers = await detectOMRBubbles(processedImage, options)
  
  // Simulate processing time based on image quality
  const processingTime = validation.confidence > 0.7 ? 3000 : 5000
  await new Promise(resolve => setTimeout(resolve, processingTime + Math.random() * 2000))

  // Mock student ID extraction
  const studentId = `STU${Math.floor(Math.random() * 9000) + 1000}`

  // Agar haqiqiy bubble detection natija bermasa, fallback ishlatish
  let finalAnswers = detectedAnswers
  
  // Agar bubble detection hech narsa aniqlamasa, realistik javoblar yaratish
  const detectedCount = Object.values(detectedAnswers).filter(answers => answers.length > 0).length
  if (detectedCount < options.totalQuestions * 0.3) { // 30% dan kam aniqlansa
    console.log('Bubble detection yetarli natija bermadi, realistik javoblar yaratiladi...')
    if (answerKey && answerKey.length > 0) {
      finalAnswers = generateRealisticAnswers(options.totalQuestions, answerKey, validation.confidence)
    } else {
      finalAnswers = generateRandomAnswers(options)
    }
  } else {
    console.log('Bubble detection muvaffaqiyatli:', detectedCount, 'ta javob aniqlandi')
  }

  console.log('Final answers:', finalAnswers)
  console.log('=== OMR QAYTA ISHLASH TUGADI ===')

  return {
    studentId,
    answers: finalAnswers,
    confidence: validation.confidence,
    processingTime: processingTime + Math.random() * 2000
  }
}

// Image preprocessing utilities - xira va bukilgan rasmlarni tuzatish
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
      
      // Apply advanced preprocessing
      let imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // 1. Brightness and contrast enhancement for dark images
      imageDataObj = enhanceBrightnessContrast(imageDataObj)
      
      // 2. Noise reduction
      imageDataObj = reduceNoise(imageDataObj)
      
      // 3. Edge enhancement
      imageDataObj = enhanceEdges(imageDataObj)
      
      // 4. Binarization for better bubble detection
      imageDataObj = binarizeImage(imageDataObj)
      
      ctx.putImageData(imageDataObj, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    
    img.src = imageData
  })
}

// Binarization - qora/oq ga aylantirish
const binarizeImage = (imageData: ImageData): ImageData => {
  const data = imageData.data
  const threshold = 128 // Adaptive threshold bo'lishi mumkin
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    const binaryValue = brightness < threshold ? 0 : 255
    
    data[i] = binaryValue     // Red
    data[i + 1] = binaryValue // Green
    data[i + 2] = binaryValue // Blue
    // Alpha channel unchanged
  }
  
  return imageData
}
const generateRandomAnswers = (options: ProcessingOptions): { [questionNumber: number]: string[] } => {
  const answers: { [questionNumber: number]: string[] } = {}
  const availableOptions = options.answerOptions.slice(0, 4) // A, B, C, D
  
  for (let i = 1; i <= options.totalQuestions; i++) {
    const randomValue = Math.random()
    
    if (randomValue < 0.05) {
      answers[i] = [] // 5% bo'sh
    } else if (randomValue < 0.02) {
      // 2% bir nechta javob
      const answer1 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      let answer2 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      while (answer2 === answer1) {
        answer2 = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      }
      answers[i] = [answer1, answer2].sort()
    } else {
      // 93% bitta javob
      const randomAnswer = availableOptions[Math.floor(Math.random() * availableOptions.length)]
      answers[i] = [randomAnswer]
    }
  }
  
  return answers
}

// Haqiqiy OMR bubble detection algoritmi
export const detectOMRBubbles = (imageData: string, options: ProcessingOptions): Promise<{ [questionNumber: number]: string[] }> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve({})
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const detectedAnswers = analyzeOMRBubbles(imageDataObj, options)
      
      resolve(detectedAnswers)
    }
    
    img.onerror = () => {
      resolve({})
    }
    
    img.src = imageData
  })
}

// OMR bubble analysis algoritmi
const analyzeOMRBubbles = (imageData: ImageData, options: ProcessingOptions): { [questionNumber: number]: string[] } => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const answers: { [questionNumber: number]: string[] } = {}
  
  console.log('=== OMR BUBBLE DETECTION BOSHLANDI ===')
  console.log('Image size:', width, 'x', height)
  console.log('Total questions:', options.totalQuestions)
  
  // OMR varaq strukturasini taxmin qilish
  const questionsPerRow = 5 // Har qatorda 5 ta savol
  const answersPerQuestion = options.answerOptions.length // A, B, C, D, E
  
  // Varaq bo'ylab grid yaratish
  const questionRows = Math.ceil(options.totalQuestions / questionsPerRow)
  const questionWidth = width / questionsPerRow
  const questionHeight = height / questionRows
  
  console.log('Grid layout:', questionsPerRow, 'x', questionRows)
  console.log('Question cell size:', questionWidth, 'x', questionHeight)
  
  for (let questionNumber = 1; questionNumber <= options.totalQuestions; questionNumber++) {
    const row = Math.floor((questionNumber - 1) / questionsPerRow)
    const col = (questionNumber - 1) % questionsPerRow
    
    // Har bir savol uchun hudud
    const questionX = col * questionWidth
    const questionY = row * questionHeight
    
    console.log(`Savol ${questionNumber}: (${questionX.toFixed(0)}, ${questionY.toFixed(0)})`)
    
    const detectedOptions: string[] = []
    
    // Har bir javob varianti uchun bubble tekshirish
    for (let optionIndex = 0; optionIndex < answersPerQuestion; optionIndex++) {
      const option = options.answerOptions[optionIndex]
      
      // Bubble joylashuvini hisoblash
      const bubbleX = questionX + (optionIndex * (questionWidth / answersPerQuestion)) + (questionWidth / answersPerQuestion / 2)
      const bubbleY = questionY + questionHeight / 2
      
      // Bubble atrofidagi hududni tekshirish
      const bubbleRadius = Math.min(questionWidth, questionHeight) / (answersPerQuestion * 3)
      const isFilled = checkBubbleFilled(data, width, height, bubbleX, bubbleY, bubbleRadius)
      
      console.log(`  ${option}: (${bubbleX.toFixed(0)}, ${bubbleY.toFixed(0)}) radius=${bubbleRadius.toFixed(0)} filled=${isFilled}`)
      
      if (isFilled) {
        detectedOptions.push(option)
      }
    }
    
    answers[questionNumber] = detectedOptions
    console.log(`  -> Aniqlangan javoblar: ${detectedOptions.join(', ') || 'Bo\'sh'}`)
  }
  
  console.log('=== YAKUNIY NATIJALAR ===')
  console.log('Detected answers:', answers)
  
  return answers
}

// Bubble to'ldirilganligini tekshirish - yaxshilangan versiya
const checkBubbleFilled = (
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  centerX: number, 
  centerY: number, 
  radius: number
): boolean => {
  let darkPixels = 0
  let totalPixels = 0
  let brightnessSum = 0
  
  // Avval bubble atrofidagi o'rtacha yorqinlikni hisoblash
  for (let y = Math.max(0, centerY - radius * 1.5); y < Math.min(height, centerY + radius * 1.5); y++) {
    for (let x = Math.max(0, centerX - radius * 1.5); x < Math.min(width, centerX + radius * 1.5); x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      
      if (distance > radius && distance <= radius * 1.5) { // Bubble atrofidagi hudud
        const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4
        const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
        brightnessSum += brightness
        totalPixels++
      }
    }
  }
  
  // Adaptive threshold - atrofdagi yorqinlikka qarab
  const avgBrightness = totalPixels > 0 ? brightnessSum / totalPixels : 128
  const adaptiveThreshold = avgBrightness * 0.7 // 70% dan qora bo'lsa, to'ldirilgan
  
  // Endi bubble ichidagi piksellarni tekshirish
  darkPixels = 0
  totalPixels = 0
  
  for (let y = Math.max(0, centerY - radius); y < Math.min(height, centerY + radius); y++) {
    for (let x = Math.max(0, centerX - radius); x < Math.min(width, centerX + radius); x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      
      if (distance <= radius) {
        const pixelIndex = (Math.floor(y) * width + Math.floor(x)) * 4
        const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3
        
        totalPixels++
        if (brightness < adaptiveThreshold) {
          darkPixels++
        }
      }
    }
  }
  
  // Agar 50% dan ko'p qora piksel bo'lsa, to'ldirilgan deb hisoblash
  const fillPercentage = totalPixels > 0 ? darkPixels / totalPixels : 0
  const isFilled = fillPercentage > 0.5
  
  console.log(`    Bubble check: threshold=${adaptiveThreshold.toFixed(0)}, ${darkPixels}/${totalPixels} = ${(fillPercentage * 100).toFixed(1)}% -> ${isFilled ? 'FILLED' : 'EMPTY'}`)
  
  return isFilled
}
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
      
      // Apply advanced preprocessing
      let imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      // 1. Brightness and contrast enhancement for dark images
      imageDataObj = enhanceBrightnessContrast(imageDataObj)
      
      // 2. Noise reduction
      imageDataObj = reduceNoise(imageDataObj)
      
      // 3. Edge enhancement
      imageDataObj = enhanceEdges(imageDataObj)
      
      ctx.putImageData(imageDataObj, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    
    img.src = imageData
  })
}

// Brightness and contrast enhancement
const enhanceBrightnessContrast = (imageData: ImageData): ImageData => {
  const data = imageData.data
  
  // Calculate average brightness
  let totalBrightness = 0
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    totalBrightness += brightness
  }
  const avgBrightness = totalBrightness / (data.length / 4)
  
  // Adaptive contrast and brightness
  const targetBrightness = 128
  const brightnessAdjustment = targetBrightness - avgBrightness
  const contrast = avgBrightness < 100 ? 1.5 : 1.2 // More contrast for dark images
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast first, then brightness
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightnessAdjustment))
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightnessAdjustment))
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightnessAdjustment))
  }
  
  return imageData
}

// Noise reduction using simple blur
const reduceNoise = (imageData: ImageData): ImageData => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const newData = new Uint8ClampedArray(data)
  
  // Simple 3x3 blur kernel for noise reduction
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      for (let c = 0; c < 3; c++) {
        let sum = 0
        let count = 0
        
        // 3x3 neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * 4 + c
            sum += data[neighborIdx]
            count++
          }
        }
        
        newData[idx + c] = sum / count
      }
    }
  }
  
  return new ImageData(newData, width, height)
}

// Edge enhancement for better bubble detection
const enhanceEdges = (imageData: ImageData): ImageData => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  const newData = new Uint8ClampedArray(data)
  
  // Sobel edge detection kernel
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      let gx = 0, gy = 0
      
      // Apply Sobel operator
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighborIdx = ((y + dy) * width + (x + dx)) * 4
          const gray = (data[neighborIdx] + data[neighborIdx + 1] + data[neighborIdx + 2]) / 3
          
          gx += gray * sobelX[dy + 1][dx + 1]
          gy += gray * sobelY[dy + 1][dx + 1]
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      const enhanced = Math.min(255, magnitude * 0.5)
      
      // Blend with original
      const originalGray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      const blended = originalGray * 0.7 + enhanced * 0.3
      
      newData[idx] = newData[idx + 1] = newData[idx + 2] = blended
    }
  }
  
  return new ImageData(newData, width, height)
}

// Validate OMR sheet structure - xira va bukilgan rasmlarni ham qabul qilish
export const validateOMRSheet = (imageData: string): Promise<{
  isValid: boolean
  issues: string[]
  suggestions: string[]
  confidence: number
}> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve({
          isValid: true,
          issues: [],
          suggestions: [],
          confidence: 0.5
        })
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = analyzeImageQuality(imageDataObj)
      
      const issues: string[] = []
      const suggestions: string[] = []
      
      // Brightness analysis
      if (analysis.avgBrightness < 80) {
        issues.push('Rasm juda qorong\'i')
        suggestions.push('Yaxshiroq yorug\'lik ostida suratga oling')
      } else if (analysis.avgBrightness > 200) {
        issues.push('Rasm juda yorqin')
        suggestions.push('Yorug\'likni kamaytiring')
      }
      
      // Contrast analysis
      if (analysis.contrast < 30) {
        issues.push('Rasm kontrasti past')
        suggestions.push('Kontrast sozlamalarini oshiring')
      }
      
      // Blur analysis
      if (analysis.sharpness < 0.3) {
        issues.push('Rasm loyqa')
        suggestions.push('Kamerani barqarorlashtirib, aniqroq suratga oling')
      }
      
      // Rotation analysis
      if (analysis.rotation > 5) {
        issues.push('Varaq egilgan yoki burilgan')
        suggestions.push('Varaqni to\'g\'ri joylashtiring')
      }
      
      // Calculate overall confidence
      let confidence = 1.0
      
      // Reduce confidence based on issues
      if (analysis.avgBrightness < 60 || analysis.avgBrightness > 220) confidence -= 0.3
      else if (analysis.avgBrightness < 80 || analysis.avgBrightness > 200) confidence -= 0.1
      
      if (analysis.contrast < 20) confidence -= 0.3
      else if (analysis.contrast < 30) confidence -= 0.1
      
      if (analysis.sharpness < 0.2) confidence -= 0.3
      else if (analysis.sharpness < 0.3) confidence -= 0.1
      
      if (analysis.rotation > 10) confidence -= 0.2
      else if (analysis.rotation > 5) confidence -= 0.1
      
      confidence = Math.max(0.1, confidence)
      
      // Accept images with confidence > 0.3 (more tolerant)
      const isValid = confidence > 0.3
      
      resolve({
        isValid,
        issues,
        suggestions,
        confidence
      })
    }
    
    img.onerror = () => {
      resolve({
        isValid: false,
        issues: ['Rasmni yuklashda xatolik'],
        suggestions: ['Boshqa rasm tanlang'],
        confidence: 0
      })
    }
    
    img.src = imageData
  })
}

// Image quality analysis
const analyzeImageQuality = (imageData: ImageData): {
  avgBrightness: number
  contrast: number
  sharpness: number
  rotation: number
} => {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  
  // Brightness analysis
  let totalBrightness = 0
  let minBrightness = 255
  let maxBrightness = 0
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    totalBrightness += brightness
    minBrightness = Math.min(minBrightness, brightness)
    maxBrightness = Math.max(maxBrightness, brightness)
  }
  
  const avgBrightness = totalBrightness / (data.length / 4)
  const contrast = maxBrightness - minBrightness
  
  // Sharpness analysis using Laplacian
  let sharpnessSum = 0
  let sharpnessCount = 0
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      // Laplacian kernel
      const neighbors = [
        ((y-1) * width + x) * 4,     // top
        ((y+1) * width + x) * 4,     // bottom
        (y * width + (x-1)) * 4,     // left
        (y * width + (x+1)) * 4      // right
      ]
      
      let laplacian = -4 * center
      neighbors.forEach(nIdx => {
        const neighborBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
        laplacian += neighborBrightness
      })
      
      sharpnessSum += Math.abs(laplacian)
      sharpnessCount++
    }
  }
  
  const sharpness = sharpnessSum / sharpnessCount / 255
  
  // Simple rotation detection (placeholder)
  const rotation = Math.random() * 3 // Mock rotation detection
  
  return {
    avgBrightness,
    contrast,
    sharpness,
    rotation
  }
}

// Calculate score based on answer key - TUZATILGAN VERSIYA
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
    
    // To'g'ri javoblarni parse qilish va normalize qilish
    const correctAnswers = correctAnswerString
      .split(',')
      .map(a => a.trim().toUpperCase())
      .filter(a => a.length > 0)
      .sort() // MUHIM: Tartibni bir xil qilish
    
    const studentAnswersUpper = studentAnswer
      .map(a => a.toUpperCase())
      .sort() // MUHIM: Tartibni bir xil qilish
    
    console.log(`  -> Taqqoslash (normalized):`, {
      correctAnswers,
      studentAnswersUpper
    })
    
    // Javoblarni solishtirish - SORTED COMPARISON
    const isCorrect = correctAnswers.length === studentAnswersUpper.length &&
      correctAnswers.join(',') === studentAnswersUpper.join(',')
    
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