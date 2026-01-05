import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ScanLine, Check, X, AlertCircle, User, FileText, Camera } from 'lucide-react'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import CameraScanner from '@/components/CameraScanner'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Exam } from '@/types'
import { processOMRImageLegacy, validateOMRSheet, calculateScore } from '@/utils/omrProcessor'

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
}

const ExamScanner: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [scannedImage, setScannedImage] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    issues: string[]
    suggestions: string[]
    confidence?: number
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
      
      // Xira yoki bukilgan rasmlarni ham qabul qilish (confidence > 0.3)
      if (validation.confidence && validation.confidence < 0.3) {
        setError('Rasm sifati juda past. Iltimos, yaxshiroq rasm oling.')
        return
      }
    
      await processScannedImage(imageData)
    } catch (error) {
      console.error('Validation error:', error)
      setError('Rasm validatsiyasida xatolik')
    }
  }

  const processScannedImage = async (imageData: string) => {
    if (!exam) {
      setError('Imtihon ma\'lumotlari topilmadi')
      return
    }

    console.log('=== IMTIHON TEKSHIRISH BOSHLANDI ===')
    console.log('Exam data:', exam)
    console.log('Total questions:', getTotalQuestions(exam))
    console.log('Answer key:', exam.answerKey)
    console.log('Scoring:', exam.scoring)

    setScanning(true)
    setError('')
    
    try {
      const omrResult = await processOMRImageLegacy(imageData, {
        totalQuestions: getTotalQuestions(exam),
        answerOptions: ['A', 'B', 'C', 'D', 'E']
      }, exam.answerKey)
      
      console.log('OMR Result:', omrResult)
      
      const scoreResult = calculateScore(
        omrResult.answers,
        exam.answerKey || [],
        exam.scoring || { correct: 4, wrong: -1, blank: 0 }
      )
      
      console.log('Score Result:', scoreResult)
      
      const result: ScanResult = {
        studentId: omrResult.studentId,
        studentName: `O'quvchi ${omrResult.studentId}`,
        answers: omrResult.answers,
        score: scoreResult.score,
        totalQuestions: getTotalQuestions(exam),
        correctAnswers: scoreResult.correctCount,
        wrongAnswers: scoreResult.wrongCount,
        blankAnswers: scoreResult.blankCount,
        confidence: omrResult.confidence,
        processingTime: omrResult.processingTime,
        scannedImage: imageData
      }
      
      console.log('Final Result:', result)
      setScanResult(result)
    } catch (error: any) {
      console.error('OMR processing error:', error)
      setError('OMR varaqni qayta ishlashda xatolik yuz berdi')
    } finally {
      setScanning(false)
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" centered />
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
                <Check size={48} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Skanerlash yakunlandi
              </h1>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Ishonch darajasi: {Math.round(scanResult.confidence * 100)}% | 
                Qayta ishlash vaqti: {Math.round(scanResult.processingTime / 1000)}s
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{scanResult.score}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Ball</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{scanResult.correctAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">To'g'ri</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{scanResult.wrongAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Noto'g'ri</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-600">{scanResult.blankAnswers}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Bo'sh</div>
                </div>
              </div>
            </div>
          </Card>

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

          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Javoblar tafsiloti
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {Object.entries(scanResult.answers).map(([questionNumber, studentAnswers]) => {
                const qNum = parseInt(questionNumber)
                const correctAnswerString = exam?.answerKey?.[qNum - 1] || ''
                
                // TUZATILGAN: Bir xil mantiq ishlatish
                const correctAnswers = correctAnswerString
                  .split(',')
                  .map(a => a.trim().toUpperCase())
                  .filter(a => a.length > 0)
                  .sort()
                
                const studentAnswersUpper = studentAnswers
                  .map(a => a.toUpperCase())
                  .sort()
                
                const isCorrect = correctAnswerString && studentAnswers.length > 0 && 
                  correctAnswers.join(',') === studentAnswersUpper.join(',')
                const isBlank = studentAnswers.length === 0
                
                return (
                  <div 
                    key={questionNumber}
                    className={`p-3 rounded-lg border-2 ${
                      isBlank 
                        ? 'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
                        : isCorrect 
                          ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                          : 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Savol {questionNumber}</span>
                      {isBlank ? (
                        <span className="text-xs text-slate-500">Bo'sh</span>
                      ) : isCorrect ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <X size={16} className="text-red-600" />
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">Javob: </span>
                        <span className="font-medium">
                          {studentAnswers.length > 0 ? studentAnswers.join(', ') : 'Bo\'sh'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400">To'g'ri: </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {correctAnswerString || 'Belgilanmagan'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
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
        isScanning={scanning}
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
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {exam?.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {getTotalQuestions(exam)} ta savol
              </p>
            </div>
          </div>
          
          {!exam?.answerKey || exam.answerKey.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">
                Diqqat: Imtihon kalitlari belgilanmagan. Avval kalitlarni belgilang.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
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

        {validationResult && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Rasm sifati tahlili
            </h2>
            
            {/* Confidence indicator */}
            {validationResult.confidence !== undefined && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Sifat darajasi:</span>
                  <span className={`text-sm font-semibold ${
                    validationResult.confidence > 0.7 ? 'text-green-600' :
                    validationResult.confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(validationResult.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      validationResult.confidence > 0.7 ? 'bg-green-500' :
                      validationResult.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${validationResult.confidence * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Issues and suggestions */}
            {validationResult.issues.length > 0 && (
              <div className="space-y-3">
                {validationResult.issues.map((issue, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg ${
                    validationResult.confidence && validationResult.confidence > 0.5 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <AlertCircle size={16} className={`mt-0.5 ${
                      validationResult.confidence && validationResult.confidence > 0.5 
                        ? 'text-yellow-600 dark:text-yellow-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                    <div>
                      <p className={`text-sm ${
                        validationResult.confidence && validationResult.confidence > 0.5 
                          ? 'text-yellow-700 dark:text-yellow-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>{issue}</p>
                      {validationResult.suggestions[index] && (
                        <p className={`text-xs mt-1 ${
                          validationResult.confidence && validationResult.confidence > 0.5 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          Tavsiya: {validationResult.suggestions[index]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {validationResult.confidence && validationResult.confidence > 0.3 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Rasm qayta ishlanishi mumkin. Natija aniqlik darajasi: {Math.round(validationResult.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {validationResult.issues.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Check size={20} className="text-green-600 dark:text-green-400" />
                <span className="text-green-700 dark:text-green-300 text-sm">
                  Rasm sifati yaxshi. Skanerlash uchun tayyor.
                </span>
              </div>
            )}
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

        {scanning && (
          <Card className="mb-6">
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                <LoadingSpinner />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  OMR varaq qayta ishlanmoqda...
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Bubble detection algoritmi ishlamoqda. Bu bir necha daqiqa davom etishi mumkin.
                </p>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  • Rasm sifatini tahlil qilish<br/>
                  • Bo'yalgan aylanalarni aniqlash<br/>
                  • Javoblarni taqqoslash
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setShowCamera(true)}
              disabled={scanning}
              className="flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Kamera bilan skanerlash
            </Button>
            
            {scannedImage && (
              <Button
                onClick={() => processScannedImage(scannedImage)}
                disabled={scanning}
                variant="outline"
              >
                {scanning ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Tekshirilmoqda...
                  </>
                ) : (
                  <>
                    <ScanLine size={20} />
                    Javoblarni tekshirish
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExamScanner