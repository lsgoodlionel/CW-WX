import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { accountsApi, ledgersApi } from '@/services/api'
import { downloadAndOpen } from '@/services/request'
import { useAsync } from '@/hooks/useAsync'
import PeriodPicker, { periodParams, type PeriodValue } from '@/components/business/PeriodPicker'
import { LEDGER_TYPE_LABEL } from '@/constants/labels'
import { currentMonth, currentQuarter, currentYear } from '@/utils/date'
import { cell } from '@/utils/format'
import { Alert, Button, Card, DataTable, Empty, Loading, SelectField, Tag } from '@/components/ui'
import './index.scss'

const LEDGER_OPTIONS = Object.entries(LEDGER_TYPE_LABEL).map(([value, label]) => ({ value, label }))

/** 账簿列宽:前三列偏文本、其后为金额列 */
const columnWidth = (index: number, total: number): number => {
  if (index === 0) return 110
  if (index === 1) return 150
  if (index === 2) return total <= 5 ? 240 : 200
  return 180
}

export default function LedgerPage() {
  const [ledgerType, setLedgerType] = useState('general')
  const [accountCode, setAccountCode] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodValue>({
    reportType: 'month',
    year: currentYear(),
    month: currentMonth(),
    quarter: currentQuarter(),
  })
  const [filterOpen, setFilterOpen] = useState(true)

  const { data: accounts } = useAsync(() => accountsApi.list(), [])

  const params = useMemo(
    () => ({
      ...periodParams(period),
      ledger_type: ledgerType,
      ...(accountCode ? { account_code: accountCode } : {}),
    }),
    [period, ledgerType, accountCode],
  )

  const { data, loading } = useAsync(() => ledgersApi.query(params), [params])

  const exportExcel = (all: boolean) =>
    downloadAndOpen('/ledgers/export-excel', { ...params, ledger_type: all ? 'all' : ledgerType }, 'xlsx')

  return (
    <View className="page-body">
      <Card
        title="账簿筛选"
        extra={
          <Text className="ui-link" onClick={() => setFilterOpen((v) => !v)}>
            {filterOpen ? '收起' : '展开'}
          </Text>
        }
      >
        <SelectField
          label="账簿种类"
          value={ledgerType}
          options={LEDGER_OPTIONS}
          clearable={false}
          onChange={(v) => setLedgerType(v || 'general')}
        />
        {filterOpen ? (
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            <SelectField
              label="会计科目"
              value={accountCode}
              options={(accounts || []).map((a) => ({
                value: a.code,
                label: `${a.code} ${a.name}`,
                keywords: a.name,
              }))}
              placeholder="全部科目"
              onChange={setAccountCode}
            />
          </>
        ) : null}
        <View className="u-row u-gap-s u-wrap" style={{ paddingTop: '16rpx' }}>
          <Button tone="primary" size="small" onClick={() => exportExcel(false)}>
            导出本账簿
          </Button>
          <Button size="small" onClick={() => exportExcel(true)}>
            导出全套账簿
          </Button>
        </View>
      </Card>

      {data?.note ? <Alert>{data.note}</Alert> : null}

      {data ? (
        <View className="ledger__title">
          <Tag tone="blue">
            {data.title} · {data.period_label}
          </Tag>
        </View>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {data && data.groups.length === 0 ? <Empty text="本期无账簿数据" mark="📚" /> : null}

      {data?.groups.map((group, gi) => {
        const columns = group.columns ?? data.columns
        return (
          <Card key={gi} title={`科目:${group.title}`} flush>
            <DataTable
              columns={columns.map((title, i) => ({
                title,
                width: columnWidth(i, columns.length),
                align: i >= 3 ? 'right' : i === 2 ? 'left' : 'center',
              }))}
              rows={group.rows.map((row, ri) => ({
                key: String(ri),
                summary: row.is_summary,
                cells: columns.map((_, ci) => cell(row.cells[ci])),
              }))}
              emptyText="本科目无发生额"
            />
          </Card>
        )
      })}
    </View>
  )
}
