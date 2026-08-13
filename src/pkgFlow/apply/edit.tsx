import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type {
  AccountTreeNode,
  ActiveWorkflow,
  Attachment,
  Employee,
  ExpenseItem,
  OrgUnit,
} from '@/types/models'
import { accountsApi, expenseApplyApi, personnelApi, workflowApi } from '@/services/api'
import { APPLY_TYPE_LABEL } from '@/constants/labels'
import { notify, success } from '@/utils/dialog'
import { Alert, Button, Card, SelectField, TextField } from '@/components/ui'
import AttachmentBar from '@/components/business/AttachmentBar'
import ExpenseItems, { emptyExpenseItem } from '@/components/business/ExpenseItems'

const APPLY_TYPE_OPTIONS = Object.entries(APPLY_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

export default function ApplyEditPage() {
  const router = useRouter()
  const idParam = router.params.id
  const [appId, setAppId] = useState<number | null>(idParam ? Number(idParam) : null)

  const [accounts, setAccounts] = useState<AccountTreeNode[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [wf, setWf] = useState<ActiveWorkflow | null>(null)
  const [approverWarn, setApproverWarn] = useState('')

  const [applicantId, setApplicantId] = useState<number | null>(null)
  const [orgUnitId, setOrgUnitId] = useState<number | null>(null)
  const [applyType, setApplyType] = useState('general')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ExpenseItem[]>([emptyExpenseItem()])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: idParam ? '编辑费用申请' : '新建费用申请' })

    accountsApi
      .tree()
      .then((tree) => setAccounts(tree.filter((a) => a.category === 'profit' || a.category === 'cost')))
      .catch(() => undefined)
    expenseApplyApi.meta().then((m) => setCategories(m.categories || [])).catch(() => undefined)
    expenseApplyApi.activeWorkflow().then(setWf).catch(() => undefined)
    personnelApi.employees().then(setEmployees).catch(() => undefined)
    personnelApi.orgUnits().then(setUnits).catch(() => undefined)
    workflowApi
      .approverCheck()
      .then((check) => {
        if (!check.has_approver) {
          setApproverWarn(
            '系统尚未设置「管理层/股东」审批人,提交后可能无人可审批。请到人员管理给员工添加「管理层」或「股东」职位。',
          )
        } else if (check.problems.some((p) => p.biz_type === 'expense_apply')) {
          setApproverWarn('费用申请流程存在未匹配到审批人的步骤,请到流程设计页检查。')
        }
      })
      .catch(() => undefined)
  }, [idParam])

  useEffect(() => {
    if (!appId) return
    expenseApplyApi
      .detail(appId)
      .then((app) => {
        setApplicantId(app.applicant_employee_id)
        setOrgUnitId(app.org_unit_id)
        setApplyType(app.apply_type)
        setReason(app.reason)
        setItems(app.items.length ? app.items : [emptyExpenseItem()])
        setAttachments(app.attachments)
      })
      .catch(() => undefined)
  }, [appId])

  const buildBody = () => {
    const valid = items.filter((it) => it.account_id && Number(it.amount) > 0)
    if (valid.length === 0) {
      notify('请至少填写一条有效的预计明细(科目 + 金额)')
      return null
    }
    return {
      applicant_employee_id: applicantId,
      org_unit_id: orgUnitId,
      apply_type: applyType,
      reason,
      items: valid,
    }
  }

  const save = async (thenSubmit: boolean) => {
    const body = buildBody()
    if (!body) return
    setSaving(true)
    try {
      const saved = appId
        ? await expenseApplyApi.update(appId, body)
        : await expenseApplyApi.create(body)
      setAppId(saved.id)
      if (thenSubmit) {
        await expenseApplyApi.submit(saved.id)
        success('已提交审批')
      } else {
        success('已保存')
      }
      setTimeout(() => Taro.navigateBack(), 600)
    } finally {
      setSaving(false)
    }
  }

  const ensureOwner = async (): Promise<number | null> => {
    if (appId) return appId
    const body = buildBody()
    if (!body) return null
    const created = await expenseApplyApi.create(body)
    setAppId(created.id)
    return created.id
  }

  return (
    <View className="page-body">
      <Alert tone={wf?.exists ? 'info' : 'warning'}>
        {wf?.exists ? (
          <Text>
            提交后将走事前审批流程「{wf.name}」:
            {(wf.steps || []).map((s) => `${s.step_no}.${s.name}`).join(' → ')}
          </Text>
        ) : (
          <Text>尚未配置「费用申请」审批流程,提交时将报错。请先到流程设计页新建。</Text>
        )}
      </Alert>
      {approverWarn ? <Alert tone="warning">{approverWarn}</Alert> : null}

      <Card title="基本信息">
        <SelectField
          label="申请人"
          value={applicantId}
          options={employees.map((e) => ({ value: e.id, label: e.name }))}
          onChange={setApplicantId}
        />
        <SelectField
          label="部门"
          value={orgUnitId}
          options={units.map((u) => ({ value: u.id, label: u.name }))}
          onChange={setOrgUnitId}
        />
        <SelectField
          label="申请类型"
          value={applyType}
          options={APPLY_TYPE_OPTIONS}
          clearable={false}
          onChange={(v) => setApplyType(v || 'general')}
        />
        <TextField
          label="申请事由"
          value={reason}
          placeholder="如 签订年度办公用品采购合同"
          onChange={setReason}
        />
      </Card>

      <Card title="预计费用明细">
        <ExpenseItems
          items={items}
          accounts={accounts}
          categories={categories}
          amountLabel="预计金额"
          onChange={setItems}
        />
      </Card>

      <Card title="申请附件">
        <Alert>合同 / 发票等,报销生成凭证时自动同步。</Alert>
        <AttachmentBar
          ownerId={appId}
          basePath="/expense-apply"
          ensureOwner={ensureOwner}
          attachments={attachments}
          onChange={setAttachments}
          defaultKind="contract"
        />
      </Card>

      <View className="u-row u-gap-s">
        <Button block loading={saving} onClick={() => save(false)}>
          保存草稿
        </Button>
        <Button tone="primary" block loading={saving} onClick={() => save(true)}>
          保存并提交
        </Button>
      </View>
    </View>
  )
}
