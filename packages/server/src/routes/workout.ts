import type { DailyWorkoutLog } from '@record/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/response.js'

const workoutBodySchema = z.object({
  dayType: z.enum(['push', 'pull', 'leg']),
  exercises: z.array(
    z.object({
      id: z.number(),
      exerciseId: z.string(),
      sets: z.array(
        z.object({
          setNumber: z.number(),
          weight: z.number(),
          reps: z.number(),
        }),
      ),
    }),
  ),
  nextId: z.number(),
})

export async function workoutRoutes(app: FastifyInstance) {
  app.get('/api/workout/last', { preHandler: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId
    const query = z
      .object({
        dayType: z.enum(['push', 'pull', 'leg']),
        before: z.string(),
      })
      .safeParse(request.query)

    if (!query.success) {
      return fail(reply, '参数错误')
    }

    const log = await prisma.workoutLog.findFirst({
      where: {
        userId,
        dayType: query.data.dayType,
        date: { lt: query.data.before },
      },
      orderBy: { date: 'desc' },
    })

    if (!log) {
      return ok<DailyWorkoutLog | null>(null)
    }

    return ok<DailyWorkoutLog>({
      date: log.date,
      dayType: log.dayType as DailyWorkoutLog['dayType'],
      exercises: log.exercises as unknown as DailyWorkoutLog['exercises'],
      nextId: log.nextId,
    })
  })

  app.get<{ Params: { date: string } }>(
    '/api/workout/:date',
    { preHandler: [app.authenticate] },
    async (request) => {
      const userId = request.user.userId
      const log = await prisma.workoutLog.findUnique({
        where: { userId_date: { userId, date: request.params.date } },
      })

      if (!log) {
        return ok<DailyWorkoutLog | null>(null)
      }

      return ok<DailyWorkoutLog>({
        date: log.date,
        dayType: log.dayType as DailyWorkoutLog['dayType'],
        exercises: log.exercises as unknown as DailyWorkoutLog['exercises'],
        nextId: log.nextId,
      })
    },
  )

  app.put<{ Params: { date: string } }>(
    '/api/workout/:date',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const userId = request.user.userId
      const body = workoutBodySchema.safeParse(request.body)
      if (!body.success) {
        return fail(reply, '请求体格式错误')
      }

      const log = await prisma.workoutLog.upsert({
        where: { userId_date: { userId, date: request.params.date } },
        create: {
          userId,
          date: request.params.date,
          dayType: body.data.dayType,
          exercises: body.data.exercises,
          nextId: body.data.nextId,
        },
        update: {
          dayType: body.data.dayType,
          exercises: body.data.exercises,
          nextId: body.data.nextId,
        },
      })

      return ok<DailyWorkoutLog>({
        date: log.date,
        dayType: log.dayType as DailyWorkoutLog['dayType'],
        exercises: log.exercises as unknown as DailyWorkoutLog['exercises'],
        nextId: log.nextId,
      })
    },
  )
}
