<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  FOODS,
  calcGrams,
  calcNutrition,
  formatNumber,
  getFoodById,
  getFoodUnitLabel,
  type FoodNutrition,
} from '@/data/foods'
import {
  createDefaultLog,
  formatDateKey,
  loadAllDailyLogs,
  loadDailyLog,
  saveDailyLog,
  type DietRecord,
} from '@/db/dietDB'
import NutritionTrendChart from '@/components/NutritionTrendChart.vue'
import { toDailySummary, type DailyNutritionSummary } from '@/utils/nutrition'

const selectedDate = ref(formatDateKey(new Date()))
const records = ref<DietRecord[]>([])
const nextId = ref(1)
const loading = ref(false)
const saving = ref(false)
const chartLoading = ref(false)
const savedSnapshot = ref('')
const trendData = ref<DailyNutritionSummary[]>([])

let isHydrating = false
let isRevertingDate = false

const displayDateText = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
})

const isDirty = computed(
  () => serializeState() !== savedSnapshot.value && savedSnapshot.value !== '',
)

const canSave = computed(() => records.value.length > 0 && !saving.value && !loading.value)

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

function serializeState() {
  return JSON.stringify({
    records: records.value.map((record) => ({
      id: record.id,
      foodId: record.foodId,
      amount: record.amount,
    })),
    nextId: nextId.value,
  })
}

function markSaved() {
  savedSnapshot.value = serializeState()
}

function getRecordNutrition(record: Pick<DietRecord, 'foodId' | 'amount'>) {
  const food = getFoodById(record.foodId)!
  return {
    food,
    grams: calcGrams(food, record.amount),
    ...calcNutrition(food, record.amount),
  }
}

function validateRecords(): string | null {
  if (records.value.length === 0) {
    return '请至少添加一条饮食记录'
  }

  for (const [index, record] of records.value.entries()) {
    if (!record.foodId) {
      return `第 ${index + 1} 行请选择食物`
    }
    if (!getFoodById(record.foodId)) {
      return `第 ${index + 1} 行食物无效`
    }
    if (!record.amount || record.amount <= 0) {
      return `第 ${index + 1} 行请输入有效的摄入量`
    }
  }

  return null
}

async function loadTrendData() {
  chartLoading.value = true
  try {
    const logs = await loadAllDailyLogs()
    trendData.value = logs
      .filter((log) => log.records.some((record) => record.foodId && record.amount > 0))
      .map((log) => toDailySummary(log.date, log.records))
  } catch {
    ElMessage.error('加载趋势数据失败')
  } finally {
    chartLoading.value = false
  }
}

async function loadRecordsForDate(date: string) {
  isHydrating = true
  loading.value = true

  try {
    const log = await loadDailyLog(date)
    if (log && log.records.length > 0) {
      records.value = log.records.map((record) => ({ ...record }))
      nextId.value = log.nextId
      markSaved()
    } else {
      const defaults = createDefaultLog(date)
      records.value = defaults.records.map((record) => ({ ...record }))
      nextId.value = defaults.nextId
      savedSnapshot.value = ''
    }
  } catch {
    ElMessage.error('加载记录失败')
    const defaults = createDefaultLog(date)
    records.value = defaults.records.map((record) => ({ ...record }))
    nextId.value = defaults.nextId
    savedSnapshot.value = ''
  } finally {
    loading.value = false
    await nextTick()
    isHydrating = false
  }
}

async function handleSave() {
  const error = validateRecords()
  if (error) {
    ElMessage.warning(error)
    return
  }

  saving.value = true
  try {
    await saveDailyLog({
      date: selectedDate.value,
      records: records.value.map((record) => ({
        id: record.id,
        foodId: record.foodId,
        amount: record.amount,
      })),
      nextId: nextId.value,
    })
    markSaved()
    ElMessage.success('保存成功')
    await loadTrendData()
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

function addRecord() {
  records.value.push({ id: nextId.value++, foodId: '', amount: 100 })
}

function removeRecord(id: number) {
  if (records.value.length <= 1) {
    ElMessage.warning('至少保留一条记录')
    return
  }
  records.value = records.value.filter((record) => record.id !== id)
}

function onFoodChange(record: DietRecord) {
  const food = getFoodById(record.foodId)
  if (!food) return
  record.amount = food.unit === 'g' ? 100 : 1
}

watch(selectedDate, async (newDate, oldDate) => {
  if (isRevertingDate) {
    isRevertingDate = false
    return
  }

  if (!oldDate || newDate === oldDate) return

  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        '当前日期有未保存的修改，切换日期将丢弃这些修改，是否继续？',
        '未保存的修改',
        {
          type: 'warning',
          confirmButtonText: '继续切换',
          cancelButtonText: '留在此页',
        },
      )
    } catch {
      isRevertingDate = true
      selectedDate.value = oldDate
      return
    }
  }

  await loadRecordsForDate(newDate)
})

onMounted(() => {
  void loadRecordsForDate(selectedDate.value)
  void loadTrendData()
})
</script>

<template>
  <div class="diet-page">
    <el-card shadow="never" class="header-card">
      <div class="header">
        <div>
          <h1>每日饮食记录表</h1>
          <p class="date">{{ displayDateText }}</p>
        </div>
        <div class="header-actions">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择日期"
            :clearable="false"
          />
          <el-tag v-if="isDirty" type="warning" effect="plain">未保存</el-tag>
          <el-button type="success" :loading="saving" :disabled="!canSave" @click="handleSave">
            保存
          </el-button>
          <el-button type="primary" @click="addRecord">添加食物</el-button>
        </div>
      </div>
    </el-card>

    <el-card v-loading="loading" shadow="never" class="table-card">
      <el-table :data="records" stripe border style="width: 100%">
        <el-table-column label="食物" min-width="160">
          <template #default="{ row }">
            <el-select
              v-model="row.foodId"
              placeholder="选择食物"
              style="width: 100%"
              @change="onFoodChange(row as DietRecord)"
            >
              <el-option
                v-for="food in FOODS"
                :key="food.id"
                :label="food.name"
                :value="food.id"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="摄入量" width="180">
          <template #default="{ row }">
            <div class="amount-input">
              <el-input-number
                v-model="row.amount"
                :min="0.1"
                :step="getFoodById(row.foodId) && getFoodUnitLabel(getFoodById(row.foodId)!) === 'g' ? 10 : 1"
                :precision="getFoodById(row.foodId) && getFoodUnitLabel(getFoodById(row.foodId)!) === 'g' ? 0 : 1"
                :disabled="!row.foodId"
                controls-position="right"
              />
              <span class="unit">
                {{ row.foodId ? getFoodUnitLabel(getFoodById(row.foodId)!) : '-' }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="折算重量" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.foodId">
              {{ formatNumber(getRecordNutrition(row as DietRecord).grams, 0) }} g
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="蛋白质 (g)" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.foodId">
              {{ formatNumber(getRecordNutrition(row as DietRecord).protein) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="脂肪 (g)" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.foodId">
              {{ formatNumber(getRecordNutrition(row as DietRecord).fat) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="碳水 (g)" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.foodId">
              {{ formatNumber(getRecordNutrition(row as DietRecord).carbs) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="热量 (kcal)" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.foodId">
              {{ formatNumber(getRecordNutrition(row as DietRecord).calories, 0) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link @click="removeRecord((row as DietRecord).id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="summary-card">
      <h2>当日合计</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">蛋白质</span>
          <span class="value">{{ formatNumber(totals.protein) }} g</span>
        </div>
        <div class="summary-item">
          <span class="label">脂肪</span>
          <span class="value">{{ formatNumber(totals.fat) }} g</span>
        </div>
        <div class="summary-item">
          <span class="label">碳水化合物</span>
          <span class="value">{{ formatNumber(totals.carbs) }} g</span>
        </div>
        <div class="summary-item highlight">
          <span class="label">总热量</span>
          <span class="value">{{ formatNumber(totals.calories, 0) }} kcal</span>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="chart-card">
      <h2>营养摄入趋势</h2>
      <NutritionTrendChart :data="trendData" :loading="chartLoading" />
    </el-card>
  </div>
</template>

<style scoped>
.diet-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.header-card,
.table-card,
.summary-card,
.chart-card {
  border-radius: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.date {
  margin: 4px 0 0;
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  color: #606266;
  white-space: nowrap;
}

.summary-card h2,
.chart-card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #303133;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item.highlight {
  background: #ecf5ff;
}

.summary-item .label {
  font-size: 13px;
  color: #909399;
}

.summary-item .value {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.summary-item.highlight .value {
  color: #409eff;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
