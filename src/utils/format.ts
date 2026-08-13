/**
 * 数值与日期时间格式化(小程序环境不引入 dayjs / Intl 依赖)。
 * 金额部分直接复用共享契约里的实现 —— 后端 Decimal 会序列化成字符串,
 * 归一逻辑必须和 Web 端完全一致。
 */
import { formatAmount, formatYuan, toAmount, type AmountLike } from '@/shared/amount'

/** 两位小数 + 千分位,如 1,234.50 */
export const money = formatAmount

/** 带 ¥ 前缀,如 ¥1,234.50 */
export const yuan = formatYuan

/** 千分位整数 */
export function int(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 账簿单元格:数字走金额格式,其余原样 */
export function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return typeof value === 'number' ? money(value) : String(value)
}

export type { AmountLike }

/** 文件大小 */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** ISO 时间戳 → 'YYYY-MM-DD HH:mm:ss' */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  return iso.slice(0, 19).replace('T', ' ')
}

/** 解析数值输入,空值归零 */
export const toNumber = toAmount
