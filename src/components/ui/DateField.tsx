import { ReactNode } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import { FieldShell } from './Field'

interface DateFieldProps {
  label?: ReactNode
  value: string
  placeholder?: string
  required?: boolean
  hint?: ReactNode
  stack?: boolean
  start?: string
  end?: string
  onChange: (value: string) => void
}

/** 日期选择,基于小程序原生 picker(mode=date)。 */
export default function DateField({
  label,
  value,
  placeholder = '选择日期',
  required,
  hint,
  stack,
  start,
  end,
  onChange,
}: DateFieldProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} stack={stack}>
      <Picker
        mode="date"
        value={value}
        start={start}
        end={end}
        onChange={(e) => onChange(String(e.detail.value))}
      >
        <View className={`ui-field__picker ${value ? '' : 'ui-field__picker--empty'}`}>
          <Text className="u-grow">{value || placeholder}</Text>
          <Text className="ui-field__arrow">📅</Text>
        </View>
      </Picker>
    </FieldShell>
  )
}
