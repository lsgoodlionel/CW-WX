import { View, Text } from '@tarojs/components'

export type StatTone = 'normal' | 'up' | 'down' | 'brand' | 'warn'

interface StatTileProps {
  label: string
  value: string
  suffix?: string
  tone?: StatTone
  onClick?: () => void
}

export default function StatTile({ label, value, suffix, tone = 'normal', onClick }: StatTileProps) {
  return (
    <View className="ui-stat" onClick={onClick}>
      <Text className="ui-stat__label">{label}</Text>
      <View className={`ui-stat__value ${tone === 'normal' ? '' : `ui-stat__value--${tone}`}`}>
        {value}
        {suffix ? <Text className="ui-stat__suffix">{suffix}</Text> : null}
      </View>
    </View>
  )
}
