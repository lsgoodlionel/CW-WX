import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { ExpenseApplication } from '@/types/models'
import { expenseApplyApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { APPLY_STATUS_LABEL, APPLY_TYPE_LABEL, DOC_STATUS_TONE } from '@/constants/labels'
import { confirm, success } from '@/utils/dialog'
import { money } from '@/utils/format'
import { Button, Card, Empty, Loading, Segmented, Sheet, Tag, Timeline } from '@/components/ui'
import AttachmentBar from '@/components/business/AttachmentBar'
import '../expense/index.scss'

const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  ...Object.entries(APPLY_STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

export default function ApplyPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('all')
  const [apps, setApps] = useState<ExpenseApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ExpenseApplication | null>(null)

  const canCreate = hasPerm(user, 'expense_apply', 'create')
  const canEdit = hasPerm(user, 'expense_apply', 'edit')
  const canDelete = hasPerm(user, 'expense_apply', 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setApps(
        await expenseApplyApi.list(statusFilter === 'all' ? undefined : { status: statusFilter }),
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useDidShow(() => {
    if (apps.length) load()
  })

  usePullDownRefresh(() => {
    load().finally(() => Taro.stopPullDownRefresh())
  })

  const submit = async (app: ExpenseApplication) => {
    if (!(await confirm(`提交费用申请 ${app.apply_no} 进入事前审批?`))) return
    await expenseApplyApi.submit(app.id)
    success('已提交审批')
    load()
  }

  const remove = async (app: ExpenseApplication) => {
    if (!(await confirm(`删除费用申请 ${app.apply_no}?`, { danger: true }))) return
    await expenseApplyApi.remove(app.id)
    success('已删除')
    load()
  }

  const openDetail = async (app: ExpenseApplication) => {
    setDetail(app)
    try {
      setDetail(await expenseApplyApi.detail(app.id))
    } catch {
      // 保底展示列表数据
    }
  }

  return (
    <View className="page-body">
      <Segmented value={statusFilter} options={STATUS_FILTERS} onChange={setStatusFilter} />

      {canCreate ? (
        <View style={{ marginTop: '24rpx' }}>
          <Button tone="primary" block onClick={() => Taro.navigateTo({ url: '/pkgFlow/apply/edit' })}>
            ＋ 新建费用申请
          </Button>
        </View>
      ) : null}

      <View style={{ marginTop: '24rpx' }}>
        {loading && apps.length === 0 ? <Loading /> : null}
        {!loading && apps.length === 0 ? <Empty text="暂无费用申请" mark="📝" /> : null}

        {apps.map((app) => (
          <Card key={app.id} flush>
            <View className="doc" onClick={() => openDetail(app)}>
              <View className="u-row-between">
                <Text className="doc__no">{app.apply_no}</Text>
                <Text className="doc__amount u-num">¥{money(app.estimated_amount)}</Text>
              </View>
              <Text className="doc__reason u-ellipsis">{app.reason || '(无事由)'}</Text>
              <View className="u-row u-gap-s u-wrap doc__meta">
                <Tag tone={DOC_STATUS_TONE[app.status]}>
                  {APPLY_STATUS_LABEL[app.status] || app.status}
                </Tag>
                <Tag>{APPLY_TYPE_LABEL[app.apply_type] || app.apply_type}</Tag>
                <Text>{app.applicant_name || '-'}</Text>
                {app.attachments.length ? <Tag tone="blue">📎 {app.attachments.length}</Tag> : null}
                {app.claim_ids.length ? <Tag tone="purple">已关联 {app.claim_ids.length} 张报销</Tag> : null}
              </View>
              <View className="ui-row-item__actions">
                {(app.status === 'draft' || app.status === 'rejected') && canEdit ? (
                  <>
                    <Text
                      className="ui-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        Taro.navigateTo({ url: `/pkgFlow/apply/edit?id=${app.id}` })
                      }}
                    >
                      编辑
                    </Text>
                    <Text
                      className="ui-link"
                      onClick={(e) => {
                        e.stopPropagation()
                        submit(app)
                      }}
                    >
                      提交
                    </Text>
                  </>
                ) : null}
                {(app.status === 'draft' || app.status === 'rejected') && canDelete ? (
                  <Text
                    className="ui-link ui-link--danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(app)
                    }}
                  >
                    删除
                  </Text>
                ) : null}
                <Text className="ui-link">详情 / 附件</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Sheet open={Boolean(detail)} title={detail?.apply_no} footer={null} onClose={() => setDetail(null)}>
        {detail ? (
          <View>
            <View className="u-row u-gap-s u-wrap">
              <Tag>{APPLY_TYPE_LABEL[detail.apply_type] || detail.apply_type}</Tag>
              <Tag tone={DOC_STATUS_TONE[detail.status]}>
                {APPLY_STATUS_LABEL[detail.status] || detail.status}
              </Tag>
              <Text className="u-muted">
                {detail.applicant_name || '-'} · {detail.org_unit_name || '-'}
              </Text>
            </View>
            <Text className="doc__detail-reason">事由:{detail.reason || '-'}</Text>

            <View className="section-title">预计费用明细</View>
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
              <Text className="u-num">¥{money(detail.estimated_amount)}</Text>
            </View>

            <View className="section-title">申请附件</View>
            <AttachmentBar
              ownerId={detail.id}
              basePath="/expense-apply"
              attachments={detail.attachments}
              canEdit={canEdit && detail.status !== 'closed'}
              defaultKind="contract"
              onChange={(next) => setDetail({ ...detail, attachments: next })}
            />

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
