import { useCallback, useEffect, useMemo, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import type {
  AccountTreeNode,
  Attachment,
  Customer,
  Entry,
  LinkedVoucher,
  VoucherDetail,
} from '@/types/models'
import { accountsApi, customersApi, vouchersApi, type VoucherPayload } from '@/services/api'
import { CATEGORY_LABEL, PARTY_LABEL, RELATION_LABEL } from '@/constants/labels'
import { today } from '@/utils/date'
import { confirm, notify, success } from '@/utils/dialog'
import { money, toNumber } from '@/utils/format'
import {
  Alert,
  Button,
  Card,
  DateField,
  Empty,
  NumberField,
  SearchBar,
  SelectField,
  Sheet,
  Tag,
  TextField,
} from '@/components/ui'
import AttachmentBar from '@/components/business/AttachmentBar'
import './edit.scss'

const emptyEntry = (): Entry => ({
  summary: '',
  account_id: 0,
  sub_account: '',
  debit: 0,
  credit: 0,
})

const RELATION_OPTIONS = Object.entries(RELATION_LABEL).map(([value, label]) => ({ value, label }))

export default function VoucherEditPage() {
  const router = useRouter()
  const idParam = router.params.id
  const isEdit = Boolean(idParam)
  const voucherId = idParam ? Number(idParam) : null

  const [accounts, setAccounts] = useState<AccountTreeNode[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [voucherDate, setVoucherDate] = useState(today())
  const [voucherNo, setVoucherNo] = useState('')
  const [note, setNote] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [entries, setEntries] = useState<Entry[]>([emptyEntry(), emptyEntry()])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [links, setLinks] = useState<LinkedVoucher[]>([])
  const [saving, setSaving] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: isEdit ? '编辑凭证' : '新建凭证' })
    accountsApi
      .tree()
      .then((tree) => setAccounts(tree.filter((a) => a.is_active)))
      .catch(() => undefined)
    customersApi
      .list({ active_only: true })
      .then(setCustomers)
      .catch(() => undefined)
  }, [isEdit])

  const applyDetail = useCallback((v: VoucherDetail) => {
    setVoucherDate(v.voucher_date)
    setVoucherNo(v.voucher_no)
    setNote(v.note)
    setCustomerId(v.customer_id)
    setEntries(v.entries.length ? v.entries : [emptyEntry(), emptyEntry()])
    setAttachments(v.attachments)
    setLinks(v.links)
  }, [])

  useEffect(() => {
    if (!voucherId) return
    vouchersApi.detail(voucherId).then(applyDetail).catch(() => undefined)
  }, [voucherId, applyDetail])

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.code} ${a.name}`,
        keywords: `${a.code} ${CATEGORY_LABEL[a.category]}`,
      })),
    [accounts],
  )

  const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0)
  const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0)
  // 允许红字(负数)冲销:借贷相等且不为零即可
  const balanced = totalDebit === totalCredit && totalDebit !== 0

  const patchEntry = (index: number, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)))

  const buildPayload = (): VoucherPayload | null => {
    const valid = entries.filter((e) => e.account_id && (e.debit !== 0 || e.credit !== 0))
    if (valid.length < 1) {
      notify('请至少填写一条有效分录')
      return null
    }
    if (!balanced) {
      notify(`借贷不平衡:借 ${money(totalDebit)} ≠ 贷 ${money(totalCredit)}`)
      return null
    }
    return {
      voucher_no: voucherNo,
      voucher_date: voucherDate,
      note,
      customer_id: customerId,
      status: 'posted',
      entries: valid.map((e) => ({
        summary: e.summary,
        account_id: e.account_id,
        sub_account: e.sub_account,
        // 编辑态可能仍是接口读回的字符串,提交前统一成数字
        debit: toNumber(e.debit),
        credit: toNumber(e.credit),
      })),
    }
  }

  const save = async () => {
    const payload = buildPayload()
    if (!payload) return
    setSaving(true)
    try {
      const saved = voucherId
        ? await vouchersApi.update(voucherId, payload)
        : await vouchersApi.create(payload)
      success('保存成功')
      if (!voucherId) {
        Taro.redirectTo({ url: `/pkgBook/voucher/edit?id=${saved.id}` })
      } else {
        applyDetail(saved)
      }
    } finally {
      setSaving(false)
    }
  }

  /** 上传附件前保证凭证已落库 */
  const ensureOwner = async (): Promise<number | null> => {
    if (voucherId) return voucherId
    const payload = buildPayload()
    if (!payload) return null
    const created = await vouchersApi.create(payload)
    notify('凭证已保存,请再次点击上传附件')
    Taro.redirectTo({ url: `/pkgBook/voucher/edit?id=${created.id}` })
    return null
  }

  const reverse = async () => {
    if (!voucherId) return
    const ok = await confirm(
      '将新建一张金额取负、借贷科目相同的红字凭证,并与本凭证建立「冲销」关联。',
      { title: '生成红字冲销凭证?', confirmText: '确认冲销', danger: true },
    )
    if (!ok) return
    const created = await vouchersApi.reverse(voucherId)
    success('已生成红字冲销凭证')
    Taro.redirectTo({ url: `/pkgBook/voucher/edit?id=${created.id}` })
  }

  const removeLink = async (link: LinkedVoucher) => {
    if (!(await confirm('删除该关联?', { danger: true }))) return
    await vouchersApi.removeLink(link.link_id)
    setLinks((prev) => prev.filter((l) => l.link_id !== link.link_id))
    success('已删除关联')
  }

  return (
    <View className="page-body">
      <Card title="凭证信息">
        <DateField label="凭证日期" required value={voucherDate} onChange={setVoucherDate} />
        <TextField
          label="凭证号"
          value={voucherNo}
          placeholder="留空自动生成"
          onChange={setVoucherNo}
        />
        <SelectField
          label="往来单位"
          value={customerId}
          options={customers.map((c) => ({
            value: c.id,
            label: `[${PARTY_LABEL[c.party_type] || '往来'}] ${c.name}${c.short_name ? `(${c.short_name})` : ''}`,
            keywords: c.tax_number,
          }))}
          placeholder="可选"
          onChange={setCustomerId}
        />
        <TextField label="摘要" value={note} placeholder="本张凭证摘要" onChange={setNote} />
      </Card>

      <Card
        title="会计分录"
        extra={
          <Tag tone={balanced ? 'success' : 'danger'}>{balanced ? '借贷平衡' : '借贷不平衡'}</Tag>
        }
      >
        {entries.map((entry, index) => (
          <View key={index} className="entry">
            <View className="entry__head">
              <Text className="entry__no">分录 {index + 1}</Text>
              {entries.length > 1 ? (
                <Text
                  className="ui-link ui-link--danger"
                  onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                >
                  删除
                </Text>
              ) : null}
            </View>
            <TextField
              label="摘要"
              value={entry.summary}
              placeholder="分录摘要"
              onChange={(v) => patchEntry(index, { summary: v })}
            />
            <SelectField
              label="会计科目"
              required
              value={entry.account_id || null}
              options={accountOptions}
              clearable={false}
              placeholder="选择科目"
              onChange={(v) => patchEntry(index, { account_id: v || 0, sub_account: '' })}
            />
            <SubAccountField
              value={entry.sub_account}
              account={accounts.find((a) => a.id === entry.account_id) || null}
              onChange={(v) => patchEntry(index, { sub_account: v })}
            />
            <NumberField
              label="借方金额"
              allowNegative
              value={entry.debit || null}
              placeholder="0.00(负数为红字)"
              onChange={(v) => patchEntry(index, { debit: v, credit: 0 })}
            />
            <NumberField
              label="贷方金额"
              allowNegative
              value={entry.credit || null}
              placeholder="0.00(负数为红字)"
              onChange={(v) => patchEntry(index, { credit: v, debit: 0 })}
            />
          </View>
        ))}

        <View className="entry__sum">
          <View className="u-row-between">
            <Text>借方合计</Text>
            <Text className="u-num entry__sum-value">{money(totalDebit)}</Text>
          </View>
          <View className="u-row-between">
            <Text>贷方合计</Text>
            <Text className="u-num entry__sum-value">{money(totalCredit)}</Text>
          </View>
        </View>

        <View className="u-row u-gap-s" style={{ marginTop: '24rpx' }}>
          <Button tone="ghost" size="small" onClick={() => setEntries((p) => [...p, emptyEntry()])}>
            + 增加分录
          </Button>
        </View>
      </Card>

      <Card title="附件凭证">
        {!isEdit ? (
          <Alert>保存凭证后即可上传附件(发票 / 银行回单 / 合同 / 完税证明)。</Alert>
        ) : null}
        <AttachmentBar
          ownerId={voucherId}
          basePath="/vouchers"
          ensureOwner={ensureOwner}
          attachments={attachments}
          onChange={setAttachments}
        />
      </Card>

      <Card
        title="凭证关联"
        extra={
          isEdit ? (
            <Text className="ui-link" onClick={() => setLinkOpen(true)}>
              + 添加关联
            </Text>
          ) : null
        }
        flush
      >
        {!isEdit ? (
          <View className="ui-card__body">
            <Alert>保存凭证后即可添加关联(预收款 / 挂账 / 核销 / 应收款)。</Alert>
          </View>
        ) : links.length === 0 ? (
          <Empty text="暂无关联凭证" mark="🔗" />
        ) : (
          links.map((l) => (
            <View key={l.link_id} className="ui-row-item">
              <View className="ui-row-item__top">
                <Text
                  className="ui-row-item__title u-grow"
                  onClick={() => Taro.redirectTo({ url: `/pkgBook/voucher/edit?id=${l.voucher_id}` })}
                >
                  {l.voucher_no}
                </Text>
                <Text className="u-num">{money(l.total_debit)}</Text>
              </View>
              <View className="ui-row-item__sub u-row u-gap-s u-wrap">
                <Tag tone="purple">{RELATION_LABEL[l.relation_type] || l.relation_type}</Tag>
                <Text>{l.direction === 'out' ? '→ 指向' : '← 被指向'}</Text>
                <Text>{l.voucher_date}</Text>
                <Text className="u-ellipsis">{l.voucher_note}</Text>
              </View>
              <View className="ui-row-item__actions">
                <Text className="ui-link ui-link--danger" onClick={() => removeLink(l)}>
                  删除关联
                </Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View className="voucher-edit__actions">
        <Button tone="primary" block loading={saving} onClick={save}>
          保存凭证
        </Button>
        {isEdit ? (
          <Button tone="danger" block onClick={reverse}>
            红字冲销
          </Button>
        ) : null}
      </View>

      {voucherId ? (
        <LinkSheet
          open={linkOpen}
          voucherId={voucherId}
          onClose={() => setLinkOpen(false)}
          onAdded={(next) => {
            setLinks(next)
            setLinkOpen(false)
          }}
        />
      ) : null}
    </View>
  )
}

/** 明细科目:可从已有二级科目里选,也可直接输入(后端自动新建) */
function SubAccountField({
  value,
  account,
  onChange,
}: {
  value: string
  account: AccountTreeNode | null
  onChange: (value: string) => void
}) {
  const subs = (account?.sub_accounts || []).filter((s) => s.is_active)
  return (
    <View>
      <TextField
        label="明细科目"
        value={value}
        placeholder={account ? '选择或直接输入(自动新建)' : '先选科目'}
        onChange={onChange}
      />
      {subs.length ? (
        <View className="sub-chips">
          {subs.map((s) => (
            <Tag
              key={s.id}
              tone={s.name === value ? 'blue' : 'default'}
              onClick={() => onChange(s.name)}
            >
              {s.name}
            </Tag>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** 添加凭证关联 */
function LinkSheet({
  open,
  voucherId,
  onClose,
  onAdded,
}: {
  open: boolean
  voucherId: number
  onClose: () => void
  onAdded: (links: LinkedVoucher[]) => void
}) {
  const [relationType, setRelationType] = useState('advance')
  const [linkNote, setLinkNote] = useState('')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [options, setOptions] = useState<{ value: number; label: string }[]>([])
  const [adding, setAdding] = useState(false)

  const search = async (keyword: string) => {
    const res = await vouchersApi.page({ keyword: keyword || undefined, page_size: 20 })
    setOptions(
      res.items
        .filter((v) => v.id !== voucherId)
        .map((v) => ({ value: v.id, label: `${v.voucher_no} ${v.voucher_date} ${v.note}` })),
    )
  }

  useEffect(() => {
    if (open) search('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const add = async () => {
    if (!targetId) {
      notify('请选择要关联的凭证')
      return
    }
    setAdding(true)
    try {
      const res = await vouchersApi.addLink(voucherId, {
        target_id: targetId,
        relation_type: relationType,
        note: linkNote,
      })
      success('已添加关联')
      setTargetId(null)
      setLinkNote('')
      onAdded(res.links)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="添加凭证关联"
      okText="添加"
      confirmLoading={adding}
      onOk={add}
      onClose={onClose}
    >
      <SelectField
        label="关系类型"
        value={relationType}
        options={RELATION_OPTIONS}
        clearable={false}
        onChange={(v) => setRelationType(v || 'advance')}
      />
      <View style={{ padding: '16rpx 0' }}>
        <SearchBar placeholder="搜索凭证号 / 摘要" onSearch={search} />
      </View>
      <SelectField
        label="关联凭证"
        required
        value={targetId}
        options={options}
        clearable={false}
        placeholder="选择凭证"
        onChange={setTargetId}
      />
      <TextField label="备注" value={linkNote} placeholder="可选" onChange={setLinkNote} />
    </Sheet>
  )
}
