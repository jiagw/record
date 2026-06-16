<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WeightTrendChart from '@/components/WeightTrendChart.vue'
import person1WeightData from '@/data/person1-weight.json'
import {
  formatDateKey,
  importWeightLogs,
  loadAllWeightLogs,
  loadWeightLog,
  saveWeightLog,
  toWeightSummary,
  type WeightLog,
  type WeightSummary,
} from '@/db/weightDB'
import { exportWeightToExcel } from '@/utils/exportWeight'

const WEIGHT_IMPORT_KEY = 'person1-weight-seed-v1'

const selectedDate = ref(formatDateKey(new Date()))
const weight = ref<number | null>(null)
const savedWeight = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const chartLoading = ref(false)
const trendData = ref<WeightSummary[]>([])

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

const isDirty = computed(() => weight.value !== savedWeight.value)

const canSave = computed(
  () =>
    weight.value !== null &&
    weight.value > 0 &&
    weight.value <= 500 &&
    !saving.value &&
    !loading.value,
)

async function tryImportSeedData() {
  if (localStorage.getItem(WEIGHT_IMPORT_KEY)) return

  try {
    await importWeightLogs(person1WeightData as WeightLog[])
    localStorage.setItem(WEIGHT_IMPORT_KEY, '1')
    ElMessage.success(`已导入人员一体重记录 ${person1WeightData.length} 条`)
  } catch (error) {
    console.error(error)
    ElMessage.error('导入历史体重数据失败')
  }
}

async function loadTrendData() {
  chartLoading.value = true
  try {
    const logs = await loadAllWeightLogs()
    trendData.value = logs.map(toWeightSummary)
  } catch {
    ElMessage.error('加载体重趋势失败')
  } finally {
    chartLoading.value = false
  }
}

async function loadWeightForDate(date: string) {
  isHydrating = true
  loading.value = true

  try {
    const log = await loadWeightLog(date)
    weight.value = log?.weight ?? null
    savedWeight.value = log?.weight ?? null
  } catch {
    ElMessage.error('加载体重记录失败')
    weight.value = null
    savedWeight.value = null
  } finally {
    loading.value = false
    await nextTick()
    isHydrating = false
  }
}

async function handleSave() {
  if (weight.value === null || weight.value <= 0) {
    ElMessage.warning('请输入有效的体重')
    return
  }
  if (weight.value > 500) {
    ElMessage.warning('体重数值不合理')
    return
  }

  saving.value = true
  try {
    await saveWeightLog({
      date: selectedDate.value,
      weight: weight.value,
    })
    savedWeight.value = weight.value
    ElMessage.success('保存成功')
    await loadTrendData()
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const logs = await loadAllWeightLogs()
    if (logs.length === 0) {
      ElMessage.warning('暂无体重记录可导出')
      return
    }
    exportWeightToExcel(logs)
    ElMessage.success(`已导出 ${logs.length} 条体重记录`)
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
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

  await loadWeightForDate(newDate)
})

onMounted(async () => {
  await tryImportSeedData()
  await loadWeightForDate(selectedDate.value)
  await loadTrendData()
})
</script>

<template>
  <div class="weight-page">
    <el-card shadow="never" class="header-card">
      <div class="header">
        <div>
          <h1>体重记录</h1>
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
          <el-button :loading="exporting" @click="handleExport">导出 Excel</el-button>
        </div>
      </div>
    </el-card>

    <el-card v-loading="loading" shadow="never" class="form-card">
      <div class="weight-form">
        <label class="form-label">当日体重</label>
        <div class="form-input">
          <el-input-number
            v-model="weight"
            :min="1"
            :max="500"
            :step="0.1"
            :precision="1"
            controls-position="right"
            placeholder="请输入体重"
          />
          <span class="unit">kg</span>
        </div>
        <p class="form-tip">每天记录一次体重，点击保存后写入本地数据库</p>
      </div>
    </el-card>

    <el-card shadow="never" class="chart-card">
      <h2>体重变化趋势</h2>
      <WeightTrendChart :data="trendData" :loading="chartLoading" />
    </el-card>
  </div>
</template>

<style scoped>
.weight-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.header-card,
.form-card,
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

.weight-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
}

.form-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.form-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit {
  color: #606266;
}

.form-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.chart-card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #303133;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }
}
</style>
