<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatDateKey } from '@record/shared'
import {
  loadAllWeightLogs,
  loadWeightLog,
  saveWeightLog,
  toWeightSummary,
  type WeightSummary,
} from '@/api/weight'
import { confirm, toast } from '@/api/request'
import LineChart from '@/components/LineChart.vue'

const selectedDate = ref(formatDateKey(new Date()))
const weight = ref<number | null>(null)
const savedWeight = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const trendData = ref<WeightSummary[]>([])

const chartLabels = computed(() => trendData.value.map((d) => d.label))
const chartSeries = computed(() => [
  { name: '体重', data: trendData.value.map((d) => d.weight), color: '#409eff' },
])

async function onDateChange(e: { detail: { value: string } }) {
  const date = e.detail.value
  if (weight.value !== savedWeight.value && savedWeight.value !== null) {
    const ok = await confirm('有未保存修改，切换日期将丢弃，是否继续？')
    if (!ok) return
  }
  selectedDate.value = date
  await loadWeightForDate(date)
}

async function loadTrendData() {
  try {
    const logs = await loadAllWeightLogs()
    trendData.value = logs.map(toWeightSummary)
  } catch {
    toast('加载趋势失败')
  }
}

async function loadWeightForDate(date: string) {
  loading.value = true
  try {
    const log = await loadWeightLog(date)
    weight.value = log?.weight ?? null
    savedWeight.value = log?.weight ?? null
  } catch {
    toast('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (weight.value === null || weight.value <= 0 || weight.value > 500) {
    return toast('请输入有效体重')
  }
  saving.value = true
  try {
    await saveWeightLog({ date: selectedDate.value, weight: weight.value })
    savedWeight.value = weight.value
    toast('保存成功', 'success')
    await loadTrendData()
  } catch {
    toast('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadWeightForDate(selectedDate.value)
  await loadTrendData()
})
</script>

<template>
  <view class="page">
    <view class="card toolbar">
      <picker mode="date" :value="selectedDate" @change="onDateChange">
        <view class="picker-row">日期：{{ selectedDate }}</view>
      </picker>
      <button class="btn-success" size="mini" :loading="saving" @click="handleSave">保存</button>
    </view>

    <view class="card">
      <view class="label">当日体重 (kg)</view>
      <input v-model.number="weight" type="digit" class="weight-input" placeholder="请输入体重" />
    </view>

    <view class="card">
      <view class="section-title">体重变化趋势</view>
      <LineChart :labels="chartLabels" :series="chartSeries" />
    </view>
  </view>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.picker-row { color: #409eff; }
.label { margin-bottom: 8px; color: #606266; }
.weight-input {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 18px;
}
.section-title { font-weight: 600; margin-bottom: 8px; }
</style>
