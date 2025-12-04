<template>
    <div class="overlay" role="dialog" aria-modal="true" v-show="showOverlay">
        <div class="modal-wrap">
            <div class="top-img" :class="{ reward: celebrating }"></div>
            <div class="modal" :class="{ closing: closing }">
                <!-- Header -->
                <div class="header">
                    <!-- 标题：优先显示"恭喜"，否则根据 canOpen 显示两种倒计时文案 -->
                    <div class="title">{{ headerTitle }}</div>
                    <!-- 副标题（奖励数字）：只在 celebrating 时展示 -->
                    <div class="subtitle" v-if="celebrating">
                        <b class="num">{{ lastReward.toLocaleString('zh-CN') }}</b>
                        <span class="unit">火花</span>
                    </div>
                </div>

                <!-- Content -->
                <div class="content">
                    <div class="c-title">今天共可开启{{ TOTAL_PER_DAY }}个宝箱</div>

                    <!--  宝箱区域 -->
                    <div class="c-baoxiao">
                        <!-- 宝箱卡片区域 -->
                        <div class="chest-strip">
                            <div v-for="item in visibleChests" :key="item.index" class="chest-card"
                                :class="[{ done: item.state === 'done', current: item.state === 'current' }]"
                                @click="item.state === 'current' && canOpen && !celebrating ? openChest() : null">
                                <!-- 顶部角标：倒计时 / 点击开启 -->
                                <div class="chip" v-if="item.state === 'current'">
                                    <span v-if="canOpen">点击开启</span>
                                    <span v-else>{{ remainText }}后开</span>
                                </div>

                                <!-- 宝箱图：已开=打开.png；未开=关闭.png -->
                                <div class="chest-img" :class="item.state === 'done' ? 'open' : 'closed'"></div>
                                <!-- 金额：已开显示数字，未开显示 ??? 或预览 -->
                                <div class="amount" v-if="item.state === 'done'">
                                    {{ formatAmount(item.amount) }}
                                </div>
                                <div class="amount unknown" v-else-if="item.state === 'current' && canOpen">
                                    {{ getPreviewAmount(item.index).toLocaleString('zh-CN') }}
                                </div>
                                <div class="amount unknown" v-else>???</div>
                            </div>
                        </div>

                        <!-- 进度条区域 -->
                        <div class="progress-section">
                            <div class="progress-line" :class="getProgressLineClass()">
                                <div v-for="(item, index) in visibleChests" :key="`progress-${item.index}`"
                                    class="progress-dot" :class="{ active: item.showProgress }"></div>
                            </div>
                        </div>

                        <!-- 编号区域 -->
                        <div class="number-section">
                            <div v-for="item in visibleChests" :key="`number-${item.index}`" class="chest-number">
                                {{ item.displayNumber }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom -->
                <div class="bottom">
                    <!--  根据状态切换文案；全开完禁用；冷却中允许点击（走 watchVideo） -->
                    <button class="but" :disabled="openedCount >= TOTAL_PER_DAY || celebrating" @click="onCtaClick">
                        {{ ctaText }}
                    </button>
                </div>
            </div>
            <!-- 外部关闭按钮 -->
            <button class="outside-close" id="outsideClose" type="button" aria-label="Close"
                @click="onOutsideClose"></button>
        </div>
    </div>
    <ClaimSuccessPopup v-model:visible="showClaimSuccess" rewardType="1" :displayAmount="displayAmount"
        @close="closeClaimPopup" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineExpose } from 'vue'
import { getChestState, postChestState } from '@/api/openTreasureChest/api'
import { ClaimWatchReward } from '@/api/public/api'
import { showDialog, showToast } from 'vant'
import ClaimSuccessPopup from '@/components/Popup/SuccessPopup.vue'
import { beginPageView, claim } from '@/utils/H5Bridge'
const showOverlay = ref(true)
const closing = ref(false)
//领取成功弹框
const showClaimSuccess = ref(false)
const displayAmount = ref(0)
function closeClaimPopup() {
    showClaimSuccess.value = false
}
/** ===== 业务常量 ===== */
const TOTAL_PER_DAY = 288
const COOLDOWN_SEC = 300 // 每 5 分钟开一个
const now = ref(Date.now())
let timer: number | undefined

/** ===== 服务端"天信息" ===== */
const dayKey = ref<string>('')        // 服务端返回的自然日（例如 2025-09-28）
const nextResetAt = ref<number>(0)     // 下一次"零点重置"的时间戳（ms）
const videoTeaserMax = ref<number | null>(null)

const videoTeaserForIndex = ref<number | null>(null)
const videoTeaserClaimed = ref(false) // ：本批次视频奖励是否已领取

/** ===== 当天状态（与后端同步） ===== */
type DayState = {
    openedCount: number
    nextUnlockAt: number | null
    amounts: Record<number, number>
}
const isClaiming = ref(false);
const celebrating = ref(false)
const openedCount = ref(0)
const nextUnlockAt = ref<number | null>(null)
const amounts = ref<Record<number, number>>({})
const lastReward = ref(0) // 仅用于头部文案显示

//页面通知移动端的数据
const dataObj = { states: 0, page: 'openTreasureChest', value: '', type: '', key: '' }

/** ===== 看视频按钮（冷却中）展示的随机上限 ===== */
const videoMaxSpark = ref(0)
function genVideoReward(min = 66, max = 266) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/** ===== 与后端同步：载入 / 保存 ===== */
// 载入：从后端 Redis 获取（若无则由后端初始化）
async function load() {
    try {
        const data = await getChestState()
        dayKey.value = data.dayKey
        nextResetAt.value = data.nextResetAt

        const s = data.state
        videoTeaserMax.value = s.videoTeaserMax ?? null
        videoTeaserForIndex.value = s.videoTeaserForIndex ?? null
        videoTeaserClaimed.value = s.videoTeaserClaimed ?? false // 新增

        // 规范化 amounts 的 key 为 number（后端可能下发 "1":1500）
        const normalized: Record<number, number> = {}
        Object.entries(s.amounts || {}).forEach(([k, v]) => {
            const keyNum = Number(k)
            const valNum = typeof v === 'number' ? v : Number(v ?? 0)
            if (!Number.isNaN(keyNum)) normalized[keyNum] = valNum
        })

        openedCount.value = s.openedCount ?? 0
        nextUnlockAt.value = s.nextUnlockAt ?? null
        amounts.value = normalized
        lastReward.value = s.lastReward ?? 0

    } catch (e) { console.error(e) }
}


// 保存：把"当前缓存"同步给后端（不阻塞UI）
function save() {
    // 异步 fire-and-forget；失败也不影响前端继续跑
    const body = {
        dayKey: dayKey.value || '', // 后端天然以 tz 计算；这里传回去可做校验/日志
        merge: true,
        state: {
            openedCount: openedCount.value,
            nextUnlockAt: nextUnlockAt.value,
            amounts: amounts.value,
            lastReward: lastReward.value,
            totalPerDay: TOTAL_PER_DAY
        }
    }
    postChestState(body).catch(() => { })
}

function formatAmount(v: number | null | undefined) {
    return typeof v === 'number' && v > 0 ? v.toLocaleString('zh-CN') : '—'
}

/** ===== 时间/可开状态 ===== */
const canOpen = computed(() => {
    if (openedCount.value >= TOTAL_PER_DAY) return false
    if (!nextUnlockAt.value) return true
    return now.value >= nextUnlockAt.value
})

const remainSec = computed(() => {
    if (!nextUnlockAt.value) return 0
    return Math.max(0, Math.floor((nextUnlockAt.value - now.value) / 1000))
})

const remainText = computed(() => {
    const m = Math.floor(remainSec.value / 60).toString().padStart(2, '0')
    const s = Math.floor(remainSec.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
})

/** ===== Header 文案 ===== */
const headerTitle = computed(() =>
    celebrating.value
        ? '恭喜获得开宝箱奖励'
        : (canOpen.value ? '倒计时结束，可开启宝箱' : '倒计时结束才能开启宝箱')
)

/** ===== 金额统一（预览=实际发奖） ===== */
function genAmount(i: number): number {
    const seq = [1500, 1200, 800, 1000, 2000, 500, 300, 1800, 900, 600]
    return seq[(i - 1) % seq.length]
}
function chestAmountFor(index: number): number {
    return amounts.value[index] ?? genAmount(index)
}
function getPreviewAmount(index: number): number {
    return chestAmountFor(index)
}

/** ===== 可视宝箱（4 张卡固定） ===== */
const visibleChests = computed(() => {
    type ChestView = {
        index: number
        state: 'done' | 'current' | 'next'
        amount?: number
        showProgress: boolean
        displayNumber: string
    }
    const arr: ChestView[] = []
    const currentOpenIndex = openedCount.value + 1

    if (openedCount.value === 0) {
        arr.push({ index: 1, state: 'current', showProgress: true, displayNumber: '第1个' })
        arr.push({ index: 2, state: 'next', showProgress: false, displayNumber: '第2个' })
        arr.push({ index: 3, state: 'next', showProgress: false, displayNumber: '...' })
        arr.push({ index: TOTAL_PER_DAY, state: 'next', showProgress: false, displayNumber: `第${TOTAL_PER_DAY}个` })
    } else {
        arr.push({
            index: openedCount.value, state: 'done',
            amount: amounts.value[openedCount.value] ?? 0,
            showProgress: true, displayNumber: `第${openedCount.value}个`
        })
        if (currentOpenIndex <= TOTAL_PER_DAY) {
            arr.push({
                index: currentOpenIndex,
                state: openedCount.value >= TOTAL_PER_DAY ? 'done' : 'current',
                amount: amounts.value[currentOpenIndex],
                showProgress: true, displayNumber: `第${currentOpenIndex}个`
            })
        }
        if (currentOpenIndex < 277) {
            arr.push({ index: currentOpenIndex + 1, state: 'next', showProgress: false, displayNumber: '...' })
        } else if (currentOpenIndex + 1 <= TOTAL_PER_DAY) {
            arr.push({
                index: currentOpenIndex + 1, state: 'next',
                showProgress: true, displayNumber: `第${currentOpenIndex + 1}个`
            })
        } else {
            arr.push({ index: Math.min(TOTAL_PER_DAY, currentOpenIndex), state: 'next', showProgress: false, displayNumber: '...' })
        }
        arr.push({
            index: TOTAL_PER_DAY, state: 'next',
            showProgress: openedCount.value >= TOTAL_PER_DAY, displayNumber: `第${TOTAL_PER_DAY}个`
        })
    }
    return arr.slice(0, 4)
})

/** ===== CTA（按钮）逻辑 ===== */
const ctaText = computed(() => {
    if (openedCount.value >= TOTAL_PER_DAY) return '今日已全部开启'
    if (canOpen.value) return '点击开启'

    // 冷却中
    if (videoTeaserClaimed.value) {
        // 已领取视频奖励：显示倒计时
        const nextIndex = openedCount.value + 1
        return `${remainText.value}后可开启第${nextIndex}个宝箱`
    } else {
        // 未领取：显示看视频提示
        const val = (videoTeaserMax.value ?? 266)
        return `看视频最高再领取${val.toLocaleString('zh-CN')}火花`
    }
})

function onCtaClick() {
    // 防止在"恭喜"展示期间触发操作
    if (celebrating.value) return

    if (openedCount.value >= TOTAL_PER_DAY) return

    if (canOpen.value) {
        // console.log('开宝箱111');
        openChest()
    } else {
        if (ctaText.value.includes('看视频')) {
            // console.log('看视频111');
            watchVideo()
        }
    }
}

function watchVideo() {
    dataObj.type = 'ShowVedioAD';
    dataObj.key = 'ShowVedioAD';
    dataObj.value = '10003';
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}


/** ===== 开启逻辑（发奖 & 冷却） ===== */
async function openChest() {
    if (!canOpen.value || openedCount.value >= TOTAL_PER_DAY) return
    // console.log('开宝箱222')
    const idx = openedCount.value + 1
    const amt = chestAmountFor(idx)
    amounts.value[idx] = amt
    lastReward.value = amt

    openedCount.value++
    nextUnlockAt.value = Date.now() + COOLDOWN_SEC * 1000
    videoTeaserClaimed.value = false // 新增：重置视频领取状态

    //  开启"恭喜"展示
    celebrating.value = true
    //通知移动端同步开启时间
    dataObj.value = remainSec.value.toString();
    if (remainSec.value > 0) {
        dataObj.states = 0;
    } else {
        dataObj.states = 1;
    }
    dataObj.type = 'open'
    dataObj.key = 'open';
    // console.log('dataObj', dataObj)
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }

    await postChestState({
        dayKey: dayKey.value || '',
        merge: true,
        state: { openedCount: openedCount.value, nextUnlockAt: nextUnlockAt.value, amounts: { [idx]: amt }, lastReward: amt }
    })

    await load()

    // 延迟关闭恭喜提示，防止立即点击
    setTimeout(() => { celebrating.value = false }, 500)
}

async function ClaimWatchRewards(payload: { transId: string; userId: string; SparkCount?: number }) {
    if (isClaiming.value) {
        console.log('已在处理领取，请稍候');
        return;
    }

    // 使用锁防止并发
    isClaiming.value = true;
    try {
        const body = {
            transId: payload.transId,
            userId: payload.userId,
            SparkCount: payload.SparkCount ?? (videoTeaserMax.value ?? 266),
            bizType: 3
        };

        await ClaimWatchReward(body).then((res => {
            showClaimSuccess.value = true;
            displayAmount.value = body.SparkCount;
            //标记已领取
            videoTeaserClaimed.value = true
            //权益领取数据埋点
            claim({ task_id: 10003, benefit_type: '金币', claim_quantity: body.SparkCount });
        }));


    } catch (err) {
        console.error('ClaimWatchRewards 异常', err);
        showToast('领取异常，请稍后重试');
    } finally {
        isClaiming.value = false;
    }
}

/** ===== 进度条样式类（四档） ===== */
const getProgressLineClass = () => {
    if (openedCount.value <= 0) return ''                  // 0%
    if (openedCount.value < 277) return 'progress-1'       // ≈33%
    if (openedCount.value < TOTAL_PER_DAY) return 'progress-2' // ≈66%
    return 'progress-3'                                    // 100%
}

/** ===== 心跳/初始化 ===== */
onMounted(() => {
    //  监听 Flutter 调用
    window.H5Bridge.on('pageRefresh', (data) => {
        // console.log('开宝箱看激励视频返回值', data);
        // 校验参数
        if (!data?.userId || !data?.transId || !data?.taskId) {
            console.warn('pageRefresh 数据不完整', data);
            return;
        }
        if (data.taskId == 10003) {
            const datas = {
                userId: data.userId,
                transId: data.transId,
                sparkCount: videoTeaserMax.value ?? 266,
                bizType: 5
            };
            ClaimWatchRewards(datas);
        } else {
            showToast('hdid不正确')
        }
    })
    load()

    //用户浏览开宝箱开始-数据埋点
    beginPageView('1', 'chest_opening_pop_up')
    celebrating.value = false //  刷新进入页面不显示"恭喜"            
    //  从后端拿 Redis 状态（若无则初始化）
    videoMaxSpark.value = genVideoReward()
    timer = window.setInterval(() => {
        now.value = Date.now()
        // 若已跨天（到达 nextResetAt），重新拉取
        if (nextResetAt.value && now.value >= nextResetAt.value) {
            load()
        }
    }, 1000)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})

const onOutsideClose = async () => {
    dataObj.value = remainSec.value.toString();
    if (remainSec.value > 0) {
        dataObj.states = 0;
    } else {
        dataObj.states = 1;
    }
    dataObj.type = '';
    dataObj.key = '';

    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
    //  关弹框就结束"恭喜"展示
    celebrating.value = false
    //用户浏览开宝箱结束-数据埋点
    beginPageView('2', 'chest_opening_pop_up')

    // closing.value = true
    setTimeout(() => { showOverlay.value = false }, 500)
}

/** ===== 暴露给模板用 ===== */
defineExpose({ TOTAL_PER_DAY })
</script>


<style scoped>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box
}

html,
body {
    background: transparent !important;
}

.c-baoxiao {
    margin-block-start: 10px;
    padding: 12px 10px 8px;
}

.chest-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.chest-card {
    position: relative;
    border-radius: 8px;
    padding: 7.5px 15px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(250, 103, 37, 0.12);
}

/* 当前可开启/计时中的宝箱 */
.chest-card.current {
    background: linear-gradient(180deg, #FFD67A 0%, #FFF6F1 82.76%);
    outline: 2px solid rgba(250, 103, 37, 0.12);
}

/* 已开启的宝箱 */
.chest-card.done {
    background: #FFF6F1;
}

.chest-card.done .amount,
.chest-card.done .chest-img {
    opacity: 0.5;
}

/* 未开启的宝箱 */
.chest-card:not(.current):not(.done) {
    background: #FFF0F0;
}

/* 顶部角标 */
.chip {
    position: absolute;
    inset-block-start: -10px;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    padding: 2px 8px;
    font-size: 11px;
    color: #fff;
    background: #fa6725;
    border-radius: 999px;
    box-shadow: 0 2px 6px rgba(250, 103, 37, 0.35);
    user-select: none;
    white-space: nowrap;
    writing-mode: horizontal-tb;
}

/* 宝箱图（按你的文件名切换） */
.chest-img {
    inline-size: 24px;
    block-size: 20px;
    margin: 10px auto 6px;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
}

.chest-img.open {
    background-image: url('/img/openTreasureChest/宝箱打开.png');
}

.chest-img.closed {
    background-image: url('/img/openTreasureChest/宝箱关闭.png');
}



/* 金额 / 占位 */
.amount {
    font-size: 12px;
    color: #fa6725;
    font-weight: 600;
}

.amount.unknown {
    color: #bbb;
}

/* 进度条区域 */
.progress-section {
    margin-block-start: 12px;
    padding: 0 8px;
}

.progress-line {
    position: relative;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    align-items: center;
}

.progress-line::before {
    content: '';
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: calc(12.5% + 5px);
    inset-inline-end: calc(12.5% + 5px);
    block-size: 2px;
    background: linear-gradient(to right,
            #fa6725 0%,
            #fa6725 var(--progress-percent),
            #f0f0f0 var(--progress-percent),
            #f0f0f0 100%);
    transform: translateY(-50%);
    z-index: 1;
    --progress-percent: 0%;
}

.progress-line.progress-1::before {
    --progress-percent: 33.33%;
}

.progress-line.progress-2::before {
    --progress-percent: 66.66%;
}

.progress-line.progress-3::before {
    --progress-percent: 100%;
}

.progress-dot {
    inline-size: 10px;
    block-size: 10px;
    border-radius: 50%;
    background: #ddd;
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
    margin: 0 auto;
    border: 2px solid #fff;
}

.progress-dot.active {
    background: #fa6725;
    box-shadow: 0 0 8px rgba(250, 103, 37, 0.4);
    transform: scale(1.2);
}

/* 编号区域 */
.number-section {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-block-start: 8px;
    padding: 0 8px;
}

.chest-number {
    font-size: 10px;
    color: #999;
    font-weight: 500;
    text-align: center;
}

/* 按钮禁用态 */
.but:disabled {
    opacity: 0.5;
}

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding: 20px;
    /* 确保在所有设备上居中 */
    box-sizing: border-box;
}


.modal-wrap {
    position: relative;
    display: inline-block;
    /* 确保内容不会超出视口 */
    max-inline-size: 100%;
    max-block-size: 100%;
}

.top-img {
    inline-size: 100%;
    max-inline-size: 360px;
    block-size: 85px;
    /* 给一个固定高度，避免图片加载问题 */
    background: url('/img/openTreasureChest/头部大宝箱.png') no-repeat center top / cover;
    /* 移动端优化 */
    min-inline-size: 280px;
}

.top-img.reward {
    background: url('/img/openTreasureChest/头部大宝箱开.png') no-repeat center top / cover;
}

.modal {
    inline-size: 100%;
    max-inline-size: 360px;
    min-inline-size: 280px;
    /* 设置最小宽度 */
    /* block-size: 330px; */
    min-block-size: 300px;
    max-block-size: calc(90vh - 100px);
    /* 减去top-img和padding的高度 */
    background: url('/img/openTreasureChest/background.png') no-repeat center top / cover;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, .3);
    position: relative;
    overflow: hidden;
    animation: modalSlideIn .4s ease-out;
    display: flex;
    flex-direction: column;
    /* 移动端适配 */
    box-sizing: border-box;
}

.header {
    text-align: center;
    padding: 25px 16px 12px;
    flex-shrink: 0;
    /* 防止标题区域被压缩 */
}

.title {
    font-family: PingFang SC, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 600;
    font-size: clamp(16px, 4vw, 18px);
    /* 响应式字体大小 */
    line-height: 1.4;
    letter-spacing: 0px;
    text-align: center;
    color: #333;
    margin-block-end: 8px;
    /* 添加文字描边效果 */
    text-shadow: 1px 1px 0 #fff, -1px 1px 0 #fff, 1px -1px 0 #fff, -1px -1px 0 #fff;
}

.subtitle {
    font-size: clamp(12px, 3vw, 14px);
    color: #666;
    line-height: 1.4;
}

.num {
    font-family: Inter;
    font-weight: 600;
    font-style: Semi Bold;
    font-size: 38px;
    line-height: 48px;
    letter-spacing: -1px;
    color: #FA6725;
}

.unit {
    font-family: PingFang SC;
    font-weight: 500;
    font-style: Medium;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0px;
    color: #FA6725;
}

.content {
    margin: 0 17px;
    inline-size: 310px;
    block-size: 156px;
    background: #FFFFFF;
    border-radius: 6px;
    inline-size: auto;
    padding: 10px;
}

.c-title {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0px;
    color: #999999;
}

.bottom {
    block-size: 100px;
    display: flex;
    justify-content: space-around;
    align-items: center;
}

.but {
    border: none;
    inline-size: 228px;
    block-size: 42px;
    opacity: 1;
    border-radius: 100px;
    background: #FA6725;
    color: #FFFFFF;
}

/* 动画效果 */
@keyframes modalSlideIn {
    0% {
        opacity: 0;
        transform: translateY(-50px) scale(0.8);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.modal.closing {
    animation: modalSlideOut .3s ease-in forwards;
}

@keyframes modalSlideOut {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }

    100% {
        opacity: 0;
        transform: translateY(-50px) scale(0.8);
    }
}

/* 移动端特殊适配 */
@media (max-width: 480px) {
    .overlay {
        padding: 16px;
    }

    .top-img {
        min-inline-size: 260px;
        block-size: 105px;
    }

    .modal {
        min-inline-size: 260px;
        border-radius: 25px;
    }

    .header {
        padding: 20px 12px 10px;
    }

    .title {
        font-size: 18px;
    }

    .subtitle {
        font-size: 12px;
    }
}

/* 超小屏幕适配 */
@media (max-width: 320px) {
    .overlay {
        padding: 12px;
    }

    .top-img {
        min-inline-size: 240px;
        block-size: 90px;
    }

    .modal {
        min-inline-size: 240px;
    }

    .header {
        padding: 16px 10px 8px;
    }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 600px) {
    .overlay {
        padding: 10px;
    }

    .modal {
        max-block-size: calc(80vh - 60px);
    }

    .top-img {
        block-size: 40px;
    }

    .header {
        padding: 15px 16px 8px;
    }
}

.outside-close {
    background-image: url(/img/public/取消按钮.svg);
    background-color: #00000040;
    background-size: 100% 100%;
    background-position: top center;
    background-repeat: no-repeat;
    position: absolute;
    inset-inline-start: 50%;
    inset-block-start: calc(100% + clamp(8px, 2.5vh, 16px));
    transform: translateX(-50%);
    z-index: 1001;
    inline-size: 26px;
    block-size: 26px;
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
</style>