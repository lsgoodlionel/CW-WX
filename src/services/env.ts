import Taro from '@tarojs/taro'

const BASE_KEY = 'cw_api_base'

/** 构建期注入的默认后端地址(config/index.ts defineConstants)。 */
const DEFAULT_BASE = (typeof TARO_APP_API_BASE === 'string' && TARO_APP_API_BASE) || ''

const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, '')

/** 当前后端根地址,例如 https://finance.example.com(不含 /api)。 */
export function getApiBase(): string {
  const saved = Taro.getStorageSync(BASE_KEY)
  return trimTrailingSlash(typeof saved === 'string' && saved ? saved : DEFAULT_BASE)
}

/** 保存后端根地址。传空串则恢复为构建期默认值。 */
export function setApiBase(url: string): void {
  const value = trimTrailingSlash((url || '').trim())
  if (value) Taro.setStorageSync(BASE_KEY, value)
  else Taro.removeStorageSync(BASE_KEY)
}

export function getDefaultApiBase(): string {
  return trimTrailingSlash(DEFAULT_BASE)
}

/** 拼出完整接口地址:path 以 / 开头,不含 /api 前缀。 */
export function apiUrl(path: string): string {
  return `${getApiBase()}/api${path}`
}
