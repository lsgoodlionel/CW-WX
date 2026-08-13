import { ReactNode } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Button from './Button'

interface SheetProps {
  open: boolean
  title?: ReactNode
  okText?: string
  cancelText?: string
  /** 传 null 隐藏底部按钮栏 */
  footer?: ReactNode | null
  confirmLoading?: boolean
  onOk?: () => void
  onClose: () => void
  children: ReactNode
}

/** 底部弹出面板,替代 Web 版的 Modal / Drawer。 */
export default function Sheet({
  open,
  title,
  okText = '保存',
  cancelText = '取消',
  footer,
  confirmLoading,
  onOk,
  onClose,
  children,
}: SheetProps) {
  if (!open) return null

  const showDefaultFooter = footer === undefined && Boolean(onOk)

  return (
    <>
      <View className="ui-modal__mask" onClick={onClose} />
      <View className="ui-modal__sheet">
        <View className="ui-modal__head">
          <Text className="ui-modal__title">{title}</Text>
          <Text className="ui-modal__close" onClick={onClose}>
            ✕
          </Text>
        </View>
        <ScrollView scrollY className="ui-modal__body">
          {children}
        </ScrollView>
        {showDefaultFooter ? (
          <View className="ui-modal__foot">
            <Button onClick={onClose}>{cancelText}</Button>
            <Button tone="primary" loading={confirmLoading} onClick={onOk}>
              {okText}
            </Button>
          </View>
        ) : footer ? (
          <View className="ui-modal__foot">{footer}</View>
        ) : null}
      </View>
    </>
  )
}
