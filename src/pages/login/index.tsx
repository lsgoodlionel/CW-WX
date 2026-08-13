import { useState } from 'react'
import Taro, { useLoad } from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { login } from '@/services/auth'
import { getApiBase, getDefaultApiBase, setApiBase } from '@/services/env'
import { getToken } from '@/services/token'
import { notify } from '@/utils/dialog'
import { Button } from '@/components/ui'
import './index.scss'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [base, setBase] = useState('')
  const [showBase, setShowBase] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useLoad(() => {
    const current = getApiBase()
    setBase(current)
    // 没配服务器地址时直接展开设置项,避免用户卡在登录失败
    if (!current) setShowBase(true)
    else if (getToken()) Taro.reLaunch({ url: '/pages/home/index' })
  })

  const submit = async () => {
    if (!username.trim() || !password) {
      notify('请输入用户名和密码')
      return
    }
    const target = base.trim()
    if (!target) {
      notify('请先填写服务器地址')
      setShowBase(true)
      return
    }
    setApiBase(target)

    setSubmitting(true)
    try {
      await login(username.trim(), password)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 400)
    } catch {
      // 错误提示由 request 层统一处理
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="login">
      <View className="login__hero">
        <Text className="login__brand">小企业财务记账系统</Text>
        <Text className="login__slogan">复式记账 · 官方报表 · 全套账簿</Text>
      </View>

      <View className="login__card">
        <View className="login__field">
          <Text className="login__label">用户名</Text>
          <Input
            className="login__input"
            value={username}
            placeholder="请输入用户名"
            onInput={(e) => setUsername(e.detail.value)}
          />
        </View>
        <View className="login__field">
          <Text className="login__label">密码</Text>
          <Input
            className="login__input"
            value={password}
            password
            placeholder="请输入密码"
            confirmType="done"
            onInput={(e) => setPassword(e.detail.value)}
            onConfirm={submit}
          />
        </View>

        {showBase ? (
          <View className="login__field">
            <Text className="login__label">服务器地址</Text>
            <Input
              className="login__input"
              value={base}
              placeholder="https://finance.example.com"
              onInput={(e) => setBase(e.detail.value)}
            />
            <Text className="login__hint">
              填写后端所在域名(不含 /api)。默认:{getDefaultApiBase() || '未设置'}
            </Text>
          </View>
        ) : null}

        <Button tone="primary" block loading={submitting} onClick={submit}>
          登录
        </Button>

        <View className="login__links">
          <Text className="ui-link" onClick={() => setShowBase((v) => !v)}>
            {showBase ? '收起服务器设置' : '服务器设置'}
          </Text>
        </View>

        <Text className="login__tip">
          初始超级管理员:admin / admin123(登录后请立即修改密码)
        </Text>
      </View>

      <Text className="login__footnote">
        小程序需在微信后台把后端域名加入 request / uploadFile / downloadFile 合法域名
      </Text>
    </View>
  )
}
