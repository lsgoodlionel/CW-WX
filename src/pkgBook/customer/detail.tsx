import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { customersApi } from '@/services/api'
import { useAsync } from '@/hooks/useAsync'
import { PARTY_LABEL, PARTY_TONE } from '@/constants/labels'
import { money } from '@/utils/format'
import { Card, Empty, Loading, Tag } from '@/components/ui'
import './detail.scss'

const INFO_FIELDS: { key: 'short_name' | 'tax_number' | 'address' | 'phone' | 'bank_name' | 'bank_account' | 'contact_person' | 'contact_phone' | 'email' | 'note'; label: string }[] = [
  { key: 'short_name', label: '简称' },
  { key: 'tax_number', label: '税号/证件号' },
  { key: 'address', label: '开票地址' },
  { key: 'phone', label: '开票电话' },
  { key: 'bank_name', label: '开户行' },
  { key: 'bank_account', label: '银行账号' },
  { key: 'contact_person', label: '联系人' },
  { key: 'contact_phone', label: '联系电话' },
  { key: 'email', label: '邮箱' },
  { key: 'note', label: '备注' },
]

export default function CustomerDetailPage() {
  const router = useRouter()
  const id = Number(router.params.id)

  const { data: customer, loading } = useAsync(() => customersApi.detail(id), [id])
  const { data: history } = useAsync(() => customersApi.vouchers(id), [id])

  if (loading && !customer) {
    return (
      <View className="page-body">
        <Loading />
      </View>
    )
  }

  if (!customer) {
    return (
      <View className="page-body">
        <Empty text="未找到该往来单位" mark="🏢" />
      </View>
    )
  }

  return (
    <View className="page-body">
      <Card>
        <View className="u-row u-gap-s u-wrap">
          <Text className="cust-detail__name">{customer.name}</Text>
          <Tag tone={PARTY_TONE[customer.party_type]}>
            {PARTY_LABEL[customer.party_type] || customer.party_type}
          </Tag>
          {customer.is_active ? null : <Tag>已停用</Tag>}
        </View>
        {INFO_FIELDS.map((f) => (
          <View key={f.key} className="cust-detail__row">
            <Text className="cust-detail__label">{f.label}</Text>
            <Text className="cust-detail__value u-grow">{customer[f.key] || '-'}</Text>
          </View>
        ))}
      </Card>

      <Card
        title="往来业务历史"
        extra={
          history ? (
            <Text className="u-num">借方合计 ¥{money(history.sum_debit)}</Text>
          ) : null
        }
        flush
      >
        {!history || history.items.length === 0 ? (
          <Empty text="暂无关联凭证" mark="🧾" />
        ) : (
          history.items.map((v) => (
            <View
              key={v.id}
              className="ui-row-item"
              onClick={() => Taro.navigateTo({ url: `/pkgBook/voucher/edit?id=${v.id}` })}
            >
              <View className="ui-row-item__top">
                <Text className="ui-row-item__title">{v.voucher_no}</Text>
                <Text className="u-num">{money(v.total_debit)}</Text>
              </View>
              <View className="ui-row-item__sub u-row-between">
                <Text className="u-ellipsis u-grow">{v.note || '(无摘要)'}</Text>
                <Text>{v.voucher_date}</Text>
              </View>
            </View>
          ))
        )}
      </Card>
    </View>
  )
}
