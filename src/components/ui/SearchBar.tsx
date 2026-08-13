import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'

interface SearchBarProps {
  placeholder?: string
  defaultValue?: string
  onSearch: (keyword: string) => void
}

export default function SearchBar({
  placeholder = '搜索',
  defaultValue = '',
  onSearch,
}: SearchBarProps) {
  const [text, setText] = useState(defaultValue)

  return (
    <View className="ui-search">
      <Text className="ui-search__icon">🔍</Text>
      <Input
        className="ui-search__input"
        value={text}
        placeholder={placeholder}
        confirmType="search"
        onInput={(e) => setText(e.detail.value)}
        onConfirm={(e) => onSearch(e.detail.value)}
      />
      {text ? (
        <Text
          className="ui-search__clear"
          onClick={() => {
            setText('')
            onSearch('')
          }}
        >
          ✕
        </Text>
      ) : null}
    </View>
  )
}
