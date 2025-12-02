<template>
    <router-view v-slot="{ Component }">
        <keep-alive :include="cachePages">
            <component :is="Component" />
        </keep-alive>
    </router-view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 需要缓存的页面（可选）
const cachePages = ref([
    // 'SigninPage',  // 如果需要缓存签到页面
    // 'LotteryPage'  // 如果需要缓存抽奖页面
])
</script>

<style lang="scss">
// 全局样式
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html,
body {
    width: 100%;
    height: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

#app {
    width: 100%;
    min-height: 100vh;
}

// 全局滚动条样式
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;

    &:hover {
        background: #999;
    }
}
</style>