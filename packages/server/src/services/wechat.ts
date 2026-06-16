interface WxSession {
  openid: string
  session_key?: string
}

export async function codeToSession(code: string): Promise<WxSession> {
  const appId = process.env.WX_APPID
  const secret = process.env.WX_SECRET

  if (!appId || !secret) {
    return { openid: `dev_${code || 'local_user'}` }
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', secret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const response = await fetch(url)
  const data = (await response.json()) as WxSession & { errcode?: number; errmsg?: string }

  if (data.errcode) {
    throw new Error(data.errmsg ?? '微信登录失败')
  }

  if (!data.openid) {
    throw new Error('未获取到 openid')
  }

  return data
}
