<template>
    <div class="overlay" id="overlay" v-show="visible">
        <div class="modal-wrap">
            <div class="modal" id="modal" :class="{ closing }">
                <div class="mascot" aria-hidden="true"></div>

                <!-- Header -->
                <div class="header">
                    <div class="title" id="hdrTitle" v-html="hdrTitleHTML"></div>
                    <div class="subline" id="hdrSub" v-html="hdrSubHTML"></div>
                </div>

                <!-- Amount Card -->
                <div class="amount-card">
                    <div class="amount-card-top">
                        <div class="amount-card-top-tag" :class="{ fading: tagFading }" id="tagText">{{ tagText }}</div>
                        <div class="amount-coins" aria-hidden="true"></div>
                        <div class="amount-hh">
                            <span class="amount-num" id="amountBig">{{ amountBig }}</span>
                            <span class="amount-unit">火花</span>
                        </div>
                    </div>

                    <div class="amount-card-content">
                        <div class="days-grid" id="daysGrid">
                            <!-- 空态 -->
                            <div v-if="viewDays.length === 0"
                                style="grid-column:1/-1;text-align:center;color:#666;font-size:12px;padding:24px 0;">
                                暂未获取到签到数据，请稍后重试
                            </div>

                            <!-- 7天小卡片 -->
                            <div v-for="d in viewDays" :key="d.dayIndex" class="day-item">
                                <div class="day-mini" :class="d.cardClass">
                                    <div class="dm-amount">{{ d.amountText }}</div>
                                </div>
                                <div class="dm-label-out">{{ d.labelText }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Buttons -->
                <div class="btn-row">
                    <button class="btn btn-reset" id="btnReset" type="button" v-show="showReset"
                        :disabled="buttonsDisabled" @click="onReset">
                        重新签到
                    </button>

                    <button class="btn btn-retro" id="btnRetro" type="button" v-show="showRetro"
                        :disabled="buttonsDisabled" @click="onRetro">
                        看视频续签
                    </button>

                    <button class="btn btn-normal" id="btnNormal" type="button" v-show="showNormal"
                        :disabled="normalDisabled" @click="onNormal">
                        {{ normalText }}
                    </button>

                    <button class="btn btn-retro-done" id="btnRetroDone" type="button" v-show="showRetroDone" disabled>
                        今天已续签
                    </button>
                </div>
            </div>

            <!-- 外部关闭 -->
            <button class="outside-close" id="outsideClose" type="button" aria-label="Close"
                @click="onOutsideClose"></button>
        </div>
        <!-- 奖励弹窗（轻量 toast） -->
        <div v-if="rewardToast.visible" id="rw-pop" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
                background:#2b2b2b;border-radius:14px;padding:18px 22px;z-index:10000;
                box-shadow:0 10px 30px rgba(0,0,0,.35); color:#fff; text-align:center; min-width:160px;">
            <div style="margin-bottom:10px"><img src="/img/signin/金币堆.png" alt="" style="height:44px" /></div>
            <div style="font-size:18px;font-weight:800">+{{ format(rewardToast.amount) }} 火花</div>
        </div>
    </div>
</template>

<script setup lang="ts">
/**
 * 老用户续签（Old-user Sign-in）Vue3+TS 版本
 * - 完全等价迁移你给的 H5 逻辑（UI 状态、按钮策略、奖励弹窗、外部关闭等）
 * - 保留 class 名称以复用现有 CSS
 * - 继续调用你的 API：getStatus(taskId), doSignin(mode, taskId)
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { getStatus, doSignin } from '../../api/signin/signinLog'
import { showSuccessToast, showFailToast, showConfirmDialog, showToast } from 'vant'
import { beginPageView, claim, addOnClick } from '@/utils/YMDataH5Bridge'
// ============ 参数（支持 URL 传参） ============
const TASK_ID = Number(new URLSearchParams(location.search).get('task') || 10002)

// ============ 通用工具 ============
const format = (n: number | string) =>
    // Number.isFinite(+n) ? Number(n).toLocaleString('zh-CN') : '0'
    n

const safeGet = (obj: any, path: string, def?: any) => {
    try { return path.split('.').reduce((o, k) => (o == null ? undefined : (o as any)[k]), obj) ?? def }
    catch { return def }
}

// ============ 原数据结构（归一化后存这里） ============
type Day = {
    dayIndex: number
    rewardSpark: number
    completed: boolean
    isToday: boolean
    retroEligible?: boolean
}
type Status = {
    days: Day[]
    signedToday: boolean
    signedCountInCycle: number
    nextPendingDayIndex?: number
}

const state = reactive<Status>({
    days: [],
    signedToday: false,
    signedCountInCycle: 0,
    nextPendingDayIndex: 0
})

let lastStatus: Status | null = null

// 归一化（normalize）
function normalizeStatus(raw: any): Status {
    const days: Day[] = (safeGet(raw, 'days') ?? safeGet(raw, 'Days') ?? []).map((d: any) => ({
        dayIndex: Number(d.dayIndex ?? d.DayIndex ?? d.index ?? d.Index ?? 0),
        rewardSpark: Number(d.rewardSpark ?? d.RewardSpark ?? d.spark ?? d.Spark ?? 0),
        completed: !!(d.completed ?? d.Completed ?? d.isDone ?? d.IsDone ?? false),
        isToday: !!(d.isToday ?? d.IsToday ?? false),
        retroEligible: !!(d.retroEligible ?? d.RetroEligible ?? false)
    }))
    return {
        days,
        signedToday: !!(safeGet(raw, 'signedToday') ?? safeGet(raw, 'SignedToday') ?? false),
        signedCountInCycle: Number(safeGet(raw, 'signedCountInCycle') ?? safeGet(raw, 'SignedCountInCycle') ?? 0),
        nextPendingDayIndex: Number(safeGet(raw, 'nextPendingDayIndex') ?? safeGet(raw, 'NextPendingDayIndex') ?? 0)
    }
}

// ============ 计算派生（derive） ============
// 是否存在续签（retro）机会
const hasRetro = computed(() => state.days.some(d => d.retroEligible && !d.completed))

// 明日项（tomorrow entry）
function getTomorrowEntry(s: Status) {
    const days = s.days || []
    const nextIdx = Number(s.nextPendingDayIndex || 0)
    let d: Day | undefined
    if (nextIdx > 0) d = days.find(x => Number(x.dayIndex) === nextIdx)
    if (!d) d = days.filter(x => !x.completed && !x.isToday).sort((a, b) => a.dayIndex - b.dayIndex)[0]
    return d || null
}

const todayAmount = computed(() => {
    const d = state.days.find(x => x.isToday)
    return d ? (Number(d.rewardSpark) || 0) : 0
})

const retroAmount = computed(() => {
    const cand = state.days.filter(x => x.retroEligible && !x.completed)
    if (!cand.length) return 0
    const oldest = cand.reduce((m, x) => Number(x.dayIndex) < Number(m.dayIndex) ? x : m, cand[0])
    return Number(oldest.rewardSpark) || 0
})

const tomorrowEntry = computed(() => getTomorrowEntry(state))
const tomorrowAmount = computed(() => tomorrowEntry.value ? Number(tomorrowEntry.value.rewardSpark) || 0 : 0)

// Header/Tag/Amount 区域
const hdrTitleHTML = computed(() => {
    if (state.signedToday) {
        return `明日签到可领取 <span class="num" style="color:#F05632;font-weight:900;">${format(tomorrowAmount.value)}</span> 火花`
    } else if (hasRetro.value) {
        return '恭喜获得续签特权'
    } else {
        return `今天签到可领取 <span class="num" style="color:#F05632;font-weight:900;">${format(todayAmount.value)}</span> 火花`
    }
})

const hdrSubHTML = computed(() => {
    const count = state.signedCountInCycle
    if (state.signedToday) {
        return (count <= 1) ? '已开启新一轮签到' : `已连续签到${count}天`
    } else if (hasRetro.value) {
        return `今日续签可领取 <span class="num" style="color:#F05632;font-weight:900;">${format(retroAmount.value)}</span> 火花`
    } else {
        return (count <= 0) ? '已开启新一轮签到' : `已连续签到${count}天`
    }
})

const tagText = computed(() => {
    if (state.signedToday) return '明日签到可领取'
    if (hasRetro.value) return '续签可领'
    return '今天签到可领取'
})

const amountBig = computed(() => {
    if (state.signedToday) return format(tomorrowAmount.value)
    if (hasRetro.value) return format(retroAmount.value)
    return format(todayAmount.value)
})

// 小卡片视图数据（与原逻辑一致）
const viewDays = computed(() => {
    const signedToday = state.signedToday
    const retroCands = state.days.filter(d => d.retroEligible && !d.completed)
    const activeRetroIndex = (!signedToday && retroCands.length)
        ? Math.min(...retroCands.map(x => Number(x.dayIndex))) : -1
    const tmrIdx = signedToday && tomorrowEntry.value ? Number(tomorrowEntry.value.dayIndex) : -1

    return state.days.map(d => {
        const isSeventh = Number(d.dayIndex) === 7
        const isCompleted = !!d.completed
        const isActiveRetro = Number(d.dayIndex) === activeRetroIndex
        const isTomorrow = signedToday && Number(d.dayIndex) === tmrIdx

        const cardClass = {
            'done': isCompleted,
            'today': (!signedToday && d.isToday) || false,
            'active': (!signedToday && hasRetro.value && isActiveRetro) || false,
            'tomorrow': isTomorrow,
            'pulse': isTomorrow // 明日高亮（pulse 动画由 CSS 控制）
        }

        // label 文案
        let labelText = `第${d.dayIndex}天`
        if (signedToday) {
            if (isCompleted) labelText = '已领取'
            else if (isTomorrow) labelText = '明天'
        } else if (hasRetro.value) {
            if (isCompleted) labelText = '已领取'
            else if (isActiveRetro) labelText = '可续签'
        } else {
            if (isCompleted) labelText = '已领取'
            else if (d.isToday) labelText = '今天'
        }

        // amount 显示逻辑（??? 与显式金额）
        const displayAmount = !!(
            isSeventh || isTomorrow || d.isToday || isCompleted ||
            (!signedToday && hasRetro.value && isActiveRetro)
        )
        const amountText = displayAmount ? format(d.rewardSpark || 0) : '???'

        // 把对象键转为 class 数组（便于绑定）
        const classArr = Object.keys(cardClass).filter(k => (cardClass as any)[k])

        return { ...d, labelText, amountText, cardClass: classArr }
    })
})

// ============ 按钮区 ============
// “明日再来”模式
const tomorrowOnly = computed(() => state.signedToday)
//关闭页面通知移动端的数据
const dataObj = { states: 0, page: 'signin', value: '10002', type: '', key: 'ShowVedioAD' }
const showReset = computed(() => !tomorrowOnly.value && hasRetro.value)
const showRetro = computed(() => !tomorrowOnly.value && hasRetro.value)
const showNormal = computed(() => tomorrowOnly.value || !hasRetro.value)
const showRetroDone = computed(() => false) // 你原 H5 里是「隐藏或禁用」，这里继续隐藏

const normalText = computed(() => tomorrowOnly.value ? '明日再来' : '立即签到')
const buttonsDisabled = ref(false)
const normalDisabled = computed(() => buttonsDisabled.value || tomorrowOnly.value)

// Tag 淡出效果（视觉微交互，可选）
const tagFading = ref(false)
watch(tagText, () => {
    tagFading.value = true
    setTimeout(() => (tagFading.value = false), 200)
})

// ============ 奖励弹窗 ============
const rewardToast = reactive({ visible: false, amount: 0 })
let rewardTimer: any = null
function showReward(amount: number) {
    clearTimeout(rewardTimer)
    rewardToast.amount = amount
    rewardToast.visible = true
    dataObj.states = 1
    rewardTimer = setTimeout(() => (rewardToast.visible = false), 1600)
}

// 计算奖励差值（与原 H5 逻辑一致）
function findNewlyCompleted(prev: Status | null, curr: Status): Day[] {
    if (!prev?.days || !curr?.days) return []
    const pm = new Map(prev.days.map(d => [Number(d.dayIndex), !!d.completed]))
    return curr.days.filter(d => !!d.completed && pm.get(Number(d.dayIndex)) !== true)
}
function rewardOf(prev: Status | null, curr: Status): number {
    const newly = findNewlyCompleted(prev, curr)
    if (newly.length) return Number(newly[0].rewardSpark) || 0
    const done = (curr.days || []).find(d => d.completed)
    return done ? Number(done.rewardSpark) || 0 : 0
}

// ============ API & 状态应用 ============
async function apiGetStatus() { return await getStatus(TASK_ID) }
async function apiDoSignin(mode: 'normal' | 'retro' | 'reset', clientRefId: '') { return await doSignin(mode, TASK_ID, clientRefId) }

function applyStatus(raw: any) {
    const s = normalizeStatus(raw)
    lastStatus = s
    state.days = s.days
    state.signedToday = s.signedToday
    state.signedCountInCycle = s.signedCountInCycle
    state.nextPendingDayIndex = s.nextPendingDayIndex
}

async function bootstrap() {
    try {
        const s = await apiGetStatus()
        applyStatus(s)
    } catch (e: any) {
        alert('初始化失败：' + (e?.message || e))
        applyStatus({ days: [], signedToday: false, signedCountInCycle: 0 })
    }
}

// ============ 事件：签到 / 续签 / 重新签到 ============
async function runAndRefresh(mode: 'normal' | 'retro' | 'reset', clientRefId: '') {
    buttonsDisabled.value = true
    const prev = lastStatus
    const modeMap = {
        normal: '签到',
        retro: '续签',
        reset: '重新签到'
    };
    try {
        //友盟数据埋点-用户点击时
        addOnClick({ taskId: 10002, pageName: '点击去' + modeMap[mode] || '' + '时' });
        //只有需要需要埋点权益领取
        if (mode == 'retro') {
            //权益领取数据埋点
            claim({ task_id: 10002, benefit_type: '机会', claim_quantity: '一次' });
        }
        await apiDoSignin(mode, clientRefId).then((cur => {
            applyStatus(cur)
            // 与原页保持：操作完成后进入“明日再来”视图（通常后端也会返回 SignedToday=true）
            state.signedToday = true
            showReward(rewardOf(prev, normalizeStatus(cur)))
        }))
    } catch (e: any) {
        console.log('error', (mode === 'retro' ? '续签失败：' : mode === 'reset' ? '重新签到失败：' : '签到失败：') + (e?.message || e || 'unknown error'))
        try { const s = await apiGetStatus(); applyStatus(s) } catch { }
    } finally {
        buttonsDisabled.value = false
    }
}

const onNormal = () => runAndRefresh('normal', '')

const onReset = () => runAndRefresh('reset', '')

// ============ 外部关闭（带动画 + H5Bridge 通知） ============
const visible = ref(true)
const closing = ref(false)

function onOutsideClose() {
    if (state.signedToday) {
        dataObj.states = 1//今日已完成签到
    }
    dataObj.key = ''
    dataObj.type = ''
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
    //用户浏览签到结束-数据埋点
    beginPageView('2', '展示日常签到弹窗时')
    closing.value = true
    setTimeout(() => { visible.value = false }, 300)
}
//看激励视频
function watchVideo() {
    dataObj.type = 'ShowVedioAD';
    dataObj.key = 'ShowVedioAD';
    dataObj.value = '10002';
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}

function onRetro() {
    watchVideo();
}

// ============ 启动 ============
onMounted(() => {
    bootstrap();
    //用户浏览签到开始-数据埋点
    beginPageView('1', '展示日常签到弹窗时')
    //  监听 Flutter 调用
    window.H5Bridge.on('pageRefresh', (data) => {
        // console.log('老用户续签看激励视频返回值', data);
        // 校验参数
        if (!data?.userId || !data?.transId || !data?.taskId) {
            console.warn('pageRefresh 数据不完整', data);
            return;
        }
        if (data.taskId == 10002) {
            //看完激励视频给予补签操作
            runAndRefresh('retro', data.transId)
        } else {
            showToast('hdid不正确')
        }
    })
})
</script>
<style lang="scss" scoped>
.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding-bottom: calc(env(safe-area-inset-bottom) + 8px)
}

.modal-wrap {
    position: relative;
    display: inline-block
}

.modal {
    width: 330px;
    max-width: 360px;
    min-height: 406px;
    background-image: url('/img/signin/背景图.png');
    background-size: cover;
    background-position: center;
    position: relative;
    border-radius: 15px;
    animation: modalSlideIn .35s ease-out
}

.mascot {
    position: absolute;
    top: -19px;
    left: 60.5%;
    width: 136px;
    height: 99px;
    background-image: url('/img/signin/卡通形象.png');
    background-repeat: no-repeat;
    pointer-events: none;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .12))
}

.header {
    width: 270px;
    position: relative;
    z-index: 1;
    padding: 18px 18px 0
}

.title {
    font-size: 18px;
    font-weight: 900;
    color: #2B2B2B;
    letter-spacing: .5px;
    text-shadow: 1px 1px 0 #fff, -1px 1px 0 #fff, 1px -1px 0 #fff, -1px -1px 0 #fff;
    line-height: 1.25
}

.subline {
    margin-top: 6px;
    font-size: 11px;
    color: #222;
    font-family: PingFang SC;
    font-weight: 400;
    line-height: 1.25;
    min-height: 1.25em
}

.subline .num {
    color: #F05632;
    font-weight: 900
}

.amount-card {
    margin: 15px;
    border-radius: 17px;
    background: linear-gradient(0deg, rgba(255, 255, 255, .8) 42.72%, rgba(252, 224, 236, .56) 114.17%);
    height: 254px;
    border: 1px solid rgba(0, 0, 0, .06);
    box-shadow: 0 4px 10px rgba(0, 0, 0, .08);
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center
}

.amount-card-top {
    border-radius: 17px;
    height: 64%;
    width: 100%;
    background: #fff;
    position: relative
}

.amount-card-top-tag {
    position: absolute;
    background: linear-gradient(270deg, #FFC538 0%, #FCE98E 100%);
    color: #3C2E12;
    font-size: 12px;
    font-family: PingFang SC;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 3px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .06);
    transition: opacity .2s ease, color .2s ease, background .2s ease, filter .2s ease
}

.amount-card-top-tag.fading {
    opacity: 0;
    filter: blur(.3px)
}

.amount-coins {
    height: 60%;
    margin-top: 8px;
    margin-bottom: 6px;
    background-image: url('/img/signin/金币堆.png');
    background-repeat: no-repeat;
    background-position: center;
    transform: translate3d(0, 30px, 0);
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .08))
}

.amount-hh {
    width: 100%;
    height: 27%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px
}

.amount-num {
    font-size: 32px;
    font-family: SF Compact;
    line-height: 1;
    font-weight: 656;
    color: #F05632;
    letter-spacing: .5px;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum' 1;
    white-space: nowrap
}

.amount-unit {
    position: relative;
    bottom: -0.2em;
    font-size: 16px;
    font-family: PingFang SC;
    line-height: 1;
    font-weight: 600;
    color: #F05632;
    transform: none !important
}

.amount-card-content {
    flex: 1;
    width: 100%;
    border-radius: 0 0 17px 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px
}

.days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    column-gap: 8px;
    row-gap: 10px;
    width: 100%
}

.day-item {
    font-size: 7.19px;
    width: 33px;
    height: 45.9px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-width: 0
}

.day-mini {
    font-size: 7.19px;
    width: 33px;
    height: 45.9px;
    border-radius: 9px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid rgba(0, 0, 0, .06);
    box-shadow: 0 2px 6px rgba(0, 0, 0, .08);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease, background-image .1s ease;
    padding-top: 6px;
    background-image: url('/public/img/signin/翻卡1.png');
}

.day-mini:active {
    transform: translateY(1px) scale(.99);
    filter: saturate(.98)
}

.day-mini.today,
.day-mini.active,
.day-mini.tomorrow {
    background-image: url('/public/img/signin/翻卡2.png');
}

.day-mini.done {
    background-image: url('/public/img/signin/翻卡.png');
}

.dm-amount {
    height: 40px;
    font-size: 10px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum' 1;
    letter-spacing: .2px;
    color: red
}

.day-mini.active .dm-amount,
.day-mini.today .dm-amount,
.day-mini.tomorrow .dm-amount {
    color: #F05632;
}

.day-mini.done .dm-amount {
    color: #B07B52
}

.dm-label-out {
    margin-top: 4px;
    font-size: 10px;
    font-weight: 700;
    text-shadow: 0 1px 0 rgba(255, 255, 255, .7);
    color: #9A8F79;
    text-align: center
}

.day-mini.active+.dm-label-out,
.day-mini.today+.dm-label-out,
.day-mini.tomorrow+.dm-label-out {
    color: #F05632;
}

.day-mini.done+.dm-label-out {
    color: #B07B52
}

@keyframes pulseGlow {
    0% {
        transform: scale(1);
        box-shadow: 0 0 0 2px rgba(240, 86, 50, .18), 0 6px 14px rgba(0, 0, 0, .25)
    }

    50% {
        transform: scale(1.02);
        box-shadow: 0 0 0 4px rgba(240, 86, 50, .28), 0 10px 18px rgba(0, 0, 0, .35)
    }

    100% {
        transform: scale(1);
        box-shadow: 0 0 0 2px rgba(240, 86, 50, .18), 0 6px 14px rgba(0, 0, 0, .25)
    }
}

// .day-mini.tomorrow {
//     border-color: #F05632;
//     box-shadow: 0 0 0 2px rgba(240, 86, 50, .18), 0 6px 14px rgba(240, 86, 50, .25)
// }

// .day-mini.tomorrow+.dm-label-out {
//     color: #F05632;
//     position: relative;
//     padding: 0 6px;
//     border-radius: 6px;
//     background: rgba(240, 86, 50, .08)
// }

// .day-mini.tomorrow.pulse {
//     animation: pulseGlow 1.6s ease-in-out infinite
// }

@media (prefers-reduced-motion: reduce) {
    .day-mini.tomorrow.pulse {
        animation: none
    }
}

.btn-row {
    display: flex;
    gap: 14px;
    justify-content: center;
    padding: 0 18px 10px;
    position: relative;
    z-index: 1
}

.btn {
    flex: 1;
    min-width: 0;
    height: 44px;
    border-radius: 24px;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 900;
    color: #fff;
    box-shadow: 0 8px 18px rgba(240, 100, 30, .25);
    transition: transform .12s ease, filter .12s ease
}

.btn:active {
    transform: translateY(1px);
    filter: saturate(.95)
}

.btn-reset {
    // background: linear-gradient(180deg, #FFDFA0 0%, #FFB74D 100%);
    background: #FFFFFF;
    color: #FA6725
}

.btn-retro {
    background: linear-gradient(180deg, #FF7B4A 0%, #F05632 100%)
}

.btn-normal {
    border: 1.09px solid;
    border-image-source: linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0) 47.42%);
    background: linear-gradient(180deg, #FF7B4A 0%, #F05632 100%)
}

.btn-normal[disabled] {
    opacity: .7;
    cursor: not-allowed
}

.btn-retro-done {
    background: linear-gradient(180deg, #FF7B4A 0%, #F05632 100%);
    opacity: .9;
    cursor: not-allowed
}

/* 自定义外部关闭按钮 */
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
        transform: translateY(42px) scale(.92)
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1)
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