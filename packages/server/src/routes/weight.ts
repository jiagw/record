import type { WeightLog } from '@record/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/response.js'

export async function weightRoutes(app: FastifyInstance) {
  app.get('/api/weight', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.userId
    const logs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    })

    const data: WeightLog[] = logs.map((log) => ({
      date: log.date,
      weight: log.weight,
    }))

    return ok(data)
  })

  app.get<{ Params: { date: string } }>(
    '/api/weight/:date',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = request.user.userId
      const log = await prisma.weightLog.findUnique({
        where: { userId_date: { userId, date: request.params.date } },
      })

      if (!log) {
        return ok<WeightLog | null>(null)
      }

      return ok<WeightLog>({ date: log.date, weight: log.weight })
    },
  )

  app.put<{ Params: { date: string } }>(
    '/api/weight/:date',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.userId
      const body = z.object({ weight: z.number().positive().max(500) }).safeParse(request.body)
      if (!body.success) {
        return fail(reply, '体重数据无效')
      }

      const log = await prisma.weightLog.upsert({
        where: { userId_date: { userId, date: request.params.date } },
        create: {
          userId,
          date: request.params.date,
          weight: body.data.weight,
        },
        update: {
          weight: body.data.weight,
        },
      })

      return ok<WeightLog>({ date: log.date, weight: log.weight })
    },
  )

  app.post('/api/weight/batch', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId
    const body = z
      .object({
        logs: z.array(
          z.object({
            date: z.string(),
            weight: z.number().positive().max(500),
          }),
        ),
      })
      .safeParse(request.body)

    if (!body.success) {
      return fail(reply, '批量数据格式错误')
    }

    await prisma.$transaction(
      body.data.logs.map((item) =>
        prisma.weightLog.upsert({
          where: { userId_date: { userId, date: item.date } },
          create: { userId, date: item.date, weight: item.weight },
          update: { weight: item.weight },
        }),
      ),
    )

    return ok({ count: body.data.logs.length })
  })
}
