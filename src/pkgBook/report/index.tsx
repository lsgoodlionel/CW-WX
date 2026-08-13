import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import type { BalanceSheetRow, Statement } from '@/types/models'
import { reportsApi } from '@/services/api'
import { downloadAndOpen } from '@/services/request'
import { useAsync } from '@/hooks/useAsync'
import PeriodPicker, { periodParams, type PeriodValue } from '@/components/business/PeriodPicker'
import { currentMonth, currentQuarter, currentYear, periodRange } from '@/utils/date'
import { money } from '@/utils/format'
import {
  Button,
  Card,
  DataTable,
  Loading,
  Segmented,
  Tag,
  type TableRow,
} from '@/components/ui'
import './index.scss'

type ReportTab = 'bs' | 'is' | 'cf' | 'tb'

const TABS = [
  { value: 'bs' as const, label: '资产负债表' },
  { value: 'is' as const, label: '利润表' },
  { value: 'cf' as const, label: '现金流量表' },
  { value: 'tb' as const, label: '科目汇总表' },
]

const BOLD_STYLES = new Set(['total', 'grand', 'header', 'head'])

/** 按缩进层级还原模板的上下级隶属关系 */
const indentLabel = (label: string, indent?: number | null): string =>
  `${'　'.repeat(indent || 0)}${label}`

export default function ReportPage() {
  const [tab, setTab] = useState<ReportTab>('bs')
  const [period, setPeriod] = useState<PeriodValue>({
    reportType: 'month',
    year: currentYear(),
    month: currentMonth(),
    quarter: currentQuarter(),
  })
  const [filterOpen, setFilterOpen] = useState(false)

  const params = useMemo(() => periodParams(period), [period])

  const { data: official, loading } = useAsync(() => reportsApi.official(params), [params])

  const range = useMemo(
    () => periodRange(period.reportType, period.year, period.month, period.quarter),
    [period],
  )
  const { data: trial } = useAsync(() => reportsApi.trialBalance(range), [range])

  const periodText =
    period.reportType === 'year'
      ? `${period.year}年`
      : period.reportType === 'quarter'
        ? `${period.year}年第${period.quarter}季度`
        : `${period.year}年${period.month}月`

  return (
    <View className="page-body">
      <Card
        title="报表期间"
        extra={
          <Text className="ui-link" onClick={() => setFilterOpen((v) => !v)}>
            {filterOpen ? '收起' : periodText}
          </Text>
        }
      >
        {filterOpen ? <PeriodPicker value={period} onChange={setPeriod} /> : null}
        <View className="u-row u-gap-s u-wrap" style={{ paddingTop: '16rpx' }}>
          {official ? <Tag tone="blue">{official.period.label}</Tag> : null}
          <Button
            tone="primary"
            size="small"
            onClick={() => downloadAndOpen('/reports/export-excel', params, 'xlsx')}
          >
            导出 Excel
          </Button>
        </View>
      </Card>

      <Segmented value={tab} options={TABS} onChange={setTab} />

      <View style={{ marginTop: '24rpx' }}>
        {loading && !official ? <Loading /> : null}

        {official && tab === 'bs' ? (
          <BalanceSheetView
            assets={official.balance_sheet.assets}
            rights={official.balance_sheet.rights}
            balanced={official.balance_sheet.balanced}
            assetTotal={official.balance_sheet.asset_total}
          />
        ) : null}

        {official && tab === 'is' ? (
          <StatementView title="利润表(会小企02表)" data={official.income} />
        ) : null}

        {official && tab === 'cf' ? (
          <StatementView title="现金流量表(会小企03表)" data={official.cashflow} />
        ) : null}

        {tab === 'tb' ? (
          !trial ? (
            <Loading />
          ) : (
            <Card title="科目汇总表" flush>
              <View className="report__banner">
                <Tag tone={trial.balanced ? 'success' : 'danger'}>
                  {trial.balanced
                    ? `试算平衡 ✓ 借贷各 ${money(trial.total_debit)}`
                    : '试算不平衡 ✗'}
                </Tag>
              </View>
              <DataTable
                columns={[
                  { title: '科目', width: 280 },
                  { title: '借方发生额', width: 200, align: 'right' },
                  { title: '贷方发生额', width: 200, align: 'right' },
                  { title: '余额', width: 200, align: 'right' },
                ]}
                rows={trial.rows.map((r) => ({
                  key: r.code,
                  cells: [`${r.code} ${r.name}`, money(r.debit), money(r.credit), money(r.balance)],
                }))}
                emptyText="本期无发生额"
              />
            </Card>
          )
        ) : null}
      </View>
    </View>
  )
}

function BalanceSheetView({
  assets,
  rights,
  balanced,
  assetTotal,
}: {
  assets: BalanceSheetRow[]
  rights: BalanceSheetRow[]
  balanced: boolean
  assetTotal: number
}) {
  const toRows = (rows: BalanceSheetRow[]): TableRow[] =>
    rows.map((r, i) => ({
      key: `${r.line ?? 'x'}-${i}`,
      summary: BOLD_STYLES.has(r.style),
      cells: [
        indentLabel(r.label, r.indent),
        r.line === null || r.line === undefined ? '' : String(r.line),
        r.end === null ? '' : money(r.end),
        r.begin === null ? '' : money(r.begin),
      ],
    }))

  const columns = [
    { title: '项目', width: 300 },
    { title: '行次', width: 88, align: 'center' as const },
    { title: '期末余额', width: 200, align: 'right' as const },
    { title: '年初余额', width: 200, align: 'right' as const },
  ]

  return (
    <>
      <View className="report__banner">
        <Tag tone={balanced ? 'success' : 'danger'}>
          {balanced ? `资产 = 负债 + 所有者权益 ✓(${money(assetTotal)} 元)` : '未平衡 ✗'}
        </Tag>
      </View>
      {/* 手机端把左右两栏拆成上下两张表,保持行次与官方模板一致 */}
      <Card title="资产" flush>
        <DataTable columns={columns} rows={toRows(assets)} />
      </Card>
      <Card title="负债和所有者权益" flush>
        <DataTable columns={columns} rows={toRows(rights)} />
      </Card>
    </>
  )
}

function StatementView({ title, data }: { title: string; data: Statement }) {
  return (
    <Card title={title} flush>
      <DataTable
        columns={[
          { title: '项目', width: 320 },
          { title: '行次', width: 88, align: 'center' },
          { title: data.col1_label, width: 220, align: 'right' },
          { title: data.col2_label, width: 220, align: 'right' },
        ]}
        rows={data.rows.map((r, i) => ({
          key: `${r.line ?? 'x'}-${i}`,
          summary: BOLD_STYLES.has(r.style),
          cells: [
            indentLabel(r.label, r.indent),
            r.line === null || r.line === undefined ? '' : String(r.line),
            r.col1 === null ? '' : money(r.col1),
            r.col2 === null ? '' : money(r.col2),
          ],
        }))}
      />
    </Card>
  )
}
