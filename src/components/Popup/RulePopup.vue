<!-- RulePopup.vue -->
<template>
    <van-popup :show="showPopup" round class="rule-popup" :close-on-click-overlay="true" teleport="body"
        :popup-style="{ border: 'none' }" :style="{ '--van-border-width': '0' }">
        <div class="rule-popup-content">
            <div class="rule-title">{{ title }}</div>
            <div class="rule-content">
                <ol>
                    <li v-for="(item, index) in rules" :key="index" v-html="item"></li>
                </ol>
            </div>
            <div class="rule-actions">
                <button type="button" class="btn primary" @click="handleConfirm">{{ confirmText }}</button>
            </div>
        </div>
    </van-popup>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
    modelValue?: boolean
    title?: string
    rules?: string[]
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
    rules: () => [
    ]
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

    // 移除 hairline 底部边框
    &:deep(.van-hairline--bottom::after) {
        display: none;
    }
}

:deep(.rule-popup.van-hairline--bottom::after) {
    display: none;
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

    ol {
        margin: 0;
        padding-left: 10px;
    }

    li {
        margin: 6px 0;
        font-size: 13px;
        line-height: 20px;
        color: #8b6a4b;

        // 支持富文本样式
        b,
        strong {
            font-weight: 700;
            color: #5a3a2a;
        }

        em,
        i {
            font-style: italic;
        }

        u {
            text-decoration: underline;
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