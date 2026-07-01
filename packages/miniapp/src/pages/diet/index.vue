<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import {
  FOODS,
  calcNutrition,
  formatDateKey,
  formatNumber,
  getFoodById,
  getFoodUnitLabel,
  type FoodNutrition,
} from '@record/shared'
import { toDailySummary, type DailyNutritionSummary } from '@record/shared'
import type { DietRecord } from '@record/shared'
import { createDefaultLog, loadAllDailyLogs, loadDailyLog, saveDailyLog } from '@/api/diet'
import { whenAuthed } from '@/api/auth'
import { confirm, toast } from '@/api/request'
import LineChart from '@/components/LineChart.vue'

const selectedDate = ref(formatDateKey(new Date()))
const records = ref<DietRecord[]>([{ id: 1, foodId: '', amount: 100 }])
const nextId = ref(2)
const loading = ref(false)
const saving = ref(false)
const savedSnapshot = ref('')
const trendData = ref<DailyNutritionSummary[]>([])

const datePickerShow = ref(false)
const datePickerValue = ref(Date.now())
const pickerShow = ref(false)
const pickerColumns = ref<string[][]>([[]])
const pickerDefaultIndex = ref<number[]>([0])
let pickerRecord: DietRecord | null = null

const foodNames = FOODS.map((f) => f.name)
const foodIndexMap = FOODS.map((f) => f.id)

const totals = computed<FoodNutrition>(() =>
  records.value.reduce(
    (sum, record) => {
      const food = getFoodById(record.foodId)
      if (!food) return sum
      const nutrition = calcNutrition(food, record.amount)
      return {
        protein: sum.protein + nutrition.protein,
        fat: sum.fat + nutrition.fat,
        carbs: sum.carbs + nutrition.carbs,
        calories: sum.calories + nutrition.calories,
      }
    },
    { protein: 0, fat: 0, carbs: 0, calories: 0 },
  ),
)

const chartLabels = computed(() => trendData.value.map((d) => d.label))
const macroChartSeries = computed(() => [
  { name: '蛋白质', data: trendData.value.map((d) => d.protein), color: '#3c9cff' },
  { name: '脂肪', data: trendData.value.map((d) => d.fat), color: '#5ac725' },
  { name: '碳水', data: trendData.value.map((d) => d.carbs), color: '#f9ae3d' },
])
const calorieChartSeries = computed(() => [
  { name: '热量', data: trendData.value.map((d) => d.calories), color: '#f56c6c' },
])

const summaryItems = computed(() => [
  { label: '蛋白质', value: formatNumber(totals.value.protein), unit: 'g', type: 'primary' as const },
  { label: '脂肪', value: formatNumber(totals.value.fat), unit: 'g', type: 'success' as const },
  { label: '碳水', value: formatNumber(totals.value.carbs), unit: 'g', type: 'warning' as const },
  { label: '热量', value: formatNumber(totals.value.calories, 0), unit: 'kcal', type: 'error' as const },
])

function serializeState() {
  return JSON.stringify({ records: records.value, nextId: nextId.value })
}

function markSaved() {
  savedSnapshot.value = serializeState()
}

function getFoodIndex(foodId: string) {
  const idx = foodIndexMap.indexOf(foodId)
  return idx >= 0 ? idx : 0
}

function openDatePicker() {
  datePickerValue.value = dayjs(selectedDate.value).valueOf()
  datePickerShow.value = true
}

async function onDateConfirm(e: { value: number }) {
  datePickerShow.value = false
  const date = dayjs(e.value).format('YYYY-MM-DD')
  if (serializeState() !== savedSnapshot.value && savedSnapshot.value) {
    const ok = await confirm('当前有未保存修改，切换日期将丢弃，是否继续？')
    if (!ok) return
  }
  selectedDate.value = date
  await loadRecordsForDate(date)
}

function openFoodPicker(record: DietRecord) {
  pickerRecord = record
  pickerColumns.value = [foodNames]
  pickerDefaultIndex.value = [getFoodIndex(record.foodId)]
  pickerShow.value = true
}

function onFoodPickerConfirm(e: { indexs: number[] }) {
  pickerShow.value = false
  if (!pickerRecord) return
  const index = e.indexs[0] ?? 0
  pickerRecord.foodId = foodIndexMap[index] ?? ''
  const food = getFoodById(pickerRecord.foodId)
  if (food) pickerRecord.amount = food.unit === 'g' ? 100 : 1
  pickerRecord = null
}

function updateAmount(record: DietRecord, value: string) {
  record.amount = Number(value) || 0
}

async function loadTrendData() {
  try {
    const logs = await loadAllDailyLogs()
    trendData.value = logs
      .filter((log) => log.records.some((r) => r.foodId && r.amount > 0))
      .map((log) => toDailySummary(log.date, log.records))
  } catch {
    toast('加载趋势失败')
  }
}

async function loadRecordsForDate(date: string) {
  loading.value = true
  try {
    const log = await loadDailyLog(date)
    if (log?.records.length) {
      records.value = log.records.map((r) => ({ ...r }))
      nextId.value = log.nextId
      markSaved()
    } else {
      const defaults = createDefaultLog(date)
      records.value = defaults.records.map((r) => ({ ...r }))
      nextId.value = defaults.nextId
      savedSnapshot.value = ''
    }
  } catch {
    toast('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  for (const [i, record] of records.value.entries()) {
    if (!record.foodId) return toast(`第 ${i + 1} 行请选择食物`)
    if (!record.amount || record.amount <= 0) return toast(`第 ${i + 1} 行请输入有效摄入量`)
  }
  saving.value = true
  try {
    await saveDailyLog({
      date: selectedDate.value,
      records: records.value,
      nextId: nextId.value,
    })
    markSaved()
    toast('保存成功', 'success')
    await loadTrendData()
  } catch {
    toast('保存失败')
  } finally {
    saving.value = false
  }
}

function addRecord() {
  records.value.push({ id: nextId.value++, foodId: '', amount: 100 })
}

async function removeRecord(id: number) {
  if (records.value.length <= 1) return toast('至少保留一条')
  records.value = records.value.filter((r) => r.id !== id)
}

function recordNutrition(record: DietRecord) {
  const food = getFoodById(record.foodId)
  if (!food) return null
  return calcNutrition(food, record.amount)
}

function recordUnitLabel(record: DietRecord) {
  const food = getFoodById(record.foodId)
  return food ? getFoodUnitLabel(food) : '-'
}

function foodCellValueStyle(record: DietRecord) {
  return getFoodById(record.foodId)
    ? { fontWeight: '600', color: '#303133' }
    : { color: '#c0c4cc' }
}

function goCarbCycle() {
  uni.navigateTo({ url: '/pages/carb-cycle/index' })
}

function recordNutritionItems(record: DietRecord) {
  const n = recordNutrition(record)
  if (!n) return []
  return [
    { label: '蛋白', value: formatNumber(n.protein), unit: 'g', type: 'primary' as const },
    { label: '脂肪', value: formatNumber(n.fat), unit: 'g', type: 'success' as const },
    { label: '碳水', value: formatNumber(n.carbs), unit: 'g', type: 'warning' as const },
    { label: '热量', value: formatNumber(n.calories, 0), unit: 'kcal', type: 'error' as const },
  ]
}

onMounted(async () => {
  await whenAuthed()
  await loadRecordsForDate(selectedDate.value)
  await loadTrendData()
})
</script>

<template>
  <view class="page">
    <view class="toolbar-sticky">
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
      <view class="card link-card" @click="goCarbCycle">
        <view class="link-card-inner">
          <u-icon name="reload" color="#3c9cff" size="18" />
          <text class="link-card-text">碳循环计算器</text>
        </view>
        <u-icon name="arrow-right" color="#c0c4cc" size="16" />
      </view>
    </view>

    <view class="card summary-card">
      <view class="section-head">
        <u-icon name="grid-fill" color="#3c9cff" size="18" />
        <text class="section-title">当日合计</text>
      </view>
      <view class="summary-grid">
        <view
          v-for="item in summaryItems"
          :key="item.label"
          class="summary-item"
          :class="`summary-item--${item.type}`"
        >
          <text class="summary-label">{{ item.label }}</text>
          <view class="summary-value-row">
            <text class="summary-value">{{ item.value }}</text>
            <text class="summary-unit">{{ item.unit }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section-bar">
      <view class="section-head compact">
        <u-icon name="edit-pen" color="#3c9cff" size="18" />
        <text class="section-title">饮食记录</text>
      </view>
    </view>

    <view v-if="loading" class="card loading-card">
      <u-loading-icon text="加载中" />
    </view>

    <view v-for="(record, index) in records" :key="record.id" class="card record-card">
      <view class="record-head">
        <view class="record-badge">{{ index + 1 }}</view>
        <view class="record-delete" @click="removeRecord(record.id)">
          <u-icon name="trash" color="#f56c6c" size="18" />
        </view>
      </view>

      <view class="record-body">
        <view class="record-field">
          <u-cell-group :border="false" class="record-food-cell">
            <u-cell
              title="食物"
              :value="getFoodById(record.foodId)?.name || '点击选择食物'"
              :value-style="foodCellValueStyle(record)"
              is-link
              @click="openFoodPicker(record)"
            />
          </u-cell-group>
        </view>

        <view class="record-field">
          <text class="record-field-label">摄入量</text>
          <view class="record-amount-wrap">
            <u-input
              :model-value="String(record.amount || '')"
              type="digit"
              border="none"
              class="record-amount-input"
              @update:model-value="(v: string) => updateAmount(record, v)"
            />
            <text class="record-amount-unit">{{ recordUnitLabel(record) }}</text>
          </view>
        </view>

        <view v-if="recordNutrition(record)" class="record-nutrition">
          <view
            v-for="item in recordNutritionItems(record)"
            :key="item.label"
            class="record-nutrition-item"
            :class="`record-nutrition-item--${item.type}`"
          >
            <text class="record-nutrition-label">{{ item.label }}</text>
            <view class="record-nutrition-value-row">
              <text class="record-nutrition-value">{{ item.value }}</text>
              <text class="record-nutrition-unit">{{ item.unit }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!loading" class="add-record-wrap">
      <u-button type="primary" icon="plus" text="添加食物" @click="addRecord" />
    </view>

    <view class="card">
      <view class="section-head">
        <u-icon name="list-dot" color="#3c9cff" size="18" />
        <text class="section-title">营养素趋势 (g)</text>
      </view>
      <LineChart :labels="chartLabels" :series="macroChartSeries" :height="200" />
    </view>

    <view class="card">
      <view class="section-head">
        <u-icon name="hourglass" color="#f56c6c" size="18" />
        <text class="section-title">热量趋势 (kcal)</text>
      </view>
      <LineChart :labels="chartLabels" :series="calorieChartSeries" :height="200" />
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

    <u-picker
      :show="pickerShow"
      title="选择食物"
      :columns="pickerColumns"
      :default-index="pickerDefaultIndex"
      close-on-click-overlay
      @confirm="onFoodPickerConfirm"
      @cancel="pickerShow = false"
      @close="pickerShow = false"
    />
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 0 24rpx 48rpx;
  box-sizing: border-box;
  background: #f0f2f5;
}

.toolbar-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 24rpx 0 0;
  background: #f0f2f5;

  .toolbar-card {
    margin-bottom: 16rpx;
  }
}

.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
}

.link-card-inner {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.link-card-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
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

  &.compact {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding: 0 8rpx;
}

.add-record-wrap {
  margin-bottom: 24rpx;

  :deep(.u-button) {
    width: 100%;
  }
}

.summary-card {
  .section-head {
    margin-bottom: 20rpx;
  }
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.summary-item {
  position: relative;
  padding: 24rpx 20rpx 24rpx 28rpx;
  border-radius: 16rpx;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6rpx;
    border-radius: 6rpx 0 0 6rpx;
  }

  &--primary {
    background: rgba(60, 156, 255, 0.08);

    &::before {
      background: #3c9cff;
    }

    .summary-value {
      color: #3c9cff;
    }
  }

  &--success {
    background: rgba(90, 199, 37, 0.08);

    &::before {
      background: #5ac725;
    }

    .summary-value {
      color: #5ac725;
    }
  }

  &--warning {
    background: rgba(249, 174, 61, 0.1);

    &::before {
      background: #f9ae3d;
    }

    .summary-value {
      color: #e6a23c;
    }
  }

  &--error {
    background: rgba(245, 108, 108, 0.08);

    &::before {
      background: #f56c6c;
    }

    .summary-value {
      color: #f56c6c;
    }
  }
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 12rpx;
}

.summary-value-row {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.summary-value {
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1;
}

.summary-unit {
  font-size: 22rpx;
  color: #909399;
}

.loading-card {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.record-card {
  padding: 0;
  overflow: hidden;
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.record-badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #3c9cff, #5cadff);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: rgba(245, 108, 108, 0.08);
}

.record-body {
  padding: 20rpx 24rpx 24rpx;
}

.record-field {
  &:not(:last-child) {
    margin-bottom: 20rpx;
  }
}

.record-field-label {
  display: block;
  font-size: 24rpx;
  color: #909399;
  margin-bottom: 12rpx;
}

.record-food-cell {
  background: #f8f9fb;
  border-radius: 12rpx;
  overflow: hidden;
}

.record-amount-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f8f9fb;
  border-radius: 12rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.record-amount-input {
  flex: 1;

  :deep(.u-input) {
    padding: 0 !important;
  }
}

.record-amount-unit {
  flex-shrink: 0;
  font-size: 26rpx;
  color: #909399;
}

.record-nutrition {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
  margin-top: 4rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f2f5;
}

.record-nutrition-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;

  &--primary {
    background: rgba(60, 156, 255, 0.08);

    .record-nutrition-value {
      color: #3c9cff;
    }
  }

  &--success {
    background: rgba(90, 199, 37, 0.08);

    .record-nutrition-value {
      color: #5ac725;
    }
  }

  &--warning {
    background: rgba(249, 174, 61, 0.1);

    .record-nutrition-value {
      color: #e6a23c;
    }
  }

  &--error {
    background: rgba(245, 108, 108, 0.08);

    .record-nutrition-value {
      color: #f56c6c;
    }
  }
}

.record-nutrition-label {
  font-size: 22rpx;
  color: #909399;
}

.record-nutrition-value-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.record-nutrition-value {
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1;
}

.record-nutrition-unit {
  font-size: 18rpx;
  color: #909399;
}
</style>
