import { useCallback, useEffect, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { ApproverCheck, Employee, WorkflowDef, WorkflowStep } from '@/types/models'
import { personnelApi, workflowApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { APPROVER_TYPE_LABEL, BIZ_TYPE_LABEL, ROLE_LABEL } from '@/constants/labels'
import { confirm, notify, success } from '@/utils/dialog'
import { Alert, Button, Card, Empty, Loading, SelectField, Sheet, Tag, TextField } from '@/components/ui'
import './index.scss'

const BIZ_OPTIONS = Object.entries(BIZ_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const APPROVER_OPTIONS = Object.entries(APPROVER_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))
const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))

const emptyStep = (): WorkflowStep => ({
  name: '',
  approver_type: 'employee',
  approver_employee_id: null,
  approver_role: '',
})

export default function WorkflowPage() {
  const { user } = useAuth()
  const [defs, setDefs] = useState<WorkflowDef[]>([])
  const [check, setCheck] = useState<ApproverCheck | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<WorkflowDef | null>(null)
  const [name, setName] = useState('')
  const [bizType, setBizType] = useState('expense')
  const [note, setNote] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep()])

  const canCreate = hasPerm(user, 'workflow', 'create')
  const canEdit = hasPerm(user, 'workflow', 'edit')
  const canDelete = hasPerm(user, 'workflow', 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [defsRes, checkRes] = await Promise.all([
        workflowApi.definitions(),
        workflowApi.approverCheck(),
      ])
      setDefs(defsRes)
      setCheck(checkRes)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    personnelApi.employees().then(setEmployees).catch(() => undefined)
  }, [load])

  usePullDownRefresh(() => {
    load().finally(() => Taro.stopPullDownRefresh())
  })

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.employee_no ? `${e.name}(${e.employee_no})` : e.name,
  }))

  const openEdit = (def: WorkflowDef | null) => {
    setEditing(def)
    setName(def?.name || '')
    setBizType(def?.biz_type || 'expense')
    setNote(def?.note || '')
    setSteps(def?.steps?.length ? def.steps.map((s) => ({ ...s })) : [emptyStep()])
    setOpen(true)
  }

  const patchStep = (index: number, patch: Partial<WorkflowStep>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const save = async () => {
    if (!name.trim()) {
      notify('请填写流程名称')
      return
    }
    if (steps.length === 0) {
      notify('至少需要一个审批步骤')
      return
    }
    const body = {
      name: name.trim(),
      biz_type: bizType,
      note,
      is_active: editing ? editing.is_active : true,
      steps: steps.map((s, i) => ({
        name: s.name || `第${i + 1}步`,
        approver_type: s.approver_type,
        approver_employee_id: s.approver_type === 'employee' ? s.approver_employee_id : null,
        approver_role: s.approver_type === 'role' ? s.approver_role || 'management' : '',
      })),
    }
    if (editing) await workflowApi.updateDef(editing.id, body)
    else await workflowApi.createDef(body)
    success('流程已保存')
    setOpen(false)
    load()
  }

  const remove = async (def: WorkflowDef) => {
    if (!(await confirm(`删除流程「${def.name}」?`, { danger: true }))) return
    await workflowApi.removeDef(def.id)
    success('已删除')
    load()
  }

  return (
    <View className="page-body">
      {check && !check.ready ? (
        <Alert tone="warning">
          <View>
            <Text className="wf__alert-title">
              {check.has_approver ? '部分流程步骤未匹配到审批人' : '尚未设置任何「管理层/股东」审批人'}
            </Text>
            {!check.has_approver ? (
              <Text className="wf__alert-body">
                预置的「费用申请/费用报销」流程按部门负责人 / 任一管理层自动找审批人(股东高于管理层,同样可审批)。
                请到人员管理给至少一名员工添加「管理层」或「股东」职位,否则提交的单据将无人可审批。
              </Text>
            ) : null}
            {check.problems.map((p) => (
              <Text key={p.id} className="wf__alert-body">
                流程「{p.name}」({p.biz_type_label}):
                {p.missing_steps
                  .map((s) => `第${s.step_no}步「${s.name}」(${s.approver_type_label})`)
                  .join('、')}
                {' '}未匹配到审批人。
              </Text>
            ))}
          </View>
        </Alert>
      ) : null}

      {canCreate ? (
        <Button tone="primary" block onClick={() => openEdit(null)}>
          ＋ 新建流程
        </Button>
      ) : null}

      <View style={{ marginTop: '24rpx' }}>
        {loading && defs.length === 0 ? <Loading /> : null}
        {!loading && defs.length === 0 ? <Empty text="暂无审批流程" mark="🔀" /> : null}

        {defs.map((def) => (
          <Card key={def.id} flush>
            <View className="wf__row">
              <View className="u-row-between">
                <Text className="wf__name u-grow u-ellipsis">{def.name}</Text>
                <Tag tone={def.is_active ? 'success' : 'default'}>
                  {def.is_active ? '启用' : '停用'}
                </Tag>
              </View>
              <View className="u-row u-gap-s u-wrap wf__meta">
                <Tag tone="blue">{BIZ_TYPE_LABEL[def.biz_type] || def.biz_type}</Tag>
                {def.note ? <Text className="u-muted">{def.note}</Text> : null}
              </View>
              <View className="wf__steps">
                {def.steps.map((s, i) => (
                  <View key={i} className="wf__step">
                    <Text className="wf__step-no">{i + 1}</Text>
                    <Text className="u-grow">
                      {s.name || '步骤'} · {s.approver_name || APPROVER_TYPE_LABEL[s.approver_type]}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="ui-row-item__actions">
                {canEdit ? (
                  <Text className="ui-link" onClick={() => openEdit(def)}>
                    编辑
                  </Text>
                ) : null}
                {canDelete ? (
                  <Text className="ui-link ui-link--danger" onClick={() => remove(def)}>
                    删除
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Sheet
        open={open}
        title={editing ? '编辑流程' : '新建流程'}
        onOk={save}
        onClose={() => setOpen(false)}
      >
        <TextField label="流程名称" required value={name} placeholder="如 费用报销审批" onChange={setName} />
        <SelectField
          label="业务类型"
          value={bizType}
          options={BIZ_OPTIONS}
          clearable={false}
          onChange={(v) => setBizType(v || 'expense')}
        />
        <TextField label="说明" value={note} placeholder="可选" onChange={setNote} />

        <View className="section-title">审批步骤(按顺序)</View>
        {steps.map((step, index) => (
          <View key={index} className="wf__edit-step">
            <View className="u-row-between">
              <Text className="wf__step-title">第 {index + 1} 步</Text>
              {steps.length > 1 ? (
                <Text
                  className="ui-link ui-link--danger"
                  onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                >
                  删除
                </Text>
              ) : null}
            </View>
            <TextField
              label="步骤名"
              value={step.name}
              placeholder="如 经理审批"
              onChange={(v) => patchStep(index, { name: v })}
            />
            <SelectField
              label="审批人类型"
              value={step.approver_type}
              options={APPROVER_OPTIONS}
              clearable={false}
              onChange={(v) => patchStep(index, { approver_type: v || 'employee' })}
            />
            {step.approver_type === 'employee' ? (
              <SelectField
                label="指定审批人"
                value={step.approver_employee_id}
                options={employeeOptions}
                placeholder="选择审批人"
                onChange={(v) => patchStep(index, { approver_employee_id: v })}
              />
            ) : null}
            {step.approver_type === 'role' ? (
              <SelectField
                label="按角色"
                value={step.approver_role || 'management'}
                options={ROLE_OPTIONS}
                clearable={false}
                onChange={(v) => patchStep(index, { approver_role: v || 'management' })}
              />
            ) : null}
            {step.approver_type !== 'employee' && step.approver_type !== 'role' ? (
              <Text className="u-muted">系统按流程规则自动指派审批人。</Text>
            ) : null}
          </View>
        ))}
        <Button tone="ghost" size="small" onClick={() => setSteps((prev) => [...prev, emptyStep()])}>
          + 增加审批步骤
        </Button>
      </Sheet>
    </View>
  )
}
