import Taro from '@tarojs/taro'
import { apiUrl, getApiBase } from './env'
import { clearToken, getToken, withToken } from './token'

const TIMEOUT_MS = 30000
const LOGIN_PAGE = '/pages/login/index'

export interface RequestOptions {
  /** 出错时是否自动 toast 提示,默认 true */
  toastOnError?: boolean
  /** 401 时是否自动跳登录页,默认 true */
  redirectOnAuthFail?: boolean
}

export class ApiError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

type Json = Record<string, unknown>

/** 从后端错误响应里提取可读文案(FastAPI 的 detail 可能是字符串或校验数组)。 */
function extractDetail(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const detail = (data as Json).detail
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (d && typeof d === 'object' ? String((d as Json).msg ?? '') : ''))
      .filter(Boolean)
    if (msgs.length) return msgs.join('; ')
  }
  return fallback
}

let redirecting = false

function gotoLogin(): void {
  if (redirecting) return
  redirecting = true
  clearToken()
  Taro.reLaunch({ url: LOGIN_PAGE }).finally(() => {
    setTimeout(() => {
      redirecting = false
    }, 800)
  })
}

function isLoginPage(): boolean {
  const pages = Taro.getCurrentPages()
  const current = pages[pages.length - 1]
  return Boolean(current && `/${current.route}`.startsWith(LOGIN_PAGE))
}

function toast(title: string): void {
  Taro.showToast({ title: title.slice(0, 60), icon: 'none', duration: 2500 })
}

/** 统一请求:自动带令牌、统一错误提示、401 跳登录。 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  payload?: { params?: Record<string, unknown>; data?: unknown },
  options: RequestOptions = {},
): Promise<T> {
  const { toastOnError = true, redirectOnAuthFail = true } = options

  if (!getApiBase()) {
    const msg = '未配置服务器地址,请在「我的 → 服务器设置」中填写'
    if (toastOnError) toast(msg)
    throw new ApiError(msg, 0)
  }

  const query = buildQuery(payload?.params)
  const url = apiUrl(path) + query
  const token = getToken()

  const res = await Taro.request({
    url,
    method,
    data: payload?.data as never,
    timeout: TIMEOUT_MS,
    header: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).catch((e) => {
    const msg = `网络请求失败:${(e as { errMsg?: string })?.errMsg || '请检查服务器地址与网络'}`
    if (toastOnError) toast(msg)
    throw new ApiError(msg, 0)
  })

  const status = res.statusCode
  if (status >= 200 && status < 300) return res.data as T

  if (status === 401) {
    const msg = extractDetail(res.data, '登录已过期,请重新登录')
    if (redirectOnAuthFail && !isLoginPage()) {
      toast('登录已过期,请重新登录')
      gotoLogin()
    } else if (toastOnError) {
      toast(msg)
    }
    throw new ApiError(msg, status)
  }

  const msg = extractDetail(res.data, `请求失败(${status})`)
  if (toastOnError) toast(msg)
  throw new ApiError(msg, status)
}

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return ''
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

/**
 * 表单编码请求。后端个别接口用 FastAPI 的 Form(...) 接参(如 PATCH /attachments/{id}),
 * 必须发 application/x-www-form-urlencoded,发 JSON 会 422。
 */
export async function requestForm<T>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  fields: Record<string, string | number>,
): Promise<T> {
  if (!getApiBase()) {
    const msg = '未配置服务器地址,请在「我的 → 服务器设置」中填写'
    toast(msg)
    throw new ApiError(msg, 0)
  }
  const token = getToken()
  const body = Object.entries(fields)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  const res = await Taro.request({
    url: apiUrl(path),
    method,
    data: body,
    timeout: TIMEOUT_MS,
    header: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).catch((e) => {
    const msg = `网络请求失败:${(e as { errMsg?: string })?.errMsg || '请检查网络'}`
    toast(msg)
    throw new ApiError(msg, 0)
  })

  if (res.statusCode >= 200 && res.statusCode < 300) return res.data as T
  if (res.statusCode === 401 && !isLoginPage()) gotoLogin()
  const msg = extractDetail(res.data, `请求失败(${res.statusCode})`)
  toast(msg)
  throw new ApiError(msg, res.statusCode)
}

export const http = {
  get: <T>(path: string, params?: Record<string, unknown>, options?: RequestOptions) =>
    request<T>('GET', path, { params }, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { data }, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { data }, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { data }, options),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
}

/** 上传文件到 `${path}`(multipart/form-data,字段名 file)。 */
export async function uploadFile<T>(
  path: string,
  filePath: string,
  formData: Record<string, string> = {},
): Promise<T> {
  const token = getToken()
  const res = await Taro.uploadFile({
    url: apiUrl(path),
    filePath,
    name: 'file',
    formData,
    header: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    let parsed: unknown = res.data
    try {
      parsed = JSON.parse(res.data)
    } catch {
      /* 非 JSON 响应直接按原文提示 */
    }
    const msg = extractDetail(parsed, `上传失败(${res.statusCode})`)
    toast(msg)
    if (res.statusCode === 401) gotoLogin()
    throw new ApiError(msg, res.statusCode)
  }
  return JSON.parse(res.data) as T
}

/**
 * 下载并打开后端生成的文件(Excel / PDF / zip)。
 * 小程序没有浏览器下载,统一走 downloadFile + openDocument。
 */
export async function downloadAndOpen(
  path: string,
  params?: Record<string, unknown>,
  fileType?: 'pdf' | 'xlsx' | 'doc' | 'docx' | 'xls' | 'ppt' | 'pptx',
): Promise<void> {
  if (!getApiBase()) {
    toast('未配置服务器地址')
    return
  }
  Taro.showLoading({ title: '正在生成…', mask: true })
  try {
    const url = withToken(apiUrl(path) + buildQuery(params))
    const res = await Taro.downloadFile({ url })
    if (res.statusCode !== 200) {
      throw new ApiError(`下载失败(${res.statusCode})`, res.statusCode)
    }
    Taro.hideLoading()
    await Taro.openDocument({ filePath: res.tempFilePath, fileType, showMenu: true })
  } catch (e) {
    Taro.hideLoading()
    const msg = e instanceof ApiError ? e.message : '下载失败,请确认服务器可访问'
    toast(msg)
  }
}

export { toast }
