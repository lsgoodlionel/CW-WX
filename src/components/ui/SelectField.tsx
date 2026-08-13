import { ReactNode, useMemo, useState } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { FieldShell } from './Field'

export interface Option<T = string | number> {
  value: T
  label: string
  /** 参与搜索的额外文本 */
  keywords?: string
}

interface SelectFieldProps<T extends string | number> {
  label?: ReactNode
  // NoInfer:泛型只从 options 推断,避免直接传 setState 时把 T 推成整个约束
  value: NoInfer<T> | null | undefined
  options: Option<T>[]
  placeholder?: string
  required?: boolean
  hint?: ReactNode
  stack?: boolean
  clearable?: boolean
  /** 选项超过该数量时显示搜索框 */
  searchThreshold?: number
  disabled?: boolean
  onChange: (value: NoInfer<T> | null) => void
}

/**
 * 下拉选择:点击后从底部弹出可搜索的选项面板。
 * 替代 Web 版 antd Select(小程序原生 picker 不支持搜索)。
 */
export default function SelectField<T extends string | number>({
  label,
  value,
  options,
  placeholder = '请选择',
  required,
  hint,
  stack,
  clearable = true,
  searchThreshold = 8,
  disabled,
  onChange,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')

  const selected = options.find((o) => o.value === value)
  const showSearch = options.length > searchThreshold

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(kw) || (o.keywords || '').toLowerCase().includes(kw),
    )
  }, [options, keyword])

  const close = () => {
    setOpen(false)
    setKeyword('')
  }

  return (
    <>
      <FieldShell label={label} required={required} hint={hint} stack={stack}>
        <View
          className={`ui-field__picker ${selected ? '' : 'ui-field__picker--empty'}`}
          onClick={() => {
            if (!disabled) setOpen(true)
          }}
        >
          <Text className="u-ellipsis u-grow">{selected ? selected.label : placeholder}</Text>
          <Text className="ui-field__arrow">▾</Text>
        </View>
      </FieldShell>

      {open ? (
        <>
          {/* 抬高层级,保证在 Sheet 内打开时盖住父弹层 */}
          <View className="ui-modal__mask ui-modal--top" onClick={close} />
          <View className="ui-modal__sheet ui-modal--top">
            <View className="ui-modal__head">
              <Text className="ui-modal__title">{label || '请选择'}</Text>
              <Text className="ui-modal__close" onClick={close}>
                ✕
              </Text>
            </View>
            {showSearch ? (
              <View style={{ padding: '16rpx 32rpx 0' }}>
                <View className="ui-search">
                  <Text className="ui-search__icon">🔍</Text>
                  <Input
                    className="ui-search__input"
                    value={keyword}
                    placeholder="搜索"
                    confirmType="search"
                    onInput={(e) => setKeyword(e.detail.value)}
                  />
                </View>
              </View>
            ) : null}
            <ScrollView scrollY className="ui-modal__body" style={{ maxHeight: '60vh' }}>
              {clearable ? (
                <View
                  className="ui-row-item"
                  onClick={() => {
                    onChange(null)
                    close()
                  }}
                >
                  <Text className="u-muted">不选择 / 清空</Text>
                </View>
              ) : null}
              {filtered.map((o) => (
                <View
                  key={String(o.value)}
                  className="ui-row-item"
                  onClick={() => {
                    onChange(o.value)
                    close()
                  }}
                >
                  <View className="ui-row-item__top">
                    <Text
                      className="u-grow"
                      style={o.value === value ? { color: '#1f6feb', fontWeight: 600 } : undefined}
                    >
                      {o.label}
                    </Text>
                    {o.value === value ? <Text style={{ color: '#1f6feb' }}>✓</Text> : null}
                  </View>
                </View>
              ))}
              {filtered.length === 0 ? (
                <View className="ui-empty">
                  <Text>没有匹配的选项</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </>
      ) : null}
    </>
  )
}
