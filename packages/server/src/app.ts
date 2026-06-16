import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify from 'fastify'
import { registerAuthPlugin } from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { dietRoutes } from './routes/diet.js'
import { weightRoutes } from './routes/weight.js'
import { workoutRoutes } from './routes/workout.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  })
  await registerAuthPlugin(app)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(authRoutes)
  await app.register(dietRoutes)
  await app.register(weightRoutes)
  await app.register(workoutRoutes)

  return app
}
