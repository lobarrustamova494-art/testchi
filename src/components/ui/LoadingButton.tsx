import React from 'react'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  variant = 'default',
  size = 'md',
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={`relative ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" color="current" />
          <span>{loadingText || 'Yuklanmoqda...'}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </div>
      )}
    </Button>
  )
}

export default LoadingButton