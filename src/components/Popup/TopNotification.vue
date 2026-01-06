<!-- TopNotification.vue -->
<!-- 页面头部轻提示 -->
<template>
  <transition name="slide-down">
    <div v-if="visible" class="top-notification">
      <div class="notification-content">
        <img src="/img/InviteEarn/提示金币.png" alt="coin" class="coin-icon" />
        <div class="notification-text">
          <span class="text-normal">{{ normalText }}</span>
          <span class="text-highlight">{{ highlightText }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  modelValue?: boolean
  normalText?: string
  highlightText?: string
  autoHide?: boolean
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  normalText: '本次拉新2人获得奖励',
  highlightText: '50万火花',
  autoHide: true,
  duration: 3000
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = ref(props.modelValue)
let timer: number | null = null

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal && props.autoHide) {
    startAutoHide()
  }
})

// 自动隐藏
const startAutoHide = () => {
  if (timer) {
    clearTimeout(timer)
  }
  timer = window.setTimeout(() => {
    hide()
  }, props.duration)
}

// 显示
const show = () => {
  visible.value = true
  emit('update:modelValue', true)
  if (props.autoHide) {
    startAutoHide()
  }
}

// 隐藏
const hide = () => {
  visible.value = false
  emit('update:modelValue', false)
}

onMounted(() => {
  if (props.modelValue && props.autoHide) {
    startAutoHide()
  }
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
})

// 暴露方法给父组件
defineExpose({
  show,
  hide
})
</script>

<style scoped lang="scss">
.top-notification {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 2.5641vw 3.84615vw;
  pointer-events: none;
  color: #1F0B00;
  transform: translateY(115%);
}

.notification-content {
  border-radius: 50px;
  min-width: 228px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  box-shadow: 0 4px 12px rgba(255, 69, 0, 0.3);
  animation: glow 2s ease-in-out infinite;
  background: linear-gradient(269.26deg, #FFE1DE 1.66%, #FFFFFF 76.52%);
  border: 1px solid #FFF6EB
}

.coin-icon {
  width: 17.68px;
  height: 18.05px;
  // animation: rotate 3s linear infinite;
  flex-shrink: 0;
}

.notification-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: PingFang SC, sans-serif;
  white-space: nowrap;
}

.text-normal {
  color: #1F0B00;
  font-family: PingFang SC;
  font-weight: 400;
  font-style: Regular;
  font-size: 13px;
  leading-trim: NONE;
  line-height: 100%;
  letter-spacing: 0px;
  text-align: right;
}

.text-highlight {
  font-family: PingFang SC;
  font-weight: 500;
  font-style: Medium;
  font-size: 13px;
  leading-trim: NONE;
  line-height: 100%;
  letter-spacing: 0px;
  text-align: right;
  color: #F01F0A;
}

/* 动画效果 */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes glow {

  0%,
  100% {
    box-shadow: 0 4px 12px rgba(255, 69, 0, 0.3);
  }

  50% {
    box-shadow: 0 4px 20px rgba(255, 69, 0, 0.5);
  }
}

/* 过渡动画 */
.slide-down-enter-active {
  animation: slideDown 0.4s ease-out;
}

.slide-down-leave-active {
  animation: slideUp 0.4s ease-in;
}

@keyframes slideDown {
  from {
    /* 从屏幕上方更远的地方开始，确保完全隐藏 */
    transform: translateY(-100%);
    opacity: 0;
  }

  to {
    transform: translateY(115%);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    /* 从当前位置开始 */
    transform: translateY(115%);
    opacity: 1;
  }

  to {
    /* 向上抽离到屏幕外 */
    transform: translateY(-100%);
    opacity: 0;
  }
}

/* 响应式调整 */
@media (max-width: 375px) {
  .notification-content {
    width: 230px;
    height: 28px;
  }

  .coin-icon {
    width: 18px;
    height: 18px;
  }

  .text-normal {
    font-size: 11px;
  }

  .text-highlight {
    font-size: 12px;
  }
}
</style>