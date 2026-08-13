import Taro from '@tarojs/taro'
import type { Attachment } from '@/types/models'
import { apiUrl } from './env'
import { toast, uploadFile } from './request'
import { withToken } from './token'

const IMAGE_EXT = /\.(png|jpe?g|gif|bmp|webp)$/i
const OPENABLE_EXT = /\.(pdf|docx?|xlsx?|pptx?)$/i

/** 附件预览 / 下载直链(带令牌) */
export function attachmentUrl(id: number, mode: 'preview' | 'download'): string {
  return withToken(apiUrl(`/attachments/${id}/${mode}`))
}

/** 让用户选择图片或聊天文件,返回本地临时路径与文件名。 */
export async function pickFile(): Promise<{ path: string; name: string } | null> {
  const { tapIndex } = await Taro.showActionSheet({
    itemList: ['从相册/相机选择图片', '从聊天记录选择文件'],
  }).catch(() => ({ tapIndex: -1 }))

  if (tapIndex === 0) {
    const res = await Taro.chooseImage({ count: 1, sizeType: ['original', 'compressed'] })
    const path = res.tempFilePaths[0]
    if (!path) return null
    return { path, name: path.split('/').pop() || 'image.jpg' }
  }
  if (tapIndex === 1) {
    const res = await Taro.chooseMessageFile({ count: 1, type: 'file' })
    const file = res.tempFiles[0]
    if (!file) return null
    return { path: file.path, name: file.name }
  }
  return null
}

/** 上传附件到指定单据。basePath 形如 '/vouchers'、'/expense/claims'、'/expense-apply'。 */
export async function uploadAttachment(
  basePath: string,
  ownerId: number,
  kind: string,
): Promise<Attachment | null> {
  const picked = await pickFile()
  if (!picked) return null

  Taro.showLoading({ title: '上传中…', mask: true })
  try {
    const attachment = await uploadFile<Attachment>(
      `${basePath}/${ownerId}/attachments`,
      picked.path,
      { kind },
    )
    Taro.hideLoading()
    Taro.showToast({ title: '附件已上传', icon: 'success' })
    return attachment
  } catch {
    Taro.hideLoading()
    return null
  }
}

/**
 * 预览附件:图片走 previewImage,可打开的文档走 downloadFile + openDocument,
 * 其余类型提示不支持。
 */
export async function previewAttachment(attachment: Attachment): Promise<void> {
  const url = attachmentUrl(attachment.id, 'preview')
  const name = attachment.original_name || ''
  const mime = attachment.mime_type || ''

  if (mime.startsWith('image/') || IMAGE_EXT.test(name)) {
    await Taro.previewImage({ urls: [url], current: url })
    return
  }

  // openDocument 只认扩展名式的 fileType,优先取文件名后缀,其次按 mime 兜底
  const ext = (name.match(OPENABLE_EXT)?.[1] || '').toLowerCase()
  const fileType = ext || (mime === 'application/pdf' ? 'pdf' : '')
  if (!fileType) {
    toast(`该类型(${mime || '未知'})暂不支持在小程序内预览,请到网页端查看`)
    return
  }

  Taro.showLoading({ title: '打开中…', mask: true })
  try {
    const res = await Taro.downloadFile({ url })
    Taro.hideLoading()
    if (res.statusCode !== 200) {
      toast(`下载失败(${res.statusCode})`)
      return
    }
    await Taro.openDocument({
      filePath: res.tempFilePath,
      fileType: fileType as 'pdf',
      showMenu: true,
    })
  } catch {
    Taro.hideLoading()
    toast('无法打开该附件,请到网页端查看')
  }
}
