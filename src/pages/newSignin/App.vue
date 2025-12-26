<template>
    <div class="overlay" role="dialog" aria-modal="true" v-show="showOverlay">
        <div class="modal-wrap">
            <div class="modal" :class="{ closing: closing }">
                <div class="header">
                    <div class="title">
                        7天签到必得 <span class="highlight">5万</span> 火花
                    </div>
                    <div class="subtitle">{{ subtitleText }}</div>
                </div>

                <div class="checkin-grid" id="grid">
                    <!-- 空态 -->
                    <div v-if="days.length === 0"
                        style="grid-column:1/-1;text-align:center;color:#666;font-size:12px;padding:24px 0;">
                        暂未获取到签到数据，请稍后重试
                    </div>

                    <!-- 列表 -->
                    <template v-else>
                        <div v-for="d in days" :key="d.dayIndex" class="day-card"
                            :class="[{ today: d.isToday, completed: d.completed }, d.dayIndex === 7 ? 'special-day' : '']">
                            <!-- 第7天特殊卡片 -->
                            <template v-if="d.dayIndex === 7">
                                <div class="special-coin" aria-hidden="true"></div>
                                <div class="day-reward">
                                    {{ d.completed ? '已领取 ' : '' }}连续签到7天得{{ d.rewardSpark }}火花
                                </div>
                                <div class="day-label">
                                    {{ d.completed ? '已领取' : (d.isToday ? '今天' : '待领取') }}
                                </div>
                                <div v-if="d.completed" class="check-mark" title="已完成"></div>
                            </template>

                            <!-- 普通卡片 -->
                            <template v-else>
                                <div class="coin-icon">
                                    <!-- <div class="coin-icon1">
                                        <div class="coin-icon2"></div>
                                    </div> -->
                                </div>
                                <div class="day-reward">{{ d.rewardSpark }} 火花</div>
                                <div class="day-label">
                                    {{ d.completed ? '已领取' : (d.isToday ? '今天' : ('第' + d.dayIndex + '天')) }}
                                </div>
                                <div v-if="d.completed" class="check-mark" title="已完成"></div>
                            </template>
                        </div>
                    </template>
                </div>

                <div class="btn-group" :style="{ display: days.length === 0 ? 'none' : '' }">
                    <button class="checkin-btn main-btn" id="btnMain" type="button" :disabled="signedToday || busy"
                        @click="onSignin">
                        {{ signedToday ? '明日再来' : (busy ? '今天已签到' : '立即签到') }}
                    </button>
                </div>

                <div class="footer-text">火花奖励可在 “福利” 查看</div>
            </div>

            <!-- 外部关闭按钮 -->
            <button class="outside-close" id="outsideClose" type="button" aria-label="Close"
                @click="onOutsideClose"></button>
        </div>

        <!-- 简易奖励弹窗（复用你原生版 showRewardPopup 的风格） -->
        <div v-if="rewardToast.visible" id="rw-pop" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
                background:#2b2b2b;border-radius:14px;padding:18px 22px;z-index:10000;
                box-shadow:0 10px 30px rgba(0,0,0,.35); color:#fff; text-align:center; min-width:160px;">
            <div style="margin-bottom:10px"><img src="/img/signin/金币堆.png" alt="" style="height:44px" /></div>
            <div style="font-size:18px;font-weight:800">+{{ format(rewardToast.amount) }} 火花</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getStatus, doSignin } from '../../api/signin/signinLog'

// 允许 ?task= 覆盖 TaskID（默认 10001）
const TASK_ID = Number(new URLSearchParams(location.search).get('task') || 10001)

// ------------- 小工具（保持与你原页面一致） -------------
const format = (n: number | string) =>
    Number.isFinite(+n) ? Number(n).toLocaleString('zh-CN') : '0'

const safeGet = (obj: any, path: string, def?: any) => {
    try {
        return path.split('.').reduce((o, k) => (o == null ? undefined : (o as any)[k]), obj) ?? def
    } catch {
        return def
    }
}

type DayRow = {
    dayIndex: number
    rewardSpark: number
    completed: boolean
    isToday: boolean
    dayDate: string | null
}

const normalizeStatus = (raw: any): { days: DayRow[]; signedToday: boolean } => {
    const days = safeGet(raw, 'days') ?? safeGet(raw, 'Days') ?? []
    const signedToday = !!(safeGet(raw, 'signedToday') ?? safeGet(raw, 'SignedToday') ?? false)
    const normDays: DayRow[] = (days as any[]).map((d) => ({
        dayIndex: Number(d.dayIndex ?? d.DayIndex ?? d.index ?? d.Index ?? 0),
        rewardSpark: Number(d.rewardSpark ?? d.RewardSpark ?? d.spark ?? d.Spark ?? 0),
        completed: !!(d.completed ?? d.Completed ?? d.isDone ?? d.IsDone ?? false),
        isToday: !!(d.isToday ?? d.IsToday ?? false),
        dayDate: d.dayDate ?? d.DayDate ?? d.date ?? d.Date ?? null
    }))
    return { days: normDays, signedToday }
}

const findNewlyCompleted = (prev: { days: DayRow[] } | null, curr: { days: DayRow[] }) => {
    if (!prev?.days || !curr?.days) return [] as DayRow[]
    const pm = new Map(prev.days.map(d => [Number(d.dayIndex), !!d.completed]))
    return curr.days.filter(d => !!d.completed && pm.get(Number(d.dayIndex)) !== true)
}

const fmtMD = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    return isNaN(+d) ? '' : `${d.getMonth() + 1}-${d.getDate()}`
}

// ------------- 状态 -------------
//关闭页面通知移动端的数据
const dataObj = { states: 0, page: 'newsignin', value: '', type: '' }
const showOverlay = ref(true)
const closing = ref(false)
const days = ref<DayRow[]>([])
const signedToday = ref(false)
const busy = ref(false)
let lastStatus: { days: DayRow[]; signedToday: boolean } | null = null

const subtitleText = computed(() => {
    if (!days.value.length) return ''
    const first = days.value[0]?.dayDate
    const last = days.value[days.value.length - 1]?.dayDate
    if (!first || !last) return ''
    return `${fmtMD(first)}---${fmtMD(last)}期间登录，轻松领取入账`
})

const rewardToast = reactive({ visible: false, amount: 0 })
let rewardTimer: any = null
const showReward = (amt: number) => {
    clearTimeout(rewardTimer)
    rewardToast.amount = amt
    rewardToast.visible = true
    dataObj.states = 1
    rewardTimer = setTimeout(() => (rewardToast.visible = false), 1600)
}

// ------------- API -------------
const apiGetStatus = async () => await getStatus(TASK_ID)
const apiDoSignin = async () => await doSignin('normal', TASK_ID)

// ------------- 渲染与交互 -------------
const applyStatus = (respRaw: any) => {
    const resp = normalizeStatus(respRaw)
    lastStatus = resp
    days.value = Array.isArray(resp.days) ? resp.days : []
    signedToday.value = !!resp.signedToday
}

const bootstrap = async () => {
    try {
        const status = await apiGetStatus()
        applyStatus(status)
    } catch (e: any) {
        console.error('[GetStatus Error]', e)
        applyStatus({ days: [], signedToday: false })

    }
}

const onSignin = async () => {
    if (busy.value || signedToday.value) return
    busy.value = true
    try {
        const prev = lastStatus
        const doRes = await apiDoSignin()         // 后端返回最新状态
        const resp = normalizeStatus(doRes)

        // 计算奖励金额（与原逻辑一致）
        const newly = findNewlyCompleted(prev, resp)
        const amount = newly.length
            ? newly[0].rewardSpark
            : (() => {
                const todayRow = (resp.days || []).find((d) => d.isToday) || (resp.days || []).find((d) => d.completed)
                return todayRow ? todayRow.rewardSpark : 0
            })()

        applyStatus(doRes)
        showReward(amount)
    } catch (e: any) {
        console.error('[DoSignin Error]', e)
        alert('签到失败：' + (e?.message || e || 'unknown error'))
        try { const s = await apiGetStatus(); applyStatus(s) } catch { }
    } finally {
        busy.value = false
    }
}

const onOutsideClose = async () => {
    if (signedToday) {
        dataObj.states = 1//今日已完成签到
    }
    // 先通知 App（若有桥）
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
    // 再做本地关闭动画
    closing.value = true
    setTimeout(() => { showOverlay.value = false }, 220) // 对齐 .modal.closing 动画 0.22s
}

onMounted(() => {
    bootstrap()
})
</script>
<style lang="scss" scoped>
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding: 24px 0
}

.modal-wrap {
    position: relative;
    display: inline-block
}

.modal {
    width: 330px;
    // max-width: 90vw;
    height: 402px;
    // max-height: 90vh;
    background: linear-gradient(357.85deg, #FFFEF9 1.57%, #FFE14C 97.99%);
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
    //border: 3px solid rgba(255, 255, 255, .5);
    position: relative;
    overflow: hidden;
    animation: modalSlideIn .4s ease-out;
    display: flex;
    flex-direction: column;
    background: url(/img/newSignin/back.png);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;

}

.header {
    text-align: center;
    padding: 20px 16px 12px
}

.title {
    font-size: 18px;
    font-weight: bold;
    color: #000;
    margin-bottom: 6px;
    text-shadow: 2px 2px 0 #fff, -2px 2px 0 #fff, 2px -2px 0 #fff, -2px -2px 0 #fff, 0 2px 0 #fff, 2px 0 0 #fff, -2px 0 0 #fff, 0 -2px 0 #fff
}

.highlight {
    font-weight: bold;
    color: #F65F45;
    text-shadow: inherit
}

.subtitle {
    font-size: 12px;
    color: #1E1E1E;
    opacity: .8;
    min-height: 18px;
    margin-top: 12px;
}

.checkin-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 13px;
    padding: 1px 4.10256vw;
    margin: 2.5641vw 0 4.10256vw;
    /* overflow: auto;  <-- 如果金币还是被裁，请注释掉这一行 */
}

/* ---  当天签到后去掉边框 --- */
/* 增加一个复合类选择器，当同时具备 today 和 completed 时去掉边框 */
.day-card.today.completed {
    border: none !important;
}

.day-card.completed {
    background: #FFF6FC;
    
    border-color: #FFB74D;
    z-index: 99999;

}


.day-card {
    height: 75px;
    background: rgba(255, 255, 255, .9);
    border-radius: 8px;
    padding: 7px 8px 26px;
    text-align: center;
    position: relative;
    transition: all .25s ease;
    // border: 1.2px solid #f0f0f0
}

// .day-card.completed {
//     background: rgba(255, 255, 255, .95);
//     border-color: #FFB74D
// }

.day-card.today {
    background: #FFF6FC;
    color: #fff;
    transform: scale(1.03);
    border: 0.84px solid #EB9E0A
}

.coin-icon {
    width: 24px;
    height: 24px;
    background-image: url('/img/newSignin/huohua.png');
    background-size: 24px;
    background-position: top center;
    background-repeat: no-repeat;
    border-radius: 50%;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, .08)
}

.coin-icon1 {
    width: 22px;
    height: 22px;
    background: #FFDD51;
    border-radius: 50%;
    border: .42px solid #FFC424;
    display: flex;
    align-items: center;
    justify-content: center
}

.coin-icon2 {
    width: 8px;
    height: 10px;
    background-image: url("/img/newSignin/Vector\ 3187.png");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    display: block
}

.day-reward {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 9px;
    leading-trim: NONE;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
    color: #252525;
}

.day-card.today .day-reward {
    color: #252525;
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 9px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
}

.day-label {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    font-size: 8.36px;
    font-weight: 600;
    text-align: center;
    /* padding: 1.02564vw 0; */
    border-radius: 0 0 1.28205vw 1.28205vw;
    background: #FFE4D7;
    color: #999;
    height: 19.23px;
    display: flex;
    /* justify-items: center; */
    align-items: center;
    justify-content: center;
    color: rgba(245, 77, 44, 0.5);
}

.day-card.today .day-label {
    background: linear-gradient(96.99deg, #FECE9F -26.88%, #FF765D 82.88%);
    font-family: PingFang SC;
    font-weight: 600;
    font-style: Semibold;
    font-size: 8.36px;
    leading-trim: NONE;
    line-height: 8.36px;
    letter-spacing: 0px;
    text-align: center;
    vertical-align: middle;
    color: #FFFFFF;
}

.day-card.completed .day-label {
    font-family: PingFang SC;
    font-weight: 600;
    font-style: Semibold;
    font-size: 8.36px;
    leading-trim: NONE;
    // line-height: 8.36px;
    letter-spacing: 0px;
    text-align: center;
    vertical-align: middle;
    color: rgba(245, 77, 44, 0.5);
    background: #F8EFF5;
}

.day-card.special-day {
    /* 确保容器不裁剪溢出的金币 */
    overflow: visible !important;
    grid-column: span 2;
    background: rgba(255, 255, 255, .9);
    color: #000;
    padding: 7px 8px 26px;
    border: 1.2px solid #f0f0f0;
    border-radius: 8px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    /* 提升层级，确保金币能压在其他卡片上方 */
    z-index: 1;
}

.day-card.special-day.today {
    background: linear-gradient(135deg, #FF8A65 0%, #FF6F00 100%);
    color: #fff;
    border-color: #E65100
}

.special-coin {
    width: 36px;
    height: 32px;
    background-image: url("/img/newSignin/2.png");
    background-size: contain;
    /* 改为 contain 确保显示完整 */
    background-repeat: no-repeat;
    background-position: center;

    /* 核心修改：允许图片向上或向外溢出 */
    position: relative;
    top: -5px;
    /* 向上偏移，压住上方边缘 */
    flex-shrink: 0;
    /* 防止被 flex 压缩高度 */
    z-index: 10;
}

.day-card.special-day .day-reward {
    font-size: 8.36px;
    font-weight: 400;
    color: #252525;
    // margin-top: 5px;
    margin-bottom: 0 !important;
    text-align: center
}

.day-card.special-day.today .day-reward {
    color: #fff
}

.day-card.special-day .day-label {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 4px 0;
    border-radius: 0 0 5px 5px;
    background: #FFE4D7;
    // color: #999;
    text-align: center
}

.day-card.special-day.today .day-label {
    background: linear-gradient(96.99deg, #FECE9F -26.88%, #FF765D 82.88%);
    color: #fff
}

.btn-group {
    text-align: center;
    margin: 16px
}

.checkin-btn {
    background: linear-gradient(135deg, #FF6F00 0%, #E65100 100%);
    border-radius: 27px;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: transform .15s ease, opacity .15s ease;
    box-shadow: 0 4px 15px rgba(255, 111, 0, .35);
    width: 279px;
    max-width: 100%;
    height: 44px;
    margin: 0 auto;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center
}

.checkin-btn:hover {
    transform: translateY(-1px)
}

.checkin-btn:active {
    transform: translateY(0) scale(.98)
}

.checkin-btn:disabled {
    background: #ccc !important;
    cursor: not-allowed;
    box-shadow: none;
    opacity: .8
}

.footer-text {
    text-align: center;
    font-size: 12px;
    color: #1E1E1E;
    opacity: .8;
    margin-top: 8px;
}

// .check-mark {
//     position: absolute;
//     top: 2px;
//     right: 2px;
//     width: 14px;
//     height: 14px;
//     background: #4CAF50;
//     border-radius: 50%;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     font-size: 9px;
//     color: #fff
// }

// .check-mark::before {
//     content: '✓'
// }

.outside-close {
    background-image: url(/img/public/取消按钮.svg);
    background-color: #00000040;
    background-size: 100% 100%;
    background-position: top center;
    background-repeat: no-repeat;
    position: absolute;
    left: 50%;
    top: calc(100% + clamp(8px, 2.5vh, 16px));
    transform: translateX(-50%);
    z-index: 1001;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: #fff;
    font-size: 18px;
    font-weight: 900;
    line-height: 32px;
    text-align: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .25);
    transition: background .2s, transform .2s;
    margin: 0;
}

.outside-close:hover {
    background: rgba(0, 0, 0, .6);
    transform: translateX(-50%) scale(1.05)
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(50px) scale(.9)
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1)
    }
}

@keyframes celebrate {
    0% {
        transform: translate(-50%, -50%) scale(0) rotate(0deg);
        opacity: 1
    }

    100% {
        transform: translate(var(--rx), var(--ry)) scale(1) rotate(360deg);
        opacity: 0
    }
}

@keyframes confettiFall {
    0% {
        opacity: 1;
        transform: translate(0, 0) rotate(0deg)
    }

    100% {
        opacity: 0;
        transform: translate(var(--rx), var(--ry)) rotate(720deg)
    }
}

@keyframes modalFadeOut {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1)
    }

    100% {
        opacity: 0;
        transform: translateY(12px) scale(.98)
    }
}

.modal.closing {
    animation: modalFadeOut .22s ease forwards
}
</style>