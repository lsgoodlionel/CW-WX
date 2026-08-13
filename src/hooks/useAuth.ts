import { useCallback, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import type { AuthUser } from '@/types/models'
import { fetchMe, getCachedUser } from '@/services/auth'
import { getApiBase } from '@/services/env'
import { getToken } from '@/services/token'

const LOGIN_PAGE = '/pages/login/index'

interface AuthState {
  user: AuthUser | null
  /** 已完成一次身份确认(无论成功失败) */
  ready: boolean
  refresh: () => Promise<void>
}

/**
 * 页面级登录守卫:无令牌 / 未配置服务器时跳转登录页,
 * 有令牌则先用本地缓存渲染,再拉取最新身份与权限。
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser())
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!getApiBase() || !getToken()) {
      setReady(true)
      Taro.reLaunch({ url: LOGIN_PAGE })
      return
    }
    try {
      setUser(await fetchMe())
    } catch {
      // 401 已由 request 层统一跳转登录
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { user, ready, refresh }
}
