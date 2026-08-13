/**
 * 文案与配色。
 *
 * 业务枚举文案(*_LABEL)来自共享契约 shared/contract/labels.ts,与 Web 端同源;
 * 下面的 *_TONE 是小程序自建 UI 组件的色板映射,属于表现层,不进共享契约。
 */
import type { Category } from '@/types/models'

export * from '@/shared/labels'

/** Tag 组件的色调:default | blue | success | warning | danger | purple */
export const CATEGORY_TONE: Record<Category, string> = {
  asset: 'blue',
  liability: 'warning',
  equity: 'purple',
  cost: 'blue',
  profit: 'success',
}

export const PARTY_TONE: Record<string, string> = {
  enterprise: 'blue',
  individual: 'success',
  supplier: 'warning',
  partner: 'purple',
}

export const ROLE_TONE: Record<string, string> = {
  shareholder: 'warning',
  management: 'blue',
  staff: 'default',
  other: 'purple',
}

export const WF_STATUS_TONE: Record<string, string> = {
  pending: 'blue',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
}

export const STEP_STATE_TONE: Record<string, string> = {
  approved: 'success',
  rejected: 'danger',
  current: 'blue',
  upcoming: 'default',
  skipped: 'default',
}

/** 费用申请单 / 报销单共用一套状态色 */
export const DOC_STATUS_TONE: Record<string, string> = {
  draft: 'default',
  pending: 'blue',
  approved: 'success',
  rejected: 'danger',
  paid: 'warning',
  closed: 'warning',
}

export const LOG_TYPE_TONE: Record<string, string> = {
  voucher: 'blue',
  account: 'blue',
  attachment: 'purple',
  company: 'purple',
  customer: 'warning',
  personnel: 'purple',
  report: 'success',
  ledger: 'success',
  data: 'danger',
  other: 'default',
}
