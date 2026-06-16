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
import type { DailyNutritionSummary } from '@/utils/nutrition'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  data: DailyNutritionSummary[]
  loading?: boolean
}>()

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const chartOption = computed<EChartsCoreOption>(() => {
  const dates = props.data.map((item) => item.label)

  return {
    color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c'],
    tooltip: {
      trigger: 'axis',
      formatter(params: CallbackDataParams | CallbackDataParams[]) {
        if (!Array.isArray(params) || params.length === 0) return ''
        const index = params[0]?.dataIndex ?? 0
        const item = props.data[index]
        if (!item) return ''

        return [
          item.date,
          `蛋白质：${item.protein.toFixed(1)} g`,
          `脂肪：${item.fat.toFixed(1)} g`,
          `碳水：${item.carbs.toFixed(1)} g`,
          `热量：${item.calories.toFixed(0)} kcal`,
        ].join('<br/>')
      },
    },
    legend: {
      data: ['蛋白质', '脂肪', '碳水', '热量'],
      bottom: 0,
    },
    grid: {
      left: 48,
      right: 48,
      top: 24,
      bottom: 48,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
    },
    yAxis: [
      {
        type: 'value',
        name: '营养素 (g)',
        min: 0,
      },
      {
        type: 'value',
        name: '热量 (kcal)',
        min: 0,
      },
    ],
    series: [
      {
        name: '蛋白质',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        data: props.data.map((item) => Number(item.protein.toFixed(1))),
      },
      {
        name: '脂肪',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        data: props.data.map((item) => Number(item.fat.toFixed(1))),
      },
      {
        name: '碳水',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        data: props.data.map((item) => Number(item.carbs.toFixed(1))),
      },
      {
        name: '热量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        yAxisIndex: 1,
        data: props.data.map((item) => Number(item.calories.toFixed(0))),
      },
    ],
  }
})

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
  () => {
    renderChart()
  },
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
      暂无历史记录，保存饮食数据后将在此展示趋势
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
