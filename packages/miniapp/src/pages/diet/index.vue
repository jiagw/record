<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  FOODS,
  calcGrams,
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
import { confirm, toast } from '@/api/request'
import LineChart from '@/components/LineChart.vue'

const selectedDate = ref(formatDateKey(new Date()))
const records = ref<DietRecord[]>([])
const nextId = ref(1)
const loading = ref(false)
const saving = ref(false)
const savedSnapshot = ref('')
const trendData = ref<DailyNutritionSummary[]>([])

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
const chartSeries = computed(() => [
  { name: '蛋白质', data: trendData.value.map((d) => d.protein), color: '#409eff' },
  { name: '脂肪', data: trendData.value.map((d) => d.fat), color: '#67c23a' },
  { name: '碳水', data: trendData.value.map((d) => d.carbs), color: '#e6a23c' },
  { name: '热量', data: trendData.value.map((d) => d.calories), color: '#f56c6c' },
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

function onDateChange(e: { detail: { value: string } }) {
  void switchDate(e.detail.value)
}

async function switchDate(date: string) {
  if (serializeState() !== savedSnapshot.value && savedSnapshot.value) {
    const ok = await confirm('当前有未保存修改，切换日期将丢弃，是否继续？')
    if (!ok) return
  }
  selectedDate.value = date
  await loadRecordsForDate(date)
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

function onFoodPick(record: DietRecord, e: { detail: { value: number } }) {
  record.foodId = foodIndexMap[e.detail.value] ?? ''
  const food = getFoodById(record.foodId)
  if (food) record.amount = food.unit === 'g' ? 100 : 1
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

function removeRecord(id: number) {
  if (records.value.length <= 1) return toast('至少保留一条')
  records.value = records.value.filter((r) => r.id !== id)
}

onMounted(async () => {
  await loadRecordsForDate(selectedDate.value)
  await loadTrendData()
})
</script>

<template>
  <view class="page">
    <view class="card toolbar">
      <picker mode="date" :value="selectedDate" @change="onDateChange">
        <view class="picker-row">日期：{{ selectedDate }}</view>
      </picker>
      <view class="btn-row">
        <button class="btn-success" size="mini" :loading="saving" @click="handleSave">保存</button>
        <button class="btn-primary" size="mini" @click="addRecord">添加</button>
      </view>
    </view>

    <view v-if="loading" class="card">加载中...</view>

    <view v-for="(record, index) in records" :key="record.id" class="card record-card">
      <view class="record-title">记录 {{ index + 1 }}</view>
      <picker
        mode="selector"
        :range="foodNames"
        :value="getFoodIndex(record.foodId)"
        @change="onFoodPick(record, $event)"
      >
        <view class="picker-row">{{ getFoodById(record.foodId)?.name || '选择食物' }}</view>
      </picker>
      <view class="input-row">
        <text>摄入量</text>
        <input v-model.number="record.amount" type="digit" class="num-input" />
        <text>{{ record.foodId ? getFoodUnitLabel(getFoodById(record.foodId)!) : '-' }}</text>
      </view>
      <view v-if="record.foodId" class="nutrition-row">
        蛋白 {{ formatNumber(calcNutrition(getFoodById(record.foodId)!, record.amount).protein) }}g /
        脂肪 {{ formatNumber(calcNutrition(getFoodById(record.foodId)!, record.amount).fat) }}g /
        碳水 {{ formatNumber(calcNutrition(getFoodById(record.foodId)!, record.amount).carbs) }}g /
        热量 {{ formatNumber(calcNutrition(getFoodById(record.foodId)!, record.amount).calories, 0) }}
      </view>
      <button size="mini" class="btn-danger" @click="removeRecord(record.id)">删除</button>
    </view>

    <view class="card">
      <view class="section-title">当日合计</view>
      <view>蛋白质 {{ formatNumber(totals.protein) }}g</view>
      <view>脂肪 {{ formatNumber(totals.fat) }}g</view>
      <view>碳水 {{ formatNumber(totals.carbs) }}g</view>
      <view>热量 {{ formatNumber(totals.calories, 0) }} kcal</view>
    </view>

    <view class="card">
      <view class="section-title">营养摄入趋势</view>
      <LineChart :labels="chartLabels" :series="chartSeries" />
    </view>
  </view>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.picker-row { padding: 8px 0; color: #409eff; }
.btn-row { display: flex; gap: 8px; }
.record-card { display: flex; flex-direction: column; gap: 8px; }
.record-title { font-weight: 600; }
.input-row { display: flex; align-items: center; gap: 8px; }
.num-input { border: 1px solid #dcdfe6; border-radius: 6px; padding: 4px 8px; width: 100px; }
.nutrition-row { color: #606266; font-size: 12px; }
.section-title { font-weight: 600; margin-bottom: 8px; }
.btn-danger { background: #fef0f0; color: #f56c6c; }
</style>
