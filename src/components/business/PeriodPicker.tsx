import { View } from '@tarojs/components'
import { Segmented, SelectField } from '@/components/ui'
import { recentYears } from '@/utils/date'

export type PeriodType = 'month' | 'quarter' | 'year'

export interface PeriodValue {
  reportType: PeriodType
  year: number
  month: number
  quarter: number
}

interface PeriodPickerProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
}

const YEAR_OPTIONS = recentYears(8).map((y) => ({ value: y, label: `${y}年` }))
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
const QUARTER_OPTIONS = [1, 2, 3, 4].map((q) => ({ value: q, label: `第${q}季度` }))

/** 月 / 季 / 年 期间选择器,报表、账簿、日志共用。 */
export default function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  return (
    <View>
      <Segmented
        value={value.reportType}
        options={[
          { value: 'month', label: '月' },
          { value: 'quarter', label: '季' },
          { value: 'year', label: '年' },
        ]}
        onChange={(reportType) => onChange({ ...value, reportType })}
      />
      <SelectField
        label="年度"
        value={value.year}
        options={YEAR_OPTIONS}
        clearable={false}
        onChange={(year) => onChange({ ...value, year: year ?? value.year })}
      />
      {value.reportType === 'month' ? (
        <SelectField
          label="月份"
          value={value.month}
          options={MONTH_OPTIONS}
          clearable={false}
          searchThreshold={99}
          onChange={(month) => onChange({ ...value, month: month ?? value.month })}
        />
      ) : null}
      {value.reportType === 'quarter' ? (
        <SelectField
          label="季度"
          value={value.quarter}
          options={QUARTER_OPTIONS}
          clearable={false}
          onChange={(quarter) => onChange({ ...value, quarter: quarter ?? value.quarter })}
        />
      ) : null}
    </View>
  )
}

/** 生成后端要的查询参数 */
export function periodParams(value: PeriodValue): Record<string, number | string> {
  const params: Record<string, number | string> = {
    report_type: value.reportType,
    year: value.year,
  }
  if (value.reportType === 'month') params.month = value.month
  if (value.reportType === 'quarter') params.quarter = value.quarter
  return params
}
