<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { formatDateKey } from '@record/shared'
import {
  loadAllWeightLogs,
  loadWeightLog,
  saveWeightLog,
  toWeightSummary,
  type WeightSummary,
} from '@/api/weight'
import { whenAuthed } from '@/api/auth'
import { confirm, toast } from '@/api/request'
import LineChart from '@/components/LineChart.vue'

const selectedDate = ref(formatDateKey(new Date()))
const weightInput = ref('')
const savedWeight = ref<number | null>(null)
const datePickerShow = ref(false)
const datePickerValue = ref(Date.now())

const parsedWeight = computed(() => {
  const trimmed = weightInput.value.trim()
  if (trimmed === '' || trimmed === '.') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
})
const loading = ref(false)
const saving = ref(false)
const trendData = ref<WeightSummary[]>([])

const chartLabels = computed(() => trendData.value.map((d) => d.label))
const chartSeries = computed(() => [
  { name: '体重', data: trendData.value.map((d) => Number(d.weight)), color: '#3c9cff' },
])

function openDatePicker() {
  datePickerValue.value = dayjs(selectedDate.value).valueOf()
  datePickerShow.value = true
}

async function onDateConfirm(e: { value: number }) {
  datePickerShow.value = false
  const date = dayjs(e.value).format('YYYY-MM-DD')
  if (parsedWeight.value !== savedWeight.value && savedWeight.value !== null) {
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
    weightInput.value = log?.weight != null ? String(log.weight) : ''
    savedWeight.value = log?.weight ?? null
  } catch {
    toast('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const weight = parsedWeight.value
  if (weight === null || weight <= 0 || weight > 500) {
    return toast('请输入有效体重')
  }
  saving.value = true
  try {
    await saveWeightLog({ date: selectedDate.value, weight })
    savedWeight.value = weight
    toast('保存成功', 'success')
    await loadTrendData()
  } catch {
    toast('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await whenAuthed()
  await loadWeightForDate(selectedDate.value)
  await loadTrendData()
})
</script>

<template>
  <view class="page">
    <view class="card toolbar-card">
      <u-cell-group :border="false">
        <u-cell
          title="记录日期"
          :value="selectedDate"
          icon="calendar"
          is-link
          @click="openDatePicker"
        />
      </u-cell-group>
      <view class="toolbar-action">
        <u-button type="success" size="small" :loading="saving" text="保存" @click="handleSave" />
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <u-icon name="level" color="#3c9cff" size="18" />
        <text class="section-title">当日体重</text>
      </view>
      <u-input
        v-model="weightInput"
        type="digit"
        placeholder="请输入体重"
        border="surround"
        clearable
      >
        <template #suffix>
          <text class="input-suffix">kg</text>
        </template>
      </u-input>
      <text v-if="savedWeight != null" class="hint">已保存：{{ savedWeight }} kg</text>
    </view>

    <view class="card">
      <view class="section-head">
        <u-icon name="list-dot" color="#3c9cff" size="18" />
        <text class="section-title">体重变化趋势</text>
      </view>
      <view v-if="loading" class="loading-wrap">
        <u-loading-icon text="加载中" />
      </view>
      <LineChart v-else :labels="chartLabels" :series="chartSeries" />
    </view>

    <u-datetime-picker
      v-model="datePickerValue"
      :show="datePickerShow"
      mode="date"
      title="选择日期"
      @confirm="onDateConfirm"
      @cancel="datePickerShow = false"
      @close="datePickerShow = false"
    />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 48rpx;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
}

.toolbar-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.toolbar-card :deep(.u-cell-group) {
  flex: 1;
}

.toolbar-action {
  flex-shrink: 0;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.input-suffix {
  color: #909399;
  font-size: 28rpx;
  padding-right: 8rpx;
}

.hint {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #909399;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}
</style>
