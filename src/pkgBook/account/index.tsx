import { useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { AccountTreeNode, Category, SubAccount } from '@/types/models'
import { accountsApi } from '@/services/api'
import { downloadAndOpen, uploadFile } from '@/services/request'
import { pickFile } from '@/services/attachments'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { useAsync } from '@/hooks/useAsync'
import { CATEGORY_LABEL, CATEGORY_TONE } from '@/constants/labels'
import { confirm, notify, success } from '@/utils/dialog'
import {
  Button,
  Card,
  Empty,
  Loading,
  Segmented,
  SelectField,
  Sheet,
  Tag,
  TextField,
} from '@/components/ui'
import './index.scss'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'asset', label: '资产' },
  { value: 'liability', label: '负债' },
  { value: 'equity', label: '权益' },
  { value: 'cost', label: '成本' },
  { value: 'profit', label: '损益' },
] as const

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABEL) as Category[]).map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
}))

const DIRECTION_OPTIONS = [
  { value: 'debit', label: '借方' },
  { value: 'credit', label: '贷方' },
]

interface ImportResult {
  created: number
  skipped: number
  errors: number
  messages?: string[]
}

export default function AccountPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<number[]>([])

  const { data: tree, loading, reload } = useAsync(() => accountsApi.tree(), [])

  const [accountOpen, setAccountOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('asset')
  const [newDirection, setNewDirection] = useState('debit')

  const [subOpen, setSubOpen] = useState(false)
  const [subParent, setSubParent] = useState<AccountTreeNode | null>(null)
  const [subEditing, setSubEditing] = useState<SubAccount | null>(null)
  const [subName, setSubName] = useState('')
  const [subNote, setSubNote] = useState('')

  const canCreate = hasPerm(user, 'account', 'create')
  const canEdit = hasPerm(user, 'account', 'edit')
  const canDelete = hasPerm(user, 'account', 'delete')

  usePullDownRefresh(() => {
    reload()
    setTimeout(() => Taro.stopPullDownRefresh(), 600)
  })

  const list = useMemo(() => {
    if (!tree) return []
    return filter === 'all' ? tree : tree.filter((a) => a.category === filter)
  }, [tree, filter])

  const toggle = (id: number) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const createAccount = async () => {
    if (!newCode.trim() || !newName.trim()) {
      notify('请填写科目编码与名称')
      return
    }
    await accountsApi.create({
      code: newCode.trim(),
      name: newName.trim(),
      category: newCategory,
      direction: newDirection as 'debit' | 'credit',
    })
    success('一级科目已新增')
    setAccountOpen(false)
    setNewCode('')
    setNewName('')
    reload()
  }

  const removeAccount = async (account: AccountTreeNode) => {
    if (!(await confirm(`停用/删除一级科目「${account.name}」?`, { danger: true }))) return
    await accountsApi.remove(account.id)
    success('已停用/删除')
    reload()
  }

  const openSub = (parent: AccountTreeNode, sub: SubAccount | null) => {
    setSubParent(parent)
    setSubEditing(sub)
    setSubName(sub?.name || '')
    setSubNote(sub?.note || '')
    setSubOpen(true)
  }

  const saveSub = async () => {
    if (!subName.trim()) {
      notify('请填写二级科目名称')
      return
    }
    const body = { name: subName.trim(), note: subNote }
    if (subEditing) await accountsApi.updateSub(subEditing.id, body)
    else if (subParent) await accountsApi.createSub(subParent.id, body)
    success('二级科目已保存')
    setSubOpen(false)
    reload()
  }

  const removeSub = async (sub: SubAccount) => {
    if (!(await confirm(`停用/删除二级科目「${sub.name}」?`, { danger: true }))) return
    await accountsApi.removeSub(sub.id)
    success('已停用/删除')
    reload()
  }

  const importSubAccounts = async () => {
    const picked = await pickFile()
    if (!picked) return
    if (!/\.xlsx$/i.test(picked.name)) {
      notify('请选择 .xlsx 模板文件')
      return
    }
    Taro.showLoading({ title: '导入中…', mask: true })
    try {
      const res = await uploadFile<ImportResult>('/accounts/subaccounts/import', picked.path)
      Taro.hideLoading()
      await Taro.showModal({
        title: '导入完成',
        content: `新增 ${res.created}、跳过 ${res.skipped}、失败 ${res.errors}\n${(res.messages || []).join('\n')}`,
        showCancel: false,
      })
      reload()
    } catch {
      Taro.hideLoading()
    }
  }

  return (
    <View className="page-body">
      <Segmented value={filter} options={FILTERS as unknown as { value: string; label: string }[]} onChange={setFilter} />

      <View className="account__tools">
        <Button size="small" onClick={() => downloadAndOpen('/accounts/subaccounts/template', undefined, 'xlsx')}>
          导入模板
        </Button>
        {canCreate ? (
          <Button size="small" onClick={importSubAccounts}>
            导入二级科目
          </Button>
        ) : null}
        <Button size="small" onClick={() => downloadAndOpen('/accounts/export-excel', undefined, 'xlsx')}>
          导出全部
        </Button>
        {canCreate ? (
          <Button tone="primary" size="small" onClick={() => setAccountOpen(true)}>
            ＋ 一级科目
          </Button>
        ) : null}
      </View>

      {loading && !tree ? <Loading /> : null}
      {!loading && list.length === 0 ? <Empty text="暂无科目" mark="🗂" /> : null}

      {list.map((a) => {
        const open = expanded.includes(a.id)
        return (
          <Card key={a.id} flush className="account__card">
            <View className="account__row" onClick={() => toggle(a.id)}>
              <View className="u-grow">
                <View className="u-row u-gap-s u-wrap">
                  <Text className="account__code u-num">{a.code}</Text>
                  <Text className="account__name">{a.name}</Text>
                  <Tag tone={CATEGORY_TONE[a.category]}>{CATEGORY_LABEL[a.category]}</Tag>
                  <Tag>{a.direction === 'debit' ? '借' : '贷'}</Tag>
                  {a.is_active ? null : <Tag>已停用</Tag>}
                </View>
                <Text className="account__sub-count">
                  {a.sub_accounts.length ? `${a.sub_accounts.length} 个二级科目` : '暂无二级科目'}
                </Text>
              </View>
              <Text className="account__arrow">{open ? '▴' : '▾'}</Text>
            </View>

            {open ? (
              <View className="account__subs">
                {a.sub_accounts.map((s) => (
                  <View key={s.id} className="account__sub">
                    <View className="u-row-between">
                      <View className="u-grow">
                        <Text className="u-num account__sub-code">{s.code}</Text>
                        <Text className="account__sub-name">{s.name}</Text>
                        {s.is_active ? null : <Tag>停用</Tag>}
                      </View>
                      <View className="u-row u-gap-s">
                        {canEdit ? (
                          <Text className="ui-link" onClick={() => openSub(a, s)}>
                            编辑
                          </Text>
                        ) : null}
                        {canDelete ? (
                          <Text className="ui-link ui-link--danger" onClick={() => removeSub(s)}>
                            删除
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {s.note ? <Text className="u-muted">{s.note}</Text> : null}
                  </View>
                ))}
                <View className="account__sub-actions">
                  {canCreate ? (
                    <Button tone="ghost" size="small" onClick={() => openSub(a, null)}>
                      + 新增二级科目
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button tone="danger" size="small" onClick={() => removeAccount(a)}>
                      停用一级科目
                    </Button>
                  ) : null}
                </View>
              </View>
            ) : null}
          </Card>
        )
      })}

      <Sheet
        open={accountOpen}
        title="新增一级科目"
        onOk={createAccount}
        onClose={() => setAccountOpen(false)}
      >
        <TextField label="科目编码" required value={newCode} placeholder="如 6602" onChange={setNewCode} />
        <TextField label="科目名称" required value={newName} placeholder="如 管理费用" onChange={setNewName} />
        <SelectField
          label="类别"
          value={newCategory}
          options={CATEGORY_OPTIONS}
          clearable={false}
          onChange={(v) => setNewCategory((v as Category) || 'asset')}
        />
        <SelectField
          label="余额方向"
          value={newDirection}
          options={DIRECTION_OPTIONS}
          clearable={false}
          onChange={(v) => setNewDirection(v || 'debit')}
        />
      </Sheet>

      <Sheet
        open={subOpen}
        title={subEditing ? '编辑二级科目' : `新增二级科目 — ${subParent?.name || ''}`}
        onOk={saveSub}
        onClose={() => setSubOpen(false)}
      >
        <TextField label="名称" required value={subName} placeholder="如 办公费" onChange={setSubName} />
        <TextField label="备注" value={subNote} placeholder="可选" onChange={setSubNote} />
        {!subEditing ? (
          <Text className="u-muted">编码将按一级科目「{subParent?.code}」自动延续生成。</Text>
        ) : null}
      </Sheet>
    </View>
  )
}
