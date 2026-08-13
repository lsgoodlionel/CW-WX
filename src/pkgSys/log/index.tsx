import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReachBottom } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { LogItem } from '@/types/models'
import { logsApi } from '@/services/api'
import { downloadAndOpen } from '@/services/request'
import PeriodPicker, { type PeriodValue } from '@/components/business/PeriodPicker'
import { LOG_TYPE_TONE } from '@/constants/labels'
import { currentMonth, currentQuarter, currentYear } from '@/utils/date'
import { dateTime } from '@/utils/format'
import { Button, Card, Empty, Loading, SelectField, Tag } from '@/components/ui'
import './index.scss'

const PAGE_SIZE = 30

export default function LogPage() {
  const [period, setPeriod] = useState<PeriodValue>({
    reportType: 'month',
    year: currentYear(),
    month: currentMonth(),
    quarter: currentQuarter(),
  })
  const [actionType, setActionType] = useState<string | null>(null)
  const [types, setTypes] = useState<Record<string, string>>({})
  const [items, setItems] = useState<LogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  // 日志接口只按 year/month/quarter 过滤,不使用 report_type
  const filterParams = useMemo(() => {
    const params: Record<string, string | number> = { year: period.year }
    if (actionType) params.action_type = actionType
    if (period.reportType === 'month') params.month = period.month
    if (period.reportType === 'quarter') params.quarter = period.quarter
    return params
  }, [period, actionType])

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true)
      try {
        const res = await logsApi.page({
          ...filterParams,
          page: targetPage,
          page_size: PAGE_SIZE,
        })
        setTypes(res.types || {})
        setTotal(res.total)
        setPage(targetPage)
        setItems((prev) => (append ? [...prev, ...res.items] : res.items))
      } finally {
        setLoading(false)
      }
    },
    [filterParams],
  )

  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  useReachBottom(() => {
    if (!loading && items.length < total) fetchPage(page + 1, true)
  })

  const toggle = (id: number) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const formatDetail = (detail: string): string => {
    try {
      return JSON.stringify(JSON.parse(detail), null, 2)
    } catch {
      return detail
    }
  }

  return (
    <View className="page-body">
      <Card
        title="筛选"
        extra={
          <Text className="ui-link" onClick={() => setFilterOpen((v) => !v)}>
            {filterOpen ? '收起' : '展开'}
          </Text>
        }
      >
        <SelectField
          label="操作类型"
          value={actionType}
          options={Object.entries(types).map(([value, label]) => ({ value, label }))}
          placeholder="全部类型"
          onChange={setActionType}
        />
        {filterOpen ? <PeriodPicker value={period} onChange={setPeriod} /> : null}
        <View style={{ paddingTop: '16rpx' }}>
          <Button
            tone="primary"
            size="small"
            onClick={() => downloadAndOpen('/logs/export-pdf', filterParams, 'pdf')}
          >
            导出 PDF
          </Button>
        </View>
      </Card>

      <View className="log__count">
        共 <Text className="u-num">{total}</Text> 条
      </View>

      {items.map((item) => (
        <View key={item.id} className="log__item" onClick={() => toggle(item.id)}>
          <View className="u-row-between u-gap-s">
            <Text className="log__action u-grow u-ellipsis">{item.action}</Text>
            <Tag tone={LOG_TYPE_TONE[item.action_type]}>{item.action_type_label}</Tag>
          </View>
          <Text className="log__summary u-ellipsis">{item.summary || '-'}</Text>
          <View className="u-row u-gap-s u-wrap log__meta">
            <Text>{dateTime(item.created_at)}</Text>
            <Text>{item.operator || '-'}</Text>
            <Tag tone={item.status_code < 400 ? 'success' : 'danger'}>{item.status_code}</Tag>
            <Text>{item.duration_ms}ms</Text>
            <Text>{item.ip || '-'}</Text>
          </View>
          {expanded.includes(item.id) && item.detail ? (
            <View className="log__detail">
              <Text className="log__detail-text">{formatDetail(item.detail)}</Text>
            </View>
          ) : null}
        </View>
      ))}

      {loading ? <Loading /> : null}
      {!loading && items.length === 0 ? <Empty text="该期间没有日志" mark="🕓" /> : null}
      {!loading && items.length > 0 && items.length >= total ? (
        <View className="log__end">— 已经到底了 —</View>
      ) : null}
    </View>
  )
}
