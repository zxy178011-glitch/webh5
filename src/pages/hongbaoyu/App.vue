<template>
    <div class="page">
        <div v-if="stage === 'countdown'" class="countdown-wrap">
            <div class="gold-header"></div>
            <div class="cd-text">
                <div>红包雨来袭</div>
                <div class="sub">倒计时</div>
            </div>
            <div class="cd-num">{{ count }}</div>
            <div class="bk-img">
                <img class="cd-hero" src="/img/hongbaoyu/ring-bag.png" alt="ring bag" />
            </div>
        </div>

        <div v-else class="rain-wrap">
            <header class="rain-header" v-if="showChrome">
                <div class="timer-bar in-header">
                    <div class="label">{{ remain }}s</div>
                    <div class="bar"><i :style="{ width: progressPct + '%' }"></i></div>
                </div>
            </header>

            <div ref="zoneRef" class="zones">
                <div class="zone rain-zone" :style="{ height: zoneHeights.rain }"></div>
                <div class="zone fade-zone" :style="{ height: zoneHeights.fade }"></div>
                <div class="zone coins-zone" :style="{ height: zoneHeights.coins }">
                    <img v-if="showChrome" class="coins-bg" src="/img/hongbaoyu/coins-bottom.png" alt="coins" />
                </div>

                <div v-for="p in packets" :key="p.id" :ref="(el) => setPacketRef(el, p.id)" class="packet"
                    @touchstart.stop.prevent="hit(p)">
                    <img src="/img/hongbaoyu/bag.png" alt="bag" />
                </div>

                <div v-for="c in coins" :key="c.id" :ref="(el) => setCoinRef(el, c.id)" class="coin" :style="{
                    '--sway-dur': c.swayDur + 'ms',
                    '--sway-amp': c.swayAmp + 'px'
                }">
                    <img class="coin-img" src="/img/hongbaoyu/金币.png" alt="coin" :class="{ rev: c.rev }"
                        :style="{ '--spin-dur': c.spinDur + 'ms' }" />
                </div>
            </div>
        </div>

        <van-dialog v-model:show="showResult" :show-confirm-button="false" :show-cancel-button="false"
            :close-on-click-overlay="false" :overlay-style="{ background: 'transparent' }" class="hb-dialog">
            <div class="hb-card">
                <div class="hb-head">
                    <div class="hb-title">你在红包雨获得</div>
                    <div class="hb-sub">
                        <span class="plus">+</span>
                        <b class="num">{{ baseReward }}</b>
                        <span class="unit">火花</span>
                    </div>
                </div>
                <div class="hb-cards">
                    <div class="card direct" :style="{
                        backgroundImage: `url(${imgDirect})`,
                        width: '100px',
                        height: '122px',
                        marginLeft: '30px',
                        marginTop: '-6px'
                    }" role="button" tabindex="0">
                        <div class="num-on-card small">
                            <b>{{ baseReward }}</b><span>火花</span>
                        </div>
                    </div>
                    <div class="card double"
                        :style="{ backgroundImage: `url(${imgDouble})`, width: '227px', height: '196px', overflow: 'hidden' }"
                        role="button" tabindex="0">
                        <div class="num-on-card big">
                            <b>{{ doubleReward }}</b><span>火花</span>
                        </div>
                    </div>
                </div>
                <div class="hb-cta">
                    <button class="btn-primary" @click="onWatchVideo">看视频翻倍领取火花</button>
                    <button class="btn-link" @click="onDirectReceive">直接领取</button>
                </div>
            </div>
        </van-dialog>
    </div>
    <SuccessPopup v-model:visible="showClaimSuccess" rewardType="1" :displayAmount="displayAmount"
        @close="closeClaimPopup" />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, shallowRef, triggerRef } from 'vue'
import { InsertSpark, ClaimWatchReward } from '../../api/public/api'
import { showToast } from 'vant'
import { beginPageView, claim, addOnClick } from '@/utils/YMDataH5Bridge'
/* --------- 状态定义 --------- */
const stage = ref('countdown')
const count = ref(3)
const score = ref(0)
const durationSec = ref(10)
const remain = ref(10)
const startTs = ref(0)

const zoneHeights = reactive({
    rain: 'clamp(32dvh, 42dvh, 48dvh)',
    fade: 'clamp(18dvh, 24dvh, 28dvh)',
    coins: 'max(22dvh, 160px)'
})

const dataObj = reactive({ states: 0, page: 'hongbaoyu', value: '', type: '', key: '' })

/* 优化核心：使用 shallowRef 
   Vue 不会深度监听数组内部对象的属性变化（如 x, y），避免 tick 循环时的响应式开销。
   我们需要手动操作 DOM 来更新位置。
*/
const packets = shallowRef([])
const coins = shallowRef([])

/* DOM 引用缓存 Map */
const packetRefs = new Map()
const coinRefs = new Map()
const zoneRef = ref(null)

const nextId = ref(1)
const rafId = ref(0)
const lastSpawnMs = ref(0)
const spawnGapMin = ref(360)
const spawnGapMax = ref(420)

// 缓存区域尺寸，避免在 tick 中重复计算
let cachedZoneW = 375
let cachedZoneH = 667
let cachedRainH = 300
let cachedFadeH = 150

// UI / 结算
const showChrome = ref(true)
const showResult = ref(false)
const rewardFactor = ref(0)
const baseReward = ref(0)
const doubleReward = ref(0)
const ended = ref(false)

const imgDirect = ref('/img/hongbaoyu/直接领取.png')
const imgDouble = ref('/img/hongbaoyu/看视频翻倍.png')
const showClaimSuccess = ref(false)
const displayAmount = ref(0)

const progressPct = computed(() => {
    const used = Math.max(0, (durationSec.value - remain.value) / durationSec.value)
    return Math.min(100, Math.round(used * 100))
})

/* --------- 辅助函数 --------- */
function rand(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a
}

// 缓存 DOM 引用
const setPacketRef = (el, id) => {
    if (el) packetRefs.set(id, el)
    else packetRefs.delete(id)
}
const setCoinRef = (el, id) => {
    if (el) coinRefs.set(id, el)
    else coinRefs.delete(id)
}

/* --------- 核心逻辑 --------- */

// 更新尺寸缓存
function updateZoneMetrics() {
    if (!zoneRef.value) return
    const rect = zoneRef.value.getBoundingClientRect()
    cachedZoneW = rect.width
    cachedZoneH = rect.height
    // 获取子区域高度（近似值或直接获取 DOM）
    const children = zoneRef.value.children
    if (children && children.length >= 2) {
        cachedRainH = children[0].offsetHeight
        cachedFadeH = children[1].offsetHeight
    }
}

function spawnPacket() {
    const x = rand(8, Math.max(8, cachedZoneW - 78))
    // 纯数据对象，不需要响应式
    packets.value.push({
        id: nextId.value++,
        x,
        y: -90,
        opacity: 1,
        hit: false, // 标记是否被点击
        lastNow: 0
    })
    // 触发 shallowRef 更新 DOM 列表
    triggerRef(packets)
}

function makeCoin(x, y) {
    const vy = 0.32 * cachedZoneH
    const now = performance.now()
    coins.value.push({
        id: nextId.value++,
        x, y,
        vy,
        start: now,
        lastNow: now,
        spinDur: rand(700, 1300),
        swayDur: rand(900, 1500),
        swayAmp: rand(4, 10),
        rev: Math.random() < 0.5,
        opacity: 1
    })
    triggerRef(coins)
}

// 点击处理：touchstart 触发
function hit(p) {
    if (p.hit) return // 防止连点
    p.hit = true
    score.value++

    // 立即隐藏 DOM（视觉反馈最优先）
    const el = packetRefs.get(p.id)
    if (el) el.style.opacity = '0'

    makeCoin(p.x + 28, p.y + 40)

    // 注意：这里不直接 splice，防止在 touch 事件中引起大的重排卡顿
    // 仅仅标记 p.hit = true，让 tick 循环在下一帧清理它
}

function onRainEnd() {
    showChrome.value = false
    rewardFactor.value = rand(70, 100)
    baseReward.value = Math.max(0, Math.floor(score.value * rewardFactor.value))
    if (baseReward.value === 0) baseReward.value = 200
    if (baseReward.value >= 1200) baseReward.value = 1200
    doubleReward.value = baseReward.value * 2
    showResult.value = true
}

/* 优化的帧循环 */
function tick(now) {
    // 如果没有 DOM 引用，跳过
    if (!zoneRef.value) {
        rafId.value = requestAnimationFrame(tick)
        return
    }

    const elapsed = (now - startTs.value) / 1000
    remain.value = Math.max(0, Math.ceil(durationSec.value - elapsed))
    const done = elapsed >= durationSec.value

    // 生成逻辑
    if (!done && now - lastSpawnMs.value > rand(spawnGapMin.value, spawnGapMax.value)) {
        spawnPacket()
        lastSpawnMs.value = now
    }

    const rainEnd = cachedRainH
    const fadeEnd = cachedRainH + cachedFadeH
    const speed = 0.32 * cachedZoneH

    let needUpdatePackets = false
    let needUpdateCoins = false

    // --- 更新红包 ---
    // 倒序循环方便删除
    for (let i = packets.value.length - 1; i >= 0; i--) {
        const p = packets.value[i]

        // 如果已经被点击（hit），直接移除
        if (p.hit) {
            packets.value.splice(i, 1)
            needUpdatePackets = true
            continue
        }

        const dt = p.lastNow ? (now - p.lastNow) / 1000 : 0
        p.lastNow = now
        p.y += speed * dt

        // 边界判断
        if (p.y >= rainEnd && p.y <= fadeEnd) {
            const k = (p.y - rainEnd) / (fadeEnd - rainEnd)
            p.opacity = Math.max(0, 1 - k)
        } else if (p.y > fadeEnd) {
            p.opacity = 0
        }

        // 移除屏幕外
        if (p.y > cachedZoneH + 120 || p.opacity <= 0.01) {
            packets.value.splice(i, 1)
            needUpdatePackets = true
            continue
        }

        // 直接 DOM 操作 (Transform + Opacity)
        // 这是性能优化的关键：绕过 Vue 响应式更新 Style
        const el = packetRefs.get(p.id)
        if (el) {
            // 使用 translate3d 开启 GPU 加速
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
            el.style.opacity = p.opacity
        }
    }

    // --- 更新金币 ---
    for (let i = coins.value.length - 1; i >= 0; i--) {
        const c = coins.value[i]
        const dt = (now - c.lastNow) / 1000
        c.lastNow = now

        c.y += (c.vy || 0) * dt
        const lived = (now - c.start) / 1000
        c.opacity = Math.max(0, 1 - lived / 2)
        // c.scale = Math.max(.85, 1 - lived * 0.1) // 缩放可选，如果觉得卡可以去掉

        if (lived >= 2 || c.y > cachedZoneH + 120) {
            coins.value.splice(i, 1)
            needUpdateCoins = true
            continue
        }

        const el = coinRefs.get(c.id)
        if (el) {
            // 保持原本 CSS 动画的同时更新位置
            // 注意：因为金币有 CSS animation (sway)，我们只控制 top/left 对应的 transform
            // 如果 transform 冲突，需要用外层容器包一层，或者只改 top/left。
            // 优化方案：这里为了不破坏 CSS sway 动画，我们只能更新 top/left 
            // 现在的 .coin 是 absolute，直接改 left/top 性能不如 transform，
            // 但因为 sway 用了 transform，所以这里用 left/top 兼容原来的 CSS 动画
            // 或者：el.style.top = c.y + 'px'; el.style.left = c.x + 'px';
            // 为了更流畅，建议：使用 transform (translate3d) 控制位移，
            // 而金币内部 img 负责自转，摇摆动画改为 JS 计算或者嵌套 div。
            // ** 鉴于不想改效果太复杂，这里用 transform 会覆盖 sway 动画 **
            // ** 所以金币这里回退到 top/left 方案，或者将位置应用在 style 上 **

            // 修正：为了保持原效果(sway)，我们还是修改 top/left，但是通过 style 直接改，不通过 vue
            el.style.top = c.y + 'px'
            el.style.left = c.x + 'px'
            el.style.opacity = c.opacity
        }
    }

    // 只有在数组长度变化时通知 Vue 更新 DOM 列表
    if (needUpdatePackets) triggerRef(packets)
    if (needUpdateCoins) triggerRef(coins)

    if (!done) {
        rafId.value = requestAnimationFrame(tick)
    } else if (!ended.value) {
        ended.value = true
        setTimeout(() => {
            packets.value = [];
            coins.value = [];
            triggerRef(packets);
            triggerRef(coins);
        }, 200)
        onRainEnd()
    }
}

function beginRain() {
    stage.value = 'rain'
    score.value = 0
    packets.value = []
    coins.value = []
    remain.value = durationSec.value
    showChrome.value = true
    showResult.value = false
    ended.value = false

    nextTick(() => {
        // 初始化尺寸
        updateZoneMetrics()
        window.addEventListener('resize', updateZoneMetrics)

        startTs.value = performance.now()
        lastSpawnMs.value = startTs.value
        rafId.value = requestAnimationFrame(tick)
    })
}

// 停止时清理
onBeforeUnmount(() => {
    cancelAnimationFrame(rafId.value)
    window.removeEventListener('resize', updateZoneMetrics)
})

/* API 交互部分保持不变 */
function onWatchVideo() {
    try {
        dataObj.type = 'ShowVedioAD'
        dataObj.key = 'ShowVedioAD'
        dataObj.value = '10005'
        window.H5Bridge?.closePage?.(dataObj)
        beginPageView('2', '展示红包雨弹窗时');
    } catch { }
}
function onDirectReceive() {
    const model = { ObtainType: 5, ObtainCount: baseReward.value, ObtainContent: '红包雨获得' }
    const message = `+${baseReward.value}  火花`
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 10005, pageName: '点击火花红包雨去领取时' });
    InsertSpark(model).then((res) => {
        try {
            dataObj.key = 'showToast'
            dataObj.value = '恭喜你获得' + message
            dataObj.type = ''
            window.H5Bridge?.closePage?.(dataObj)
        } catch { }
        showResult.value = false
        beginPageView('2', '展示红包雨弹窗时');
    })
}
function ClaimWatchRewards(model) {
    ClaimWatchReward(model).then((res) => {
        try {
            showResult.value = false
            showClaimSuccess.value = true;
            displayAmount.value = model.sparkCount;
            //权益领取数据埋点
            claim({ task_id: 10005, benefit_type: '金币', claim_quantity: model.sparkCount });
        } catch { }
    })
}
function closeClaimPopup() {
    showClaimSuccess.value = false
    dataObj.type = ''
    dataObj.key = ''
    dataObj.value = ''
    window.H5Bridge?.closePage?.(dataObj)
}
onMounted(() => {
    const tickInterval = setInterval(() => {
        if (count.value <= 1) {
            clearInterval(tickInterval)
            beginRain()
        } else {
            count.value--
        }
    }, 1000)
    beginPageView('1', '展示红包雨弹窗时');
    window.H5Bridge.on('pageRefresh', (data) => {
        if (!data?.userId || !data?.transId || !data?.taskId) return;
        if (data.taskId == 10005) {
            const datas = {
                userId: data.userId,
                transId: data.transId,
                sparkCount: doubleReward.value,
                bizType: 5
            };
            ClaimWatchRewards(datas);
        } else {
            showToast('hdid不正确')
        }
    })
})
</script>

<style scoped>
/* 原样式保留，只修改 packet 和 coin 的定位方式相关 */

/* ... (保留你的 :root, .page 等所有基础样式) ... */
:root {
    --mask-rgba: 0, 0, 0;
    --mask-alpha: .7;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
}

:global(html),
:global(body) {
    margin: 0;
    height: 110%;
    overflow: hidden;
    overscroll-behavior: none;
    background: transparent !important;
}

* {
    box-sizing: border-box;
}

.page {
    position: fixed;
    inset: 0;
    width: 100vw;
    min-height: 100vh;
    color: #fff;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden;
    isolation: isolate;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    touch-action: pan-x pinch-zoom;
}

.page::before {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .7);
    backdrop-filter: blur(1px);
    -webkit-backdrop-filter: blur(1px);
    z-index: -2;
    pointer-events: none;
}

/* ... Countdown 样式保持不变 ... */
.countdown-wrap {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: calc(var(--safe-top) + 8px);
}

.gold-header {
    position: absolute;
    inset: 0 0 auto 0;
    height: 20vh;
    z-index: -1;
    background: url('/img/hongbaoyu/顶部背景.png') no-repeat center top / cover;
}

.cd-text {
    margin-top: 15vh;
    line-height: 1.2;
    text-align: center;
    color: #FCEDC2;
    text-shadow: 0 10px 28px rgba(0, 0, 0, .35), 0 0 18px rgba(255, 234, 180, .95);
}

.cd-text>div:first-child {
    font-size: clamp(30px, 9vh, 45px);
    font-weight: 900;
    letter-spacing: .08em;
}

.cd-text .sub {
    margin-top: 4px;
    opacity: .95;
    font-size: clamp(30px, 9vh, 45px);
    font-weight: 900;
}

.cd-num {
    margin: 20px 0 40px 0;
    color: #FCEDC2;
    font-size: clamp(56px, 9vh, 86px);
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 10px 28px rgba(0, 0, 0, .35), 0 0 18px rgba(255, 234, 180, .95);
}

.bk-img {
    position: relative;
    width: clamp(240px, 72vw, 340px);
    height: clamp(260px, 38vh, 420px);
    margin-top: 4px;
    background: url('/img/hongbaoyu/线条.png') no-repeat center / cover;
}

.cd-hero {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    height: auto;
}

/* ... Rain Header 样式保持不变 ... */
.rain-wrap {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.rain-header {
    overflow: hidden;
    position: relative;
    height: 20vh;
    padding-top: calc(var(--safe-top) + 6px);
    background: url('/img/hongbaoyu/顶部背景.png') no-repeat center top / cover;
}

.timer-bar.in-header {
    width: 88%;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8vh;
}

.timer-bar .label {
    width: 56px;
    text-align: right;
    font-weight: 700;
    color: #FFE9B6;
    text-shadow: 0 2px 10px rgba(0, 0, 0, .35);
}

.timer-bar .bar {
    --bar-h: 22px;
    --bar-pad: 3px;
    position: relative;
    flex: 1;
    height: var(--bar-h);
    padding: var(--bar-pad);
    border-radius: 999px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(255, 255, 255, .22), rgba(255, 255, 255, .10));
    border: 1px solid rgba(255, 255, 255, .65);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .45), inset 0 -3px 8px rgba(0, 0, 0, .28), 0 2px 10px rgba(0, 0, 0, .08);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
}

.timer-bar .bar::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .28), inset 0 10px 16px rgba(255, 255, 255, .08);
    pointer-events: none;
    z-index: 1;
}

.timer-bar .bar i {
    position: relative;
    z-index: 2;
    display: block;
    height: calc(var(--bar-h) - var(--bar-pad) * 2);
    border-radius: 999px;
    transition: width .2s linear;
    background: linear-gradient(90deg, #ff5a32 0%, #ff6a38 35%, #ff7e46 62%, #ffe5cf 100%);
    box-shadow: 0 4px 10px rgba(255, 94, 50, .32), inset 0 1px 0 rgba(255, 255, 255, .55);
}

.timer-bar .bar i::after {
    content: '';
    position: absolute;
    right: -2px;
    top: 0;
    bottom: 0;
    width: 26px;
    border-radius: inherit;
    background: radial-gradient(20px 20px at 65% 50%, rgba(255, 255, 255, .95), rgba(255, 255, 255, .45) 60%, rgba(255, 255, 255, 0) 72%);
    filter: blur(.2px);
}

.zones {
    position: relative;
    flex: 1 1 auto;
    overflow: hidden;
    background: transparent;
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

.zone {
    position: relative;
}

.coins-zone {
    height: 20vh;
    position: relative;
    overflow: visible;
}

.coins-bg {
    position: absolute;
    left: 50%;
    bottom: max(6vh, env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    width: min(120vw, 780px);
    height: auto;
    pointer-events: none;
    filter: drop-shadow(0 10px 16px rgba(0, 0, 0, .35));
}

/* --- 核心优化 CSS 修改 --- */
.packet {
    position: absolute;
    width: 74px;
    height: 90px;
    filter: drop-shadow(0 10px 16px rgba(0, 0, 0, .35));
    /* 去掉 will-change，或者只保留 transform，不要 transition top/left */
    will-change: transform;
    pointer-events: auto;
    /* 初始在屏幕外，完全靠 JS transform 控制位置，避免初始渲染闪烁 */
    top: 0;
    left: 0;
    transform: translate3d(0, -200px, 0);
}

.packet::before {
    content: '';
    position: absolute;
    inset: -12px;
    background: transparent;
    pointer-events: auto;
    /* 增大点击热区 */
}

.packet img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.coin {
    position: absolute;
    width: 60px;
    height: 80px;
    pointer-events: none;
    animation: coin-sway var(--sway-dur, 1200ms) ease-in-out infinite alternate;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .28)) drop-shadow(0 0 8px rgba(255, 220, 120, .35));
    /* 金币位置由 JS 控制 left/top，摇摆由 CSS 动画控制 */
    top: 0;
    left: 0;
}

.coin-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    animation: coin-spin var(--spin-dur, 1000ms) linear infinite;
}

.coin-img.rev {
    animation-direction: reverse;
}

@keyframes coin-sway {
    from {
        transform: translateX(calc(var(--sway-amp, 8px) * -1));
    }

    to {
        transform: translateX(var(--sway-amp, 8px));
    }
}

@keyframes coin-spin {
    to {
        transform: rotate(360deg);
    }
}

/* ... 结算弹窗样式保持不变 ... */
:deep(.hb-dialog.van-dialog) {
    background: transparent !important;
    box-shadow: none !important;
    width: auto;
    padding: 0;
}

.hb-card {
    margin-top: max(10vh, env(safe-area-inset-top, 0px));
    width: min(92vw, 520px);
    margin-left: auto;
    margin-right: auto;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    user-select: none;
}

.hb-head {
    text-align: center;
}

.hb-title {
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 32px;
    line-height: 100%;
    color: #FFF5D6;
    text-shadow: 0 2px 12px rgba(0, 0, 0, .35);
}

.hb-sub {
    margin-top: 2vh;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
}

.hb-sub .plus {
    font-size: 26px;
    font-weight: 900;
    color: #fff7e0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, .35);
}

.hb-sub .num {
    font-size: 36px;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(180deg, #fff9e0, #ffd68a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: 0 8px 28px rgba(0, 0, 0, .35);
}

.hb-sub .unit {
    font-size: 16px;
    color: #ffe7b8;
    font-weight: 700;
}

.hb-cards {
    width: 100%;
    display: grid;
    grid-template-columns: 25% 75%;
    gap: 12px;
    align-items: center;
}

.hb-cards .card {
    position: relative;
    width: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    outline: none;
    aspect-ratio: 3 / 4;
}

.hb-cards .card.double {
    aspect-ratio: 1 / 1;
}

.num-on-card {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    color: #8a5a2b;
    text-shadow: 0 2px 10px rgba(0, 0, 0, .15);
    display: flex;
    align-items: baseline;
    gap: 6px;
    pointer-events: none;
}

.num-on-card b {
    font-weight: 900;
    background: linear-gradient(180deg, #fff9e0, #ffd68a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.num-on-card.small {
    top: 50%;
    transform: translate(-50%, -50%);
}

.num-on-card.small b {
    font-family: Inter;
    font-weight: 600;
    font-size: 22px;
    line-height: 28px;
    letter-spacing: -1px;
    color: #FA6725;
}

.num-on-card.small span {
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 12px;
    line-height: 100%;
    color: #FA6725;
    width: 24px;
}

.num-on-card.big {
    top: 50%;
    left: 62%;
    transform: translate(-50%, -50%);
}

.num-on-card.big b {
    font-family: Inter;
    font-weight: 600;
    font-size: 38px;
    line-height: 48px;
    letter-spacing: -1px;
    color: #FA6725;
}

.num-on-card.big span {
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 12px;
    line-height: 100%;
    color: #FA6725;
    width: 24px;
}

.hb-cta {
    width: min(92vw, 520px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    margin-top: 35px;
}

.btn-primary {
    width: 228px;
    height: 45px;
    text-align: center;
    padding: 12px 16px;
    border: 0;
    border-radius: 999px;
    color: #7a3c00;
    font-weight: 800;
    background: linear-gradient(180deg, #fff1b6, #ffd86b);
    box-shadow: 0 8px 18px rgba(0, 0, 0, .22);
}

.btn-link {
    width: 100%;
    padding: 10px 16px;
    border: 0;
    background: transparent;
    color: #fff;
    font-weight: 400;
    font-size: 14px;
}
</style>