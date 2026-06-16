import type { ApiResponse } from '@record/shared'
import { API_BASE_URL } from '../config'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const token = uni.getStorageSync('token') as string

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method ?? 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>
        if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          reject(new Error('未登录'))
          return
        }
        if (!body || body.code !== 0) {
          reject(new Error(body?.message ?? '请求失败'))
          return
        }
        resolve(body.data)
      },
      fail: (err) => reject(new Error(err.errMsg ?? '网络错误')),
    })
  })
}

export function toast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  uni.showToast({ title, icon: icon === 'error' ? 'none' : icon })
}

export async function confirm(content: string, title = '提示'): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(!!res.confirm),
    })
  })
}
