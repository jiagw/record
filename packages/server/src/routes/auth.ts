import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/response.js'
import { codeToSession } from '../services/wechat.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/wx-login', async (request, reply) => {
    const body = z.object({ code: z.string().min(1) }).safeParse(request.body)
    if (!body.success) {
      return fail(reply, '缺少 code')
    }

    try {
      const session = await codeToSession(body.data.code)
      const user = await prisma.user.upsert({
        where: { openid: session.openid },
        create: { openid: session.openid },
        update: {},
      })

      const token = await reply.jwtSign({ userId: user.id })
      return ok({ token, userId: user.id })
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      return fail(reply, message, 1, 500)
    }
  })
}
