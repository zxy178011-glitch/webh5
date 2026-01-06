<template>
    <van-popup :show="visible" class="success-popup1" round>
        <div class="popup-content">
            <div class="popup-img1">
                <van-image class="check-img1" src="/img/yuyue/Claimtopimg.png" />
            </div>
            <div class="popup-title">恭喜您获得奖励</div>
            <div class="popup-desc1" v-if="rewardType == '1'">
                <div> {{ displayAmount }} <span class="popup-sp">火花</span></div>

            </div>
            <div v-else class="popup-desc">
                {{ displayAmount }}
            </div>
            <van-button type="danger" class="popup-button" round block @click="handleClose">
                开心收下
            </van-button>
        </div>
        <button class="outside-close1" type="button" aria-label="Close" @click="handleClose"></button>
    </van-popup>
</template>

<script setup lang="ts">

const props = defineProps<{
    visible: boolean
    displayAmount: number | string
    rewardType?: string //1是火花奖励提示 2是抽奖机会提示
}>()

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'close'): void
}>()

function handleClose() {
    emit('update:visible', false)
    emit('close')
}
</script>

<style scoped>
/* —— 领取成功弹框样式 —— */
.success-popup1 {
    width: 270px !important;
    height: 292px !important;
    background: linear-gradient(189.51deg, #abeDe9 -16.96%, rgba(255, 255, 255) 31.91%);
    border-radius: 16px !important;
    overflow: visible !important;
}

.popup-content {
    padding: 32px 24px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.popup-img1 {
    margin-top: -105px;
    background-image: url('/img/yuyue/氛围背景.png');
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center 85%;
}

.check-img1 {
    width: 270px;
    height: 156px;
}

/* 文案 */
.popup-title {
    font-size: 18px;
    font-weight: 600;
    color: #2c2c2c;
    margin: 0;
    line-height: 1.3;
}

.popup-desc1 {
    font-size: 48px;
    font-weight: 600;
    color: #fa6725;
    margin: 0;
}

.popup-desc {
    font-size: 26px;
    font-weight: 600;
    color: #fa6725;
    margin: 0;
}

.popup-sp {
    font-size: 18px;
    font-weight: 500;
    color: #fa6725;
}

/* 主按钮 */
.popup-button {
    width: 208px;
    height: 42px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 8px;
    background: #fa6725 !important;
    border: none !important;
}

/* 关闭按钮 */
.outside-close1 {
    z-index: 10001;
    background-image: url('/img/public/取消按钮.svg') !important;
    background-color: #00000040 !important;
    background-size: 100% 100% !important;
    background-position: top center !important;
    background-repeat: no-repeat !important;
    position: absolute;
    left: 50%;
    top: calc(100% + clamp(8px, 2.5vh, 16px));
    transform: translateX(-50%);
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #00000040;
    color: #fff;
    font-size: 18px;
    font-weight: 900;
    line-height: 32px;
    text-align: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    transition: background 0.2s, transform 0.2s;
    margin: 0;
}

.outside-close:active {
    transform: translateX(-50%) scale(0.92);
}
</style>
