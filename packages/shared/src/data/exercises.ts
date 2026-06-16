export type WorkoutDayType = 'push' | 'pull' | 'leg'

export interface ExerciseItem {
  id: string
  name: string
  dayType: WorkoutDayType
}

export const WORKOUT_DAY_OPTIONS: { value: WorkoutDayType; label: string }[] = [
  { value: 'push', label: '推日' },
  { value: 'pull', label: '拉日' },
  { value: 'leg', label: '腿日' },
]

export const DEFAULT_EXERCISE_IDS: Record<WorkoutDayType, string[]> = {
  push: [
    'barbell-flat-bench',
    'dumbbell-incline-bench',
    'parallel-bar-dip',
    'lying-tricep-extension',
    'y-lateral-raise',
  ],
  pull: [
    'assisted-pull-up',
    'single-arm-machine-row',
    'single-arm-machine-pulldown',
    'seated-row',
    'straight-arm-pulldown',
  ],
  leg: [
    'single-leg-rdl',
    'bulgarian-split-squat',
    'front-squat',
    'romanian-deadlift',
    'back-extension',
  ],
}

export const EXERCISES: ExerciseItem[] = [
  { id: 'barbell-flat-bench', name: '杠铃平板卧推', dayType: 'push' },
  { id: 'dumbbell-incline-bench', name: '哑铃上斜卧推', dayType: 'push' },
  { id: 'parallel-bar-dip', name: '双杠臂屈伸', dayType: 'push' },
  { id: 'lying-tricep-extension', name: '仰卧臂屈伸', dayType: 'push' },
  { id: 'y-lateral-raise', name: 'Y字侧平举', dayType: 'push' },
  { id: 'assisted-pull-up', name: '辅助引体', dayType: 'pull' },
  { id: 'single-arm-machine-row', name: '单手器械划船', dayType: 'pull' },
  { id: 'single-arm-machine-pulldown', name: '单手器械下拉', dayType: 'pull' },
  { id: 'seated-row', name: '坐姿划船', dayType: 'pull' },
  { id: 'straight-arm-pulldown', name: '直臂下压', dayType: 'pull' },
  { id: 'single-leg-rdl', name: '单腿硬拉', dayType: 'leg' },
  { id: 'bulgarian-split-squat', name: '保加利亚深蹲', dayType: 'leg' },
  { id: 'front-squat', name: '颈前深蹲', dayType: 'leg' },
  { id: 'romanian-deadlift', name: '罗马尼亚硬拉', dayType: 'leg' },
  { id: 'back-extension', name: '山羊挺身', dayType: 'leg' },
]

export function getExerciseById(id: string): ExerciseItem | undefined {
  return EXERCISES.find((item) => item.id === id)
}

export function getExercisesByDayType(dayType: WorkoutDayType): ExerciseItem[] {
  return EXERCISES.filter((item) => item.dayType === dayType)
}

export function getDayTypeLabel(dayType: WorkoutDayType): string {
  return WORKOUT_DAY_OPTIONS.find((item) => item.value === dayType)?.label ?? dayType
}

export function inferDayTypeFromExerciseId(exerciseId: string): WorkoutDayType | '' {
  return getExerciseById(exerciseId)?.dayType ?? ''
}
