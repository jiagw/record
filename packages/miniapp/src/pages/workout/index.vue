<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
  loadWorkoutLog,
  resizeSets,
  saveWorkoutLog,
  type WorkoutExercise,
} from '@/api/workout'
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

function serializeState() {
  return JSON.stringify({ dayType: dayType.value, exercises: exercises.value, nextId: nextId.value })
}

function markSaved() {
  savedSnapshot.value = serializeState()
}

function getDayTypeIndex() {
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

async function onDateChange(e: { detail: { value: string } }) {
  const date = e.detail.value
  if (serializeState() !== savedSnapshot.value && savedSnapshot.value) {
    const ok = await confirm('有未保存修改，切换日期将丢弃，是否继续？')
    if (!ok) return
  }
  selectedDate.value = date
  await loadWorkoutForDate(date)
}

async function onDayTypePick(e: { detail: { value: number } }) {
  const next = dayTypeValues[e.detail.value] as WorkoutDayType
  if (dayType.value && next !== dayType.value && serializeState() !== savedSnapshot.value && savedSnapshot.value) {
    const ok = await confirm('切换训练日将重置动作，未保存修改将丢失，是否继续？')
    if (!ok) return
  }
  dayType.value = next
  exercises.value = createExercisesForDayType(next)
  nextId.value = exercises.value.length + 1
}

function onExercisePick(exercise: WorkoutExercise, e: { detail: { value: number } }) {
  const ids = getExerciseIds()
  exercise.exerciseId = ids[e.detail.value] ?? exercise.exerciseId
}

function onSetCountChange(exercise: WorkoutExercise, e: { detail: { value: number } }) {
  exercise.sets = resizeSets(exercise.sets, e.detail.value + 1)
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

onMounted(() => {
  void loadWorkoutForDate(selectedDate.value)
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
      <view class="label">训练日</view>
      <picker mode="selector" :range="dayTypeLabels" :value="getDayTypeIndex()" @change="onDayTypePick">
        <view class="picker-row">{{ dayType ? WORKOUT_DAY_OPTIONS.find((o) => o.value === dayType)?.label : '选择推/拉/腿日' }}</view>
      </picker>
    </view>

    <view v-if="!dayType" class="card empty">请先选择训练日</view>

    <view v-for="(exercise, index) in exercises" :key="exercise.id" class="card exercise-card">
      <view class="exercise-title">动作 {{ index + 1 }} · {{ getExerciseById(exercise.exerciseId)?.name }}</view>
      <picker
        mode="selector"
        :range="getExerciseNames()"
        :value="getExercisePickIndex(exercise.exerciseId)"
        @change="onExercisePick(exercise, $event)"
      >
        <view class="picker-row">更换动作</view>
      </picker>
      <picker
        mode="selector"
        :range="Array.from({ length: 20 }, (_, i) => `${i + 1} 组`)"
        :value="exercise.sets.length - 1"
        @change="onSetCountChange(exercise, $event)"
      >
        <view class="picker-row">组数：{{ exercise.sets.length }} 组</view>
      </picker>
      <view v-for="set in exercise.sets" :key="set.setNumber" class="set-row">
        <text>第{{ set.setNumber }}组</text>
        <input v-model.number="set.weight" type="digit" class="num-input" placeholder="kg" />
        <input v-model.number="set.reps" type="number" class="num-input" placeholder="次" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.picker-row { color: #409eff; padding: 6px 0; }
.label { color: #606266; margin-bottom: 6px; }
.empty { color: #909399; text-align: center; }
.exercise-card { display: flex; flex-direction: column; gap: 8px; }
.exercise-title { font-weight: 600; }
.set-row { display: flex; align-items: center; gap: 8px; }
.num-input {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 4px 8px;
  width: 80px;
}
</style>
