<template>
    <div class="page">
        <!-- 顶部返回按钮 -->
        <!-- <button class="back-btn" aria-label="返回" @click="goBack">
            <van-icon name="arrow-left" class="back-icon" />
        </button> -->
        <!-- 顶部导航栏 -->
        <van-nav-bar left-arrow @click-left="goBack" safe-area-inset-top class="nav-bar">
           
        </van-nav-bar>
        <!-- 贴底内容 -->
        <div class="bottom">
            <div class="reward">
                <div class="reward-header">
                    <div class="icon-img"> </div>
                    <div class="reward-label">本轮奖励</div>
                </div>
                <div class="amt">
                    <span class="num">{{ displayAmount }}</span>
                    <span class="unit">火花</span>
                </div>
            </div>

            <div class="bu">
                <!-- 一键预约（RESERVE） -->
                <div v-if="state === 'RESERVE'" type="danger" class="cta" round block :loading="loading"
                    @click="onReserve">
                    <div class="reserve-img"></div>
                </div>

                <!-- 明日领取（TOMORROW） -->
                <div v-if="state === 'TOMORROW'" class="cta cta-disabled" type="default" round block disabled>
                    <div class="tomorrow-img"></div>
                </div>

                <!-- 立即领取（CLAIM） -->
                <div v-if="state === 'CLAIM'" type="danger" class="cta" round block :loading="loading" @click="onClaim">
                    <div class="claim-img"></div>
                </div>
            </div>
            <div class="tip">{{ tipText }}</div>
        </div>

        <!-- 预约成功弹框 -->
        <van-popup v-model:show="showReserveSuccess" class="success-popup" round>
            <div class="popup-content">
                <div class="popup-img">

                </div>
                <div class="popup-title">恭喜预约成功</div>
                <div class="popup-desc">记得明日来领奖励，过期将失效</div>
                <van-button type="danger" class="popup-button" round block :loading="popupReminderLoading"
                    @click="onSetReminder">
                    提醒我来领火花
                </van-button>

            </div>
            <button class="outside-close" type="button" aria-label="Close" @click="closeReservePopup"></button>
        </van-popup>

        <!-- 领取成功弹框 -->
        <van-popup v-model:show="showClaimSuccess" class="success-popup1" round>
            <div class="popup-content">
                <div class="popup-img1">
                    <div class="check-img1"></div>
                </div>
                <div class="popup-title">恭喜您获得奖励</div>
                <div class="popup-desc1">
                    {{ displayAmount }} <span class="popup-sp">火花</span>
                </div>
                <van-button type="danger" class="popup-button" round block @click="closeClaimPopup">
                    开心收下
                </van-button>
            </div>
            <button class="outside-close" type="button" aria-label="Close" @click="closeClaimPopup"></button>
        </van-popup>
    </div>
</template>

<script setup lang="ts">
/**
 * 预约领取页（Finite State Machine）
 * 依据：isReserved(昨已约) / reservedToday(今已约) / isClaimed(今已领)
 * 统一使用 flags 为单一数据源（Single Source of Truth），所有事件后都通过 deriveState 重算 UI。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { IsReservedAsync, CreateActivityReservationAsync, ClaimRewardAsync, CreateReservationReminderAsync, GetEntityAsync } from '../../api/reservation/api.js'
import { addOnClick } from '@/utils/YMDataH5Bridge.js'
/** 状态集 */
type State = 'RESERVE' | 'TOMORROW' | 'CLAIM'
/** 事件集 */
type EventType = 'FETCH_OK' | 'RESERVE_OK' | 'CLAIM_OK'
/** 后端标志 */
interface ServerFlags {
    isReserved: boolean      // 昨天是否已预约(→ 今天可领)
    reservedToday: boolean   // 今天是否已预约(→ 明日再领)
    isClaimed: boolean       // 今天是否已领取
}
//关闭页面通知移动端的数据
const dataObj = { states: 0, page: 'yuyue', key: '', value: '', type: '' }
const loading = ref(false)
const showReserveSuccess = ref(false)
const showClaimSuccess = ref(false)
const popupReminderLoading = ref(false) //弹框内“提醒”按钮 loading

/** 奖励展示 */
const reward = ref(0);


const displayAmount = computed(() =>
    // Number.isFinite(reward.value) ? reward.value.toLocaleString('zh-CN') : '0'
    reward.value
)

/** 当前按钮状态 & 提示文案 */
const state = ref<State>('RESERVE')
const tipText = ref('预约明日奖励，错过再等一天')

/** 领取成功弹框里的“预约明天”按钮 loading */
const popupReserveLoading = ref(false)

/** —— 单一真相：后端标志 —— */
const flags = reactive<ServerFlags>({
    isReserved: false,
    reservedToday: false,
    isClaimed: false
})

/** 根据 flags 推导按钮状态 */
function deriveState(f: ServerFlags): State {
    const { isReserved, reservedToday, isClaimed } = f
    // 昨天已预约 & 今天未领 → 立即领取
    if (isReserved === true && isClaimed === false) return 'CLAIM'
    // 今天已预约 → 明日领取
    if (reservedToday === true) return 'TOMORROW'
    // 今天已领取 → 一键预约（为明天再约）
    if (isClaimed === true) return 'RESERVE'
    // 默认 → 一键预约
    return 'RESERVE'
}

/** 根据状态 & 来源设置文案 */
function syncTipByState(
    s: State,
    from?: 'FETCH' | 'RESERVE' | 'CLAIM',
    f?: ServerFlags
) {
    switch (s) {
        case 'RESERVE':
            // 领取后回到一键预约
            if (from === 'CLAIM') {
                tipText.value = '今日已领取，预约明日奖励'
            } else {
                tipText.value = f?.isClaimed ? '今日已领取，预约明日奖励' : '预约明日奖励，错过再等一天'
            }
            break
        case 'TOMORROW':
            tipText.value = from === 'CLAIM' ? '今日已领取，明日再来' : '已预约，明日即可领取'
            break
        case 'CLAIM':
            tipText.value = '今日可领取，别错过'
            break
    }
}

/** 统一重算（事件后调用） */
function recompute(from?: 'FETCH' | 'RESERVE' | 'CLAIM') {
    state.value = deriveState(flags)
    syncTipByState(state.value, from, flags)
}

/** 事件分发：只更新 flags，再统一重算 */
function dispatch(event: EventType, payload?: any) {
    switch (event) {
        case 'FETCH_OK': {
            const f: ServerFlags = payload?.flags || { isReserved: false, reservedToday: false, isClaimed: false }
            flags.isReserved = !!f.isReserved
            flags.reservedToday = !!f.reservedToday
            flags.isClaimed = !!f.isClaimed
            const n = payload?.rewardSpark
            if (typeof n === 'number' && Number.isFinite(n)) reward.value = n
            recompute('FETCH')
            break
        }
        case 'RESERVE_OK': {
            // 预约成功 → 今天已预约
            flags.reservedToday = true
            recompute('RESERVE')
            break
        }
        case 'CLAIM_OK': {
            // 领取成功 → 今天已领取；昨晚的“可领资格”已用完
            flags.isClaimed = true
            flags.isReserved = false
            // 若后端在领取时已自动预约明天，可解开下一行：
            // flags.reservedToday = true
            recompute('CLAIM')
            break
        }
    }
}

/** —— API —— */
// 拉取状态
async function fetchStatus() {
    if (loading.value) return
    loading.value = true
    try {
        const res = await IsReservedAsync({ reservationType: 1, targetTitle: '预约领取火花活动' })
        const f: ServerFlags = {
            isReserved: !!res?.isReserved,
            reservedToday: !!res?.reservedToday,
            isClaimed: !!res?.isClaimed,
        }
        dispatch('FETCH_OK', { flags: f, rewardSpark: res?.rewardSpark })
    } finally {
        loading.value = false
    }
}

// 预约提醒
async function onSetReminder() {
    if (popupReminderLoading.value) return
    popupReminderLoading.value = true
    try {
        await CreateReservationReminderAsync({
            BizType: '1001',//预约福利提醒
            RefId: '1',//
            Title: '预约领取的火花金币到发放时间啦',//
            ContentShort: '1',//
            ContentFull: '1',//
            DeepLink: '1',//
            DataJson: '1',//
            Priority: 0,//
            ChannelMask: 0,//
            AppID: '1',//
            ExpiresAt: ''
        }).then((res) => {
            //成功关闭弹框
            showReserveSuccess.value = false
            GetEntityAsync().then((res) => {
                try {
                    dataObj.page = '';
                    dataObj.type = '';
                    dataObj.key = 'calendarEvent';
                    dataObj.value = 'start=' + res.start +
                        '&end=' + res.end +
                        '&title=' + res.title +
                        '&description=' + res.contentShort;
                    (window as any).H5Bridge?.closePage?.(dataObj)
                } catch { }
            })
        })
    } finally {
        popupReminderLoading.value = false
    }
}
// 一键预约
async function onReserve() {
    if (loading.value || state.value !== 'RESERVE') return
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 10004, pageName: '点击一键预约时' });
    loading.value = true
    try {
        await CreateActivityReservationAsync({
            reservationType: 1,
            targetID: 'string',
            targetTitle: '预约领取火花活动'
        })
        showReserveSuccess.value = true
        dispatch('RESERVE_OK')
    } finally {
        loading.value = false
    }
}

// 立即领取
async function onClaim() {
    if (loading.value || state.value !== 'CLAIM') return
    loading.value = true
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 10004, pageName: '点击一键领取时' });
    try {
        await ClaimRewardAsync()
        showClaimSuccess.value = true
        dispatch('CLAIM_OK') // 由 recompute 决定回到“一键预约”或（若自动预约）“明日再领”
    } finally {
        loading.value = false
    }
}

// 领取成功弹框里的「预约明天」
async function reserveTomorrowFromPopup() {
    if (popupReserveLoading.value) return
    popupReserveLoading.value = true
    try {
        await CreateActivityReservationAsync({
            reservationType: 1,
            targetID: 'string',
            targetTitle: '预约领取火花活动'
        })
        dispatch('RESERVE_OK')
        showClaimSuccess.value = false
    } finally {
        popupReserveLoading.value = false
    }
}

/** —— 其余交互 —— */
// 关闭预约成功弹框
function closeReservePopup() {
    showReserveSuccess.value = false
    // TODO: 可在此通过原生桥设置明日提醒
}

// 关闭领取成功弹框
function closeClaimPopup() {
    showClaimSuccess.value = false
}

// 预约页：统一“返回”
function goBack() {
    // 1) 通知宿主（统一协议）：请关闭当前容器
    let str = '';
    if (state.value == 'RESERVE') {
        dataObj.states = 0;
        dataObj.value = '0';//去预约
    }
    if (state.value == 'TOMORROW') {
        dataObj.states = 1;
        dataObj.value = '1'//明日领取
    }
    if (state.value == 'CLAIM') {
        dataObj.states = 1;
        dataObj.value = '2'//去领取
    }
    try {
        (window as any).H5Bridge?.closePage?.(dataObj)
    } catch { }

    // // 2) 本地兜底：有历史就后退；否则跳首页
    // if (window.history.length > 1) {
    //     window.history.back()
    //     return
    // }
    // location.replace('/') // 或者你项目里想去的默认页
}


onMounted(fetchStatus)

// 暴露给原生/外部调用
defineExpose({
    fetchStatus,
    setButtonStatus: (s: State) => { state.value = s; syncTipByState(s) },
    reserveTomorrowFromPopup, // 若外部要直连预约
})
</script>


<style scoped lang="scss">
/* 顶部返回按钮（Back） */
.back-btn {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    left: 10px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    background: rgb(255 255 255 / 0%);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0%);
    padding: 0;
    -webkit-tap-highlight-color: transparent;
}

.back-btn:active {
    transform: scale(0.96);
}

.back-icon {
    font-size: 22px;
    color: #2c2c2c;
}

/* 页面布局（Page） */
/* 页面布局（Page） - 修复版本 */
.page {
    /* 尺寸确保完全覆盖 */
    min-height: 100vh;
    min-height: 100svh;
    /* 新标准，支持动态视窗 */
    width: 100%;
    min-width: 100vw;
    /* 关键：确保最小宽度覆盖整个视窗 */

    background-color: #e6f3ff;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;

    /* 防止滚动和溢出问题 */
    overflow-x: hidden;
    box-sizing: border-box;
    margin: 0;
    padding: 0;

    /* 背景设置 - 核心修复 */
    background-image: url('/img/yuyue/back.png');
    background-repeat: no-repeat;
    background-size: cover;
    /* 保持cover确保完全覆盖 */
    background-position: center center;
    /* 居中定位更稳定 */
    background-attachment: scroll;
    /* 移除fixed，避免移动端兼容问题 */
}

/* 使用伪元素作为背景保险方案 */
.page::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100svh;

    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    z-index: -1;
}

/* 媒体查询 - 简化版本，统一使用cover */
@media (min-width: 390px) {
    .page {
        background-size: cover;
        background-position: center center;
    }
}

@media (min-width: 375px) and (max-width: 389px) {
    .page {
        background-size: cover;
        background-position: center center;
    }
}

@media (max-width: 374px) {
    .page {
        background-size: cover;
        background-position: center center;
        min-width: 100vw;
    }

    @media (max-height: 600px) {
        .page {
            background-size: cover;
            background-position: center center;
        }
    }
}

@media (max-width: 320px) {
    .page {
        background-size: cover;
        background-position: center center;
        min-width: 100vw;
    }
}

@media (max-width: 568px) and (orientation: landscape) {
    .page {
        background-size: cover;
        background-position: center center;
    }
}

.nav-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    background: transparent;
    padding-top: 45px;
    padding-bottom: 5px;

  
     :deep(.van-nav-bar__arrow) {
        color: #1E1E1E;
        font-size: 22px;
        font-weight: bold;
    }

    &::after {
        display: none !important;
    }

}

/* 底部容器（Bottom） */
.bottom {
    padding: 16px 20px calc(60px + env(safe-area-inset-bottom));
    width: calc(100vw - 40px);
    max-width: 480px;
    margin: 0 auto 8px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    box-sizing: border-box;
}

@media (max-width: 374px) {
    .bottom {
        width: calc(100vw - 24px);
        padding: 12px 12px calc(50px + env(safe-area-inset-bottom));
        gap: 16px;
    }
}

@media (max-width: 320px) {
    .bottom {
        width: calc(100vw - 16px);
        padding: 10px 8px calc(45px + env(safe-area-inset-bottom));
        gap: 14px;
    }
}

/* 奖励区（Reward） */
.reward {
    text-align: center;
    color: #3a2a1a;
    text-shadow: 0 1px 2px rgba(255, 255, 255, .6);
}

.reward-header {
    height: 90px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.icon-img {
    /* 背景设置  */
    background-image: url('/img/yuyue/金币.png');
    background-repeat: no-repeat;
    background-size: cover;
    /* 保持cover确保完全覆盖 */
    background-position: center center;
    /* 居中定位更稳定 */
    background-attachment: scroll;
    width: 44px;
    height: 38px;
}

.reward-label {
    width: 72px;
    height: 25px;
    top: 558px;
    left: 159px;
    opacity: 1;
    font-family: PingFang SC;
    font-weight: 500;
    font-style: Medium;
    font-size: 16px;
    leading-trim: NONE;
    line-height: 100%;
    letter-spacing: 0px;
    color: #903903;
}

.amt {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    justify-content: center;
}

.num {
    font-size: 48px;
    color: #F20021;
    font-weight: 700;
    line-height: 1;
}

.unit {
    font-size: 18px;
    color: #F20021;
    font-weight: 600;
    padding-bottom: 5px
}

@media (max-width: 320px) {
    .num {
        font-size: 32px;
    }

    .unit {
        font-size: 15px;
    }
}

/* 按钮（Buttons） */
.bu {
    display: flex;
    width: 100%;
    justify-content: center;
}

.cta {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 59px;
    width: 233px;
    border: none;
    background: url('/img/yuyue/按钮背景.png') no-repeat center center / contain !important;
    user-select: none;
}

/* 针对明日再领状态的半透明样式 */
.cta-disabled {
    opacity: 0.6;
    cursor: not-allowed;
    /* 鼠标悬停显示禁止符号（PC端调试有用） */
    pointer-events: none;
    /* 禁止点击事件，防止误触 */
    filter: saturate(0.8);
    /* 可选：稍微降低一点饱和度，显得更像“置灰” */
}

.reserve-img {
    width: 93px;
    height: 88px;
    background: url('/img/yuyue/一键预约.png') no-repeat center center / contain !important;
}

.tomorrow-img {
    width: 93px;
    height: 88px;
    background: url('/img/yuyue/明日再领.png') no-repeat center center / contain !important;
}

.claim-img {
    width: 93px;
    height: 88px;
    background: url('/img/yuyue/立即领取.png') no-repeat center center / contain !important;
}

/* 明日领取（禁用态但保留颜色） */
.tomorrow-btn {
    opacity: 1 !important;
    /* 取消默认半透明 */
    pointer-events: none;
    /* 彻底禁用点击 */
    cursor: default !important;

    background: linear-gradient(90deg, #FFD79E 0%, #FF9FDB 100%) !important;
    color: #fff !important;
    border: 2px solid transparent !important;

    background-origin: border-box;
    background-clip: padding-box, border-box;
    box-shadow: none;

    filter: saturate(0.75) brightness(0.98);
}

:deep(.van-button--disabled.tomorrow-btn) {
    opacity: 1;
    background: linear-gradient(90deg, #FF9FDB 100%, #FFD79E 5%) !important;
    color: #fff;
    border-color: transparent;
    filter: saturate(0.75) brightness(0.98);
}

:deep(.van-button--disabled.tomorrow-btn):active {
    transform: none !important;
}

/* 提示文本 */
.tip {
    text-align: center;
    color: #7f8c8d;
    font-size: clamp(11px, 3vw, 13px);
    line-height: 1.4;
}

/* —— 弹框（Popup） —— */
:deep(.van-popup) {
    overflow: visible !important;
}

/* 预约成功弹框 */
.success-popup {
    width: 280px !important;
    height: 230px !important;
    background: linear-gradient(180deg, #FBEED2 0%, #FFFFFF 100%);
    border-radius: 16px !important;
    overflow: visible !important;
}

/* 领取成功弹框 */
.success-popup1 {
    width: 270px !important;
    height: 292px !important;
    background: linear-gradient(189.51deg, #ABEDE9 -16.96%, rgba(255, 255, 255) 31.91%);
    border-radius: 16px !important;
    overflow: visible !important;
}

/* 弹框内容与图片尺寸 */
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
    background-image: url('/img/yuyue/Claimtopimg.png');
    background-repeat: no-repeat;
    background-size: cover;
}

.popup-img {
    width: 76px;
    height: 78px;
    margin-top: -61px;
    background: url('/img/yuyue/√.png') no-repeat center center / contain;
}

/* 文案 */
.popup-title {
    font-size: 18px;
    font-weight: 600;
    color: #2C2C2C;
    margin: 0;
    line-height: 1.3;
}

.popup-desc {
    font-size: 14px;
    color: #666;
    line-height: 1.4;
    margin: 0;
}

.popup-desc1 {
    font-size: 48px;
    font-weight: 600;
    color: #FA6725;
    /* line-height: 1.4; */
    margin: 0;
}

.popup-sp {
    font-size: 18px;
    font-weight: 500;
    color: #FA6725;
}

/* 弹框主按钮 */
.popup-button {
    width: 208px;
    height: 42px;
    font-size: 14px;
    font-weight: 500;
    margin-top: 8px;
    background: #FA6725 !important;
    border: none !important;
}

/* 自定义外部关闭按钮 */
/* 关闭按钮 */
.outside-close {
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
