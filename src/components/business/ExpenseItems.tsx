import { View, Text } from '@tarojs/components'
import type { AccountTreeNode, ExpenseItem } from '@/types/models'
import { Button, NumberField, SelectField, TextField } from '@/components/ui'
import { money } from '@/utils/format'
import './expense-items.scss'

interface ExpenseItemsProps {
  items: ExpenseItem[]
  /** 费用科目(损益类 + 成本类) */
  accounts: AccountTreeNode[]
  /** 后端给的常用费用类别建议 */
  categories: string[]
  amountLabel?: string
  onChange: (items: ExpenseItem[]) => void
}

export const emptyExpenseItem = (): ExpenseItem => ({
  category: '',
  account_id: null,
  sub_account: '',
  amount: 0,
  note: '',
})

/** 费用明细编辑器,费用申请与费用报销共用。 */
export default function ExpenseItems({
  items,
  accounts,
  categories,
  amountLabel = '金额',
  onChange,
}: ExpenseItemsProps) {
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.code} ${a.name}`,
    keywords: a.code,
  }))
  const categoryOptions = categories.map((c) => ({ value: c, label: c }))

  const patch = (index: number, next: Partial<ExpenseItem>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...next } : it)))

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)

  const subOptions = (accountId: number | null) => {
    const account = accounts.find((a) => a.id === accountId)
    return (account?.sub_accounts || [])
      .filter((s) => s.is_active)
      .map((s) => ({ value: s.name, label: `${s.code} ${s.name}` }))
  }

  return (
    <View>
      {items.map((item, index) => (
        <View key={index} className="exp-item">
          <View className="exp-item__head">
            <Text className="exp-item__no">明细 {index + 1}</Text>
            {items.length > 1 ? (
              <Text
                className="ui-link ui-link--danger"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                删除
              </Text>
            ) : null}
          </View>

          {categoryOptions.length ? (
            <SelectField
              label="费用类别"
              value={item.category || null}
              options={categoryOptions}
              placeholder="选择类别(可留空)"
              onChange={(v) => patch(index, { category: v || '' })}
            />
          ) : (
            <TextField
              label="费用类别"
              value={item.category}
              placeholder="如 差旅费"
              onChange={(v) => patch(index, { category: v })}
            />
          )}

          <SelectField
            label="费用科目"
            required
            value={item.account_id}
            options={accountOptions}
            clearable={false}
            placeholder="选择费用科目"
            onChange={(v) => patch(index, { account_id: v, sub_account: '' })}
          />

          <SelectField
            label="明细科目"
            value={item.sub_account || null}
            options={subOptions(item.account_id)}
            placeholder={item.account_id ? '选择明细科目(可留空)' : '先选费用科目'}
            disabled={!item.account_id}
            onChange={(v) => patch(index, { sub_account: v || '' })}
          />

          <NumberField
            label={amountLabel}
            required
            value={item.amount || null}
            placeholder="0.00"
            onChange={(v) => patch(index, { amount: v })}
          />

          <TextField
            label="备注"
            value={item.note}
            placeholder="可选"
            onChange={(v) => patch(index, { note: v })}
          />
        </View>
      ))}

      <View className="exp-item__foot">
        <Button tone="ghost" size="small" onClick={() => onChange([...items, emptyExpenseItem()])}>
          + 增加明细
        </Button>
        <Text className="exp-item__total u-num">
          合计 ¥{money(total)}
        </Text>
      </View>
    </View>
  )
}
