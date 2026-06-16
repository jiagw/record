<script setup lang="ts">
import { getCurrentInstance, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: { name: string; data: number[]; color?: string }[]
    height?: number
  }>(),
  { height: 280 },
)

const canvasId = `chart-${Math.random().toString(36).slice(2)}`

function draw() {
  const instance = getCurrentInstance()
  if (!instance || props.labels.length === 0 || props.series.length === 0) return

  const query = uni.createSelectorQuery().in(instance.proxy as unknown as WechatMiniprogram.Component.TrivialInstance)
  query
    .select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0]?.node as WechatMiniprogram.Canvas | undefined
      const width = res[0]?.width ?? 300
      const height = res[0]?.height ?? props.height
      if (!canvas) return

      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const dpr = uni.getSystemInfoSync().pixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      const padding = { top: 20, right: 16, bottom: 36, left: 40 }
      const chartW = width - padding.left - padding.right
      const chartH = height - padding.top - padding.bottom

      const allValues = props.series.flatMap((s) => s.data)
      const min = Math.min(...allValues, 0)
      const max = Math.max(...allValues, 1)
      const range = max - min || 1

      const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399']

      props.series.forEach((serie, serieIndex) => {
        const color = serie.color ?? colors[serieIndex % colors.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        serie.data.forEach((value, index) => {
          const x = padding.left + (index / Math.max(props.labels.length - 1, 1)) * chartW
          const y = padding.top + chartH - ((value - min) / range) * chartH
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()
      })

      ctx.fillStyle = '#909399'
      ctx.font = '10px sans-serif'
      props.labels.forEach((label, index) => {
        if (index % Math.ceil(props.labels.length / 6) !== 0 && index !== props.labels.length - 1) return
        const x = padding.left + (index / Math.max(props.labels.length - 1, 1)) * chartW
        ctx.fillText(label, x - 12, height - 10)
      })
    })
}

onMounted(draw)
watch(() => [props.labels, props.series], draw, { deep: true })
</script>

<template>
  <view class="chart-box" :style="{ height: `${height}px` }">
    <canvas :id="canvasId" type="2d" class="chart-canvas" :style="{ height: `${height}px` }" />
    <view v-if="labels.length === 0" class="empty">暂无数据</view>
  </view>
</template>

<style scoped>
.chart-box {
  position: relative;
  width: 100%;
}
.chart-canvas {
  width: 100%;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}
</style>
