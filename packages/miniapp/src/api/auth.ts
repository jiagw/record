import type { AuthResult } from '@record/shared'
import { request } from './request'

export async function wxLogin(): Promise<AuthResult> {
  const loginRes = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  const result = await request<AuthResult>({
    url: '/api/auth/wx-login',
    method: 'POST',
    data: { code: loginRes.code || 'dev_code' },
  })

  uni.setStorageSync('token', result.token)
  uni.setStorageSync('userId', result.userId)
  return result
}

export async function ensureLogin() {
  const token = uni.getStorageSync('token')
  if (token) return
  await wxLogin()
}
