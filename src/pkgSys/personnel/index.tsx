import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { Employee, OrgUnit, Position } from '@/types/models'
import { personnelApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABEL, ROLE_TONE } from '@/constants/labels'
import { confirm, notify, success } from '@/utils/dialog'
import {
  Alert,
  Button,
  Card,
  Empty,
  Loading,
  NumberField,
  Segmented,
  SelectField,
  Sheet,
  Tag,
  TextField,
  type Option,
} from '@/components/ui'
import './index.scss'

const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))

const GENDER_OPTIONS: Option<string>[] = [
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]

const STATUS_OPTIONS: Option<string>[] = [
  { value: 'active', label: '在职' },
  { value: 'left', label: '离职' },
]

interface FlatUnit extends OrgUnit {
  depth: number
}

const emptyPosition = (unitId: number | null): Position => ({
  org_unit_id: unitId,
  role_type: 'staff',
  position: '',
})

interface EmployeeForm {
  name: string
  employee_no: string
  gender: string
  phone: string
  hire_date: string
  equity_ratio: number
  id_number: string
  email: string
  status: string
  note: string
  positions: Position[]
}

const emptyEmployeeForm = (unitId: number | null): EmployeeForm => ({
  name: '',
  employee_no: '',
  gender: '',
  phone: '',
  hire_date: '',
  equity_ratio: 0,
  id_number: '',
  email: '',
  status: 'active',
  note: '',
  positions: [emptyPosition(unitId)],
})

export default function PersonnelPage() {
  const { user } = useAuth()
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [unitOpen, setUnitOpen] = useState(false)
  const [unitEditing, setUnitEditing] = useState<OrgUnit | null>(null)
  const [unitName, setUnitName] = useState('')
  const [unitParent, setUnitParent] = useState<number | null>(null)
  const [unitNote, setUnitNote] = useState('')

  const [empOpen, setEmpOpen] = useState(false)
  const [empEditing, setEmpEditing] = useState<Employee | null>(null)
  const [empForm, setEmpForm] = useState<EmployeeForm>(emptyEmployeeForm(null))

  const [memberOpen, setMemberOpen] = useState(false)
  const [memberEmployeeId, setMemberEmployeeId] = useState<number | null>(null)
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState('staff')
  const [memberPosition, setMemberPosition] = useState('')

  const canCreate = hasPerm(user, 'personnel', 'create')
  const canEdit = hasPerm(user, 'personnel', 'edit')
  const canDelete = hasPerm(user, 'personnel', 'delete')

  const loadUnits = useCallback(() => personnelApi.orgUnits().then(setUnits), [])
  const loadAllEmployees = useCallback(
    () => personnelApi.employees().then(setAllEmployees),
    [],
  )
  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      setEmployees(
        await personnelApi.employees({
          org_unit_id: selectedUnit ?? undefined,
          role_type: roleFilter === 'all' ? undefined : roleFilter,
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [selectedUnit, roleFilter])

  useEffect(() => {
    loadUnits().catch(() => undefined)
    loadAllEmployees().catch(() => undefined)
  }, [loadUnits, loadAllEmployees])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const refresh = useCallback(() => {
    loadUnits().catch(() => undefined)
    loadAllEmployees().catch(() => undefined)
    loadEmployees()
  }, [loadUnits, loadAllEmployees, loadEmployees])

  usePullDownRefresh(() => {
    refresh()
    setTimeout(() => Taro.stopPullDownRefresh(), 600)
  })

  /** 组织树按层级压平,用缩进表现父子关系 */
  const flatUnits = useMemo<FlatUnit[]>(() => {
    const byParent = new Map<string, OrgUnit[]>()
    units.forEach((u) => {
      const key = String(u.parent_id ?? 'root')
      byParent.set(key, [...(byParent.get(key) || []), u])
    })
    const walk = (parentKey: string, depth: number): FlatUnit[] =>
      (byParent.get(parentKey) || []).flatMap((u) => [
        { ...u, depth },
        ...walk(String(u.id), depth + 1),
      ])
    return walk('root', 0)
  }, [units])

  const unitName4 = (id: number | null) => units.find((u) => u.id === id)?.name || ''
  const unitOptions = units.map((u) => ({ value: u.id, label: u.name }))

  /* ---------- 部门 ---------- */
  const openUnit = (parent: OrgUnit | null, editing: OrgUnit | null) => {
    setUnitEditing(editing)
    setUnitName(editing?.name || '')
    setUnitParent(editing ? editing.parent_id : (parent?.id ?? null))
    setUnitNote(editing?.note || '')
    setUnitOpen(true)
  }

  const saveUnit = async () => {
    if (!unitName.trim()) {
      notify('请填写部门名称')
      return
    }
    const body = { name: unitName.trim(), parent_id: unitParent, note: unitNote }
    if (unitEditing) await personnelApi.updateUnit(unitEditing.id, body)
    else await personnelApi.createUnit(body)
    success('部门已保存')
    setUnitOpen(false)
    refresh()
  }

  const removeUnit = async (unit: OrgUnit) => {
    if (!(await confirm(`删除部门「${unit.name}」?`, { danger: true }))) return
    await personnelApi.removeUnit(unit.id)
    success('部门已删除')
    if (selectedUnit === unit.id) setSelectedUnit(null)
    refresh()
  }

  /* ---------- 员工 ---------- */
  const openEmployee = (employee: Employee | null) => {
    setEmpEditing(employee)
    if (employee) {
      setEmpForm({
        name: employee.name,
        employee_no: employee.employee_no,
        gender: employee.gender,
        phone: employee.phone,
        hire_date: employee.hire_date,
        equity_ratio: employee.equity_ratio,
        id_number: employee.id_number,
        email: employee.email,
        status: employee.status,
        note: employee.note,
        positions: employee.positions.length
          ? employee.positions.map((p) => ({ ...p }))
          : [emptyPosition(null)],
      })
    } else {
      setEmpForm(emptyEmployeeForm(selectedUnit))
    }
    setEmpOpen(true)
  }

  const patchPosition = (index: number, patch: Partial<Position>) =>
    setEmpForm((prev) => ({
      ...prev,
      positions: prev.positions.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }))

  const saveEmployee = async () => {
    if (!empForm.name.trim()) {
      notify('请填写姓名')
      return
    }
    const body = { ...empForm, name: empForm.name.trim() }
    if (empEditing) await personnelApi.updateEmployee(empEditing.id, body)
    else await personnelApi.createEmployee(body)
    success('员工已保存')
    setEmpOpen(false)
    refresh()
  }

  const removeEmployee = async (employee: Employee) => {
    if (!(await confirm(`删除员工「${employee.name}」?`, { danger: true }))) return
    await personnelApi.removeEmployee(employee.id)
    success('已删除')
    refresh()
  }

  /* ---------- 向部门添加成员 ---------- */
  const openMember = () => {
    if (!selectedUnit) {
      notify('请先选择一个部门')
      return
    }
    setMemberEmployeeId(null)
    setMemberName('')
    setMemberRole('staff')
    setMemberPosition('')
    setMemberOpen(true)
  }

  const saveMember = async () => {
    if (!selectedUnit) return
    if (!memberEmployeeId && !memberName.trim()) {
      notify('请选择已有员工或填写新员工姓名')
      return
    }
    await personnelApi.addMember(selectedUnit, {
      employee_id: memberEmployeeId,
      name: memberName.trim(),
      role_type: memberRole,
      position: memberPosition,
    })
    success('成员已添加')
    setMemberOpen(false)
    refresh()
  }

  const pickedEmployee = allEmployees.find((e) => e.id === memberEmployeeId) || null

  return (
    <View className="page-body">
      <Card
        title="组织架构"
        extra={
          canCreate ? (
            <Text className="ui-link" onClick={() => openUnit(null, null)}>
              ＋ 顶级部门
            </Text>
          ) : null
        }
        flush
      >
        <View
          className={`org__row ${selectedUnit === null ? 'org__row--active' : ''}`}
          onClick={() => setSelectedUnit(null)}
        >
          <Text className="u-grow">全部员工</Text>
        </View>
        {flatUnits.map((u) => (
          <View
            key={u.id}
            className={`org__row ${selectedUnit === u.id ? 'org__row--active' : ''}`}
            onClick={() => setSelectedUnit(u.id)}
          >
            <Text className="u-grow" style={{ paddingLeft: `${u.depth * 28}rpx` }}>
              {u.depth > 0 ? '└ ' : ''}
              {u.name}
              <Text className="u-muted"> ({u.employee_count})</Text>
            </Text>
            <View className="u-row u-gap-s">
              {canCreate ? (
                <Text
                  className="ui-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    openUnit(u, null)
                  }}
                >
                  子部门
                </Text>
              ) : null}
              {canEdit ? (
                <Text
                  className="ui-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    openUnit(null, u)
                  }}
                >
                  改
                </Text>
              ) : null}
              {canDelete ? (
                <Text
                  className="ui-link ui-link--danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeUnit(u)
                  }}
                >
                  删
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        {units.length === 0 ? <Empty text="暂无部门,点右上角新增" mark="🏗" /> : null}
      </Card>

      <Card
        title={`员工档案${selectedUnit ? ` — ${unitName4(selectedUnit)}` : ''}`}
        flush
      >
        <View className="org__filters">
          <Segmented
            value={roleFilter}
            options={[{ value: 'all', label: '全部' }, ...ROLE_OPTIONS]}
            onChange={setRoleFilter}
          />
          <View className="u-row u-gap-s" style={{ marginTop: '16rpx' }}>
            {canCreate ? (
              <Button size="small" disabled={!selectedUnit} onClick={openMember}>
                向本部门添加成员
              </Button>
            ) : null}
            {canCreate ? (
              <Button tone="primary" size="small" onClick={() => openEmployee(null)}>
                ＋ 新增员工
              </Button>
            ) : null}
          </View>
        </View>

        {loading && employees.length === 0 ? <Loading /> : null}
        {!loading && employees.length === 0 ? <Empty text="暂无员工" mark="👥" /> : null}

        {employees.map((e) => (
          <View key={e.id} className="ui-row-item">
            <View className="ui-row-item__top">
              <Text className="ui-row-item__title u-grow">
                {e.name}
                {e.employee_no ? <Text className="u-muted"> · {e.employee_no}</Text> : null}
              </Text>
              <Tag tone={e.status === 'active' ? 'success' : 'default'}>
                {e.status === 'active' ? '在职' : '离职'}
              </Tag>
            </View>
            <View className="u-row u-wrap u-gap-s" style={{ marginTop: '10rpx' }}>
              {e.positions.length === 0 ? (
                <Text className="u-muted">未任职</Text>
              ) : (
                e.positions.map((p, i) => (
                  <Tag key={i} tone={ROLE_TONE[p.role_type]}>
                    {p.org_unit_name || '未分配'}·{ROLE_LABEL[p.role_type] || p.role_type}
                    {p.position ? `·${p.position}` : ''}
                  </Tag>
                ))
              )}
            </View>
            <View className="ui-row-item__sub u-row u-gap-s u-wrap">
              <Text>电话 {e.phone || '-'}</Text>
              {e.equity_ratio ? <Text>持股 {e.equity_ratio}%</Text> : null}
            </View>
            <View className="ui-row-item__actions">
              {canEdit ? (
                <Text className="ui-link" onClick={() => openEmployee(e)}>
                  编辑
                </Text>
              ) : null}
              {canDelete ? (
                <Text className="ui-link ui-link--danger" onClick={() => removeEmployee(e)}>
                  删除
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      {/* 部门 */}
      <Sheet
        open={unitOpen}
        title={unitEditing ? '编辑部门' : '新增部门'}
        onOk={saveUnit}
        onClose={() => setUnitOpen(false)}
      >
        <TextField label="部门名称" required value={unitName} onChange={setUnitName} />
        <SelectField
          label="上级部门"
          value={unitParent}
          options={unitOptions.filter((o) => o.value !== unitEditing?.id)}
          placeholder="顶级部门(留空)"
          onChange={setUnitParent}
        />
        <TextField label="备注" value={unitNote} placeholder="可选" onChange={setUnitNote} />
      </Sheet>

      {/* 员工 */}
      <Sheet
        open={empOpen}
        title={empEditing ? '编辑员工' : '新增员工'}
        onOk={saveEmployee}
        onClose={() => setEmpOpen(false)}
      >
        <TextField
          label="姓名"
          required
          value={empForm.name}
          onChange={(v) => setEmpForm((f) => ({ ...f, name: v }))}
        />
        <TextField
          label="工号"
          value={empForm.employee_no}
          onChange={(v) => setEmpForm((f) => ({ ...f, employee_no: v }))}
        />
        <SelectField
          label="性别"
          value={empForm.gender || null}
          options={GENDER_OPTIONS}
          onChange={(v) => setEmpForm((f) => ({ ...f, gender: v || '' }))}
        />
        <TextField
          label="电话"
          value={empForm.phone}
          onChange={(v) => setEmpForm((f) => ({ ...f, phone: v }))}
        />
        <TextField
          label="入职日期"
          value={empForm.hire_date}
          placeholder="2024-01-01"
          onChange={(v) => setEmpForm((f) => ({ ...f, hire_date: v }))}
        />
        <NumberField
          label="持股比例(%)"
          value={empForm.equity_ratio || null}
          placeholder="股东填写"
          onChange={(v) => setEmpForm((f) => ({ ...f, equity_ratio: v }))}
        />
        <TextField
          label="身份证号"
          value={empForm.id_number}
          onChange={(v) => setEmpForm((f) => ({ ...f, id_number: v }))}
        />
        <TextField
          label="邮箱"
          value={empForm.email}
          onChange={(v) => setEmpForm((f) => ({ ...f, email: v }))}
        />
        <SelectField
          label="状态"
          value={empForm.status}
          options={STATUS_OPTIONS}
          clearable={false}
          onChange={(v) => setEmpForm((f) => ({ ...f, status: v || 'active' }))}
        />
        <TextField
          label="备注"
          value={empForm.note}
          onChange={(v) => setEmpForm((f) => ({ ...f, note: v }))}
        />

        <View className="section-title">任职(可跨多个部门兼任不同角色)</View>
        {empForm.positions.map((p, index) => (
          <View key={index} className="org__position">
            <View className="u-row-between">
              <Text className="u-muted">任职 {index + 1}</Text>
              {empForm.positions.length > 1 ? (
                <Text
                  className="ui-link ui-link--danger"
                  onClick={() =>
                    setEmpForm((f) => ({
                      ...f,
                      positions: f.positions.filter((_, i) => i !== index),
                    }))
                  }
                >
                  删除
                </Text>
              ) : null}
            </View>
            <SelectField
              label="部门"
              value={p.org_unit_id}
              options={unitOptions}
              placeholder="未分配"
              onChange={(v) => patchPosition(index, { org_unit_id: v })}
            />
            <SelectField
              label="角色"
              value={p.role_type}
              options={ROLE_OPTIONS}
              clearable={false}
              onChange={(v) => patchPosition(index, { role_type: v || 'staff' })}
            />
            <TextField
              label="职位"
              value={p.position}
              placeholder="如 财务经理"
              onChange={(v) => patchPosition(index, { position: v })}
            />
          </View>
        ))}
        <Button
          tone="ghost"
          size="small"
          onClick={() =>
            setEmpForm((f) => ({ ...f, positions: [...f.positions, emptyPosition(null)] }))
          }
        >
          + 增加一个任职部门
        </Button>
      </Sheet>

      {/* 向部门添加成员 */}
      <Sheet
        open={memberOpen}
        title={`向「${unitName4(selectedUnit)}」添加成员`}
        okText="添加"
        onOk={saveMember}
        onClose={() => setMemberOpen(false)}
      >
        <SelectField
          label="已有员工"
          value={memberEmployeeId}
          options={allEmployees.map((e) => ({
            value: e.id,
            label: e.employee_no ? `${e.name}(${e.employee_no})` : e.name,
          }))}
          placeholder="选已有员工则自动带入其档案(兼职)"
          onChange={setMemberEmployeeId}
        />
        {pickedEmployee ? (
          <Alert>
            已有档案:{pickedEmployee.name},电话 {pickedEmployee.phone || '-'},现有{' '}
            {pickedEmployee.positions.length} 个任职
          </Alert>
        ) : (
          <TextField
            label="新员工姓名"
            value={memberName}
            placeholder="不选已有员工时填写"
            onChange={setMemberName}
          />
        )}
        <SelectField
          label="角色"
          value={memberRole}
          options={ROLE_OPTIONS}
          clearable={false}
          onChange={(v) => setMemberRole(v || 'staff')}
        />
        <TextField
          label="职位"
          value={memberPosition}
          placeholder="如 技术顾问"
          onChange={setMemberPosition}
        />
      </Sheet>
    </View>
  )
}
