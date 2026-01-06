import React, { useRef, useEffect, useState } from 'react'
import { Camera, RotateCcw, X, Upload, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CameraScannerProps {
  onCapture: (imageData: string) => void
  onClose: () => void
  isScanning?: boolean
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose, isScanning = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [facingMode])

  const startCamera = async () => {
    try {
      setError('')
      setIsReady(false)

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Brauzer kamerani qo\'llab-quvvatlamaydi')
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 2560, min: 1280 }, // Increased resolution
          height: { ideal: 1440, min: 720 }  // Increased resolution
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true)
        }
      }
    } catch (err: any) {
      console.error('Kamera xatoligi:', err)
      
      let errorMessage = 'Kameraga kirish imkoni yo\'q.'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera ruxsati berilmagan. Brauzer sozlamalarida kamera ruxsatini yoqing.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Kamera topilmadi. Kamera ulangan va ishlaydigan ekanligini tekshiring.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Brauzer kamerani qo\'llab-quvvatlamaydi.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera boshqa dastur tomonidan ishlatilmoqda.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Kamera talablariga javob bermaydi.'
      }
      
      setError(errorMessage)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data as base64 with higher quality
    const imageData = canvas.toDataURL('image/jpeg', 0.95) // Increased quality from 0.8 to 0.95
    
    // Call parent callback
    onCapture(imageData)
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      onCapture(imageData)
    }
    reader.onerror = () => {
      setError('Faylni o\'qishda xatolik yuz berdi')
    }
    reader.readAsDataURL(file)
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <h2 className="text-lg font-semibold">Test Varaqni Skanerlash</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-4">
            <div className="max-w-md">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <p className="text-lg mb-2">Kamera xatoligi</p>
              <p className="text-sm opacity-75 mb-6">{error}</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={startCamera} 
                  variant="outline" 
                  className="text-white border-white hover:bg-white/10 w-full"
                >
                  <Camera size={20} className="mr-2" />
                  Kamerani qayta ishga tushirish
                </Button>
                
                <div className="text-sm opacity-75 my-2">yoki</div>
                
                <Button 
                  onClick={openFileDialog}
                  className="bg-primary hover:bg-primary/80 w-full"
                  disabled={isScanning}
                >
                  <Upload size={20} className="mr-2" />
                  Fayl yuklash
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-blue-900/30 rounded-lg text-xs">
                <p className="font-medium mb-1">Kamera ruxsati berish uchun:</p>
                <p>1. Brauzer manzil qatoridagi kamera belgisini bosing</p>
                <p>2. "Ruxsat berish" ni tanlang</p>
                <p>3. Sahifani yangilang</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Guide Rectangle - Horizontal for OMR sheet */}
                <div className="w-96 h-64 border-2 border-white border-dashed rounded-lg bg-black/20">
                  <div className="absolute -top-8 left-0 right-0 text-center">
                    <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                      Test varaqni bu doira ichiga joylashtiring
                    </span>
                  </div>
                </div>
                
                {/* Corner markers */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-white"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-white"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-white"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-white"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/50">
        <div className="flex items-center justify-center gap-4">
          {/* File Upload */}
          <button
            onClick={openFileDialog}
            disabled={isScanning}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            title="Fayl yuklash"
          >
            <Upload size={24} />
          </button>

          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            disabled={!isReady || isScanning}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            title="Kamerani almashtirish"
          >
            <RotateCcw size={24} />
          </button>

          {/* Capture Button */}
          <button
            onClick={captureImage}
            disabled={!isReady || isScanning}
            className="p-4 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors shadow-lg"
            title="Suratga olish"
          >
            {isScanning ? (
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={32} />
            )}
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-white text-sm opacity-75">
            {isScanning ? 'Skanerlash...' : 'Suratga olish yoki fayl yuklash'}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default CameraScanner