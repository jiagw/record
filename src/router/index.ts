import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/weight',
      name: 'weight',
      component: () => import('../views/WeightView.vue'),
    },
    {
      path: '/workout',
      name: 'workout',
      component: () => import('../views/WorkoutView.vue'),
    },
  ],
})

export default router
