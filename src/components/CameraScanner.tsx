import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Camera, RotateCcw, X } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CameraScannerProps {
  onCapture: (imageData: string) => void
  onClose: () => void
  isScanning?: boolean
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose, isScanning = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isInitializing, setIsInitializing] = useState(false)

  // Cleanup function to properly stop camera
  const stopCamera = useCallback(() => {
    console.log('🔴 Stopping camera...')
    
    if (streamRef.current) {
      // Stop all tracks
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}, state: ${track.readyState}`)
        track.stop()
      })
      streamRef.current = null
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsReady(false)
    console.log('✅ Camera stopped successfully')
  }, [])

  // Start camera with proper error handling
  const startCamera = useCallback(async () => {
    if (isInitializing) {
      console.log('⏳ Camera initialization already in progress...')
      return
    }

    try {
      setIsInitializing(true)
      setError('')
      setIsReady(false)
      
      console.log('🟡 Starting camera...')

      // Stop existing stream first
      stopCamera()

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 2560, min: 1280 },
          height: { ideal: 1440, min: 720 }
        }
      }

      console.log('📷 Requesting camera access with constraints:', constraints)
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Check if component is still mounted
      if (!videoRef.current) {
        console.log('⚠️ Component unmounted, stopping stream')
        mediaStream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = mediaStream
      videoRef.current.srcObject = mediaStream

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element not available'))
          return
        }

        const video = videoRef.current
        
        const onLoadedMetadata = () => {
          console.log('✅ Camera ready:', {
            width: video.videoWidth,
            height: video.videoHeight,
            facingMode
          })
          setIsReady(true)
          resolve()
        }

        const onError = (error: Event) => {
          console.error('❌ Video error:', error)
          reject(new Error('Video loading failed'))
        }

        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
        video.addEventListener('error', onError, { once: true })

        // Timeout after 10 seconds
        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
          reject(new Error('Camera initialization timeout'))
        }, 10000)
      })

    } catch (err: any) {
      console.error('❌ Camera error:', err)
      stopCamera()
      
      let errorMessage = 'Kameraga kirish imkoni yo\'q.'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera ruxsati berilmagan. Brauzer sozlamalarini tekshiring.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera boshqa dastur tomonidan ishlatilmoqda.'
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Kamera ishga tushirishda vaqt tugadi. Qayta urinib ko\'ring.'
      }
      
      setError(errorMessage)
    } finally {
      setIsInitializing(false)
    }
  }, [facingMode, stopCamera, isInitializing])

  // Initialize camera on mount and facingMode change
  useEffect(() => {
    startCamera()
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting, cleaning up camera...')
      stopCamera()
    }
  }, [startCamera, stopCamera])

  // Handle page visibility change to manage camera resources
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Page hidden, pausing camera...')
        if (videoRef.current) {
          videoRef.current.pause()
        }
      } else {
        console.log('📱 Page visible, resuming camera...')
        if (videoRef.current && streamRef.current) {
          videoRef.current.play()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) {
      console.warn('⚠️ Cannot capture: video or canvas not ready')
      return
    }

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        console.error('❌ Cannot get canvas context')
        return
      }

      console.log('📸 Capturing image...', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      })

      // Set canvas size to video size
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Get image data as base64 with high quality
      const imageData = canvas.toDataURL('image/jpeg', 0.95)
      
      console.log('✅ Image captured successfully, size:', imageData.length)
      
      // Call parent callback
      onCapture(imageData)
    } catch (error) {
      console.error('❌ Image capture error:', error)
      setError('Rasmga olishda xatolik yuz berdi')
    }
  }, [isReady, onCapture])

  const switchCamera = useCallback(() => {
    if (isInitializing) {
      console.log('⏳ Cannot switch camera while initializing')
      return
    }
    
    console.log('🔄 Switching camera from', facingMode, 'to', facingMode === 'user' ? 'environment' : 'user')
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }, [facingMode, isInitializing])

  const handleClose = useCallback(() => {
    console.log('❌ Closing camera scanner...')
    stopCamera()
    onClose()
  }, [stopCamera, onClose])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <h2 className="text-lg font-semibold">Test Varaqni Skanerlash</h2>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-4">
            <div>
              <Camera size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Kamera xatoligi</p>
              <p className="text-sm opacity-75 mb-4">{error}</p>
              <Button 
                onClick={startCamera} 
                variant="outline" 
                className="text-white border-white"
                disabled={isInitializing}
              >
                {isInitializing ? 'Ishga tushirilmoqda...' : 'Qayta urinish'}
              </Button>
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
            
            {/* Loading overlay */}
            {isInitializing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>Kamera ishga tushirilmoqda...</p>
                </div>
              </div>
            )}
            
            {/* Overlay Guide */}
            {isReady && (
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
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/50">
        <div className="flex items-center justify-center gap-4">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            disabled={!isReady || isScanning || isInitializing}
            className="p-3 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors"
            title="Kamerani almashtirish"
          >
            <RotateCcw size={24} />
          </button>

          {/* Capture Button */}
          <button
            onClick={captureImage}
            disabled={!isReady || isScanning || isInitializing}
            className="p-4 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white transition-colors shadow-lg"
            title="Suratga olish"
          >
            {isScanning ? (
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={32} />
            )}
          </button>

          {/* Placeholder for symmetry */}
          <div className="p-3 w-12 h-12"></div>
        </div>

        <div className="text-center mt-4">
          <p className="text-white text-sm opacity-75">
            {isInitializing 
              ? 'Kamera ishga tushirilmoqda...' 
              : isScanning 
                ? 'Skanerlash...' 
                : isReady 
                  ? 'Suratga olish uchun kamera tugmasini bosing'
                  : 'Kamera tayyorlanmoqda...'
            }
          </p>
        </div>
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

export default CameraScanner