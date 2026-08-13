import Taro from '@tarojs/taro'
import type { AuthUser, PermissionModule } from '@/types/models'
import { http } from './request'
import { clearToken, setToken } from './token'

// 权限判定与 Web 端同源(shared/contract/perm.ts),这里转出供页面直接引用
export { hasPerm } from '@/shared/perm'

const USER_KEY = 'cw_user'

export interface LoginResult {
  token: string
  user: AuthUser
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await http.post<LoginResult>(
    '/auth/login',
    { username, password },
    { redirectOnAuthFail: false },
  )
  setToken(res.token)
  cacheUser(res.user)
  return res.user
}

export function logout(): void {
  clearToken()
  Taro.removeStorageSync(USER_KEY)
}

export function cacheUser(user: AuthUser): void {
  Taro.setStorageSync(USER_KEY, user)
}

/** 读取本地缓存的登录用户(用于首屏立即渲染,随后再拉取最新)。 */
export function getCachedUser(): AuthUser | null {
  const raw = Taro.getStorageSync(USER_KEY)
  return raw && typeof raw === 'object' ? (raw as AuthUser) : null
}

export async function fetchMe(): Promise<AuthUser> {
  const user = await http.get<AuthUser>('/auth/me')
  cacheUser(user)
  return user
}

export function changePassword(oldPassword: string, newPassword: string): Promise<unknown> {
  return http.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export function fetchPermissionCatalog(): Promise<PermissionModule[]> {
  return http.get<PermissionModule[]>('/auth/permission-catalog')
}
