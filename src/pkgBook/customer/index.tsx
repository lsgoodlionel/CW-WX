import { useCallback, useEffect, useState } from 'react'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { Customer } from '@/types/models'
import { customersApi } from '@/services/api'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { PARTY_LABEL, PARTY_TONE } from '@/constants/labels'
import { confirm, notify, success } from '@/utils/dialog'
import {
  Button,
  Empty,
  Loading,
  SearchBar,
  Segmented,
  SelectField,
  Sheet,
  Tag,
  TextField,
} from '@/components/ui'
import './index.scss'

const PARTY_OPTIONS = Object.entries(PARTY_LABEL).map(([value, label]) => ({ value, label }))

const FIELDS: { key: keyof Customer; label: string; required?: boolean }[] = [
  { key: 'name', label: '名称', required: true },
  { key: 'short_name', label: '简称' },
  { key: 'tax_number', label: '税号/证件号' },
  { key: 'address', label: '地址' },
  { key: 'phone', label: '电话' },
  { key: 'bank_name', label: '开户行' },
  { key: 'bank_account', label: '银行账号' },
  { key: 'contact_person', label: '联系人' },
  { key: 'contact_phone', label: '联系电话' },
  { key: 'email', label: '邮箱' },
  { key: 'note', label: '备注' },
]

type FormState = Record<string, string>

const emptyForm = (partyType: string): FormState => {
  const form: FormState = { party_type: partyType }
  FIELDS.forEach((f) => {
    form[f.key] = ''
  })
  return form
}

export default function CustomerPage() {
  const { user } = useAuth()
  const [partyType, setPartyType] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('enterprise'))

  const canCreate = hasPerm(user, 'customer', 'create')
  const canEdit = hasPerm(user, 'customer', 'edit')
  const canDelete = hasPerm(user, 'customer', 'delete')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(
        await customersApi.list({
          keyword: keyword || undefined,
          party_type: partyType === 'all' ? undefined : partyType,
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [keyword, partyType])

  useEffect(() => {
    load()
  }, [load])

  useDidShow(() => {
    if (list.length) load()
  })

  usePullDownRefresh(() => {
    load().finally(() => Taro.stopPullDownRefresh())
  })

  const openEdit = (customer: Customer | null) => {
    setEditing(customer)
    if (customer) {
      const next: FormState = { party_type: customer.party_type }
      FIELDS.forEach((f) => {
        next[f.key] = String(customer[f.key] ?? '')
      })
      setForm(next)
    } else {
      setForm(emptyForm(partyType === 'all' ? 'enterprise' : partyType))
    }
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      notify('请填写名称')
      return
    }
    if (editing) await customersApi.update(editing.id, form)
    else await customersApi.create(form)
    success('已保存')
    setOpen(false)
    load()
  }

  const remove = async (customer: Customer) => {
    if (!(await confirm(`删除/停用「${customer.name}」?`, { danger: true }))) return
    await customersApi.remove(customer.id)
    success('已删除/停用')
    load()
  }

  return (
    <View className="page-body">
      <Segmented
        value={partyType}
        options={[{ value: 'all', label: '全部' }, ...PARTY_OPTIONS]}
        onChange={setPartyType}
      />

      <View className="ui-toolbar" style={{ marginTop: '24rpx' }}>
        <View className="u-grow">
          <SearchBar placeholder="搜索名称 / 简称 / 税号" onSearch={setKeyword} />
        </View>
        {canCreate ? (
          <Button tone="primary" size="small" onClick={() => openEdit(null)}>
            ＋ 新增
          </Button>
        ) : null}
      </View>

      {loading && list.length === 0 ? <Loading /> : null}
      {!loading && list.length === 0 ? <Empty text="暂无往来单位" mark="🏢" /> : null}

      {list.map((c) => (
        <View
          key={c.id}
          className="customer-card"
          onClick={() => Taro.navigateTo({ url: `/pkgBook/customer/detail?id=${c.id}` })}
        >
          <View className="u-row-between">
            <Text className="customer-card__name u-grow u-ellipsis">{c.name}</Text>
            <Tag tone={PARTY_TONE[c.party_type]}>{PARTY_LABEL[c.party_type] || c.party_type}</Tag>
          </View>
          <View className="customer-card__meta">
            {c.short_name ? <Text>简称 {c.short_name} · </Text> : null}
            <Text>{c.tax_number || '无税号'}</Text>
          </View>
          <View className="u-row-between customer-card__foot">
            <Text className="u-muted">
              {c.contact_person || '-'} {c.contact_phone || ''}
            </Text>
            <View className="u-row u-gap-s">
              {c.is_active ? null : <Tag>停用</Tag>}
              {canEdit ? (
                <Text
                  className="ui-link"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(c)
                  }}
                >
                  编辑
                </Text>
              ) : null}
              {canDelete ? (
                <Text
                  className="ui-link ui-link--danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(c)
                  }}
                >
                  删除
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      ))}

      <Sheet
        open={open}
        title={editing ? '编辑往来单位' : '新增往来单位'}
        onOk={save}
        onClose={() => setOpen(false)}
      >
        <SelectField
          label="类型"
          value={form.party_type}
          options={PARTY_OPTIONS}
          clearable={false}
          onChange={(v) => setForm((f) => ({ ...f, party_type: v || 'enterprise' }))}
        />
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            required={f.required}
            value={form[f.key] || ''}
            placeholder={f.required ? `请填写${f.label}` : '可选'}
            onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
          />
        ))}
      </Sheet>
    </View>
  )
}
