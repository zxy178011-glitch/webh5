<template>
  <van-popup :show="modelValue" :z-index="2010" @update:show="$emit('update:modelValue', $event)"
    class="custom-pink-popup" round :close-on-click-overlay="true">
    <div class="popup-wrapper">
      <div class="content-top">
        <h3 class="pop-title">{{ customTitle || defaultInfo.title }}</h3>
        <div class="pop-message" v-html="customMessage || defaultInfo.message"></div>
      </div>
      <div class="content-bottom">
        <van-button class="action-btn-main" round block @click="$emit('confirm', method)">
          {{ method === 'wechat' ? '去微信绑定' : '去支付宝绑定' }}
        </van-button>
      </div>
    </div>
    <button class="outside-close-btn" @click="$emit('update:modelValue', false)"></button>
  </van-popup>
</template>

<script setup lang="ts">
/* JS 逻辑保持不变... */
import { computed } from 'vue';
interface Props {
  modelValue: boolean;
  method: 'wechat' | 'alipay' | string;
  customTitle?: string;
  customMessage?: string;
}
const props = defineProps<Props>();
defineEmits(['update:modelValue', 'confirm']);

const defaultInfo = computed(() => {
  const config = {
    wechat: { title: '绑定微信账号', message: '绑定微信账号才可以进行提现,只需绑定一次,后续均提现至该微信账号' },
    alipay: { title: '绑定支付宝账号', message: '绑定支付宝账号才可以进行提现,只需绑定一次,后续均提现至该支付宝账号' }
  };
  return config[props.method as 'wechat' | 'alipay'] || config.wechat;
});
</script>

<style lang="scss">
/* 注意：这里去掉了 scoped，因为 van-popup 会被传送到 body 下 */
/* 使用唯一的类名 .custom-pink-popup 避免样式污染全局 */
.custom-pink-popup {
  width: 270px !important;
  height: auto !important;
  /* 让高度根据内容自适应 */
  background: transparent !important;
  overflow: visible !important;
  box-shadow: none !important;

  .popup-wrapper {
    background: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .content-top {
    background: #ffffff;
    padding: 24px 20px 20px 20px;
    text-align: center;

    .pop-title {
      font-size: 18px;
      font-weight: 500;
      color: #252525;
      margin-bottom: 12px;
      font-family: PingFang SC;
    }

    .pop-message {
      font-size: 14px;
      color: #8A8A8A;
      line-height: 20px;
    }
  }

  .content-bottom {
    padding: 0 24px 24px;

    .action-btn-main {
      background: #FA6725 !important;
      border: none !important;
      color: #ffffff !important;
      height: 42px;
      font-size: 14px;
    }
  }

  .outside-close-btn {
    position: absolute;
    bottom: -60px;
    /* 调整了位置，原 -90 可能会太靠下 */
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 32px;
    background: url('/img/public/取消按钮.svg') no-repeat center;
    background-size: contain;
    border: none;
  }
}
</style>