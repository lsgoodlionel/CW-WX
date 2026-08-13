import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { Attachment } from '@/types/models'
import { ATTACHMENT_KIND_LABEL } from '@/constants/labels'
import { attachmentsApi } from '@/services/api'
import { previewAttachment, uploadAttachment } from '@/services/attachments'
import { confirm, success } from '@/utils/dialog'
import { fileSize } from '@/utils/format'
import { Button, SelectField, Tag } from '@/components/ui'
import './attachment-bar.scss'

interface AttachmentBarProps {
  /** 单据 id;为空时先调用 ensureOwner 落库 */
  ownerId: number | null
  /** 附件端点前缀,如 '/vouchers'、'/expense/claims'、'/expense-apply' */
  basePath: string
  /** 新建场景:确保单据已保存并返回 id,返回 null 表示暂不能上传 */
  ensureOwner?: () => Promise<number | null>
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  canEdit?: boolean
  defaultKind?: string
}

// 审批记录由系统生成,不作为手动上传类型
const KIND_OPTIONS = Object.entries(ATTACHMENT_KIND_LABEL)
  .filter(([value]) => value !== 'approval')
  .map(([value, label]) => ({ value, label }))

/** 单据附件:选择后立即上传,支持预览、改类型、删除。 */
export default function AttachmentBar({
  ownerId,
  basePath,
  ensureOwner,
  attachments,
  onChange,
  canEdit = true,
  defaultKind = 'invoice',
}: AttachmentBarProps) {
  const [kind, setKind] = useState(defaultKind)
  const [busy, setBusy] = useState(false)

  const doUpload = async () => {
    let id = ownerId
    if (!id && ensureOwner) id = await ensureOwner()
    if (!id) return

    setBusy(true)
    try {
      const created = await uploadAttachment(basePath, id, kind)
      if (created) onChange([...attachments, created])
    } finally {
      setBusy(false)
    }
  }

  const remove = async (attachment: Attachment) => {
    const ok = await confirm(`删除附件「${attachment.original_name}」?`, { danger: true })
    if (!ok) return
    await attachmentsApi.remove(attachment.id)
    onChange(attachments.filter((a) => a.id !== attachment.id))
    success('附件已删除')
  }

  const changeKind = async (attachment: Attachment) => {
    const res = await Taro.showActionSheet({
      itemList: KIND_OPTIONS.map((k) => k.label),
    }).catch(() => null)
    const picked = res && KIND_OPTIONS[res.tapIndex]
    if (!picked || picked.value === attachment.kind) return

    await attachmentsApi.changeKind(attachment.id, picked.value)
    onChange(
      attachments.map((a) => (a.id === attachment.id ? { ...a, kind: picked.value } : a)),
    )
    success('附件类型已更新')
  }

  return (
    <View className="attach">
      {canEdit ? (
        <View className="attach__upload">
          <View className="u-grow">
            <SelectField
              label="附件类型"
              value={kind}
              options={KIND_OPTIONS}
              clearable={false}
              onChange={(v) => setKind(v || defaultKind)}
            />
          </View>
          <Button tone="ghost" size="small" loading={busy} onClick={doUpload}>
            + 上传附件
          </Button>
        </View>
      ) : null}

      {attachments.length === 0 ? (
        <Text className="u-muted">暂无附件</Text>
      ) : (
        attachments.map((a) => (
          <View key={a.id} className="attach__item">
            <View className="u-row-between u-gap-s">
              <Text className="attach__name u-grow u-ellipsis" onClick={() => previewAttachment(a)}>
                📎 {a.original_name}
              </Text>
              <Tag tone="blue">{ATTACHMENT_KIND_LABEL[a.kind] || a.kind}</Tag>
            </View>
            <View className="u-row-between attach__meta">
              <Text className="u-muted">{fileSize(a.size_bytes)}</Text>
              <View className="u-row u-gap-s">
                <Text className="ui-link" onClick={() => previewAttachment(a)}>
                  预览
                </Text>
                {canEdit && a.kind !== 'approval' ? (
                  <Text className="ui-link" onClick={() => changeKind(a)}>
                    改类型
                  </Text>
                ) : null}
                {canEdit ? (
                  <Text className="ui-link ui-link--danger" onClick={() => remove(a)}>
                    删除
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  )
}
