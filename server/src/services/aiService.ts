import { SmartOMRAnalysis, SmartOMRResult } from './smartOMRAnalysis.js'

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

export class AIService {
  /**
   * SMART 2-STAGE OMR ANALYSIS
   * STAGE 1: Image → Groq Vision Model → Fill percentages (haqiqiy rasm tahlili)
   * STAGE 2: Percentages → Groq Text Model → Decision (mantiq va qaror)
   */
  static async analyzeOMRSheet(
    imageBase64: string,
    answerKey: string[],
    scoring: { correct: number; wrong: number; blank: number }
  ): Promise<OMRAnalysisResult> {
    
    console.log('=== SMART 2-STAGE OMR SYSTEM ACTIVATED ===')
    console.log('STAGE 1: Image → LLaVA Vision Model → Fill percentages')
    console.log('STAGE 2: Percentages → Groq Text Model → Decision')
    console.log('Questions to analyze:', answerKey.length)
    console.log('Image size:', imageBase64.length, 'characters')
    console.log('Using LLaVA Vision Model: llava-v1.5-7b-4096-preview')
    
    try {
      // Smart 2-Stage Analysis tizimidan foydalanish
      const result = await SmartOMRAnalysis.analyzeWithSmartSystem(
        imageBase64,
        answerKey,
        scoring
      )
      
      console.log('=== SMART 2-STAGE ANALYSIS COMPLETED ===')
      console.log('Accuracy achieved:', (result.confidence * 100).toFixed(1) + '%')
      console.log('Correct answers:', result.correctAnswers, '/', answerKey.length)
      
      // Format ni moslashtirish
      return {
        extractedAnswers: result.extractedAnswers,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        blankAnswers: result.blankAnswers,
        totalScore: result.totalScore,
        confidence: result.confidence,
        detailedResults: result.detailedResults
      }
      
    } catch (error) {
      console.error('Smart 2-Stage OMR analysis failed:', error)
      throw new Error('OMR analysis failed: ' + error)
    }
  }
}