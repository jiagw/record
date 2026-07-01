<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from '@/api/request'
import {
  buildCopyText,
  calcCarbCycle,
  type BodyType,
  type CarbCycleResult,
  type ProteinFactor,
} from '@/utils/carbCycle'

type WeightUnit = 'kg' | 'jin'

const weightInput = ref('')
const weightUnit = ref<WeightUnit>('kg')
const bodyType = ref<BodyType>('endomorph')
const proteinFactor = ref<ProteinFactor>(1.0)
const showCalories = ref(true)

const debouncedWeightKg = ref<number | null>(null)
const debouncedBodyType = ref(bodyType.value)
const debouncedProteinFactor = ref(proteinFactor.value)
const debouncedShowCalories = ref(showCalories.value)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRecalc() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedBodyType.value = bodyType.value
    debouncedProteinFactor.value = proteinFactor.value
    debouncedShowCalories.value = showCalories.value
    debouncedWeightKg.value = parsedWeightKg.value
  }, 300)
}

const parsedWeightKg = computed(() => {
  const trimmed = weightInput.value.trim()
  if (trimmed === '' || trimmed === '.') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) return null
  return weightUnit.value === 'jin' ? n * 0.5 : n
})

const inputError = computed(() => {
  const trimmed = weightInput.value.trim()
  if (trimmed === '') return '请输入体重'
  if (trimmed === '.' || parsedWeightKg.value === null) return '请输入有效的体重数值'
  if (parsedWeightKg.value <= 0) return '体重必须大于 0'
  return ''
})

const result = computed<CarbCycleResult | null>(() => {
  if (debouncedWeightKg.value === null || debouncedWeightKg.value <= 0) return null
  return calcCarbCycle(debouncedWeightKg.value, debouncedBodyType.value, debouncedProteinFactor.value)
})

const dayCards = computed(() => {
  if (!result.value) return []
  const { high, medium, low } = result.value
  return [
    {
      key: 'high',
      title: '高碳日',
      subtitle: '每周 2 天',
      plan: high,
      theme: 'green',
    },
    {
      key: 'medium',
      title: '中碳日',
      subtitle: '每周 3 天',
      plan: medium,
      theme: 'yellow',
    },
    {
      key: 'low',
      title: '低碳日',
      subtitle: '每周 2 天',
      plan: low,
      theme: 'red',
    },
  ]
})

const proteinOptions: { label: string; value: ProteinFactor }[] = [
  { label: '0.8', value: 0.8 },
  { label: '1.0', value: 1.0 },
  { label: '1.2', value: 1.2 },
  { label: '1.5', value: 1.5 },
]

watch([weightInput, weightUnit, bodyType, proteinFactor, showCalories], scheduleRecalc, { immediate: true })

function onCopy() {
  if (!result.value || debouncedWeightKg.value === null) {
    return toast(inputError.value || '请先输入有效体重')
  }
  const text = buildCopyText(debouncedWeightKg.value, result.value, debouncedShowCalories.value)
  uni.setClipboardData({
    data: text,
    success: () => toast('已复制到剪贴板', 'success'),
    fail: () => toast('复制失败'),
  })
}
</script>

<template>
  <view class="page">
    <view class="card form-card">
      <view class="section-head">
        <u-icon name="edit-pen" color="#3c9cff" size="18" />
        <text class="section-title">参数设置</text>
      </view>

      <view class="form-field">
        <view class="field-label-row">
          <text class="field-label">体重</text>
          <text class="field-required">必填</text>
        </view>
        <view class="weight-row">
          <u-input
            v-model="weightInput"
            type="digit"
            placeholder="请输入体重"
            border="surround"
            clearable
            class="weight-input"
          />
          <view class="unit-toggle">
            <view
              class="unit-btn"
              :class="{ 'unit-btn--active': weightUnit === 'kg' }"
              @click="weightUnit = 'kg'"
            >
              kg
            </view>
            <view
              class="unit-btn"
              :class="{ 'unit-btn--active': weightUnit === 'jin' }"
              @click="weightUnit = 'jin'"
            >
              斤
            </view>
          </view>
        </view>
        <text v-if="inputError && weightInput.trim()" class="field-error">{{ inputError }}</text>
      </view>

      <view class="form-field">
        <text class="field-label">胚型</text>
        <view class="body-type-row">
          <view
            class="body-type-btn"
            :class="{ 'body-type-btn--active': bodyType === 'endomorph' }"
            @click="bodyType = 'endomorph'"
          >
            <text class="body-type-name">内胚型</text>
            <text class="body-type-desc">碳水×2 · 脂肪×0.8</text>
          </view>
          <view
            class="body-type-btn"
            :class="{ 'body-type-btn--active': bodyType === 'ectomorph' }"
            @click="bodyType = 'ectomorph'"
          >
            <text class="body-type-name">外胚型</text>
            <text class="body-type-desc">碳水×3 · 脂肪×1.0</text>
          </view>
        </view>
      </view>

      <view class="form-field">
        <text class="field-label">蛋白质系数 (g/kg)</text>
        <view class="protein-row">
          <view
            v-for="opt in proteinOptions"
            :key="opt.value"
            class="protein-btn"
            :class="{ 'protein-btn--active': proteinFactor === opt.value }"
            @click="proteinFactor = opt.value"
          >
            {{ opt.label }}
          </view>
        </view>
      </view>

      <view class="form-field form-field--switch">
        <text class="field-label">显示热量</text>
        <u-switch v-model="showCalories" size="22" active-color="#3c9cff" />
      </view>
    </view>

    <view v-if="inputError && !weightInput.trim()" class="card hint-card">
      <u-icon name="info-circle" color="#909399" size="16" />
      <text class="hint-text">{{ inputError }}，填写后将自动计算碳循环方案</text>
    </view>

    <template v-if="result">
      <view class="card result-header">
        <view class="result-header-main">
          <view class="result-header-icon">
            <u-icon name="grid-fill" color="#3c9cff" size="20" />
          </view>
          <view class="result-header-text">
            <text class="result-header-title">每日方案</text>
            <text class="result-header-desc">2 高碳 · 3 中碳 · 2 低碳</text>
          </view>
        </view>
        <view class="copy-btn" hover-class="copy-btn--hover" @click="onCopy">
          <u-icon name="file-text" color="#3c9cff" size="15" />
          <text class="copy-btn-text">复制方案</text>
        </view>
      </view>

      <view
        v-for="card in dayCards"
        :key="card.key"
        class="card day-card"
        :class="`day-card--${card.theme}`"
      >
        <view class="day-card-head">
          <text class="day-card-title">{{ card.title }}</text>
          <text class="day-card-subtitle">{{ card.subtitle }}</text>
        </view>
        <view class="day-metrics">
          <view class="metric-item">
            <text class="metric-label">碳水</text>
            <view class="metric-value-row">
              <text class="metric-value">{{ card.plan.carbs }}</text>
              <text class="metric-unit">g</text>
            </view>
          </view>
          <view class="metric-item">
            <text class="metric-label">脂肪</text>
            <view class="metric-value-row">
              <text class="metric-value">{{ card.plan.fat }}</text>
              <text class="metric-unit">g</text>
            </view>
          </view>
          <view class="metric-item">
            <text class="metric-label">蛋白</text>
            <view class="metric-value-row">
              <text class="metric-value">{{ card.plan.protein }}</text>
              <text class="metric-unit">g</text>
            </view>
          </view>
          <view v-if="showCalories" class="metric-item">
            <text class="metric-label">热量</text>
            <view class="metric-value-row">
              <text class="metric-value">{{ card.plan.calories }}</text>
              <text class="metric-unit">kcal</text>
            </view>
          </view>
        </view>
      </view>

      <view class="card summary-card">
        <view class="section-head">
          <u-icon name="list-dot" color="#3c9cff" size="18" />
          <text class="section-title">周汇总</text>
        </view>
        <view class="summary-grid">
          <view v-if="showCalories" class="summary-item summary-item--calories">
            <text class="summary-label">周平均热量</text>
            <view class="summary-value-row">
              <text class="summary-value">{{ result.weeklyAvgCalories }}</text>
              <text class="summary-unit">kcal</text>
            </view>
          </view>
          <view class="summary-item summary-item--carbs">
            <text class="summary-label">周碳水总量</text>
            <view class="summary-value-row">
              <text class="summary-value">{{ result.weeklyCarbsTotal }}</text>
              <text class="summary-unit">g</text>
            </view>
          </view>
          <view class="summary-item summary-item--fat">
            <text class="summary-label">周脂肪总量</text>
            <view class="summary-value-row">
              <text class="summary-value">{{ result.weeklyFatTotal }}</text>
              <text class="summary-unit">g</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <view class="card info-card">
      <view class="section-head">
        <u-icon name="bookmark" color="#3c9cff" size="18" />
        <text class="section-title">食物参考</text>
      </view>
      <text class="info-text">200g 碳水 ≈ 800g 熟米饭、≈ 400g 馒头</text>
      <text class="info-text">高碳日建议米饭 / 馒头；低碳日建议土豆 / 红薯 / 玉米</text>
    </view>

    <view class="card tips-card">
      <view class="section-head">
        <u-icon name="info-circle" color="#e6a23c" size="18" />
        <text class="section-title">温馨提示</text>
      </view>
      <view class="tip-list">
        <text class="tip-item">· 碳水按营养素克数计算，不是食物重量</text>
        <text class="tip-item">· 中碳日热量可能偏低，可用蔬菜填补</text>
        <text class="tip-item">· 蛋白不建议长期采用 1.5 g/kg</text>
      </view>
    </view>

    <view class="disclaimer">
      <text>以上内容仅供参考，不构成医疗或营养建议。如有健康问题，请咨询专业人士。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 48rpx;
  box-sizing: border-box;
  background: #f0f2f5;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.04);
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


.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
}

.result-header-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.result-header-icon {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: rgba(60, 156, 255, 0.1);
}

.result-header-text {
  flex: 1;
  min-width: 0;
}

.result-header-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #303133;
  line-height: 1.3;
}

.result-header-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #909399;
  line-height: 1.3;
}

.copy-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(60, 156, 255, 0.1);
  border: 1rpx solid rgba(60, 156, 255, 0.2);
  transition: background 0.2s;

  &--hover {
    background: rgba(60, 156, 255, 0.16);
  }
}

.copy-btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #3c9cff;
  white-space: nowrap;
}

.form-field {
  &:not(:last-child) {
    margin-bottom: 28rpx;
  }

  &--switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0 !important;

    .field-label {
      margin-bottom: 0;
    }
  }
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.field-label {
  display: block;
  font-size: 26rpx;
  color: #606266;
  margin-bottom: 12rpx;
}

.field-required {
  font-size: 22rpx;
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.field-error {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #f56c6c;
}

.weight-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.weight-input {
  flex: 1;
}

.unit-toggle {
  display: flex;
  background: #f0f2f5;
  border-radius: 12rpx;
  padding: 4rpx;
  flex-shrink: 0;
}

.unit-btn {
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  color: #909399;
  border-radius: 10rpx;
  transition: all 0.2s;

  &--active {
    background: #fff;
    color: #3c9cff;
    font-weight: 600;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }
}

.body-type-row {
  display: flex;
  gap: 16rpx;
}

.body-type-btn {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  border: 2rpx solid #e4e7ed;
  background: #f8f9fb;
  transition: all 0.2s;

  &--active {
    border-color: #3c9cff;
    background: rgba(60, 156, 255, 0.08);
  }
}

.body-type-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8rpx;
}

.body-type-desc {
  display: block;
  font-size: 22rpx;
  color: #909399;
}

.protein-row {
  display: flex;
  gap: 12rpx;
}

.protein-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #606266;
  background: #f0f2f5;
  transition: all 0.2s;

  &--active {
    background: #3c9cff;
    color: #fff;
    font-weight: 600;
  }
}

.hint-card {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 20rpx 24rpx;
}

.hint-text {
  flex: 1;
  font-size: 24rpx;
  color: #909399;
  line-height: 1.5;
}

.day-card {
  overflow: hidden;
  padding: 0;

  &--green {
    .day-card-head {
      background: linear-gradient(135deg, rgba(90, 199, 37, 0.15), rgba(90, 199, 37, 0.05));
      border-left: 6rpx solid #5ac725;
    }

    .metric-value {
      color: #5ac725;
    }
  }

  &--yellow {
    .day-card-head {
      background: linear-gradient(135deg, rgba(249, 174, 61, 0.15), rgba(249, 174, 61, 0.05));
      border-left: 6rpx solid #f9ae3d;
    }

    .metric-value {
      color: #e6a23c;
    }
  }

  &--red {
    .day-card-head {
      background: linear-gradient(135deg, rgba(245, 108, 108, 0.12), rgba(245, 108, 108, 0.04));
      border-left: 6rpx solid #f56c6c;
    }

    .metric-value {
      color: #f56c6c;
    }
  }
}

.day-card-head {
  padding: 20rpx 24rpx;
}

.day-card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #303133;
}

.day-card-subtitle {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-top: 4rpx;
}

.day-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 20rpx 24rpx 24rpx;
}

.metric-item {
  padding: 20rpx 16rpx;
  background: #f8f9fb;
  border-radius: 12rpx;
}

.metric-label {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 8rpx;
}

.metric-value-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.metric-value {
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1;
}

.metric-unit {
  font-size: 22rpx;
  color: #909399;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.summary-item {
  padding: 20rpx 16rpx;
  border-radius: 12rpx;

  &--calories {
    grid-column: 1 / -1;
    background: rgba(245, 108, 108, 0.08);

    .summary-value {
      color: #f56c6c;
    }
  }

  &--carbs {
    background: rgba(249, 174, 61, 0.1);

    .summary-value {
      color: #e6a23c;
    }
  }

  &--fat {
    background: rgba(90, 199, 37, 0.08);

    .summary-value {
      color: #5ac725;
    }
  }
}

.summary-label {
  display: block;
  font-size: 22rpx;
  color: #909399;
  margin-bottom: 8rpx;
}

.summary-value-row {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.summary-value {
  font-size: 36rpx;
  font-weight: 700;
}

.summary-unit {
  font-size: 22rpx;
  color: #909399;
}

.info-card,
.tips-card {
  .section-head {
    margin-bottom: 16rpx;
  }
}

.info-text {
  display: block;
  font-size: 26rpx;
  color: #606266;
  line-height: 1.6;

  &:not(:last-child) {
    margin-bottom: 12rpx;
  }
}

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tip-item {
  font-size: 26rpx;
  color: #606266;
  line-height: 1.5;
}

.disclaimer {
  padding: 0 16rpx 16rpx;
  text-align: center;
  font-size: 22rpx;
  color: #c0c4cc;
  line-height: 1.6;
}
</style>
