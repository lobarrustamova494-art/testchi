import jwt from 'jsonwebtoken'

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign(
    { userId },
    secret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'omr-admin',
      audience: 'omr-users'
    }
  )
}

export const verifyToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'omr-admin',
      audience: 'omr-users'
    }) as { userId: string }
    
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}