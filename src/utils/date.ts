/** 轻量日期工具:仅覆盖本项目用到的场景,避免引入 dayjs。 */

const pad = (n: number): string => String(n).padStart(2, '0')

export function today(): string {
  return toDateStr(new Date())
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function currentYear(): number {
  return new Date().getFullYear()
}

export function currentMonth(): number {
  return new Date().getMonth() + 1
}

export function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1
}

/** 某年某月最后一天,如 (2025, 2) → '2025-02-28' */
export function endOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return toDateStr(d)
}

export function startOfMonth(year: number, month: number): string {
  return `${year}-${pad(month)}-01`
}

/** 报表口径:按月/季/年算出起止日期 */
export function periodRange(
  reportType: 'month' | 'quarter' | 'year',
  year: number,
  month: number,
  quarter: number,
): { start: string; end: string } {
  if (reportType === 'year') {
    return { start: `${year}-01-01`, end: endOfMonth(year, 12) }
  }
  if (reportType === 'quarter') {
    const startMonth = (quarter - 1) * 3 + 1
    return { start: startOfMonth(year, startMonth), end: endOfMonth(year, quarter * 3) }
  }
  return { start: startOfMonth(year, month), end: endOfMonth(year, month) }
}

/** 最近 n 年,从今年倒序 */
export function recentYears(n: number): number[] {
  const y = currentYear()
  return Array.from({ length: n }, (_, i) => y - i)
}

/** 相对今天偏移若干天 */
export function shiftDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}
