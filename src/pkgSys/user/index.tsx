import { useCallback, useEffect, useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import type {
  AuthPreset,
  Employee,
  OrgUnit,
  PermissionModule,
  Role,
  UserRow,
} from '@/types/models'
import { personnelApi, presetsApi, usersApi } from '@/services/api'
import { fetchPermissionCatalog } from '@/services/auth'
import { ROLE_LABEL } from '@/constants/labels'
import { confirm, notify, success } from '@/utils/dialog'
import {
  Button,
  Card,
  Empty,
  FieldShell,
  Loading,
  Segmented,
  SelectField,
  Sheet,
  Tag,
  TextField,
} from '@/components/ui'
import './index.scss'

type Tab = 'users' | 'roles' | 'presets'

const TABS = [
  { value: 'users' as const, label: '用户管理' },
  { value: 'roles' as const, label: '角色与权限' },
  { value: 'presets' as const, label: '授权预设' },
]

export default function UserAdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <View className="page-body">
      <Segmented value={tab} options={TABS} onChange={setTab} />
      <View style={{ marginTop: '24rpx' }}>
        {tab === 'users' ? <UserTab /> : null}
        {tab === 'roles' ? <RoleTab /> : null}
        {tab === 'presets' ? <PresetTab /> : null}
      </View>
    </View>
  )
}

/* ---------------- 用户 ---------------- */
function UserTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [roleIds, setRoleIds] = useState<number[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [pwTarget, setPwTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, r, e] = await Promise.all([
        usersApi.list(),
        usersApi.roles(),
        personnelApi.employees(),
      ])
      setUsers(u)
      setRoles(r)
      setEmployees(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (row: UserRow | null) => {
    setEditing(row)
    setUsername(row?.username || '')
    setPassword('')
    setDisplayName(row?.display_name || '')
    setEmployeeId(row?.employee_id ?? null)
    setRoleIds(row?.role_ids || [])
    setIsActive(row ? row.is_active : true)
    setIsSuperAdmin(row ? row.is_super_admin : false)
    setOpen(true)
  }

  const save = async () => {
    if (!editing && (!username.trim() || password.length < 6)) {
      notify('请填写用户名,并设置至少 6 位初始密码')
      return
    }
    const body: Record<string, unknown> = {
      display_name: displayName,
      employee_id: employeeId,
      role_ids: roleIds,
      is_super_admin: isSuperAdmin,
    }
    if (editing) {
      body.is_active = isActive
      await usersApi.update(editing.id, body)
    } else {
      body.username = username.trim()
      body.password = password
      await usersApi.create(body)
    }
    success('已保存')
    setOpen(false)
    load()
  }

  const remove = async (row: UserRow) => {
    if (!(await confirm(`删除用户「${row.username}」?`, { danger: true }))) return
    await usersApi.remove(row.id)
    success('已删除')
    load()
  }

  const resetPassword = async () => {
    if (!pwTarget) return
    if (newPassword.length < 6) {
      notify('新密码至少 6 位')
      return
    }
    await usersApi.resetPassword(pwTarget.id, newPassword)
    success('密码已重置')
    setPwTarget(null)
    setNewPassword('')
  }

  const fillByPreset = async () => {
    if (!employeeId) {
      notify('请先选择关联员工')
      return
    }
    const res = await presetsApi.resolve(employeeId)
    setRoleIds(res.role_ids)
    success('已按该员工的部门+职位预设填充角色')
  }

  const toggleRole = (id: number) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <>
      <Button tone="primary" block onClick={() => openEdit(null)}>
        ＋ 新建用户
      </Button>

      <View style={{ marginTop: '24rpx' }}>
        {loading && users.length === 0 ? <Loading /> : null}
        {!loading && users.length === 0 ? <Empty text="暂无用户" mark="🔐" /> : null}

        {users.map((row) => (
          <Card key={row.id} flush>
            <View className="ui-row-item">
              <View className="ui-row-item__top">
                <Text className="ui-row-item__title u-grow">
                  {row.username}
                  {row.display_name ? <Text className="u-muted"> · {row.display_name}</Text> : null}
                </Text>
                <Tag tone={row.is_active ? 'success' : 'default'}>
                  {row.is_active ? '启用' : '停用'}
                </Tag>
              </View>
              <View className="u-row u-wrap u-gap-s" style={{ marginTop: '10rpx' }}>
                {row.is_super_admin ? (
                  <Tag tone="danger">超级管理员</Tag>
                ) : row.role_names.length ? (
                  row.role_names.map((n) => <Tag key={n}>{n}</Tag>)
                ) : (
                  <Text className="u-muted">未分配角色</Text>
                )}
              </View>
              <View className="ui-row-item__actions">
                <Text className="ui-link" onClick={() => openEdit(row)}>
                  编辑
                </Text>
                <Text
                  className="ui-link"
                  onClick={() => {
                    setPwTarget(row)
                    setNewPassword('')
                  }}
                >
                  重置密码
                </Text>
                {row.username !== 'admin' ? (
                  <Text className="ui-link ui-link--danger" onClick={() => remove(row)}>
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
        title={editing ? '编辑用户' : '新建用户'}
        onOk={save}
        onClose={() => setOpen(false)}
      >
        {!editing ? (
          <>
            <TextField label="用户名" required value={username} onChange={setUsername} />
            <TextField
              label="初始密码"
              required
              password
              value={password}
              placeholder="至少 6 位"
              onChange={setPassword}
            />
          </>
        ) : null}
        <TextField label="姓名" value={displayName} onChange={setDisplayName} />
        <SelectField
          label="关联员工"
          value={employeeId}
          options={employees.map((e) => ({ value: e.id, label: e.name }))}
          onChange={setEmployeeId}
        />

        <FieldShell
          label="角色(可多选)"
          stack
          hint={
            <Text className="ui-link" onClick={fillByPreset}>
              ⚡ 按部门角色预设填充
            </Text>
          }
        >
          <View className="u-row u-wrap u-gap-s">
            {roles.map((r) => (
              <Tag
                key={r.id}
                tone={roleIds.includes(r.id) ? 'blue' : 'default'}
                onClick={() => toggleRole(r.id)}
              >
                {roleIds.includes(r.id) ? '✓ ' : ''}
                {r.name}
              </Tag>
            ))}
            {roles.length === 0 ? <Text className="u-muted">暂无角色</Text> : null}
          </View>
        </FieldShell>

        {editing ? (
          <FieldShell label="启用">
            <Switch checked={isActive} onChange={(e) => setIsActive(e.detail.value)} />
          </FieldShell>
        ) : null}
        <FieldShell label="超级管理员" hint="拥有全部权限">
          <Switch checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.detail.value)} />
        </FieldShell>
      </Sheet>

      <Sheet
        open={Boolean(pwTarget)}
        title={`重置密码 — ${pwTarget?.username || ''}`}
        okText="重置"
        onOk={resetPassword}
        onClose={() => setPwTarget(null)}
      >
        <TextField
          label="新密码"
          required
          password
          value={newPassword}
          placeholder="至少 6 位"
          onChange={setNewPassword}
        />
      </Sheet>
    </>
  )
}

/* ---------------- 角色与权限 ---------------- */
function RoleTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [catalog, setCatalog] = useState<PermissionModule[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [perms, setPerms] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([usersApi.roles(), fetchPermissionCatalog()])
      setRoles(r)
      setCatalog(c)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (role: Role | null) => {
    setEditing(role)
    setName(role?.name || '')
    setNote(role?.note || '')
    setPerms(role?.perms || [])
    setOpen(true)
  }

  const togglePerm = (perm: string) =>
    setPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]))

  const toggleModule = (module: PermissionModule, checked: boolean) => {
    const modulePerms = module.actions.map((a) => `${module.module}:${a.action}`)
    setPerms((prev) =>
      checked
        ? Array.from(new Set([...prev, ...modulePerms]))
        : prev.filter((p) => !modulePerms.includes(p)),
    )
  }

  const save = async () => {
    if (!name.trim()) {
      notify('请填写角色名称')
      return
    }
    const body = { name: name.trim(), note, perms }
    if (editing) await usersApi.updateRole(editing.id, body)
    else await usersApi.createRole(body)
    success('已保存')
    setOpen(false)
    load()
  }

  const remove = async (role: Role) => {
    if (!(await confirm(`删除角色「${role.name}」?`, { danger: true }))) return
    await usersApi.removeRole(role.id)
    success('已删除')
    load()
  }

  return (
    <>
      <Button tone="primary" block onClick={() => openEdit(null)}>
        ＋ 新建角色
      </Button>

      <View style={{ marginTop: '24rpx' }}>
        {loading && roles.length === 0 ? <Loading /> : null}
        {!loading && roles.length === 0 ? <Empty text="暂无角色" mark="🏷" /> : null}

        {roles.map((role) => (
          <Card key={role.id} flush>
            <View className="ui-row-item">
              <View className="ui-row-item__top">
                <Text className="ui-row-item__title u-grow">{role.name}</Text>
                <Tag tone="blue">{role.perms.length} 项权限</Tag>
              </View>
              {role.note ? <Text className="ui-row-item__sub">{role.note}</Text> : null}
              <View className="ui-row-item__actions">
                <Text className="ui-link" onClick={() => openEdit(role)}>
                  编辑
                </Text>
                <Text className="ui-link ui-link--danger" onClick={() => remove(role)}>
                  删除
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Sheet
        open={open}
        title={editing ? '编辑角色' : '新建角色'}
        onOk={save}
        onClose={() => setOpen(false)}
      >
        <TextField label="角色名称" required value={name} onChange={setName} />
        <TextField label="说明" value={note} placeholder="可选" onChange={setNote} />

        <View className="section-title">权限设置(点选允许的操作)</View>
        {catalog.map((module) => {
          const modulePerms = module.actions.map((a) => `${module.module}:${a.action}`)
          const allChecked = modulePerms.every((p) => perms.includes(p))
          return (
            <View key={module.module} className="perm__module">
              <View className="u-row-between">
                <Text className="perm__module-name">{module.label}</Text>
                <Text className="ui-link" onClick={() => toggleModule(module, !allChecked)}>
                  {allChecked ? '取消全选' : '全选'}
                </Text>
              </View>
              <View className="u-row u-wrap u-gap-s" style={{ marginTop: '10rpx' }}>
                {module.actions.map((a) => {
                  const perm = `${module.module}:${a.action}`
                  const checked = perms.includes(perm)
                  return (
                    <Tag
                      key={perm}
                      tone={checked ? 'blue' : 'default'}
                      onClick={() => togglePerm(perm)}
                    >
                      {checked ? '✓ ' : ''}
                      {a.label}
                    </Tag>
                  )
                })}
              </View>
            </View>
          )
        })}
      </Sheet>
    </>
  )
}

/* ---------------- 授权预设 ---------------- */
function PresetTab() {
  const [presets, setPresets] = useState<AuthPreset[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AuthPreset | null>(null)
  const [orgUnitId, setOrgUnitId] = useState<number | null>(null)
  const [empRoleType, setEmpRoleType] = useState('')
  const [roleId, setRoleId] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, r, u] = await Promise.all([
        presetsApi.list(),
        usersApi.roles(),
        personnelApi.orgUnits(),
      ])
      setPresets(p)
      setRoles(r)
      setUnits(u)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (preset: AuthPreset | null) => {
    setEditing(preset)
    setOrgUnitId(preset?.org_unit_id ?? null)
    setEmpRoleType(preset?.emp_role_type || '')
    setRoleId(preset?.role_id ?? null)
    setNote(preset?.note || '')
    setOpen(true)
  }

  const save = async () => {
    if (!roleId) {
      notify('请选择要授予的系统角色')
      return
    }
    const body = {
      org_unit_id: orgUnitId,
      emp_role_type: empRoleType,
      role_id: roleId,
      note,
    }
    if (editing) await presetsApi.update(editing.id, body)
    else await presetsApi.create(body)
    success('已保存')
    setOpen(false)
    load()
  }

  const remove = async (preset: AuthPreset) => {
    if (!(await confirm('删除该预设?', { danger: true }))) return
    await presetsApi.remove(preset.id)
    success('已删除')
    load()
  }

  const applyAll = async () => {
    if (!(await confirm('将按预设覆盖所有关联员工用户的角色,确认?'))) return
    const res = await presetsApi.apply()
    success(`已更新 ${res.updated} / ${res.total} 个用户`)
  }

  return (
    <>
      <View className="u-row u-gap-s">
        <Button tone="primary" block onClick={() => openEdit(null)}>
          ＋ 新建预设
        </Button>
        <Button block onClick={applyAll}>
          批量应用到用户
        </Button>
      </View>

      <Text className="preset__hint">
        规则:员工在「部门 + 职位角色」满足条件时,自动授予对应系统角色。新建用户关联员工后可一键按预设填充。
      </Text>

      {loading && presets.length === 0 ? <Loading /> : null}
      {!loading && presets.length === 0 ? <Empty text="暂无授权预设" mark="⚡" /> : null}

      {presets.map((preset) => (
        <Card key={preset.id} flush>
          <View className="ui-row-item">
            <View className="u-row u-wrap u-gap-s">
              <Tag>{preset.org_unit_name}</Tag>
              <Text className="u-muted">+</Text>
              <Tag tone="blue">{preset.emp_role_label}</Tag>
              <Text className="u-muted">→</Text>
              <Tag tone="success">{preset.role_name}</Tag>
            </View>
            {preset.note ? <Text className="ui-row-item__sub">{preset.note}</Text> : null}
            <View className="ui-row-item__actions">
              <Text className="ui-link" onClick={() => openEdit(preset)}>
                编辑
              </Text>
              <Text className="ui-link ui-link--danger" onClick={() => remove(preset)}>
                删除
              </Text>
            </View>
          </View>
        </Card>
      ))}

      <Sheet
        open={open}
        title={editing ? '编辑授权预设' : '新建授权预设'}
        onOk={save}
        onClose={() => setOpen(false)}
      >
        <SelectField
          label="部门"
          value={orgUnitId}
          options={units.map((u) => ({ value: u.id, label: u.name }))}
          placeholder="留空 = 全部部门"
          onChange={setOrgUnitId}
        />
        <SelectField
          label="员工职位角色"
          value={empRoleType}
          options={[
            { value: '', label: '全部职位' },
            ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })),
          ]}
          clearable={false}
          onChange={(v) => setEmpRoleType(v ?? '')}
        />
        <SelectField
          label="授予系统角色"
          required
          value={roleId}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          clearable={false}
          onChange={setRoleId}
        />
        <TextField label="说明" value={note} placeholder="可选" onChange={setNote} />
      </Sheet>
    </>
  )
}
