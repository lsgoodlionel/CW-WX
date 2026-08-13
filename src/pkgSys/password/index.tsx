import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import { changePassword, logout } from '@/services/auth'
import { notify, success } from '@/utils/dialog'
import { Alert, Button, Card, TextField } from '@/components/ui'

export default function PasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!oldPassword) {
      notify('请输入原密码')
      return
    }
    if (newPassword.length < 6) {
      notify('新密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('两次输入的新密码不一致')
      return
    }
    setSaving(true)
    try {
      await changePassword(oldPassword, newPassword)
      success('密码已修改,请重新登录')
      setTimeout(() => {
        logout()
        Taro.reLaunch({ url: '/pages/login/index' })
      }, 900)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="page-body">
      <Alert>修改成功后当前登录会失效,需要用新密码重新登录。</Alert>
      <Card title="修改密码">
        <TextField label="原密码" required password value={oldPassword} onChange={setOldPassword} />
        <TextField
          label="新密码"
          required
          password
          value={newPassword}
          placeholder="至少 6 位"
          onChange={setNewPassword}
        />
        <TextField
          label="确认新密码"
          required
          password
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
      </Card>
      <Button tone="primary" block loading={saving} onClick={submit}>
        确认修改
      </Button>
    </View>
  )
}
