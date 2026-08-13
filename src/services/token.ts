import Taro from '@tarojs/taro'

const TOKEN_KEY = 'cw_token'

export function getToken(): string {
  const t = Taro.getStorageSync(TOKEN_KEY)
  return typeof t === 'string' ? t : ''
}

export function setToken(token: string): void {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export function clearToken(): void {
  Taro.removeStorageSync(TOKEN_KEY)
}

/**
 * 给 downloadFile / 图片直链附加令牌。
 * 这类请求由基础库直接发起,后端允许 ?token= 传令牌(见 auth_mw.py)。
 */
export function withToken(url: string): string {
  const t = getToken()
  if (!t) return url
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(t)}`
}
