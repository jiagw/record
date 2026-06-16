<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WORKOUT_DAY_OPTIONS,
  getExerciseById,
  getExercisesByDayType,
  inferDayTypeFromExerciseId,
  type WorkoutDayType,
} from '@/data/exercises'
import {
  createDefaultLog,
  createExercisesForDayType,
  formatDateKey,
  loadWorkoutLog,
  resizeSets,
  saveWorkoutLog,
  type WorkoutExercise,
} from '@/db/workoutDB'

const selectedDate = ref(formatDateKey(new Date()))
const dayType = ref<WorkoutDayType | ''>('')
const exercises = ref<WorkoutExercise[]>([])
const nextId = ref(1)
const loading = ref(false)
const saving = ref(false)
const savedSnapshot = ref('')

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

const canSave = computed(
  () => !!dayType.value && exercises.value.length > 0 && !saving.value && !loading.value,
)

function serializeState() {
  return JSON.stringify({
    dayType: dayType.value,
    exercises: exercises.value.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
      })),
    })),
    nextId: nextId.value,
  })
}

function markSaved() {
  savedSnapshot.value = serializeState()
}

function normalizeLoadedLog(log: {
  dayType?: WorkoutDayType | ''
  exercises: Array<WorkoutExercise & { dayType?: WorkoutDayType | '' }>
  nextId: number
}) {
  const inferredDayType =
    log.dayType ||
    log.exercises[0]?.dayType ||
    inferDayTypeFromExerciseId(log.exercises[0]?.exerciseId ?? '')

  return {
    dayType: inferredDayType as WorkoutDayType | '',
    exercises: log.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      sets: exercise.sets.map((set) => ({ ...set })),
    })),
    nextId: log.nextId,
  }
}

function applyDayType(nextDayType: WorkoutDayType) {
  dayType.value = nextDayType
  exercises.value = createExercisesForDayType(nextDayType)
  nextId.value = exercises.value.length + 1
}

function getSetCount(exercise: WorkoutExercise) {
  return exercise.sets.length
}

function getExerciseOptions() {
  if (!dayType.value) return []
  return getExercisesByDayType(dayType.value)
}

function onSetCountChange(exercise: WorkoutExercise, count: number | undefined) {
  if (!count) return
  exercise.sets = resizeSets(exercise.sets, count)
}

function validateExercises(): string | null {
  if (!dayType.value) {
    return '请选择训练日（推/拉/腿）'
  }
  if (exercises.value.length === 0) {
    return '请先选择训练日以加载动作'
  }

  for (const [index, exercise] of exercises.value.entries()) {
    if (!exercise.exerciseId) {
      return `第 ${index + 1} 个动作请选择训练项目`
    }
    const exerciseInfo = getExerciseById(exercise.exerciseId)
    if (!exerciseInfo) {
      return `第 ${index + 1} 个动作无效`
    }
    if (exerciseInfo.dayType !== dayType.value) {
      return `${exerciseInfo.name} 与当前训练日不匹配`
    }
    if (exercise.sets.length === 0) {
      return `${exerciseInfo.name} 请设置组数`
    }
    for (const [setIndex, set] of exercise.sets.entries()) {
      if (!set.weight || set.weight <= 0) {
        return `${exerciseInfo.name} 第 ${setIndex + 1} 组请输入有效重量`
      }
      if (!set.reps || set.reps <= 0) {
        return `${exerciseInfo.name} 第 ${setIndex + 1} 组请输入有效次数`
      }
    }
  }

  return null
}

async function loadWorkoutForDate(date: string) {
  isHydrating = true
  loading.value = true

  try {
    const log = await loadWorkoutLog(date)
    if (log && log.exercises.length > 0) {
      const normalized = normalizeLoadedLog(log)
      dayType.value = normalized.dayType
      exercises.value = normalized.exercises
      nextId.value = normalized.nextId
      markSaved()
    } else {
      const defaults = createDefaultLog(date)
      dayType.value = defaults.dayType
      exercises.value = defaults.exercises
      nextId.value = defaults.nextId
      savedSnapshot.value = ''
    }
  } catch {
    ElMessage.error('加载健身记录失败')
    const defaults = createDefaultLog(date)
    dayType.value = defaults.dayType
    exercises.value = defaults.exercises
    nextId.value = defaults.nextId
    savedSnapshot.value = ''
  } finally {
    loading.value = false
    await nextTick()
    isHydrating = false
  }
}

async function handleSave() {
  const error = validateExercises()
  if (error) {
    ElMessage.warning(error)
    return
  }

  saving.value = true
  try {
    await saveWorkoutLog({
      date: selectedDate.value,
      dayType: dayType.value as WorkoutDayType,
      exercises: exercises.value.map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.map((set) => ({
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
        })),
      })),
      nextId: nextId.value,
    })
    markSaved()
    ElMessage.success('保存成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

async function handleDayTypeChange(nextDayType: WorkoutDayType | '') {
  if (isHydrating) return

  const oldDayType = dayType.value

  if (!nextDayType) {
    exercises.value = []
    nextId.value = 1
    return
  }

  if (oldDayType && nextDayType !== oldDayType && exercises.value.length > 0 && isDirty.value) {
    try {
      await ElMessageBox.confirm(
        '切换训练日将重置为默认动作，未保存的修改将丢失，是否继续？',
        '切换训练日',
        {
          type: 'warning',
          confirmButtonText: '继续切换',
          cancelButtonText: '取消',
        },
      )
    } catch {
      dayType.value = oldDayType
      return
    }
  }

  applyDayType(nextDayType)
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

  await loadWorkoutForDate(newDate)
})

onMounted(() => {
  void loadWorkoutForDate(selectedDate.value)
})
</script>

<template>
  <div class="workout-page">
    <el-card shadow="never" class="header-card">
      <div class="header">
        <div>
          <h1>健身记录</h1>
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
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="day-type-card">
      <div class="day-type-row">
        <label>训练日</label>
        <el-select
          :model-value="dayType"
          placeholder="选择推/拉/腿日"
          style="width: 200px"
          @update:model-value="handleDayTypeChange"
        >
          <el-option
            v-for="item in WORKOUT_DAY_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <span v-if="!dayType" class="day-type-tip">选择训练日后将自动加载 5 个默认动作</span>
      </div>
    </el-card>

    <div v-loading="loading" class="exercise-list">
      <el-empty v-if="!dayType" description="请先选择训练日" />

      <el-card
        v-for="(exercise, exerciseIndex) in exercises"
        v-else
        :key="exercise.id"
        shadow="never"
        class="exercise-card"
      >
        <div class="exercise-header">
          <span class="exercise-index">动作 {{ exerciseIndex + 1 }}</span>
          <span class="exercise-name">{{ getExerciseById(exercise.exerciseId)?.name }}</span>
        </div>

        <div class="exercise-controls">
          <div class="control-item">
            <label>训练动作</label>
            <el-select v-model="exercise.exerciseId" placeholder="选择动作" style="width: 100%">
              <el-option
                v-for="item in getExerciseOptions()"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </div>
          <div class="control-item set-count">
            <label>组数</label>
            <el-input-number
              :model-value="getSetCount(exercise)"
              :min="1"
              :max="20"
              :step="1"
              controls-position="right"
              @update:model-value="(value) => onSetCountChange(exercise, value ?? 1)"
            />
          </div>
        </div>

        <el-table :data="exercise.sets" border stripe class="sets-table">
          <el-table-column label="组数" width="80" align="center">
            <template #default="{ row }">第 {{ row.setNumber }} 组</template>
          </el-table-column>
          <el-table-column label="重量 (kg)" min-width="140">
            <template #default="{ row }">
              <el-input-number
                v-model="row.weight"
                :min="0"
                :max="500"
                :step="2.5"
                :precision="1"
                controls-position="right"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="次数" min-width="120">
            <template #default="{ row }">
              <el-input-number
                v-model="row.reps"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.workout-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.header-card,
.day-type-card,
.exercise-card {
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

.day-type-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.day-type-row label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.day-type-tip {
  color: #909399;
  font-size: 13px;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 120px;
}

.exercise-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.exercise-index {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.exercise-name {
  font-size: 14px;
  color: #409eff;
}

.exercise-controls {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 16px;
  margin-bottom: 16px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-item label {
  font-size: 14px;
  color: #606266;
}

.sets-table {
  width: 100%;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .day-type-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .exercise-controls {
    grid-template-columns: 1fr;
  }
}
</style>
