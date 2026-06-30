<script setup lang="ts">
import { getCurrentInstance, onMounted, watch } from 'vue'
import { onReady } from '@dcloudio/uni-app'

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: { name: string; data: number[]; color?: string }[]
    height?: number
    showLegend?: boolean
  }>(),
  { height: 240, showLegend: true },
)

const instance = getCurrentInstance()
const canvasId = `chart${Math.random().toString(36).slice(2)}`
const colors = ['#3c9cff', '#5ac725', '#f9ae3d', '#f56c6c', '#909399']

function getPointX(index: number, count: number, chartW: number, left: number) {
  if (count <= 1) return left + chartW / 2
  return left + (index / (count - 1)) * chartW
}

function drawSmoothLine(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  xMin: number,
  xMax: number,
) {
  if (points.length < 2) return

  const clampX = (x: number) => Math.min(xMax, Math.max(xMin, x))

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2]

    const cp1x = clampX(p1.x + (p2.x - p0.x) / 6)
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = clampX(p2.x - (p3.x - p1.x) / 6)
    const cp2y = p2.y - (p3.y - p1.y) / 6

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }

  ctx.stroke()
}

function renderChart(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const padding = { top: 16, right: 24, bottom: 32, left: 36 }
  const chartW = width - padding.left - padding.right
  const chartRight = padding.left + chartW
  const chartH = height - padding.top - padding.bottom

  const allValues = props.series.flatMap((s) => s.data.map((v) => Number(v)))
  if (allValues.length === 0) return

  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  const min = dataMin === dataMax ? dataMin - 1 : dataMin
  const max = dataMin === dataMax ? dataMax + 1 : dataMax
  const range = max - min || 1

  ctx.clearRect(0, 0, width, height)

  props.series.forEach((serie, serieIndex) => {
    const color = serie.color ?? colors[serieIndex % colors.length]
    const points = serie.data.map((value, index) => ({
      x: getPointX(index, props.labels.length, chartW, padding.left),
      y: padding.top + chartH - ((Number(value) - min) / range) * chartH,
    }))

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2

    if (points.length === 1) {
      ctx.beginPath()
      ctx.arc(points[0].x, points[0].y, 4, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    drawSmoothLine(ctx, points, padding.left, chartRight)
  })

  ctx.fillStyle = '#909399'
  ctx.font = '10px sans-serif'
  props.labels.forEach((label, index) => {
    if (index % Math.ceil(props.labels.length / 6) !== 0 && index !== props.labels.length - 1) return
    const x = getPointX(index, props.labels.length, chartW, padding.left)
    const isFirst = index === 0
    const isLast = index === props.labels.length - 1
    ctx.textAlign = isFirst ? 'left' : isLast ? 'right' : 'center'
    const textX = isFirst ? padding.left : isLast ? chartRight : x
    ctx.fillText(label, textX, height - 8)
  })
  ctx.textAlign = 'left'
}

function initCanvas() {
  if (props.labels.length === 0 || props.series.length === 0) return

  const proxy = instance?.proxy
  if (!proxy) return

  uni
    .createSelectorQuery()
    .in(proxy)
    .select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas = res[0]?.node as WechatMiniprogram.Canvas | undefined
      if (!canvas) return

      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const width = res[0].width
      const height = res[0].height || props.height
      const dpr = uni.getSystemInfoSync().pixelRatio

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      renderChart(ctx, width, height)
    })
}

let drawTimer: ReturnType<typeof setTimeout> | null = null

function scheduleDraw() {
  if (drawTimer) clearTimeout(drawTimer)
  drawTimer = setTimeout(initCanvas, 50)
}

onReady(scheduleDraw)
onMounted(scheduleDraw)
watch(() => props.labels.length, scheduleDraw)
watch(() => props.series.map((s) => s.data.join(',')), scheduleDraw)
</script>

<template>
  <view class="chart-wrap">
    <view v-if="showLegend && labels.length > 0" class="legend">
      <view v-for="(item, index) in series" :key="item.name" class="legend-item">
        <view class="legend-dot" :style="{ background: item.color ?? colors[index % colors.length] }" />
        <text>{{ item.name }}</text>
      </view>
    </view>
    <view class="chart-box" :style="{ height: `${height}px` }">
      <canvas :id="canvasId" type="2d" class="chart-canvas" :style="{ height: `${height}px` }" />
      <view v-if="labels.length === 0" class="empty">暂无数据</view>
    </view>
  </view>
</template>

<style scoped>
.chart-wrap {
  width: 100%;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-box {
  position: relative;
  width: 100%;
}

.chart-canvas {
  display: block;
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
  background: #f5f7fa;
  border-radius: 16rpx;
}
</style>
