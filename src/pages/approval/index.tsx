import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type {
  Employee,
  ExpenseApplication,
  ExpenseClaim,
  WorkflowDef,
  WorkflowInstance,
} from '@/types/models'
import {
  expenseApi,
  expenseApplyApi,
  personnelApi,
  workflowApi,
} from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import {
  APPLY_TYPE_LABEL,
  ATTACHMENT_KIND_LABEL,
  BIZ_TYPE_LABEL,
  WF_STATUS_LABEL,
  WF_STATUS_TONE,
} from '@/constants/labels'
import { previewAttachment } from '@/services/attachments'
import { confirm, notify, prompt, success } from '@/utils/dialog'
import { dateTime, money } from '@/utils/format'
import {
  Alert,
  Button,
  Card,
  Empty,
  Loading,
  SelectField,
  Sheet,
  Tag,
  TextField,
  Timeline,
} from '@/components/ui'
import './index.scss'

type BizDoc =
  | { kind: 'expense'; data: ExpenseClaim }
  | { kind: 'expense_apply'; data: ExpenseApplication }
  | null

export default function ApprovalPage() {
  const { user } = useAuth()
  const [actorId, setActorId] = useState<number | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [defs, setDefs] = useState<WorkflowDef[]>([])
  const [todos, setTodos] = useState<WorkflowInstance[]>([])
  const [all, setAll] = useState<WorkflowInstance[]>([])
  const [loading, setLoading] = useState(true)

  const [detail, setDetail] = useState<WorkflowInstance | null>(null)
  const [bizDoc, setBizDoc] = useState<BizDoc>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState<number | null>(null)

  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitDefId, setSubmitDefId] = useState<number | null>(null)
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitApplicant, setSubmitApplicant] = useState<number | null>(null)

  const canManage = Boolean(
    user?.is_super_admin || hasPerm(user, 'approval', 'edit') || hasPerm(user, 'approval', 'delete'),
  )

  useEffect(() => {
    personnelApi.employees().then(setEmployees).catch(() => undefined)
    workflowApi.definitions().then(setDefs).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (user?.employee_id) setActorId(user.employee_id)
  }, [user])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [instances, myTasks] = await Promise.all([
        workflowApi.instances(),
        actorId ? workflowApi.myTasks(actorId) : Promise.resolve([] as WorkflowInstance[]),
      ])
      setAll(instances)
      setTodos(myTasks)
    } finally {
      setLoading(false)
    }
  }, [actorId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  usePullDownRefresh(() => {
    loadAll().finally(() => Taro.stopPullDownRefresh())
  })

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.employee_no ? `${e.name}(${e.employee_no})` : e.name,
  }))

  const pendingTaskForMe = (inst: WorkflowInstance) =>
    inst.tasks.find((t) => t.result === 'pending' && t.approver_employee_id === actorId)
  const anyPendingTask = (inst: WorkflowInstance) => inst.tasks.find((t) => t.result === 'pending')

  const openDetail = async (inst: WorkflowInstance) => {
    setDetail(inst)
    setBizDoc(null)
    if (!inst.biz_id) return
    try {
      if (inst.biz_type === 'expense') {
        setBizDoc({ kind: 'expense', data: await expenseApi.detail(inst.biz_id) })
      } else if (inst.biz_type === 'expense_apply') {
        setBizDoc({ kind: 'expense_apply', data: await expenseApplyApi.detail(inst.biz_id) })
      }
    } catch {
      // 无权限查看业务单据时,仅展示流程链
    }
  }

  const act = async (inst: WorkflowInstance, approve: boolean) => {
    const task = pendingTaskForMe(inst)
    if (!task) {
      notify('该单当前步骤不由你审批')
      return
    }
    const { ok, value } = await prompt(approve ? '审批通过' : '审批驳回', '审批意见(可选)')
    if (!ok) return
    if (approve) await workflowApi.approve(task.id, value)
    else await workflowApi.reject(task.id, value)
    success('已处理')
    setDetail(null)
    loadAll()
  }

  const reassign = async (inst: WorkflowInstance, employeeId: number | null) => {
    const task = anyPendingTask(inst)
    if (!task) {
      notify('无进行中的待办可改派')
      return
    }
    await workflowApi.reassign(task.id, employeeId)
    success(employeeId ? '已改派处理人' : '已按流程重新匹配')
    setReassignTo(null)
    setManageOpen(false)
    const fresh = await workflowApi.instance(inst.id)
    setDetail(fresh)
    loadAll()
  }

  const cancelInstance = async (inst: WorkflowInstance) => {
    if (!(await confirm('撤销该审批?关联单据将退回草稿。'))) return
    await workflowApi.cancel(inst.id)
    success('已撤销')
    setManageOpen(false)
    setDetail(null)
    loadAll()
  }

  const deleteInstance = async (inst: WorkflowInstance) => {
    if (!(await confirm('删除该审批实例?关联单据将退回草稿。', { danger: true }))) return
    await workflowApi.removeInstance(inst.id)
    success('已删除审批实例')
    setManageOpen(false)
    setDetail(null)
    loadAll()
  }

  const doSubmit = async () => {
    if (!submitDefId || !submitTitle.trim()) {
      notify('请选择流程并填写标题')
      return
    }
    await workflowApi.createInstance({
      definition_id: submitDefId,
      title: submitTitle.trim(),
      applicant_employee_id: submitApplicant,
    })
    success('已发起审批')
    setSubmitOpen(false)
    setSubmitTitle('')
    setSubmitDefId(null)
    loadAll()
  }

  const renderInstance = (inst: WorkflowInstance, withActions: boolean) => (
    <View key={inst.id} className="ui-row-item" onClick={() => openDetail(inst)}>
      <View className="ui-row-item__top">
        <Text className="ui-row-item__title u-grow u-ellipsis">{inst.title || `#${inst.id}`}</Text>
        <Tag tone={WF_STATUS_TONE[inst.status]}>{WF_STATUS_LABEL[inst.status] || inst.status}</Tag>
      </View>
      <View className="ui-row-item__sub u-row u-gap-s u-wrap">
        <Tag>{BIZ_TYPE_LABEL[inst.biz_type] || inst.biz_type}</Tag>
        <Text>申请人 {inst.applicant_name || '-'}</Text>
        <Text>第 {inst.current_step_no} 步</Text>
        <Text>{dateTime(inst.created_at).slice(0, 16)}</Text>
      </View>
      {withActions ? (
        <View className="ui-row-item__actions">
          <Text
            className="ui-link"
            onClick={(e) => {
              e.stopPropagation()
              act(inst, true)
            }}
          >
            通过
          </Text>
          <Text
            className="ui-link ui-link--danger"
            onClick={(e) => {
              e.stopPropagation()
              act(inst, false)
            }}
          >
            驳回
          </Text>
        </View>
      ) : null}
    </View>
  )

  return (
    <View className="page-body">
      <Card title="审批人身份">
        <SelectField
          label="当前身份"
          value={actorId}
          options={employeeOptions}
          placeholder="选择你的员工身份"
          onChange={setActorId}
          hint={
            user && !user.employee_id
              ? '当前账号未绑定员工,可在「用户与权限」绑定后自动识别'
              : undefined
          }
        />
        <View style={{ paddingTop: '16rpx' }}>
          <Button
            tone="ghost"
            size="small"
            onClick={() => {
              setSubmitOpen(true)
              setSubmitApplicant(actorId)
            }}
          >
            ＋ 发起通用审批
          </Button>
        </View>
      </Card>

      <Card title={`我的待办(${todos.length})`} flush>
        {loading && todos.length === 0 ? (
          <Loading />
        ) : todos.length === 0 ? (
          <Empty text={actorId ? '暂无待办' : '请先选择审批人身份'} mark="✅" />
        ) : (
          todos.map((inst) => renderInstance(inst, true))
        )}
      </Card>

      <Card title="全部审批单" flush>
        {loading && all.length === 0 ? (
          <Loading />
        ) : all.length === 0 ? (
          <Empty text="暂无审批单" mark="📋" />
        ) : (
          all.map((inst) => renderInstance(inst, false))
        )}
      </Card>

      {/* 审批详情 */}
      <Sheet
        open={Boolean(detail)}
        title="审批详情"
        footer={
          detail && pendingTaskForMe(detail) ? (
            <>
              <Button tone="danger" onClick={() => act(detail, false)}>
                驳回
              </Button>
              <Button tone="primary" onClick={() => act(detail, true)}>
                通过
              </Button>
            </>
          ) : null
        }
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <View>
            <Text className="approval__title">{detail.title}</Text>
            <View className="u-row u-gap-s u-wrap" style={{ marginTop: '12rpx' }}>
              <Tag>{BIZ_TYPE_LABEL[detail.biz_type] || detail.biz_type}</Tag>
              <Tag tone={WF_STATUS_TONE[detail.status]}>
                {WF_STATUS_LABEL[detail.status] || detail.status}
              </Tag>
              <Text className="u-muted">申请人 {detail.applicant_name || '-'}</Text>
            </View>

            {bizDoc ? <BizContent doc={bizDoc} /> : null}

            <View className="section-title">审批流程</View>
            <Timeline steps={detail.steps} />

            {canManage && detail.status === 'pending' ? (
              <View style={{ marginTop: '24rpx' }}>
                <Button block onClick={() => setManageOpen(true)}>
                  处理人管理 / 撤销
                </Button>
              </View>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* 处理人管理 */}
      <Sheet
        open={manageOpen && Boolean(detail)}
        title="处理人管理"
        footer={null}
        onClose={() => setManageOpen(false)}
      >
        {detail ? (
          <View>
            <Alert>
              当前处理人:{anyPendingTask(detail)?.approver_name || '未指派'}。未匹配到审批人时,
              可先到「人员管理」设置管理层/股东后点自动匹配,或直接改派给指定处理人。
            </Alert>
            <SelectField
              label="改派给"
              value={reassignTo}
              options={employeeOptions}
              placeholder="选择处理人"
              onChange={setReassignTo}
            />
            <View className="approval__manage-actions">
              <Button
                tone="primary"
                disabled={!reassignTo}
                onClick={() => reassign(detail, reassignTo)}
              >
                改派
              </Button>
              <Button onClick={() => reassign(detail, null)}>按流程自动匹配</Button>
              <Button onClick={() => cancelInstance(detail)}>撤销审批</Button>
              <Button tone="danger" onClick={() => deleteInstance(detail)}>
                删除实例
              </Button>
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* 发起通用审批 */}
      <Sheet
        open={submitOpen}
        title="发起审批"
        okText="发起"
        onOk={doSubmit}
        onClose={() => setSubmitOpen(false)}
      >
        <Alert>费用申请 / 报销单在各自页面提交后会自动出现在此,这里用于发起通用审批。</Alert>
        <SelectField
          label="选择流程"
          required
          value={submitDefId}
          options={defs
            .filter((d) => d.is_active)
            .map((d) => ({
              value: d.id,
              label: `${d.name}(${BIZ_TYPE_LABEL[d.biz_type] || d.biz_type})`,
            }))}
          clearable={false}
          onChange={setSubmitDefId}
        />
        <TextField
          label="标题"
          required
          value={submitTitle}
          placeholder="如 报销差旅费 500 元"
          onChange={setSubmitTitle}
        />
        <SelectField
          label="申请人"
          value={submitApplicant}
          options={employeeOptions}
          onChange={setSubmitApplicant}
        />
      </Sheet>
    </View>
  )
}

/** 审批详情里的业务单据内容(费用申请 / 报销:明细 + 附件) */
function BizContent({ doc }: { doc: NonNullable<BizDoc> }) {
  const { items, attachments, reason } = doc.data
  const total =
    doc.kind === 'expense'
      ? (doc.data as ExpenseClaim).total_amount
      : (doc.data as ExpenseApplication).estimated_amount

  return (
    <View>
      <View className="section-title">
        {doc.kind === 'expense' ? '报销明细' : '费用申请明细'}
        {doc.kind === 'expense_apply'
          ? ` · ${APPLY_TYPE_LABEL[(doc.data as ExpenseApplication).apply_type] || ''}`
          : ''}
      </View>
      <Text className="u-muted">事由:{reason || '-'}</Text>
      {items.map((it, i) => (
        <View key={i} className="approval__item">
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
      <View className="approval__total u-row-between">
        <Text>合计</Text>
        <Text className="u-num">¥{money(total)}</Text>
      </View>

      <View className="section-title">附件</View>
      {attachments.length === 0 ? (
        <Text className="u-muted">无</Text>
      ) : (
        <View className="u-row u-wrap u-gap-s">
          {attachments.map((a) => (
            <Tag key={a.id} tone="blue" onClick={() => previewAttachment(a)}>
              {ATTACHMENT_KIND_LABEL[a.kind] || a.kind}·{a.original_name}
            </Tag>
          ))}
        </View>
      )}
    </View>
  )
}
