import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { VoucherListItem } from '@/types/models'
import { vouchersApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { confirm, success } from '@/utils/dialog'
import { money } from '@/utils/format'
import { Button, Card, DateField, Empty, Loading, SearchBar, Tag } from '@/components/ui'
import './list.scss'

const PAGE_SIZE = 20

export default function VoucherListPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<VoucherListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const canEdit = hasPerm(user, 'voucher', 'edit')
  const canCreate = hasPerm(user, 'voucher', 'create')
  const canDelete = hasPerm(user, 'voucher', 'delete')

  const fetchPage = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true)
      try {
        const res = await vouchersApi.page({
          page: targetPage,
          page_size: PAGE_SIZE,
          keyword: keyword || undefined,
          start: start || undefined,
          end: end || undefined,
        })
        setTotal(res.total)
        setPage(targetPage)
        setItems((prev) => (append ? [...prev, ...res.items] : res.items))
      } finally {
        setLoading(false)
      }
    },
    [keyword, start, end],
  )

  useEffect(() => {
    fetchPage(1, false)
  }, [fetchPage])

  // 从编辑页返回时刷新列表
  useDidShow(() => {
    if (items.length) fetchPage(1, false)
  })

  usePullDownRefresh(() => {
    fetchPage(1, false).finally(() => Taro.stopPullDownRefresh())
  })

  useReachBottom(() => {
    if (!loading && items.length < total) fetchPage(page + 1, true)
  })

  const remove = async (item: VoucherListItem) => {
    const ok = await confirm(`确认删除凭证 ${item.voucher_no}?删除后不可恢复。`, { danger: true })
    if (!ok) return
    await vouchersApi.remove(item.id)
    success('已删除')
    fetchPage(1, false)
  }

  return (
    <View className="page-body voucher-list">
      <View className="ui-toolbar">
        <View className="u-grow">
          <SearchBar
            placeholder="搜索凭证号 / 摘要"
            defaultValue={keyword}
            onSearch={(kw) => setKeyword(kw)}
          />
        </View>
        <Button size="small" onClick={() => setFilterOpen((v) => !v)}>
          {filterOpen ? '收起' : '日期'}
        </Button>
      </View>

      {filterOpen ? (
        <Card>
          <DateField label="开始日期" value={start} placeholder="不限" onChange={setStart} />
          <DateField label="结束日期" value={end} placeholder="不限" onChange={setEnd} />
          <View className="u-row u-gap-s" style={{ paddingTop: '16rpx' }}>
            <Button
              size="small"
              onClick={() => {
                setStart('')
                setEnd('')
              }}
            >
              清空
            </Button>
            <Button tone="primary" size="small" onClick={() => setFilterOpen(false)}>
              应用
            </Button>
          </View>
        </Card>
      ) : null}

      <View className="voucher-list__count">
        共 <Text className="u-num">{total}</Text> 张凭证
      </View>

      {items.map((v) => (
        <View
          key={v.id}
          className="voucher-card"
          onClick={() => {
            if (canEdit) Taro.navigateTo({ url: `/pkgBook/voucher/edit?id=${v.id}` })
          }}
        >
          <View className="u-row-between">
            <Text className="voucher-card__no">{v.voucher_no}</Text>
            <Text className="voucher-card__amount u-num">¥{money(v.total_debit)}</Text>
          </View>
          <View className="voucher-card__note u-ellipsis">{v.note || '(无摘要)'}</View>
          <View className="u-row-between voucher-card__foot">
            <View className="u-row u-gap-s u-wrap">
              <Text className="u-muted">{v.voucher_date}</Text>
              {v.customer_name ? <Tag tone="purple">{v.customer_name}</Tag> : null}
              <Tag>{v.entry_count} 条分录</Tag>
              {v.attachment_count > 0 ? <Tag tone="blue">📎 {v.attachment_count}</Tag> : null}
              {v.link_count > 0 ? <Tag tone="purple">关联 {v.link_count}</Tag> : null}
            </View>
            {canDelete ? (
              <Text
                className="ui-link ui-link--danger"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(v)
                }}
              >
                删除
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      {loading ? <Loading /> : null}
      {!loading && items.length === 0 ? <Empty text="没有符合条件的凭证" mark="🧾" /> : null}
      {!loading && items.length > 0 && items.length >= total ? (
        <View className="voucher-list__end">— 已经到底了 —</View>
      ) : null}

      {canCreate ? (
        <View className="voucher-list__fab" onClick={() => Taro.navigateTo({ url: '/pkgBook/voucher/edit' })}>
          ＋
        </View>
      ) : null}
    </View>
  )
}
