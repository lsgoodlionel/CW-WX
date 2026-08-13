import { ReactNode, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'

interface FieldShellProps {
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  /** 标签在上、控件在下(适合长文本) */
  stack?: boolean
  children: ReactNode
}

export function FieldShell({ label, required, hint, stack, children }: FieldShellProps) {
  return (
    <View className={`ui-field ${stack ? 'ui-field--stack' : ''}`}>
      {label ? (
        <Text className="ui-field__label">
          {required ? <Text className="ui-field__required">*</Text> : null}
          {label}
        </Text>
      ) : null}
      <View className="ui-field__control">
        {children}
        {hint ? <View className="ui-field__hint">{hint}</View> : null}
      </View>
    </View>
  )
}

interface TextFieldProps {
  label?: ReactNode
  value: string
  placeholder?: string
  required?: boolean
  hint?: ReactNode
  stack?: boolean
  password?: boolean
  type?: 'text' | 'number' | 'digit' | 'idcard'
  onChange: (value: string) => void
}

export function TextField({
  label,
  value,
  placeholder,
  required,
  hint,
  stack,
  password,
  type = 'text',
  onChange,
}: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} hint={hint} stack={stack}>
      <Input
        className="ui-field__input"
        placeholderClass="ui-field__placeholder"
        value={value}
        type={type}
        password={password}
        placeholder={placeholder}
        onInput={(e) => onChange(e.detail.value)}
      />
    </FieldShell>
  )
}

interface NumberFieldProps {
  label?: ReactNode
  /** 接口读回的金额是字符串(后端 Decimal),用户输入后是数字 */
  value: number | string | null
  placeholder?: string
  required?: boolean
  hint?: ReactNode
  stack?: boolean
  /** 允许负数(红字冲销) */
  allowNegative?: boolean
  onChange: (value: number) => void
}

export function NumberField({
  label,
  value,
  placeholder,
  required,
  hint,
  stack,
  allowNegative,
  onChange,
}: NumberFieldProps) {
  // 保留用户正在输入的原始文本,否则 "1." / "-" 这类中间态会被 Number() 抹掉
  const [draft, setDraft] = useState<string | null>(null)
  const display = draft ?? (value === null || value === 0 || value === '' ? '' : String(value))

  return (
    <FieldShell label={label} required={required} hint={hint} stack={stack}>
      <Input
        className="ui-field__input"
        placeholderClass="ui-field__placeholder"
        // 小程序 digit 键盘不带负号,红字场景需要普通键盘
        type={allowNegative ? 'text' : 'digit'}
        value={display}
        placeholder={placeholder}
        onInput={(e) => {
          const raw = e.detail.value.replace(allowNegative ? /[^0-9.-]/g : /[^0-9.]/g, '')
          setDraft(raw)
          const n = Number(raw)
          onChange(raw === '' || !Number.isFinite(n) ? 0 : n)
        }}
        onBlur={() => setDraft(null)}
      />
    </FieldShell>
  )
}
