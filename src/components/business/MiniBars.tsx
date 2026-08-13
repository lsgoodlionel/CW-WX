import { View, Text } from '@tarojs/components'
import { money } from '@/utils/format'
import './mini-bars.scss'

export interface BarDatum {
  key: string
  label: string
  value: number
  /** 同一条目的第二个数值(如净利润) */
  secondary?: number
}

interface MiniBarsProps {
  data: BarDatum[]
  primaryLabel?: string
  secondaryLabel?: string
}

/**
 * 纯 CSS 条形图。小程序里 recharts 不可用,图表以「标签 + 数值 + 比例条」呈现,
 * 保留量级对比,不引入 canvas 依赖。
 */
export default function MiniBars({ data, primaryLabel, secondaryLabel }: MiniBarsProps) {
  const max = Math.max(
    1,
    ...data.map((d) => Math.max(Math.abs(d.value), Math.abs(d.secondary ?? 0))),
  )
  const hasSecondary = data.some((d) => d.secondary !== undefined)

  return (
    <View className="bars">
      {hasSecondary ? (
        <View className="bars__legend">
          <Text className="bars__dot bars__dot--primary" />
          <Text className="bars__legend-text">{primaryLabel}</Text>
          <Text className="bars__dot bars__dot--secondary" />
          <Text className="bars__legend-text">{secondaryLabel}</Text>
        </View>
      ) : null}

      {data.map((d) => (
        <View key={d.key} className="bars__row">
          <View className="u-row-between">
            <Text className="bars__label">{d.label}</Text>
            <Text className="bars__value u-num">{money(d.value)}</Text>
          </View>
          <View className="bars__track">
            <View
              className="bars__fill bars__fill--primary"
              style={{ width: `${Math.min(100, (Math.abs(d.value) / max) * 100)}%` }}
            />
          </View>
          {d.secondary !== undefined ? (
            <>
              <View className="u-row-between">
                <Text className="bars__sub">{secondaryLabel}</Text>
                <Text className="bars__sub u-num">{money(d.secondary)}</Text>
              </View>
              <View className="bars__track">
                <View
                  className={`bars__fill ${d.secondary < 0 ? 'bars__fill--negative' : 'bars__fill--secondary'}`}
                  style={{ width: `${Math.min(100, (Math.abs(d.secondary) / max) * 100)}%` }}
                />
              </View>
            </>
          ) : null}
        </View>
      ))}
    </View>
  )
}
