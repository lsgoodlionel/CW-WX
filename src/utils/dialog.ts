import Taro from '@tarojs/taro'

/** 二次确认,替代 antd 的 Popconfirm / Modal.confirm。 */
export async function confirm(
  content: string,
  options: { title?: string; confirmText?: string; danger?: boolean } = {},
): Promise<boolean> {
  const { title = '确认操作', confirmText = '确定', danger } = options
  const res = await Taro.showModal({
    title,
    content,
    confirmText,
    cancelText: '取消',
    confirmColor: danger ? '#cf1322' : '#1f6feb',
  })
  return Boolean(res.confirm)
}

// showModal 的可编辑模式(editable / placeholderText / content)在 Taro 类型里缺失,这里补齐
interface EditableModalOption extends Taro.showModal.Option {
  editable?: boolean
  placeholderText?: string
}
interface EditableModalResult extends Taro.showModal.SuccessCallbackResult {
  content?: string
}

/** 带输入框的确认(审批意见等)。 */
export async function prompt(
  title: string,
  placeholder = '',
): Promise<{ ok: boolean; value: string }> {
  const option: EditableModalOption = {
    title,
    editable: true,
    placeholderText: placeholder,
    confirmText: '确定',
    cancelText: '取消',
  }
  const res = (await Taro.showModal(option)) as EditableModalResult
  return { ok: Boolean(res.confirm), value: res.content || '' }
}

export function success(title: string): void {
  Taro.showToast({ title, icon: 'success' })
}

export function notify(title: string): void {
  Taro.showToast({ title, icon: 'none', duration: 2500 })
}
