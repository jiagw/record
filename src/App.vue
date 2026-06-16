<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

function navigate(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="brand">健康记录</div>
      <el-menu
        mode="horizontal"
        :default-active="activeMenu"
        :ellipsis="false"
        class="app-menu"
        @select="navigate"
      >
        <el-menu-item index="/">饮食记录</el-menu-item>
        <el-menu-item index="/weight">体重记录</el-menu-item>
        <el-menu-item index="/workout">健身记录</el-menu-item>
      </el-menu>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  width: 100%;
  min-height: 100vh;
  background: #f0f2f5;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.brand {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.app-menu {
  flex: 1;
  border-bottom: none;
  background: transparent;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 12px 16px 0;
  }

  .app-menu {
    width: 100%;
  }

  .app-main {
    padding: 16px;
  }
}
</style>
