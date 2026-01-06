import { Router } from 'express'
import { Request, Response } from 'express'
import { AIService } from '../services/aiService.js'
import { authenticate } from '../middleware/auth.js'
import Joi from 'joi'

const router = Router()

// Rasm tahlili uchun validation schema
const imageAnalysisSchema = Joi.object({
  image: Joi.string().required().messages({
    'string.empty': 'Rasm base64 formatida bo\'lishi kerak',
    'any.required': 'Rasm majburiy'
  }),
  prompt: Joi.string().optional().messages({
    'string.base': 'Prompt matn bo\'lishi kerak'
  })
})

// Matn tahlili uchun validation schema
const textAnalysisSchema = Joi.object({
  text: Joi.string().required().min(1).messages({
    'string.empty': 'Matn bo\'sh bo\'lmasligi kerak',
    'any.required': 'Matn majburiy',
    'string.min': 'Matn kamida 1 ta belgi bo\'lishi kerak'
  }),
  context: Joi.string().optional().messages({
    'string.base': 'Kontekst matn bo\'lishi kerak'
  })
})

// Savol tahlili uchun validation schema
const questionAnalysisSchema = Joi.object({
  questions: Joi.array().items(Joi.string().min(1)).min(1).required().messages({
    'array.base': 'Savollar array bo\'lishi kerak',
    'array.min': 'Kamida 1 ta savol bo\'lishi kerak',
    'any.required': 'Savollar majburiy'
  })
})

/**
 * POST /api/ai/analyze-image
 * Rasmni tahlil qilish
 */
router.post('/analyze-image', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = imageAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { image, prompt } = value

    // Let the AI service handle base64 validation
    const result = await AIService.analyzeImage(image, prompt)

    res.json({
      success: true,
      message: 'Rasm muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Rasm tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

// OMR tahlili uchun validation schema
const omrAnalysisSchema = Joi.object({
  image: Joi.string().required().messages({
    'string.empty': 'Rasm base64 formatida bo\'lishi kerak',
    'any.required': 'Rasm majburiy'
  }),
  answerKey: Joi.array().items(Joi.string().allow('', null)).min(1).required().messages({
    'array.base': 'Javob kalitlari array bo\'lishi kerak',
    'array.min': 'Kamida 1 ta javob kaliti bo\'lishi kerak',
    'any.required': 'Javob kalitlari majburiy'
  }),
  scoring: Joi.object({
    correct: Joi.number().required().messages({
      'number.base': 'To\'g\'ri javob bali raqam bo\'lishi kerak',
      'any.required': 'To\'g\'ri javob bali majburiy'
    }),
    wrong: Joi.number().required().messages({
      'number.base': 'Noto\'g\'ri javob bali raqam bo\'lishi kerak',
      'any.required': 'Noto\'g\'ri javob bali majburiy'
    }),
    blank: Joi.number().required().messages({
      'number.base': 'Bo\'sh javob bali raqam bo\'lishi kerak',
      'any.required': 'Bo\'sh javob bali majburiy'
    })
  }).required().messages({
    'object.base': 'Baholash tizimi obyekt bo\'lishi kerak',
    'any.required': 'Baholash tizimi majburiy'
  })
})

/**
 * POST /api/ai/analyze-omr
 * OMR varaqni tahlil qilish va natijalarni hisoblash
 */
router.post('/analyze-omr', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('=== OMR ANALYZE REQUEST ===')
    console.log('Request body keys:', Object.keys(req.body))
    console.log('Request body:', {
      image: req.body.image ? `[base64 string of ${req.body.image.length} chars]` : 'MISSING',
      answerKey: req.body.answerKey,
      answerKeyType: Array.isArray(req.body.answerKey) ? 'array' : typeof req.body.answerKey,
      answerKeyLength: req.body.answerKey?.length || 0,
      scoring: req.body.scoring,
      scoringType: typeof req.body.scoring
    })
    
    // Pre-validation fixes
    if (req.body.answerKey && !Array.isArray(req.body.answerKey)) {
      console.log('Converting answerKey to array')
      req.body.answerKey = []
    }
    
    if (!req.body.answerKey) {
      console.log('Setting empty answerKey array')
      req.body.answerKey = []
    }
    
    if (!req.body.scoring || typeof req.body.scoring !== 'object') {
      console.log('Setting default scoring')
      req.body.scoring = { correct: 1, wrong: 0, blank: 0 }
    }
    
    const { error, value } = omrAnalysisSchema.validate(req.body)
    if (error) {
      console.error('Validation error details:', error.details)
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      })
    }

    const { image, answerKey, scoring } = value
    
    console.log('=== VALIDATED DATA ===')
    console.log('Image length:', image?.length || 0)
    console.log('Answer key:', answerKey)
    console.log('Scoring:', scoring)

    // Let the AI service handle base64 validation
    const result = await AIService.analyzeOMRSheet(image, answerKey, scoring)

    res.json({
      success: true,
      message: 'OMR varaq muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('OMR tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/analyze-text
 * Matnni tahlil qilish va yaxshilash
 */
router.post('/analyze-text', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = textAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { text, context } = value

    const result = await AIService.analyzeText(text, context)

    res.json({
      success: true,
      message: 'Matn muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Matn tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * POST /api/ai/analyze-questions
 * Imtihon savollarini tahlil qilish
 */
router.post('/analyze-questions', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = questionAnalysisSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validatsiya xatosi',
        errors: error.details.map(detail => detail.message)
      })
    }

    const { questions } = value

    const result = await AIService.analyzeQuestions(questions)

    res.json({
      success: true,
      message: 'Savollar muvaffaqiyatli tahlil qilindi',
      data: result
    })

  } catch (error) {
    console.error('Savol tahlil xatosi:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server xatosi'
    })
  }
})

/**
 * GET /api/ai/status
 * AI service holatini tekshirish
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.GROQ_API_KEY
    
    console.log('=== AI STATUS CHECK ===')
    console.log('GROQ_API_KEY exists:', hasApiKey)
    console.log('GROQ_API_KEY length:', process.env.GROQ_API_KEY?.length || 0)
    
    res.json({
      success: true,
      message: 'AI service holati',
      data: {
        available: hasApiKey,
        provider: 'Groq',
        models: [
          'meta-llama/llama-4-scout-17b-16e-instruct',
          'meta-llama/llama-4-maverick-17b-128e-instruct',
          'llama-3.1-70b-versatile'
        ],
        features: [
          'Rasm tahlili',
          'Matn yaxshilash',
          'Savol tahlili'
        ]
      }
    })

  } catch (error) {
    console.error('AI status xatosi:', error)
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    })
  }
})

export default router