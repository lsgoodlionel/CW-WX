import { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'

export function Empty({ text = '暂无数据', mark = '📋' }: { text?: string; mark?: string }) {
  return (
    <View className="ui-empty">
      <Text className="ui-empty__mark">{mark}</Text>
      <Text>{text}</Text>
    </View>
  )
}

export function Loading({ text = '加载中' }: { text?: string }) {
  return (
    <View className="ui-loading">
      <View className="ui-loading__dot" />
      <View className="ui-loading__dot" />
      <View className="ui-loading__dot" />
      <View>{text}</View>
    </View>
  )
}

interface AlertProps {
  tone?: 'info' | 'warning' | 'danger'
  children: ReactNode
}

export function Alert({ tone = 'info', children }: AlertProps) {
  const mark = tone === 'info' ? 'ℹ️' : tone === 'warning' ? '⚠️' : '⛔'
  return (
    <View className={`ui-alert ui-alert--${tone}`}>
      <Text>{mark}</Text>
      <View className="u-grow">{children}</View>
    </View>
  )
}
