<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { ensureLogin } from './api/auth'

onLaunch(async () => {
  try {
    await ensureLogin()
  } catch (error) {
    console.error('登录失败', error)
  }
})
</script>

<style lang="scss">
@import 'uview-plus/index.scss';

page {
  background: #f5f6f8;
  color: #303133;
  font-size: 28rpx;
}
</style>
