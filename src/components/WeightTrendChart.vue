<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import type { CallbackDataParams } from 'echarts/types/dist/shared'
import type { WeightSummary } from '@/db/weightDB'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  data: WeightSummary[]
  loading?: boolean
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const chartOption = computed<EChartsCoreOption>(() => ({
  color: ['#409eff'],
  tooltip: {
    trigger: 'axis',
    formatter(params: CallbackDataParams | CallbackDataParams[]) {
      if (!Array.isArray(params) || params.length === 0) return ''
      const index = params[0]?.dataIndex ?? 0
      const item = props.data[index]
      if (!item) return ''
      return `${item.date}<br/>体重：${item.weight.toFixed(1)} kg`
    },
  },
  legend: {
    data: ['体重'],
    bottom: 0,
  },
  grid: {
    left: 48,
    right: 24,
    top: 24,
    bottom: 48,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.data.map((item) => item.label),
  },
  yAxis: {
    type: 'value',
    name: '体重 (kg)',
    scale: true,
  },
  series: [
    {
      name: '体重',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      areaStyle: { opacity: 0.08 },
      data: props.data.map((item) => Number(item.weight.toFixed(1))),
    },
  ],
}))

function renderChart() {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  chart.setOption(chartOption.value, true)
}

function handleResize() {
  chart?.resize()
}

watch(
  () => props.data,
  () => renderChart(),
  { deep: true },
)

watch(
  () => props.loading,
  (loading) => {
    if (loading) {
      chart?.showLoading({ text: '加载中...' })
    } else {
      chart?.hideLoading()
      renderChart()
    }
  },
)

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="chart-wrapper">
    <div v-if="!loading && data.length === 0" class="empty-tip">
      暂无体重记录，保存数据后将在此展示变化趋势
    </div>
    <div ref="chartRef" class="chart" :class="{ hidden: !loading && data.length === 0 }" />
  </div>
</template>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  min-height: 360px;
}

.chart {
  width: 100%;
  height: 360px;
}

.chart.hidden {
  visibility: hidden;
}

.empty-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}
</style>
