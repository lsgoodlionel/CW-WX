import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { ExpenseClaim } from '@/types/models'
import { expenseApi } from '@/services/api'
import { previewAttachment } from '@/services/attachments'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import {
  ATTACHMENT_KIND_LABEL,
  DOC_STATUS_TONE,
  EXPENSE_STATUS_LABEL,
} from '@/constants/labels'
import { confirm, success } from '@/utils/dialog'
import { money } from '@/utils/format'
import { Button, Card, Empty, Loading, Segmented, Sheet, Tag, Timeline } from '@/components/ui'
import './index.scss'

const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  ...Object.entries(EXPENSE_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

export default function ExpensePage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [claims, setClaims] = useState<ExpenseClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ExpenseClaim | null>(null)

  const canCreate = hasPerm(user, 'expense', 'create')
  const canEdit = hasPerm(user, 'expense', 'edit')
  const canDelete = hasPerm(user, 'expense', 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setClaims(await expenseApi.list(statusFilter === 'all' ? undefined : { status: statusFilter }))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useDidShow(() => {
    if (claims.length) load()
  })

  usePullDownRefresh(() => {
    load().finally(() => Taro.stopPullDownRefresh())
  })

  const submit = async (claim: ExpenseClaim) => {
    if (!(await confirm(`提交报销单 ${claim.claim_no} 进入审批流程?`))) return
    await expenseApi.submit(claim.id)
    success('已提交审批')
    load()
  }

  const remove = async (claim: ExpenseClaim) => {
    if (!(await confirm(`删除报销单 ${claim.claim_no}?`, { danger: true }))) return
    await expenseApi.remove(claim.id)
    success('已删除')
    load()
  }

  const makeVoucher = async (claim: ExpenseClaim) => {
    if (!(await confirm('根据该报销单生成记账凭证(借费用 / 贷银行)?'))) return
    const res = await expenseApi.makeVoucher(claim.id)
    success(`已生成凭证 ${res.voucher_no}`)
    load()
  }

  const regenerate = async (claim: ExpenseClaim) => {
    if (!(await confirm('重新生成审批记录单并挂到凭证附件?'))) return
    const res = await expenseApi.regenerateDoc(claim.id)
    success('已补生成审批记录单')
    if (detail?.id === claim.id) setDetail(res)
  }

  const openDetail = async (claim: ExpenseClaim) => {
    setDetail(claim)
    try {
      setDetail(await expenseApi.detail(claim.id))
    } catch {
      // 保底展示列表里的数据
    }
  }

  return (
    <View className="page-body">
      <Segmented value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />

      {canCreate ? (
        <View style={{ marginTop: '24rpx' }}>
          <Button tone="primary" block onClick={() => Taro.navigateTo({ url: '/pkgFlow/expense/edit' })}>
            ＋ 新建报销单
          </Button>
        </View>
      ) : null}

      <View style={{ marginTop: '24rpx' }}>
        {loading && claims.length === 0 ? <Loading /> : null}
        {!loading && claims.length === 0 ? <Empty text="暂无报销单" mark="💰" /> : null}

        {claims.map((claim) => (
          <Card key={claim.id} flush>
            <View className="doc" onClick={() => openDetail(claim)}>
              <View className="u-row-between">
                <Text className="doc__no">{claim.claim_no}</Text>
                <Text className="doc__amount u-num">¥{money(claim.total_amount)}</Text>
              </View>
              <Text className="doc__reason u-ellipsis">{claim.reason || '(无事由)'}</Text>
              <View className="u-row u-gap-s u-wrap doc__meta">
                <Tag tone={DOC_STATUS_TONE[claim.status]}>
                  {EXPENSE_STATUS_LABEL[claim.status] || claim.status}
                </Tag>
                <Text>{claim.applicant_name || '-'}</Text>
                {claim.org_unit_name ? <Text>{claim.org_unit_name}</Text> : null}
                {claim.application_no ? <Tag tone="purple">申请 {claim.application_no}</Tag> : null}
                {claim.voucher_no ? <Tag tone="blue">凭证 {claim.voucher_no}</Tag> : null}
              </View>
              <View className="ui-row-item__actions">
                {(claim.status === 'draft' || claim.status === 'rejected') && canEdit ? (
                  <>
                    <Text
                      className="ui-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        Taro.navigateTo({ url: `/pkgFlow/expense/edit?id=${claim.id}` })
                      }}
                    >
                      编辑
                    </Text>
                    <Text
                      className="ui-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        submit(claim)
                      }}
                    >
                      提交
                    </Text>
                  </>
                ) : null}
                {(claim.status === 'draft' || claim.status === 'rejected') && canDelete ? (
                  <Text
                    className="ui-link ui-link--danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(claim)
                    }}
                  >
                    删除
                  </Text>
                ) : null}
                {claim.status === 'approved' && canEdit ? (
                  <Text
                    className="ui-link"
                    onClick={(e) => {
                      e.stopPropagation()
                      makeVoucher(claim)
                    }}
                  >
                    生成凭证
                  </Text>
                ) : null}
                {claim.status === 'paid' && canEdit ? (
                  <Text
                    className="ui-link"
                    onClick={(e) => {
                      e.stopPropagation()
                      regenerate(claim)
                    }}
                  >
                    补生成审批单
                  </Text>
                ) : null}
                <Text className="ui-link">详情</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Sheet open={Boolean(detail)} title={detail?.claim_no} footer={null} onClose={() => setDetail(null)}>
        {detail ? (
          <View>
            <View className="u-row u-gap-s u-wrap">
              <Tag tone={DOC_STATUS_TONE[detail.status]}>
                {EXPENSE_STATUS_LABEL[detail.status] || detail.status}
              </Tag>
              <Text className="u-muted">
                {detail.applicant_name || '-'} · {detail.org_unit_name || '-'}
              </Text>
            </View>
            <Text className="doc__detail-reason">事由:{detail.reason || '-'}</Text>
            {detail.application_no ? (
              <Tag tone="purple">关联申请 {detail.application_no}</Tag>
            ) : null}

            <View className="section-title">报销明细</View>
            {detail.items.map((it, i) => (
              <View key={i} className="doc__item">
                <View className="u-row-between">
                  <Text className="u-grow u-ellipsis">
                    {it.category ? `${it.category} · ` : ''}
                    {it.account_name || '-'}
                    {it.sub_account ? ` / ${it.sub_account}` : ''}
                  </Text>
                  <Text className="u-num">{money(it.amount)}</Text>
                </View>
                {it.note ? <Text className="u-muted">{it.note}</Text> : null}
              </View>
            ))}
            <View className="doc__total u-row-between">
              <Text>合计</Text>
              <Text className="u-num">¥{money(detail.total_amount)}</Text>
            </View>

            {detail.attachments.length ? (
              <>
                <View className="section-title">相关附件(含从费用申请同步)</View>
                <View className="u-row u-wrap u-gap-s">
                  {detail.attachments.map((a) => (
                    <Tag key={a.id} tone="blue" onClick={() => previewAttachment(a)}>
                      {ATTACHMENT_KIND_LABEL[a.kind] || a.kind}·{a.original_name}
                    </Tag>
                  ))}
                </View>
              </>
            ) : null}

            {detail.workflow ? (
              <>
                <View className="section-title">审批流程</View>
                <Timeline steps={detail.workflow.steps} />
              </>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  )
}
