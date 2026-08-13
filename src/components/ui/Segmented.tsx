import { Text, ScrollView } from '@tarojs/components'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  // NoInfer:泛型只从 options 推断,避免直接传 setState 时把 T 推成 string
  value: NoInfer<T>
  options: SegmentOption<T>[]
  onChange: (value: NoInfer<T>) => void
}

export default function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <ScrollView scrollX className="ui-seg">
      {options.map((o) => (
        <Text
          key={o.value}
          className={`ui-seg__item ${o.value === value ? 'ui-seg__item--active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Text>
      ))}
    </ScrollView>
  )
}
