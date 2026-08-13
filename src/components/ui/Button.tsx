import { ReactNode } from 'react'
import { View } from '@tarojs/components'

export type ButtonTone = 'primary' | 'default' | 'ghost' | 'danger'

interface ButtonProps {
  tone?: ButtonTone
  size?: 'normal' | 'small'
  block?: boolean
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
  children: ReactNode
}

export default function Button({
  tone = 'default',
  size = 'normal',
  block,
  disabled,
  loading,
  className,
  onClick,
  children,
}: ButtonProps) {
  const inert = disabled || loading
  const classes = [
    'ui-btn',
    `ui-btn--${tone}`,
    size === 'small' ? 'ui-btn--small' : '',
    block ? 'ui-btn--block' : '',
    inert ? 'ui-btn--disabled' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <View
      className={classes}
      hoverClass={inert ? 'none' : 'ui-btn__hover'}
      onClick={() => {
        if (!inert) onClick?.()
      }}
    >
      {loading ? '处理中…' : children}
    </View>
  )
}
