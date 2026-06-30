import type { ApiResponse } from '@record/shared'
import { API_BASE_URL } from '../config'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
}

export async function request<T>(options: RequestOptions, retried = false): Promise<T> {
  const token = uni.getStorageSync('token') as string

  const body = await new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const payload = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          reject(new Error('未登录'))
          return
        }
        if (!payload || payload.code !== 0) {
          reject(new Error(payload?.message ?? '请求失败'))
          return
        }
        resolve(payload.data)
      },
      fail: (err) => reject(new Error(err.errMsg ?? '网络错误')),
    })
  }).catch(async (error) => {
    const isAuthRequest = options.url.includes('/api/auth/')
    if (!retried && !isAuthRequest && error.message === '未登录') {
      const { reLogin } = await import('./auth')
      await reLogin()
      return request<T>(options, true)
    }
    throw error
  })

  return body
}

export function toast(title: string, _icon: 'success' | 'error' | 'none' = 'none') {
  uni.$u.toast(title)
}

export async function confirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => resolve(!!res.confirm),
    })
  })
}
