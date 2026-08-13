import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type {
  AccountTreeNode,
  ActiveWorkflow,
  Attachment,
  Employee,
  ExpenseApplication,
  ExpenseItem,
  OrgUnit,
} from '@/types/models'
import {
  accountsApi,
  expenseApi,
  expenseApplyApi,
  personnelApi,
  workflowApi,
} from '@/services/api'
import { APPLY_TYPE_LABEL, APPROVER_TYPE_LABEL } from '@/constants/labels'
import { notify, success } from '@/utils/dialog'
import { Alert, Button, Card, SelectField, TextField } from '@/components/ui'
import AttachmentBar from '@/components/business/AttachmentBar'
import ExpenseItems, { emptyExpenseItem } from '@/components/business/ExpenseItems'

export default function ExpenseEditPage() {
  const router = useRouter()
  const idParam = router.params.id
  const [claimId, setClaimId] = useState<number | null>(idParam ? Number(idParam) : null)

  const [accounts, setAccounts] = useState<AccountTreeNode[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [approvedApps, setApprovedApps] = useState<ExpenseApplication[]>([])
  const [wf, setWf] = useState<ActiveWorkflow | null>(null)
  const [approverWarn, setApproverWarn] = useState('')

  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [applicantId, setApplicantId] = useState<number | null>(null)
  const [orgUnitId, setOrgUnitId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ExpenseItem[]>([emptyExpenseItem()])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: idParam ? '编辑报销单' : '新建报销单' })

    accountsApi
      .tree()
      .then((tree) => setAccounts(tree.filter((a) => a.category === 'profit' || a.category === 'cost')))
      .catch(() => undefined)
    expenseApi.meta().then((m) => setCategories(m.categories || [])).catch(() => undefined)
    expenseApi.activeWorkflow().then(setWf).catch(() => undefined)
    personnelApi.employees().then(setEmployees).catch(() => undefined)
    personnelApi.orgUnits().then(setUnits).catch(() => undefined)
    expenseApplyApi.approved().then(setApprovedApps).catch(() => undefined)
    workflowApi
      .approverCheck()
      .then((check) => {
        if (!check.has_approver) {
          setApproverWarn(
            '系统尚未设置「管理层/股东」审批人,提交后可能无人可审批。请到人员管理给员工添加「管理层」或「股东」职位。',
          )
        } else if (check.problems.some((p) => p.biz_type === 'expense')) {
          setApproverWarn('费用报销流程存在未匹配到审批人的步骤,请到流程设计页检查。')
        }
      })
      .catch(() => undefined)
  }, [idParam])

  useEffect(() => {
    if (!claimId) return
    expenseApi
      .detail(claimId)
      .then((claim) => {
        setApplicationId(claim.application_id)
        setApplicantId(claim.applicant_employee_id)
        setOrgUnitId(claim.org_unit_id)
        setReason(claim.reason)
        setItems(claim.items.length ? claim.items : [emptyExpenseItem()])
        setAttachments(claim.attachments)
      })
      .catch(() => undefined)
  }, [claimId])

  /** 选中已通过的费用申请后带出申请人/部门/事由/明细 */
  const pickApplication = (appId: number | null) => {
    setApplicationId(appId)
    if (!appId) return
    const app = approvedApps.find((a) => a.id === appId)
    if (!app) return
    setApplicantId(app.applicant_employee_id ?? applicantId)
    setOrgUnitId(app.org_unit_id ?? orgUnitId)
    setReason(app.reason)
    setItems(
      app.items.length
        ? app.items.map((it) => ({
            category: it.category,
            account_id: it.account_id,
            sub_account: it.sub_account,
            amount: it.amount,
            note: it.note,
          }))
        : [emptyExpenseItem()],
    )
  }

  const buildBody = () => {
    const valid = items.filter((it) => it.account_id && Number(it.amount) > 0)
    if (valid.length === 0) {
      notify('请至少填写一条有效的费用明细(科目 + 金额)')
      return null
    }
    return {
      application_id: applicationId,
      applicant_employee_id: applicantId,
      org_unit_id: orgUnitId,
      reason,
      items: valid,
    }
  }

  const save = async (thenSubmit: boolean) => {
    const body = buildBody()
    if (!body) return
    setSaving(true)
    try {
      const saved = claimId
        ? await expenseApi.update(claimId, body)
        : await expenseApi.create(body)
      setClaimId(saved.id)
      if (thenSubmit) {
        await expenseApi.submit(saved.id)
        success('已提交审批')
      } else {
        success('已保存')
      }
      setTimeout(() => Taro.navigateBack(), 600)
    } finally {
      setSaving(false)
    }
  }

  /** 上传附件前先把单据存成草稿 */
  const ensureOwner = async (): Promise<number | null> => {
    if (claimId) return claimId
    const body = buildBody()
    if (!body) return null
    const created = await expenseApi.create(body)
    setClaimId(created.id)
    return created.id
  }

  return (
    <View className="page-body">
      <Alert tone={wf?.exists ? 'info' : 'warning'}>
        {wf?.exists ? (
          <Text>
            提交后将走审批流程「{wf.name}」:
            {(wf.steps || [])
              .map(
                (s) =>
                  `${s.step_no}.${s.name}(${APPROVER_TYPE_LABEL[s.approver_type] || s.approver_type})`,
              )
              .join(' → ')}
          </Text>
        ) : (
          <Text>尚未配置「费用报销」审批流程,提交时将报错。请先到流程设计页新建。</Text>
        )}
      </Alert>
      {approverWarn ? <Alert tone="warning">{approverWarn}</Alert> : null}

      <Card title="基本信息">
        <SelectField
          label="关联费用申请"
          value={applicationId}
          options={approvedApps.map((a) => ({
            value: a.id,
            label: `${a.apply_no} · ${APPLY_TYPE_LABEL[a.apply_type] || ''} · ${a.reason}`,
            keywords: a.reason,
          }))}
          placeholder="不关联 / 选择已审批的费用申请"
          hint="选择已通过的费用申请可自动带出事由与明细,生成凭证时同步其附件"
          onChange={pickApplication}
        />
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
        <TextField
          label="报销事由"
          value={reason}
          placeholder="如 7月市场部差旅及办公费用"
          onChange={setReason}
        />
      </Card>

      <Card title="费用明细">
        <ExpenseItems
          items={items}
          accounts={accounts}
          categories={categories}
          amountLabel="金额"
          onChange={setItems}
        />
      </Card>

      <Card title="报销附件">
        <Alert>发票 / 回单等,生成凭证时自动同步到凭证附件。</Alert>
        <AttachmentBar
          ownerId={claimId}
          basePath="/expense/claims"
          ensureOwner={ensureOwner}
          attachments={attachments}
          onChange={setAttachments}
          defaultKind="invoice"
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
