import { ReactNode } from 'react'
import { Text } from '@tarojs/components'

export type TagTone = 'default' | 'blue' | 'success' | 'warning' | 'danger' | 'purple'

interface TagProps {
  tone?: TagTone | string
  className?: string
  onClick?: () => void
  children: ReactNode
}

const TONES = new Set(['default', 'blue', 'success', 'warning', 'danger', 'purple'])

export default function Tag({ tone = 'default', className, onClick, children }: TagProps) {
  const safeTone = TONES.has(tone) ? tone : 'default'
  return (
    <Text className={`ui-tag ui-tag--${safeTone} ${className || ''}`} onClick={onClick}>
      {children}
    </Text>
  )
}
