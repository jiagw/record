import type { FastifyReply } from 'fastify'
import type { ApiResponse } from '@record/shared'

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, data, message }
}

export function fail(reply: FastifyReply, message: string, code = 1, status = 400) {
  return reply.status(status).send({ code, data: null, message } satisfies ApiResponse<null>)
}
