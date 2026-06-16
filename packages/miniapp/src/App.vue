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

<style>
page {
  background: #f0f2f5;
  color: #303133;
  font-size: 14px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.btn-primary {
  background: #409eff;
  color: #fff;
}
.btn-success {
  background: #67c23a;
  color: #fff;
}
.btn-default {
  background: #fff;
  color: #606266;
  border: 1px solid #dcdfe6;
}
button {
  font-size: 14px;
}
</style>
