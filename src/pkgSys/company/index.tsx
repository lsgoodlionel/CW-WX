import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type { Company } from '@/types/models'
import { companyApi } from '@/services/api'
import { apiUrl, getApiBase } from '@/services/env'
import { uploadFile } from '@/services/request'
import { withToken } from '@/services/token'
import { pickFile } from '@/services/attachments'
import { hasPerm } from '@/services/auth'
import { useAuth } from '@/hooks/useAuth'
import { confirm, notify, success } from '@/utils/dialog'
import { Alert, Button, Card, Loading, TextField } from '@/components/ui'

type CompanyField = keyof Omit<Company, 'id'>

const GROUPS: { title: string; fields: { key: CompanyField; label: string; required?: boolean; placeholder?: string }[] }[] = [
  {
    title: '工商登记',
    fields: [
      { key: 'name', label: '公司名称', required: true },
      { key: 'tax_number', label: '纳税人识别号(税号)' },
      { key: 'legal_person', label: '法定代表人 / 负责人' },
      { key: 'industry', label: '所属行业' },
      { key: 'establish_date', label: '成立日期', placeholder: '如 2020-01-01' },
      { key: 'reg_address', label: '注册地址' },
      { key: 'phone', label: '联系电话' },
    ],
  },
  {
    title: '财务设置',
    fields: [
      { key: 'bank_name', label: '开户银行' },
      { key: 'bank_account', label: '银行账号' },
      { key: 'accounting_standard', label: '执行会计准则', placeholder: '小企业会计准则' },
      { key: 'currency', label: '记账本位币', placeholder: '人民币' },
      { key: 'start_period', label: '启用会计期间', placeholder: '如 2025-01' },
    ],
  },
  {
    title: '人员',
    fields: [
      { key: 'accountant', label: '会计主管' },
      { key: 'auditor', label: '审核' },
      { key: 'bookkeeper', label: '记账' },
      { key: 'recorder', label: '录入' },
    ],
  },
]

type FormState = Partial<Record<CompanyField, string>>

export default function CompanyPage() {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const canEdit = hasPerm(user, 'company', 'edit')

  useEffect(() => {
    companyApi
      .get()
      .then((company) => {
        const next: FormState = {}
        GROUPS.forEach((g) =>
          g.fields.forEach((f) => {
            next[f.key] = String(company[f.key] ?? '')
          }),
        )
        setForm(next)
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!form.name?.trim()) {
      notify('请填写公司名称')
      return
    }
    setSaving(true)
    try {
      await companyApi.update(form)
      success('企业信息已保存')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="page-body">
        <Loading />
      </View>
    )
  }

  return (
    <View className="page-body">
      {GROUPS.map((group) => (
        <Card key={group.title} title={group.title}>
          {group.fields.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              required={f.required}
              value={form[f.key] || ''}
              placeholder={f.placeholder}
              onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
        </Card>
      ))}

      {canEdit ? (
        <Button tone="primary" block loading={saving} onClick={save}>
          保存
        </Button>
      ) : null}

      <DataBackup canImport={Boolean(user?.is_super_admin)} />
    </View>
  )
}

/** 数据备份 / 恢复 */
function DataBackup({ canImport }: { canImport: boolean }) {
  const [busy, setBusy] = useState(false)

  const exportBackup = async () => {
    if (!getApiBase()) {
      notify('未配置服务器地址')
      return
    }
    setBusy(true)
    Taro.showLoading({ title: '正在打包…', mask: true })
    try {
      const res = await Taro.downloadFile({ url: withToken(apiUrl('/data/export')) })
      Taro.hideLoading()
      if (res.statusCode !== 200) {
        notify(`导出失败(${res.statusCode})`)
        return
      }
      // 小程序无法直接落盘,转发到聊天(可发给「文件传输助手」)即可保存
      await Taro.shareFileMessage({ filePath: res.tempFilePath, fileName: 'finance-backup.zip' })
    } catch {
      Taro.hideLoading()
      notify('导出失败,或当前微信版本不支持转发文件,请改用网页端导出')
    } finally {
      setBusy(false)
    }
  }

  const importBackup = async () => {
    const ok = await confirm(
      '导入将【整体替换】当前所有数据(凭证、附件、科目、企业信息),此操作不可撤销。',
      { title: '确认导入备份?', confirmText: '确认导入', danger: true },
    )
    if (!ok) return

    const picked = await pickFile()
    if (!picked) return
    if (!/\.zip$/i.test(picked.name)) {
      notify('请选择 .zip 备份文件')
      return
    }

    setBusy(true)
    Taro.showLoading({ title: '导入中…', mask: true })
    try {
      const res = await uploadFile<{ accounts: number; vouchers: number; attachments: number }>(
        '/data/import',
        picked.path,
      )
      Taro.hideLoading()
      success(`导入成功:科目 ${res.accounts}、凭证 ${res.vouchers}、附件 ${res.attachments}`)
    } catch {
      Taro.hideLoading()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="数据备份 / 恢复">
      <Alert tone="warning">
        导出会把企业信息、科目、全部凭证与附件打包成一个 zip。小程序无法直接保存文件,
        导出后请通过「转发到聊天」发给文件传输助手保存;导入为整体替换,请先做好备份。
      </Alert>
      <View className="u-row u-gap-s">
        <Button tone="primary" block loading={busy} onClick={exportBackup}>
          导出备份
        </Button>
        {canImport ? (
          <Button block loading={busy} onClick={importBackup}>
            导入备份
          </Button>
        ) : null}
      </View>
      {!canImport ? (
        <Text className="u-muted">导入备份仅限超级管理员操作。</Text>
      ) : null}
    </Card>
  )
}
