/**
 * 后端接口封装。按业务域分组,与 backend/app/routers/* 一一对应。
 */
import type {
  Account,
  AccountTreeNode,
  ActiveWorkflow,
  ApproverCheck,
  AuthPreset,
  Company,
  Customer,
  CustomerVoucherItem,
  DashboardData,
  Employee,
  ExpenseApplication,
  ExpenseClaim,
  Ledger,
  LogPage,
  OfficialReports,
  OrgUnit,
  Role,
  SubAccount,
  TrialBalance,
  UserRow,
  Attachment,
  VoucherDetail,
  VoucherPage,
  WorkflowDef,
  WorkflowInstance,
} from '@/types/models'
import { http, requestForm } from './request'

/* ---------------- 会计科目 ---------------- */
export const accountsApi = {
  list: (params?: { category?: string; active_only?: boolean }) =>
    http.get<Account[]>('/accounts', params),
  tree: () => http.get<AccountTreeNode[]>('/accounts/tree'),
  create: (data: Partial<Account>) => http.post<Account>('/accounts', data),
  remove: (id: number) => http.del<void>(`/accounts/${id}`),
  createSub: (accountId: number, data: { name: string; note?: string }) =>
    http.post<SubAccount>(`/accounts/${accountId}/subaccounts`, data),
  updateSub: (subId: number, data: { name: string; note?: string }) =>
    http.put<SubAccount>(`/accounts/subaccounts/${subId}`, data),
  removeSub: (subId: number) => http.del<void>(`/accounts/subaccounts/${subId}`),
}

/* ---------------- 记账凭证 ---------------- */
export interface VoucherPayload {
  voucher_no: string
  voucher_date: string
  note: string
  customer_id: number | null
  status: string
  entries: {
    summary: string
    account_id: number
    sub_account: string
    debit: number
    credit: number
  }[]
}

export const vouchersApi = {
  page: (params: Record<string, unknown>) => http.get<VoucherPage>('/vouchers', params),
  detail: (id: number) => http.get<VoucherDetail>(`/vouchers/${id}`),
  create: (data: VoucherPayload) => http.post<VoucherDetail>('/vouchers', data),
  update: (id: number, data: VoucherPayload) => http.put<VoucherDetail>(`/vouchers/${id}`, data),
  remove: (id: number) => http.del<void>(`/vouchers/${id}`),
  reverse: (id: number) => http.post<VoucherDetail>(`/vouchers/${id}/reverse`),
  addLink: (id: number, data: { target_id: number; relation_type: string; note: string }) =>
    http.post<VoucherDetail>(`/vouchers/${id}/links`, data),
  removeLink: (linkId: number) => http.del<void>(`/vouchers/links/${linkId}`),
}

/* ---------------- 附件 ---------------- */
export const attachmentsApi = {
  remove: (id: number) => http.del<void>(`/attachments/${id}`),
  // 后端用 Form(...) 接收 kind,必须走表单编码
  changeKind: (id: number, kind: string) =>
    requestForm<Attachment>('PATCH', `/attachments/${id}`, { kind }),
}

/* ---------------- 往来单位 ---------------- */
export const customersApi = {
  list: (params?: { keyword?: string; party_type?: string; active_only?: boolean }) =>
    http.get<Customer[]>('/customers', params),
  detail: (id: number) => http.get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => http.post<Customer>('/customers', data),
  update: (id: number, data: Partial<Customer>) => http.put<Customer>(`/customers/${id}`, data),
  remove: (id: number) => http.del<void>(`/customers/${id}`),
  vouchers: (id: number) =>
    http.get<{ items: CustomerVoucherItem[]; sum_debit: number }>(`/customers/${id}/vouchers`),
}

/* ---------------- 人员 ---------------- */
export const personnelApi = {
  orgUnits: () => http.get<OrgUnit[]>('/personnel/org-units'),
  createUnit: (data: Partial<OrgUnit>) => http.post<OrgUnit>('/personnel/org-units', data),
  updateUnit: (id: number, data: Partial<OrgUnit>) =>
    http.put<OrgUnit>(`/personnel/org-units/${id}`, data),
  removeUnit: (id: number) => http.del<void>(`/personnel/org-units/${id}`),
  employees: (params?: { org_unit_id?: number; role_type?: string }) =>
    http.get<Employee[]>('/personnel/employees', params),
  createEmployee: (data: Record<string, unknown>) =>
    http.post<Employee>('/personnel/employees', data),
  updateEmployee: (id: number, data: Record<string, unknown>) =>
    http.put<Employee>(`/personnel/employees/${id}`, data),
  removeEmployee: (id: number) => http.del<void>(`/personnel/employees/${id}`),
  addMember: (unitId: number, data: Record<string, unknown>) =>
    http.post<Employee>(`/personnel/org-units/${unitId}/members`, data),
}

/* ---------------- 审批流程 ---------------- */
export const workflowApi = {
  definitions: () => http.get<WorkflowDef[]>('/workflow/definitions'),
  createDef: (data: Record<string, unknown>) =>
    http.post<WorkflowDef>('/workflow/definitions', data),
  updateDef: (id: number, data: Record<string, unknown>) =>
    http.put<WorkflowDef>(`/workflow/definitions/${id}`, data),
  removeDef: (id: number) => http.del<void>(`/workflow/definitions/${id}`),
  approverCheck: () => http.get<ApproverCheck>('/workflow/approver-check'),
  instances: () => http.get<WorkflowInstance[]>('/workflow/instances'),
  instance: (id: number) => http.get<WorkflowInstance>(`/workflow/instances/${id}`),
  myTasks: (employeeId: number) =>
    http.get<WorkflowInstance[]>('/workflow/my-tasks', { employee_id: employeeId }),
  createInstance: (data: Record<string, unknown>) =>
    http.post<WorkflowInstance>('/workflow/instances', data),
  approve: (taskId: number, comment: string) =>
    http.post<WorkflowInstance>(`/workflow/tasks/${taskId}/approve`, { comment }),
  reject: (taskId: number, comment: string) =>
    http.post<WorkflowInstance>(`/workflow/tasks/${taskId}/reject`, { comment }),
  reassign: (taskId: number, employeeId: number | null) =>
    http.post<WorkflowInstance>(`/workflow/tasks/${taskId}/reassign`, { employee_id: employeeId }),
  cancel: (instanceId: number) =>
    http.post<WorkflowInstance>(`/workflow/instances/${instanceId}/cancel`),
  removeInstance: (instanceId: number) => http.del<void>(`/workflow/instances/${instanceId}`),
}

/* ---------------- 费用报销 ---------------- */
export const expenseApi = {
  list: (params?: { status?: string }) => http.get<ExpenseClaim[]>('/expense/claims', params),
  detail: (id: number) => http.get<ExpenseClaim>(`/expense/claims/${id}`),
  create: (data: Record<string, unknown>) => http.post<ExpenseClaim>('/expense/claims', data),
  update: (id: number, data: Record<string, unknown>) =>
    http.put<ExpenseClaim>(`/expense/claims/${id}`, data),
  remove: (id: number) => http.del<void>(`/expense/claims/${id}`),
  submit: (id: number) => http.post<ExpenseClaim>(`/expense/claims/${id}/submit`),
  makeVoucher: (id: number) => http.post<ExpenseClaim>(`/expense/claims/${id}/make-voucher`),
  regenerateDoc: (id: number) =>
    http.post<ExpenseClaim>(`/expense/claims/${id}/regenerate-approval-doc`),
  activeWorkflow: () => http.get<ActiveWorkflow>('/expense/active-workflow'),
  meta: () => http.get<{ categories: string[] }>('/expense/meta'),
}

/* ---------------- 费用申请(事前) ---------------- */
export const expenseApplyApi = {
  list: (params?: { status?: string }) => http.get<ExpenseApplication[]>('/expense-apply', params),
  approved: () => http.get<ExpenseApplication[]>('/expense-apply/approved'),
  detail: (id: number) => http.get<ExpenseApplication>(`/expense-apply/${id}`),
  create: (data: Record<string, unknown>) => http.post<ExpenseApplication>('/expense-apply', data),
  update: (id: number, data: Record<string, unknown>) =>
    http.put<ExpenseApplication>(`/expense-apply/${id}`, data),
  remove: (id: number) => http.del<void>(`/expense-apply/${id}`),
  submit: (id: number) => http.post<ExpenseApplication>(`/expense-apply/${id}/submit`),
  activeWorkflow: () => http.get<ActiveWorkflow>('/expense-apply/active-workflow'),
  meta: () => http.get<{ categories: string[] }>('/expense-apply/meta'),
}

/* ---------------- 报表 / 账簿 / 日志 ---------------- */
export const reportsApi = {
  dashboard: (params: { period_type: string; ref_date: string }) =>
    http.get<DashboardData>('/reports/dashboard', params),
  official: (params: Record<string, unknown>) =>
    http.get<OfficialReports>('/reports/official', params),
  trialBalance: (params: { start: string; end: string }) =>
    http.get<TrialBalance>('/reports/trial-balance', params),
}

export const ledgersApi = {
  query: (params: Record<string, unknown>) => http.get<Ledger>('/ledgers', params),
}

export const logsApi = {
  page: (params: Record<string, unknown>) => http.get<LogPage>('/logs', params),
}

/* ---------------- 企业信息 ---------------- */
export const companyApi = {
  get: () => http.get<Company>('/company'),
  update: (data: Partial<Company>) => http.put<Company>('/company', data),
}

/* ---------------- 用户 / 角色 / 预设 ---------------- */
export const usersApi = {
  list: () => http.get<UserRow[]>('/users'),
  create: (data: Record<string, unknown>) => http.post<UserRow>('/users', data),
  update: (id: number, data: Record<string, unknown>) => http.put<UserRow>(`/users/${id}`, data),
  remove: (id: number) => http.del<void>(`/users/${id}`),
  resetPassword: (id: number, newPassword: string) =>
    http.post<void>(`/users/${id}/reset-password`, { new_password: newPassword }),
  roles: () => http.get<Role[]>('/roles'),
  createRole: (data: Record<string, unknown>) => http.post<Role>('/roles', data),
  updateRole: (id: number, data: Record<string, unknown>) => http.put<Role>(`/roles/${id}`, data),
  removeRole: (id: number) => http.del<void>(`/roles/${id}`),
}

export const presetsApi = {
  list: () => http.get<AuthPreset[]>('/auth-presets'),
  create: (data: Record<string, unknown>) => http.post<AuthPreset>('/auth-presets', data),
  update: (id: number, data: Record<string, unknown>) =>
    http.put<AuthPreset>(`/auth-presets/${id}`, data),
  remove: (id: number) => http.del<void>(`/auth-presets/${id}`),
  resolve: (employeeId: number) =>
    http.get<{ role_ids: number[] }>('/auth-presets/resolve', { employee_id: employeeId }),
  apply: () => http.post<{ updated: number; total: number }>('/auth-presets/apply'),
}
