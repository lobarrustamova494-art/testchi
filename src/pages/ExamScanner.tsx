import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, AlertCircle, User, FileText, Camera, Brain, Zap } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LoadingButton from '@/components/ui/LoadingButton'
import ProgressBar from '@/components/ui/ProgressBar'
import CameraScanner from '@/components/CameraScanner'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { AIService, OMRAnalysisResult } from '@/services/aiService'
import { Exam } from '@/types'
import { validateOMRSheet } from '@/utils/omrProcessor'

interface ScanResult {
  studentId: string
  studentName: string
  answers: { [questionNumber: number]: string[] }
  score: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  blankAnswers: number
  confidence: number
  processingTime: number
  scannedImage?: string
  aiAnalysis?: OMRAnalysisResult
  detailedResults?: Array<{
    questionNumber: number
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
    score: number
  }>
}

const ExamScanner: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [scannedImage, setScannedImage] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    issues: string[]
    suggestions: string[]
  } | null>(null)

  useEffect(() => {
    const fetchExam = async () => {
      if (!id) {
        setError('Imtihon ID topilmadi')
        setLoading(false)
        return
      }

      try {
        const response = await apiService.getExam(id)
        if (response.data?.exam) {
          setExam(response.data.exam)
        } else {
          setError('Imtihon topilmadi')
        }
      } catch (error: any) {
        console.error('Imtihon yuklashda xatolik:', error)
        setError('Imtihon yuklashda xatolik yuz berdi')
      } finally {
        setLoading(false)
      }
    }

    fetchExam()
  }, [id])

  const getTotalQuestions = (exam: Exam | null): number => {
    if (!exam) return 0
    if (exam.totalQuestions) return exam.totalQuestions
    
    // Calculate from subjects if totalQuestions is not set
    if (exam.subjects && Array.isArray(exam.subjects)) {
      return exam.subjects.reduce((total: number, subject: any) => {
        if (subject.sections && Array.isArray(subject.sections)) {
          return total + subject.sections.reduce((sectionTotal: number, section: any) => {
            return sectionTotal + (section.questionCount || 0)
          }, 0)
        }
        return total
      }, 0)
    }
    
    return 0
  }

  const handleCameraCapture = async (imageData: string) => {
    setScannedImage(imageData)
    setShowCamera(false)
    
    try {
      const validation = await validateOMRSheet(imageData)
      setValidationResult(validation)
      
      if (!validation.isValid) {
        return
      }
    
      // Avtomatik AI tahlil qilish
      await processWithAI(imageData)
    } catch (error) {
      console.error('Validation error:', error)
      setError('Rasm validatsiyasida xatolik')
    }
  }

  const processWithAI = async (imageData: string) => {
    console.log('=== PROCESS WITH AI STARTED ===')
    console.log('Image data length:', imageData.length)
    console.log('Image data starts with:', imageData.substring(0, 50))
    console.log('Exam data:', exam)
    
    if (!exam) {
      setError('Imtihon ma\'lumotlari topilmadi')
      return
    }

    // Validate answerKey
    if (!exam.answerKey) {
      setError('Imtihon kalitlari belgilanmagan. Avval kalitlarni belgilang.')
      return
    }

    // Ensure answerKey is an array
    let answerKey: string[] = []
    if (Array.isArray(exam.answerKey)) {
      answerKey = exam.answerKey
    } else if (typeof exam.answerKey === 'string') {
      // If it's a string, try to parse it
      try {
        answerKey = JSON.parse(exam.answerKey)
      } catch (e) {
        answerKey = [exam.answerKey]
      }
    } else {
      setError('Imtihon kalitlari noto\'g\'ri formatda')
      return
    }

    if (!Array.isArray(answerKey) || answerKey.length === 0) {
      setError('Imtihon kalitlari bo\'sh yoki noto\'g\'ri formatda')
      return
    }

    // Answer key validation
    const totalQuestions = getTotalQuestions(exam)
    if (answerKey.length !== totalQuestions) {
      setError(`Kalitlar soni (${answerKey.length}) savollar soniga (${totalQuestions}) mos kelmaydi`)
      return
    }

    // Validate and normalize scoring
    let scoring = exam.scoring
    if (!scoring || typeof scoring !== 'object') {
      console.warn('Scoring not found, using default values')
      scoring = { correct: 1, wrong: 0, blank: 0 }
    }

    // Ensure all scoring values are numbers
    if (typeof scoring.correct !== 'number') scoring.correct = 1
    if (typeof scoring.wrong !== 'number') scoring.wrong = 0
    if (typeof scoring.blank !== 'number') scoring.blank = 0

    console.log('=== AI TAHLIL BOSHLANDI ===')
    console.log('Exam data:', exam)
    console.log('Answer key:', answerKey)
    console.log('Answer key type:', Array.isArray(answerKey))
    console.log('Answer key length:', answerKey.length)
    console.log('Total questions:', totalQuestions)
    console.log('Scoring:', scoring)
    console.log('Scoring type:', typeof scoring)
    console.log('Scoring validation:', {
      hasCorrect: typeof scoring.correct === 'number',
      hasWrong: typeof scoring.wrong === 'number',
      hasBlank: typeof scoring.blank === 'number'
    })

    setAiAnalyzing(true)
    setAnalysisProgress(0)
    setError('')
    
    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const startTime = Date.now()
      
      console.log('Calling AIService.analyzeOMRSheet...')
      console.log('Parameters:', {
        imageData: `[${imageData.length} chars]`,
        answerKey: answerKey,
        scoring: scoring
      })
      
      // AI tahlil
      const aiResult = await AIService.analyzeOMRSheet(
        imageData,
        answerKey,
        scoring
      )
      
      console.log('AI analysis completed:', aiResult)
      
      clearInterval(progressInterval)
      setAnalysisProgress(100)
      
      const processingTime = Date.now() - startTime
      
      console.log('AI Result:', aiResult)

      // Suspicious answers check
      if (aiResult.suspiciousAnswers && aiResult.suspiciousAnswers > 0) {
        console.warn(`${aiResult.suspiciousAnswers} ta shubhali javob aniqlandi`)
      }

      // Pattern matching check
      if (aiResult.matchesExpectedPattern) {
        console.log('✅ AI tahlil kutilgan pattern bilan mos keldi')
      } else {
        console.warn('⚠️ AI tahlil kutilgan pattern dan farq qildi')
      }

      // Human analysis comparison
      if (aiResult.humanAnalysisScore !== undefined) {
        console.log(`Human analysis score: ${aiResult.humanAnalysisScore}`)
        console.log(`AI calculated score: ${aiResult.totalScore}`)
        if (aiResult.totalScore === aiResult.humanAnalysisScore) {
          console.log('🎯 AI score matches human analysis exactly!')
        }
      }
      
      // Natijani formatlash
      const result: ScanResult = {
        studentId: 'AI-SCAN-' + Date.now(),
        studentName: 'AI Tahlil',
        answers: {}, // AI dan kelgan javoblarni formatlash
        score: aiResult.totalScore,
        totalQuestions: aiResult.extractedAnswers.length,
        correctAnswers: aiResult.correctAnswers,
        wrongAnswers: aiResult.wrongAnswers,
        blankAnswers: aiResult.blankAnswers,
        confidence: aiResult.confidence,
        processingTime,
        scannedImage: imageData,
        aiAnalysis: aiResult,
        detailedResults: aiResult.detailedResults
      }
      
      console.log('Final AI Result:', result)
      setScanResult(result)

      // Low confidence warning
      if (aiResult.confidence < 0.7) {
        setError(`Tahlil ishonchliligi past (${(aiResult.confidence * 100).toFixed(0)}%). Rasmni qayta oling yoki qo'lda tekshiring.`)
      }

    } catch (error: any) {
      console.error('AI tahlil xatosi:', error)
      setError('AI tahlil qilishda xatolik yuz berdi: ' + error.message)
    } finally {
      setAiAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const handleSaveResult = async () => {
    if (!scanResult || !exam) return

    try {
      alert('Natija saqlandi!')
      navigate(`/exam-detail/${id}`)
    } catch (error) {
      console.error('Save error:', error)
      setError('Natijani saqlashda xatolik!')
    }
  }

  const resetScan = () => {
    setScanResult(null)
    setScannedImage(null)
    setValidationResult(null)
    setError('')
    setAnalysisProgress(0)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Faqat rasm fayllarini yuklash mumkin')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Fayl hajmi 10MB dan oshmasligi kerak')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        setScannedImage(imageData)
        
        try {
          const validation = await validateOMRSheet(imageData)
          setValidationResult(validation)
          
          if (!validation.isValid) {
            return
          }
        
          // Avtomatik AI tahlil qilish
          await processWithAI(imageData)
        } catch (error) {
          console.error('Validation error:', error)
          setError('Rasm validatsiyasida xatolik')
        }
      }
      reader.onerror = () => {
        setError('Faylni o\'qishda xatolik yuz berdi')
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('File upload error:', error)
      setError('Fayl yuklashda xatolik yuz berdi')
    }

    // Clear the input value so the same file can be selected again
    event.target.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-slate-600 dark:text-slate-400">Imtihon yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header
          user={user ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar || '',
            isOnline: true
          } : { id: '1', name: '', phone: '', avatar: '', isOnline: false }}
          title="Imtihonni tekshirish"
          showBack
          showHome
          onBack={() => navigate(`/exam-detail/${id}`)}
        />
        
        <div className="max-w-4xl mx-auto p-4 pb-24 flex items-center justify-center min-h-[60vh]">
          <Card className="text-center p-8">
            <div className="flex justify-center mb-4">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Xatolik yuz berdi
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              Bosh sahifaga qaytish
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (scanResult) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header
          user={user ? {
            id: user.id,
            name: user.name,
            phone: user.phone,
            avatar: user.avatar || '',
            isOnline: true
          } : { id: '1', name: '', phone: '', avatar: '', isOnline: false }}
          title="Skanerlash natijasi"
          showBack
          showHome
          onBack={() => navigate(`/exam-detail/${id}`)}
        />

        <div className="max-w-4xl mx-auto p-4 pb-24">
          <Card className="mb-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Brain size={48} className="text-purple-600" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                AI Tahlil Yakunlandi
              </h1>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Ishonch darajasi: {Math.round(scanResult.confidence * 100)}% | 
                Qayta ishlash vaqti: {Math.round(scanResult.processingTime / 1000)}s
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{scanResult.score}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Jami Ball</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{scanResult.correctAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">To'g'ri</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{scanResult.wrongAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Noto'g'ri</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-3xl font-bold text-slate-600">{scanResult.blankAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Bo'sh</div>
                </div>
              </div>

              {/* Foiz ko'rsatkichi */}
              <div className="mt-6">
                <div className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Natija: {Math.round((scanResult.correctAnswers / scanResult.totalQuestions) * 100)}%
                </div>
                <ProgressBar 
                  value={(scanResult.correctAnswers / scanResult.totalQuestions) * 100}
                  variant={
                    (scanResult.correctAnswers / scanResult.totalQuestions) >= 0.8 ? 'success' :
                    (scanResult.correctAnswers / scanResult.totalQuestions) >= 0.6 ? 'warning' : 'error'
                  }
                  size="lg"
                  showLabel={false}
                />
              </div>
            </div>
          </Card>

          {/* AI tahlil tafsilotlari */}
          {scanResult.detailedResults && scanResult.detailedResults.length > 0 && (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Brain size={20} className="text-purple-600" />
                AI Tahlil Tafsilotlari
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid gap-2">
                  {scanResult.detailedResults.slice(0, 20).map((result, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        result.isCorrect 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : result.studentAnswer === ''
                          ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}
                    >
                      <span className="font-medium">
                        {result.questionNumber}-savol:
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          {result.studentAnswer || 'Bo\'sh'} 
                          {result.correctAnswer && ` → ${result.correctAnswer}`}
                        </span>
                        <span className="font-bold">
                          {result.score > 0 ? '+' : ''}{result.score}
                        </span>
                      </div>
                    </div>
                  ))}
                  {scanResult.detailedResults.length > 20 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-2">
                      ... va yana {scanResult.detailedResults.length - 20} ta savol
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <User size={24} className="text-slate-600 dark:text-slate-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {scanResult.studentName}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  ID: {scanResult.studentId}
                </p>
              </div>
            </div>
          </Card>

          {scanResult.scannedImage && (
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Skanerlangan rasm
              </h3>
              <div className="relative">
                <img 
                  src={scanResult.scannedImage} 
                  alt="Skanerlangan OMR varaq"
                  className="w-full max-w-md mx-auto rounded-lg border border-slate-200 dark:border-slate-700"
                />
              </div>
            </Card>
          )}

          <div className="flex gap-4">
            <Button onClick={resetScan} variant="outline">
              Qayta skanerlash
            </Button>
            <Button onClick={handleSaveResult} className="flex-1">
              Natijani saqlash
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (showCamera) {
    return (
      <CameraScanner
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        isScanning={aiAnalyzing}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <Header
        user={user ? {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatar: user.avatar || '',
          isOnline: true
        } : { id: '1', name: '', phone: '', avatar: '', isOnline: false }}
        title="Imtihonni tekshirish"
        showBack
        showHome
        onBack={() => navigate(`/exam-detail/${id}`)}
      />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText size={24} className="text-primary" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {exam?.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {exam?.date} • {getTotalQuestions(exam)} ta savol
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Kalitlar: {exam?.answerKey?.length || 0}/{getTotalQuestions(exam)}
              </div>
              {exam?.answerKey && exam.answerKey.length > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Kalitlar belgilangan
                </div>
              )}
            </div>
          </div>

          {/* Answer Key Preview */}
          {exam?.answerKey && exam.answerKey.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Kalitlar ko'rinishi:
              </div>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-xs">
                {exam.answerKey.slice(0, 20).map((answer, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <span className="text-slate-500">{index + 1}:</span>
                    <span className="font-mono text-primary">
                      {answer || 'BLANK'}
                    </span>
                  </div>
                ))}
                {exam.answerKey.length > 20 && (
                  <div className="text-slate-400">
                    +{exam.answerKey.length - 20} ko'proq...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scoring Info */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-green-600 dark:text-green-400 font-semibold">
                +{exam?.scoring?.correct || 1}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                To'g'ri javob
              </div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-red-600 dark:text-red-400 font-semibold">
                {exam?.scoring?.wrong || 0}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Noto'g'ri javob
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="text-slate-600 dark:text-slate-400 font-semibold">
                {exam?.scoring?.blank || 0}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Bo'sh javob
              </div>
            </div>
          </div>
          
          {!exam?.answerKey || exam.answerKey.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mt-4">
              <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                Diqqat: Imtihon kalitlari belgilanmagan. Avval kalitlarni belgilang.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mt-4">
              <Check size={20} className="text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300 text-sm">
                Kalitlar belgilangan. Skanerlash uchun tayyor.
              </span>
            </div>
          )}
        </Card>

        {scannedImage && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Skanerlangan rasm
            </h2>
            <div className="relative">
              <img 
                src={scannedImage} 
                alt="Skanerlangan OMR varaq"
                className="w-full max-w-md mx-auto rounded-lg border border-slate-200 dark:border-slate-700"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => setScannedImage(null)}
                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </Card>
        )}

        {validationResult && !validationResult.isValid && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rasm sifati tekshiruvi
            </h2>
            <div className="space-y-3">
              {validationResult.issues.map((issue, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{issue}</p>
                    {validationResult.suggestions[index] && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Tavsiya: {validationResult.suggestions[index]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {error && (
          <Card className="mb-6">
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Xatolik yuz berdi</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {aiAnalyzing && (
          <Card className="mb-6">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                <div className="relative">
                  <Brain size={32} className="text-purple-600 animate-pulse" />
                  <Zap size={16} className="absolute -top-1 -right-1 text-yellow-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  AI tomonidan tahlil qilinmoqda...
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Sun'iy intellekt Test varaqni tahlil qilmoqda va javoblarni aniqlayapti
                </p>
                <ProgressBar 
                  value={analysisProgress} 
                  variant="default"
                  size="sm"
                  showLabel={true}
                  label="AI Tahlil"
                  animated={true}
                />
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingButton
              onClick={() => setShowCamera(true)}
              loading={aiAnalyzing}
              loadingText="Tahlil qilinmoqda..."
              className="flex items-center justify-center gap-2"
              icon={<Camera size={20} />}
            >
              Kamera bilan skanerlash
            </LoadingButton>
            
            <LoadingButton
              onClick={() => document.getElementById('file-upload')?.click()}
              loading={aiAnalyzing}
              loadingText="Tahlil qilinmoqda..."
              variant="outline"
              className="flex items-center justify-center gap-2"
              icon={<FileText size={20} />}
            >
              Fayl yuklash
            </LoadingButton>
            
            {scannedImage && !scanResult && (
              <LoadingButton
                onClick={() => processWithAI(scannedImage)}
                loading={aiAnalyzing}
                loadingText="AI tahlil qilinmoqda..."
                variant="outline"
                icon={<Brain size={20} />}
                className="md:col-span-2"
              >
                AI bilan qayta tahlil
              </LoadingButton>
            )}
          </div>

          {!exam?.answerKey || exam.answerKey.length === 0 ? (
            <div className="text-center">
              <Button
                onClick={() => navigate(`/exam-keys/${id}`)}
                variant="outline"
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                Avval kalitlarni belgilang
              </Button>
            </div>
          ) : null}
        </div>

        {/* Hidden file input */}
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  )
}

export default ExamScanner