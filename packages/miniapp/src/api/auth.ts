import type { AuthResult } from '@record/shared'
import { request } from './request'

let authReady: Promise<void> | null = null

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

function startLogin(): Promise<void> {
  authReady = (async () => {
    const token = uni.getStorageSync('token')
    if (!token) await wxLogin()
  })().catch((error) => {
    authReady = null
    throw error
  })
  return authReady
}

export function whenAuthed(): Promise<void> {
  if (!authReady) startLogin()
  return authReady!
}

export function invalidateAuth() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userId')
  authReady = null
}

export async function reLogin(): Promise<void> {
  invalidateAuth()
  await startLogin()
}

export async function ensureLogin() {
  return whenAuthed()
}
