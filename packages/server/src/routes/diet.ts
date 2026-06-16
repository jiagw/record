import type { DailyDietLog } from '@record/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/response.js'

const dietBodySchema = z.object({
  records: z.array(
    z.object({
      id: z.number(),
      foodId: z.string(),
      amount: z.number(),
    }),
  ),
  nextId: z.number(),
})

export async function dietRoutes(app: FastifyInstance) {
  app.get('/api/diet', { preHandler: [app.authenticate] }, async (request) => {
    const userId = request.user.userId
    const query = z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .safeParse(request.query)

    const logs = await prisma.dietLog.findMany({
      where: {
        userId,
        ...(query.success && query.data.from ? { date: { gte: query.data.from } } : {}),
        ...(query.success && query.data.to ? { date: { lte: query.data.to } } : {}),
      },
      orderBy: { date: 'asc' },
    })

    const data: DailyDietLog[] = logs.map((log) => ({
      date: log.date,
      records: log.records as unknown as DailyDietLog['records'],
      nextId: log.nextId,
    }))

    return ok(data)
  })

  app.get<{ Params: { date: string } }>(
    '/api/diet/:date',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = request.user.userId
      const log = await prisma.dietLog.findUnique({
        where: { userId_date: { userId, date: request.params.date } },
      })

      if (!log) {
        return ok<DailyDietLog | null>(null)
      }

      return ok<DailyDietLog>({
        date: log.date,
        records: log.records as unknown as DailyDietLog['records'],
        nextId: log.nextId,
      })
    },
  )

  app.put<{ Params: { date: string } }>(
    '/api/diet/:date',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.userId
      const body = dietBodySchema.safeParse(request.body)
      if (!body.success) {
        return fail(reply, '请求体格式错误')
      }

      const log = await prisma.dietLog.upsert({
        where: { userId_date: { userId, date: request.params.date } },
        create: {
          userId,
          date: request.params.date,
          records: body.data.records,
          nextId: body.data.nextId,
        },
        update: {
          records: body.data.records,
          nextId: body.data.nextId,
        },
      })

      return ok({
        date: log.date,
        records: log.records as unknown as DailyDietLog['records'],
        nextId: log.nextId,
      })
    },
  )
}
