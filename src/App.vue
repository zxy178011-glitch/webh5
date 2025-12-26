<template>
    <router-view v-slot="{ Component }">
        <keep-alive v-if="$route.meta.keepAlive">
            <component :is="Component" :key="$route.fullPath" />
        </keep-alive>
        <component :is="Component" v-else :key="$route.fullPath" />
    </router-view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 需要缓存的页面（可选）
const cachePages = ref([
    // 'SigninPage',  // 如果需要缓存签到页面
    // 'LotteryPage'  // 如果需要缓存抽奖页面
])

// 防止页面被拖动露出 Flutter 背景
onMounted(() => {
    // 禁止页面整体的橡皮筋效果
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'

    // 阻止默认的触摸滚动行为（防止露出背景）
    const preventOverscroll = (e: TouchEvent) => {
        const target = e.target as HTMLElement
        // 检查是否在可滚动容器内
        const scrollableParent = target.closest('[style*="overflow"]') ||
            target.closest('.van-popup') ||
            target.closest('[class*="scroll"]')

        // 如果不在可滚动容器内，阻止默认行为
        if (!scrollableParent) {
            // 检查是否已经滚动到顶部或底部
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
            const scrollHeight = document.documentElement.scrollHeight
            const clientHeight = document.documentElement.clientHeight

            if ((scrollTop === 0 && e.touches[0].clientY > 0) ||
                (scrollTop + clientHeight >= scrollHeight && e.touches[0].clientY < 0)) {
                e.preventDefault()
            }
        }
    }

    document.addEventListener('touchmove', preventOverscroll, { passive: false })

    // 组件卸载时清理
    onUnmounted(() => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.height = ''
        document.removeEventListener('touchmove', preventOverscroll)
    })
})
</script>

<style lang="scss">
// 全局样式
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent; // 去除点击高亮
}

html,
body {
    width: 100%;
    height: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden; // 禁止整体滚动
    position: fixed; // 固定定位，防止拖动
    overscroll-behavior: none; // 禁止过度滚动（橡皮筋效果）
}

#app {
    width: 100%;
    height: 100%;
    overflow-y: auto; // 允许 app 内部滚动
    overflow-x: hidden; // 禁止横向滚动
    -webkit-overflow-scrolling: touch; // iOS 平滑滚动
    overscroll-behavior: none; // 禁止过度滚动
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