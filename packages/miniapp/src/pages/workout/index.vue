<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import {
  WORKOUT_DAY_OPTIONS,
  formatDateKey,
  getExerciseById,
  getExercisesByDayType,
  inferDayTypeFromExerciseId,
  type WorkoutDayType,
} from '@record/shared'
import {
  createDefaultLog,
  createExercisesForDayType,
  loadLastWorkoutByDayType,
  loadWorkoutLog,
  resizeSets,
  saveWorkoutLog,
  type DailyWorkoutLog,
  type WorkoutExercise,
} from '@/api/workout'
import { whenAuthed } from '@/api/auth'
import { confirm, toast } from '@/api/request'

const selectedDate = ref(formatDateKey(new Date()))
const dayType = ref<WorkoutDayType | ''>('')
const dayTypeLabels = WORKOUT_DAY_OPTIONS.map((o) => o.label)
const dayTypeValues = WORKOUT_DAY_OPTIONS.map((o) => o.value)
const exercises = ref<WorkoutExercise[]>([])
const nextId = ref(1)
const loading = ref(false)
const saving = ref(false)
const savedSnapshot = ref('')
const lastWorkoutLog = ref<DailyWorkoutLog | null>(null)
const loadingLastWorkout = ref(false)

const datePickerShow = ref(false)
const datePickerValue = ref(Date.now())
const pickerShow = ref(false)
const pickerTitle = ref('')
const pickerColumns = ref<string[][]>([[]])
const pickerDefaultIndex = ref<number[]>([0])

type PickerKind = 'dayType' | 'exercise' | 'setCount'
let pickerKind: PickerKind = 'dayType'
let pickerTarget: WorkoutExercise | null = null

const setCountOptions = Array.from({ length: 20 }, (_, i) => `${i + 1} 组`)

function serializeState() {
  return JSON.stringify({ dayType: dayType.value, exercises: exercises.value, nextId: nextId.value })
}

function markSaved() {
  savedSnapshot.value = serializeState()
}

function getDayTypeIndex() {
  if (!dayType.value) return 0
  const idx = dayTypeValues.indexOf(dayType.value)
  return idx >= 0 ? idx : 0
}

function getExerciseNames() {
  if (!dayType.value) return []
  return getExercisesByDayType(dayType.value).map((e) => e.name)
}

function getExerciseIds() {
  if (!dayType.value) return []
  return getExercisesByDayType(dayType.value).map((e) => e.id)
}

function getExercisePickIndex(exerciseId: string) {
  const ids = getExerciseIds()
  const idx = ids.indexOf(exerciseId)
  return idx >= 0 ? idx : 0
}

async function fetchLastWorkoutForDayType() {
  if (!dayType.value) {
    lastWorkoutLog.value = null
    return
  }
  loadingLastWorkout.value = true
  try {
    lastWorkoutLog.value = await loadLastWorkoutByDayType(dayType.value, selectedDate.value)
  } catch {
    lastWorkoutLog.value = null
  } finally {
    loadingLastWorkout.value = false
  }
}

function cloneExercisesFromLog(log: DailyWorkoutLog) {
  let id = 1
  const cloned = log.exercises.map((exercise) => ({
    id: id++,
    exerciseId: exercise.exerciseId,
    sets: exercise.sets.map((set) => ({ ...set })),
  }))
  return { exercises: cloned, nextId: id }
}

async function handleImportLast() {
  if (!lastWorkoutLog.value) return
  const ok = await confirm(`导入 ${lastWorkoutLog.value.date} 的训练数据？当前数据将被覆盖。`)
  if (!ok) return
  const cloned = cloneExercisesFromLog(lastWorkoutLog.value)
  exercises.value = cloned.exercises
  nextId.value = cloned.nextId
  toast('已导入上次训练数据', 'success')
}

function openDatePicker() {
  datePickerValue.value = dayjs(selectedDate.value).valueOf()
  datePickerShow.value = true
}

async function onDateConfirm(e: { value: number }) {
  datePickerShow.value = false
  const date = dayjs(e.value).format('YYYY-MM-DD')
  if (serializeState() !== savedSnapshot.value && savedSnapshot.value) {
    const ok = await confirm('有未保存修改，切换日期将丢弃，是否继续？')
    if (!ok) return
  }
  selectedDate.value = date
  await loadWorkoutForDate(date)
}

function openDayTypePicker() {
  pickerKind = 'dayType'
  pickerTarget = null
  pickerTitle.value = '选择训练日'
  pickerColumns.value = [dayTypeLabels]
  pickerDefaultIndex.value = [getDayTypeIndex()]
  pickerShow.value = true
}

function openExercisePicker(exercise: WorkoutExercise) {
  pickerKind = 'exercise'
  pickerTarget = exercise
  pickerTitle.value = '选择动作'
  pickerColumns.value = [getExerciseNames()]
  pickerDefaultIndex.value = [getExercisePickIndex(exercise.exerciseId)]
  pickerShow.value = true
}

function openSetCountPicker(exercise: WorkoutExercise) {
  pickerKind = 'setCount'
  pickerTarget = exercise
  pickerTitle.value = '选择组数'
  pickerColumns.value = [setCountOptions]
  pickerDefaultIndex.value = [exercise.sets.length - 1]
  pickerShow.value = true
}

async function onPickerConfirm(e: { indexs: number[] }) {
  pickerShow.value = false
  const index = e.indexs[0] ?? 0

  if (pickerKind === 'dayType') {
    const next = dayTypeValues[index] as WorkoutDayType
    if (
      dayType.value &&
      next !== dayType.value &&
      serializeState() !== savedSnapshot.value &&
      savedSnapshot.value
    ) {
      const ok = await confirm('切换训练日将重置动作，未保存修改将丢失，是否继续？')
      if (!ok) return
    }
    dayType.value = next
    exercises.value = createExercisesForDayType(next)
    nextId.value = exercises.value.length + 1
    return
  }

  if (!pickerTarget) return

  if (pickerKind === 'exercise') {
    const ids = getExerciseIds()
    pickerTarget.exerciseId = ids[index] ?? pickerTarget.exerciseId
    return
  }

  if (pickerKind === 'setCount') {
    pickerTarget.sets = resizeSets(pickerTarget.sets, index + 1)
  }
}

async function loadWorkoutForDate(date: string) {
  loading.value = true
  try {
    const log = await loadWorkoutLog(date)
    if (log?.exercises.length) {
      dayType.value = log.dayType || inferDayTypeFromExerciseId(log.exercises[0]?.exerciseId ?? '')
      exercises.value = log.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }))
      nextId.value = log.nextId
      markSaved()
    } else {
      const defaults = createDefaultLog(date)
      dayType.value = defaults.dayType
      exercises.value = defaults.exercises
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
  if (!dayType.value) return toast('请选择训练日')
  for (const exercise of exercises.value) {
    const info = getExerciseById(exercise.exerciseId)
    if (!info) return toast('存在无效动作')
    for (const set of exercise.sets) {
      if (!set.weight || !set.reps) return toast(`${info.name} 请填写完整组数据`)
    }
  }
  saving.value = true
  try {
    await saveWorkoutLog({
      date: selectedDate.value,
      dayType: dayType.value,
      exercises: exercises.value,
      nextId: nextId.value,
    })
    markSaved()
    toast('保存成功', 'success')
  } catch {
    toast('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await whenAuthed()
  await loadWorkoutForDate(selectedDate.value)
})

watch([dayType, selectedDate], fetchLastWorkoutForDayType)
</script>

<template>
  <view class="page">
    <view class="card toolbar-card">
      <u-cell-group :border="false">
        <u-cell
          title="训练日期"
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
        <u-icon name="grid" color="#3c9cff" size="18" />
        <text class="section-title">训练日类型</text>
      </view>
      <u-cell-group :border="false">
        <u-cell
          title="训练日"
          :value="dayType ? WORKOUT_DAY_OPTIONS.find((o) => o.value === dayType)?.label : '请选择'"
          is-link
          @click="openDayTypePicker"
        />
        <u-cell
          v-if="dayType && lastWorkoutLog"
          title="导入上次训练"
          :value="lastWorkoutLog.date"
          is-link
          @click="handleImportLast"
        />
        <u-cell
          v-else-if="dayType && loadingLastWorkout"
          title="导入上次训练"
          value="查询中..."
        />
      </u-cell-group>
    </view>

    <view v-if="loading" class="card loading-card">
      <u-loading-icon text="加载中" />
    </view>

    <u-empty v-else-if="!dayType" mode="list" text="请先选择训练日" />

    <view v-for="(exercise, index) in exercises" :key="exercise.id" class="card exercise-card">
      <view class="exercise-head">
        <view class="exercise-badge">{{ index + 1 }}</view>
        <u-cell-group :border="false" class="exercise-select-cell">
          <u-cell
            :title="getExerciseById(exercise.exerciseId)?.name"
            is-link
            @click="openExercisePicker(exercise)"
          />
        </u-cell-group>
      </view>

      <view class="exercise-body">
        <u-cell-group :border="false" class="set-count-cell">
          <u-cell
            title="组数"
            :value="`${exercise.sets.length} 组`"
            is-link
            @click="openSetCountPicker(exercise)"
          />
        </u-cell-group>

        <view class="set-list">
          <view v-for="set in exercise.sets" :key="set.setNumber" class="set-row">
            <view class="set-label">第 {{ set.setNumber }} 组</view>
            <u-input
              :model-value="String(set.weight || '')"
              type="digit"
              placeholder="重量"
              border="surround"
              class="set-input"
              @update:model-value="(v: string) => { set.weight = Number(v) || 0 }"
            >
              <template #suffix>
                <text class="input-suffix">kg</text>
              </template>
            </u-input>
            <u-input
              :model-value="String(set.reps || '')"
              type="number"
              placeholder="次数"
              border="surround"
              class="set-input"
              @update:model-value="(v: string) => { set.reps = Number(v) || 0 }"
            >
              <template #suffix>
                <text class="input-suffix">次</text>
              </template>
            </u-input>
          </view>
        </view>
      </view>
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
      :title="pickerTitle"
      :columns="pickerColumns"
      :default-index="pickerDefaultIndex"
      close-on-click-overlay
      @confirm="onPickerConfirm"
      @cancel="pickerShow = false"
      @close="pickerShow = false"
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
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
}

.loading-card {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}

.exercise-card {
  padding: 0;
  overflow: hidden;
}

.exercise-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.exercise-badge {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  background: linear-gradient(135deg, #3c9cff, #5cadff);
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exercise-select-cell {
  flex: 1;
  background: #f8f9fb;
  border-radius: 12rpx;
  overflow: hidden;
}

.exercise-body {
  padding: 16rpx 24rpx 24rpx;
}

.set-count-cell {
  background: #f8f9fb;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.set-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.set-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 16rpx;
  background: #f8f9fb;
  border-radius: 12rpx;
}

.set-label {
  width: 96rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #606266;
}

.set-input {
  flex: 1;
}

.input-suffix {
  color: #909399;
  font-size: 24rpx;
  padding-right: 8rpx;
}
</style>
