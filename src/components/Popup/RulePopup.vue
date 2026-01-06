<!-- RulePopup.vue -->
<template>
    <van-popup :show="showPopup" round class="rule-popup" :close-on-click-overlay="true" teleport="body"
        :popup-style="{ border: 'none' }" :style="{ '--van-border-width': '0' }">
        <div class="rule-popup-content">
            <div class="rule-title">{{ title }}</div>
            <div class="rule-content">
                <!-- 改用 div 替代 ol，支持自定义结构 -->
                <div class="rule-list">
                    <div v-for="(item, index) in rules" :key="item.ruleOrder || index"
                        :class="['rule-item', `level-${item.ruleLevel}`, item.ruleType]">
                        <div class="rule-text" v-html="item.ruleContent"></div>
                    </div>
                </div>
            </div>
            <div class="rule-actions">
                <button type="button" class="btn primary" @click="handleConfirm">{{ confirmText }}</button>
            </div>
        </div>
    </van-popup>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// 规则项接口
interface RuleItem {
    ruleOrder: number
    ruleContent: string
    ruleLevel: number      // 层级：1, 2, 3...
    ruleType: string       // 类型：title, content
    parentId?: number  
}

interface Props {
    modelValue?: boolean
    title?: string
    rules?: RuleItem[]  // 改为对象数组
    confirmText?: string
}

interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    title: '活动规则',
    confirmText: '我知道了',
    rules: () => []
})

const emit = defineEmits<Emits>()

const showPopup = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
})

const handleConfirm = () => {
    emit('confirm')
    showPopup.value = false
}
</script>

<style scoped lang="scss">
.rule-popup {
    width: 320px;
    padding: 16px 16px 14px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);

    &:deep(.van-hairline--bottom::after) {
        display: none;
    }
}

.rule-title {
    margin-bottom: 10px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: rgba(133, 61, 33, 1);
}

.rule-content {
    max-height: 50vh;
    overflow: auto;
    padding: 6px 2px 10px;

    .rule-list {
        font-size: 13px;
        line-height: 20px;
        color: #8b6a4b;
    }

    .rule-item {
        margin: 6px 0;

        // 根据层级添加缩进
        &.level-1 {
            padding-left: 0;

            &.title {
                margin-top: 12px;
                margin-bottom: 8px;
                font-weight: 600;
                font-size: 14px;
                color: #5a3a2a;
            }
        }

        &.level-2 {
            padding-left: 16px;
        }

        &.level-3 {
            padding-left: 32px;
        }

        &.level-4 {
            padding-left: 48px;
        }

        // 标题样式
        &.title {
            font-weight: 600;
            color: #5a3a2a;
        }

        // 内容样式
        &.content {
            // 默认样式
        }

        .rule-text {

            // 支持富文本
            :deep(b),
            :deep(strong) {
                font-weight: 700;
                color: #5a3a2a;
            }

            :deep(em),
            :deep(i) {
                font-style: italic;
            }

            :deep(u) {
                text-decoration: underline;
            }
        }
    }
}

.rule-actions {
    display: flex;
    justify-content: center;
    margin-top: 6px;

    .btn.primary {
        min-width: 120px;
        height: 36px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        line-height: 36px;
        font-size: 14px;
        background: #fa6725;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;

        &:active {
            transform: scale(0.98);
            opacity: 0.9;
        }
    }
}
</style>