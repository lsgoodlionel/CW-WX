import { useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { reportsApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { today } from '@/utils/date'
import { int, money, yuan } from '@/utils/format'
import { Card, DateField, Empty, Loading, Segmented, StatTile, Tag } from '@/components/ui'
import MiniBars from '@/components/business/MiniBars'
import './index.scss'

type PeriodType = 'day' | 'month' | 'quarter' | 'year'

const PERIOD_OPTIONS = [
  { value: 'day' as const, label: '日' },
  { value: 'month' as const, label: '月' },
  { value: 'quarter' as const, label: '季' },
  { value: 'year' as const, label: '年' },
]

interface Shortcut {
  key: string
  label: string
  icon: string
  module: string
  url: string
}

const SHORTCUTS: Shortcut[] = [
  { key: 'voucher', label: '新建凭证', icon: '🧾', module: 'voucher', url: '/pkgBook/voucher/edit' },
  { key: 'report', label: '财务报表', icon: '📊', module: 'report', url: '/pkgBook/report/index' },
  { key: 'ledger', label: '会计账簿', icon: '📚', module: 'ledger', url: '/pkgBook/ledger/index' },
  { key: 'expense', label: '费用报销', icon: '💰', module: 'expense', url: '/pkgFlow/expense/index' },
  { key: 'apply', label: '费用申请', icon: '📝', module: 'expense_apply', url: '/pkgFlow/apply/index' },
  { key: 'customer', label: '往来单位', icon: '🏢', module: 'customer', url: '/pkgBook/customer/index' },
]

export default function HomePage() {
  const { user } = useAuth()
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [refDate, setRefDate] = useState(today())

  const { data, loading, reload } = useAsync(
    () => reportsApi.dashboard({ period_type: periodType, ref_date: refDate }),
    [periodType, refDate],
  )

  usePullDownRefresh(() => {
    reload()
    setTimeout(() => Taro.stopPullDownRefresh(), 600)
  })

  const shortcuts = SHORTCUTS.filter((s) => hasPerm(user, s.module, 'view'))

  if (loading && !data) {
    return (
      <View className="page-body">
        <Loading text="正在加载仪表盘" />
      </View>
    )
  }

  if (!data) {
    return (
      <View className="page-body">
        <Empty text="暂无数据,请下拉刷新或检查服务器设置" mark="📡" />
      </View>
    )
  }

  const expenseTotal = data.expense_breakdown.reduce((s, e) => s + Math.abs(e.amount), 0)

  return (
    <View className="home">
      {/* 顶部资金概览:整页最重的信息,用深色渐变面板拉开层级 */}
      <View className="home__hero">
        <Text className="home__hero-label">货币资金合计</Text>
        <Text className="home__hero-value u-num">{yuan(data.money.total)}</Text>
        <View className="home__hero-split">
          <View className="home__hero-cell">
            <Text className="home__hero-cell-label">银行存款</Text>
            <Text className="home__hero-cell-value u-num">{money(data.money.bank)}</Text>
          </View>
          <View className="home__hero-cell">
            <Text className="home__hero-cell-label">库存现金</Text>
            <Text className="home__hero-cell-value u-num">{money(data.money.cash)}</Text>
          </View>
          <View className="home__hero-cell">
            <Text className="home__hero-cell-label">其他货币资金</Text>
            <Text className="home__hero-cell-value u-num">{money(data.money.other)}</Text>
          </View>
        </View>
      </View>

      <View className="home__body">
        <Card>
          <Segmented
            value={periodType}
            options={PERIOD_OPTIONS}
            onChange={(v) => setPeriodType(v)}
          />
          <DateField label="参考日期" value={refDate} onChange={setRefDate} />
          <View className="u-row u-gap-s" style={{ paddingTop: '16rpx' }}>
            <Tag tone="blue">{data.period.label}</Tag>
            <Text className="u-muted" style={{ fontSize: '20rpx' }}>
              {data.period.start} ~ {data.period.end}
            </Text>
          </View>
        </Card>

        <View className="home__grid">
          <StatTile label={`营业收入(${data.period.label})`} value={money(data.revenue)} suffix="元" tone="up" />
          <StatTile label={`总支出(${data.period.label})`} value={money(data.expense)} suffix="元" tone="down" />
        </View>
        <View className="home__grid">
          <StatTile
            label="净利润"
            value={money(data.net_profit)}
            suffix="元"
            tone={data.net_profit >= 0 ? 'up' : 'down'}
          />
          <StatTile label="本期凭证数" value={int(data.voucher_count)} suffix="张" tone="brand" />
        </View>
        <View className="home__grid">
          <StatTile label="应收账款" value={money(data.receivable)} suffix="元" tone="up" />
          <StatTile label="应付账款" value={money(data.payable)} suffix="元" tone="down" />
          <StatTile label="应交税费" value={money(data.tax_payable)} suffix="元" tone="warn" />
        </View>

        <Card title="待办 / 运营概览" flush>
          <View className="home__ops">
            <OpsCell
              label="审批进行中"
              value={data.ops.workflow_pending}
              onClick={() => Taro.switchTab({ url: '/pages/approval/index' })}
            />
            <OpsCell
              label="待生成凭证"
              value={data.ops.claim_approved}
              onClick={() => Taro.navigateTo({ url: '/pkgFlow/expense/index' })}
            />
            <OpsCell
              label="报销审批中"
              value={data.ops.claim_pending}
              onClick={() => Taro.navigateTo({ url: '/pkgFlow/expense/index' })}
            />
            <OpsCell
              label="费用申请待审"
              value={data.ops.apply_pending}
              onClick={() => Taro.navigateTo({ url: '/pkgFlow/apply/index' })}
            />
            <OpsCell
              label="往来单位"
              value={data.ops.customers}
              onClick={() => Taro.navigateTo({ url: '/pkgBook/customer/index' })}
            />
            <OpsCell
              label="在册员工"
              value={data.ops.employees}
              onClick={() => Taro.navigateTo({ url: '/pkgSys/personnel/index' })}
            />
          </View>
        </Card>

        {shortcuts.length ? (
          <Card title="快捷入口" flush>
            <View className="home__ops">
              {shortcuts.map((s) => (
                <View
                  key={s.key}
                  className="home__shortcut"
                  onClick={() => Taro.navigateTo({ url: s.url })}
                >
                  <Text className="home__shortcut-icon">{s.icon}</Text>
                  <Text className="home__shortcut-label">{s.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        <Card title="近 6 个月收入 / 净利润">
          {data.trend.length === 0 ? (
            <Empty text="暂无趋势数据" mark="📈" />
          ) : (
            <MiniBars
              primaryLabel="营业收入"
              secondaryLabel="净利润"
              data={data.trend.map((t) => ({
                key: t.month,
                label: t.month,
                value: t.revenue,
                secondary: t.net_profit,
              }))}
            />
          )}
        </Card>

        <Card title={`支出构成(${data.period.label})`}>
          {data.expense_breakdown.length === 0 ? (
            <Empty text="本期无支出" mark="🧮" />
          ) : (
            <View>
              {data.expense_breakdown.map((e) => (
                <View key={e.code} className="home__exp">
                  <View className="u-row-between">
                    <Text className="home__exp-name">{e.name}</Text>
                    <Text className="home__exp-value u-num">{yuan(e.amount)}</Text>
                  </View>
                  <View className="home__exp-track">
                    <View
                      className="home__exp-fill"
                      style={{
                        width: `${expenseTotal ? Math.round((Math.abs(e.amount) / expenseTotal) * 100) : 0}%`,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </View>
    </View>
  )
}

function OpsCell({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick: () => void
}) {
  return (
    <View className="home__ops-cell" onClick={onClick}>
      <Text className={`home__ops-value ${value ? 'home__ops-value--active' : ''} u-num`}>
        {value}
      </Text>
      <Text className="home__ops-label">{label}</Text>
    </View>
  )
}
