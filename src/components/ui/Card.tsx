import { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'

interface CardProps {
  title?: ReactNode
  extra?: ReactNode
  /** body 不加内边距(用于承载列表) */
  flush?: boolean
  className?: string
  children?: ReactNode
}

export default function Card({ title, extra, flush, className, children }: CardProps) {
  return (
    <View className={`ui-card ${flush ? 'ui-card--flush' : ''} ${className || ''}`}>
      {(title || extra) && (
        <View className="ui-card__head">
          <Text className="ui-card__title">{title}</Text>
          {extra ? <View className="ui-card__extra">{extra}</View> : null}
        </View>
      )}
      <View className="ui-card__body">{children}</View>
    </View>
  )
}
