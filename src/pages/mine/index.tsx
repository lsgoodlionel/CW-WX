import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { hasPerm, logout } from '@/services/auth'
import { getApiBase, getDefaultApiBase, setApiBase } from '@/services/env'
import { useAuth } from '@/hooks/useAuth'
import { confirm, notify, success } from '@/utils/dialog'
import { Button, Card, Sheet, Tag, TextField } from '@/components/ui'
import './index.scss'

interface MenuItem {
  key: string
  label: string
  icon: string
  /** 空串表示无需权限 */
  module: string
  url: string
}

const MENU_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: '账务',
    items: [
      { key: 'account', label: '会计科目', icon: '🗂', module: 'account', url: '/pkgBook/account/index' },
      { key: 'customer', label: '往来单位', icon: '🏢', module: 'customer', url: '/pkgBook/customer/index' },
      { key: 'report', label: '财务报表', icon: '📊', module: 'report', url: '/pkgBook/report/index' },
      { key: 'ledger', label: '会计账簿', icon: '📚', module: 'ledger', url: '/pkgBook/ledger/index' },
    ],
  },
  {
    title: '审批与费用',
    items: [
      { key: 'workflow', label: '流程设计', icon: '🔀', module: 'workflow', url: '/pkgFlow/workflow/index' },
      { key: 'expense_apply', label: '费用申请', icon: '📝', module: 'expense_apply', url: '/pkgFlow/apply/index' },
      { key: 'expense', label: '费用报销', icon: '💰', module: 'expense', url: '/pkgFlow/expense/index' },
    ],
  },
  {
    title: '组织与系统',
    items: [
      { key: 'personnel', label: '人员管理', icon: '👥', module: 'personnel', url: '/pkgSys/personnel/index' },
      { key: 'user', label: '用户与权限', icon: '🔐', module: 'user', url: '/pkgSys/user/index' },
      { key: 'logs', label: '操作日志', icon: '🕓', module: 'logs', url: '/pkgSys/log/index' },
      { key: 'company', label: '企业信息', icon: '🏛', module: 'company', url: '/pkgSys/company/index' },
    ],
  },
]

export default function MinePage() {
  const { user } = useAuth()
  const [baseOpen, setBaseOpen] = useState(false)
  const [base, setBase] = useState(getApiBase())

  const saveBase = () => {
    const value = base.trim()
    if (!value) {
      notify('请填写服务器地址')
      return
    }
    setApiBase(value)
    success('已保存,请重新登录以生效')
    setBaseOpen(false)
    setTimeout(() => {
      logout()
      Taro.reLaunch({ url: '/pages/login/index' })
    }, 800)
  }

  const doLogout = async () => {
    if (!(await confirm('确认退出登录?'))) return
    logout()
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  return (
    <View className="mine">
      <View className="mine__profile">
        <View className="mine__avatar">{(user?.display_name || user?.username || '?').slice(0, 1)}</View>
        <View className="u-grow">
          <View className="u-row u-gap-s">
            <Text className="mine__name">{user?.display_name || user?.username || '未登录'}</Text>
            {user?.is_super_admin ? <Tag tone="danger">超管</Tag> : null}
          </View>
          <Text className="mine__roles">
            {user?.is_super_admin
              ? '拥有全部权限'
              : user?.roles?.length
                ? user.roles.join(' · ')
                : '未分配角色'}
          </Text>
        </View>
      </View>

      <View className="mine__body">
        {MENU_GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.module || hasPerm(user, i.module, 'view'))
          if (items.length === 0) return null
          return (
            <Card key={group.title} title={group.title} flush>
              {items.map((item) => (
                <View
                  key={item.key}
                  className="mine__row"
                  onClick={() => Taro.navigateTo({ url: item.url })}
                >
                  <Text className="mine__row-icon">{item.icon}</Text>
                  <Text className="u-grow">{item.label}</Text>
                  <Text className="mine__row-arrow">›</Text>
                </View>
              ))}
            </Card>
          )
        })}

        <Card title="账号与设置" flush>
          <View
            className="mine__row"
            onClick={() => Taro.navigateTo({ url: '/pkgSys/password/index' })}
          >
            <Text className="mine__row-icon">🔑</Text>
            <Text className="u-grow">修改密码</Text>
            <Text className="mine__row-arrow">›</Text>
          </View>
          <View
            className="mine__row"
            onClick={() => {
              setBase(getApiBase())
              setBaseOpen(true)
            }}
          >
            <Text className="mine__row-icon">🌐</Text>
            <Text className="u-grow">服务器设置</Text>
            <Text className="mine__row-value u-ellipsis">{getApiBase() || '未设置'}</Text>
            <Text className="mine__row-arrow">›</Text>
          </View>
        </Card>

        <Button tone="danger" block onClick={doLogout}>
          退出登录
        </Button>

        <Text className="mine__footnote">
          小企业财务记账系统 · 微信小程序版 v1.0.0{'\n'}
          导出的 Excel / PDF 会在小程序内打开,可通过右上角转发保存
        </Text>
      </View>

      <Sheet
        open={baseOpen}
        title="服务器设置"
        okText="保存并重新登录"
        onOk={saveBase}
        onClose={() => setBaseOpen(false)}
      >
        <TextField
          label="服务器地址"
          value={base}
          placeholder="https://finance.example.com"
          onChange={setBase}
          hint={`后端所在域名,不含 /api。构建默认值:${getDefaultApiBase() || '未设置'}`}
          stack
        />
      </Sheet>
    </View>
  )
}
