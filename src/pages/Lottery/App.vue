<!-- LotteryPage.vue -->
<template>
    <div class="lottery-page">
        <!-- 顶部导航栏 -->
        <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
            <template #right>
                <span class="rule-btn" @click="showRulePopup">规则</span>
            </template>
        </van-nav-bar>
        <RulePopup v-model="showRule" title="规则" :rules="ruleList" confirmText="我知道了" />
        <div class="page-content">
            <!-- 大转盘容器 -->
            <div class="lottery-container">
                <div class="lottery-title-img"></div>

                <div class="lottery-board">
                    <!-- 九宫格抽奖区 -->
                    <div class="lottery-grid">
                        <div v-for="(prize, index) in prizes" :key="prize.id" :class="['grid-item', {
                            'is-center': prize.isCenter,
                            'is-active': currentIndex === index,
                            'is-running': isRunning,

                            /*精确区分中间行的左右卡片 */
                            'is-middle-left': index === 3,  /* 索引 3，即第 4 个元素 */
                            'is-middle-right': index === 5  /* 索引 5，即第 6 个元素 */

                        }]" @click="handleGridClick(index)">
                            <!-- 普通格子 -->
                            <div class="prize-card" v-if="!prize.isCenter">
                                <div class="coin-icon"></div>
                                <div class="prize-amount">{{ prize.amount }}</div>
                            </div>

                            <!-- 中心抽奖按钮（带“本次免费 / 领取机会” 小标签） -->
                            <div class="center-card" v-else>
                                <div class="center-title">抽奖 <!-- 注意：给小标签单独 click，避免父级 click 触发两次 -->
                                    <div class="center-note" @click.stop="onCenterCtaClick">
                                        {{ centerCta }}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- “连续抽奖3天 & 我的抽奖记录”版面 -->
            <div class="bottom">
                <!-- 连续抽奖3天 -->
                <div class="sign-section">
                    <div class="section-title">
                        <span class="day-number"> {{ signedCountInCycle }}</span>
                    </div>
                    <div class="section-content">
                        <div class="sign-info">
                            <span class="info-text">再抽1天可得{{ nextItem }}</span>
                            <span class="tip-text">需连续签到才能获取全部奖励</span>
                        </div>
                        <div class="sign-days">
                            <div v-for="day in signInDays" :key="day.day"
                                :class="['day-item', { 'is-signed': day.signed }]">
                                <div class="day-box">
                                    <div class="day-amount">{{ day.reward }}</div>
                                    <div class="day-coin" aria-hidden="true"></div>
                                </div>
                                <div class="day-label">{{ day.label }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 我的抽奖记录 -->
                <div class="record-section">
                    <div class="section-title-list"> </div>
                    <div class="section-content">
                        <div v-if="lotteryRecords.length > 0" class="record-list">
                            <div v-for="record in lotteryRecords" :key="record.id" class="record-item">
                                <span class="record-reward">{{ record.reward }}</span>
                                <span class="record-time">{{ record.time }}</span>
                            </div>
                            <div class="record-tip">仅展示近20次记录</div>
                        </div>
                        <van-empty v-else description="暂无抽奖记录" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 中奖弹窗 -->
        <van-popup v-model:show="showPrizeDialog" position="center" class="prize-popup"
            :style="{ background: 'transparent' }">
            <div class="prize-wrap">
                <!-- 头部装饰图：悬浮在卡片上方 -->
                <div class="prize-top" aria-hidden="true"></div>

                <!-- 主体卡片 -->
                <div class="prize-body">
                    <!-- 顶部黄条“恭喜获得” -->
                    <div class="prize-head-tab">
                        <span>恭喜获得</span>
                    </div>

                    <!-- 奖励文案（例：88火花） -->
                    <div class="prize-amount">{{ prizeResult }}</div>

                    <!-- 金币图 -->
                    <div class="prize-coin" aria-hidden="true"></div>

                    <!-- 按钮区 -->
                    <div class="prize-actions">
                        <van-button block round class="btn-primary" @click="onDoTaskAgain">
                            做任务再抽一次
                        </van-button>
                        <van-button block round class="btn-secondary" @click="onIKnow">
                            我知道了
                        </van-button>
                    </div>

                    <!-- 固定在弹框底部 20px 的关闭按钮 -->
                    <button class="outside-close" type="button" aria-label="Close"
                        @click="showPrizeDialog = false"></button>
                </div>
            </div>
        </van-popup>



        <!-- 领取机会：底部抽屉（Bottom Drawer） -->
        <van-popup close-icon-position="top-right" v-model:show="showChanceDrawer" round position="bottom"
            :style="{ height: '316px', background: 'transparent' }" closeable>
            <div class="drawer-wrap">
                <!-- 悬浮到弹层外的顶部装饰 -->
                <div class="top-icon" aria-hidden="true"></div><!-- 真正带圆角和背景的内容盒子 -->
                <div class="drawer-body">
                    <div class="chance-drawer">
                        <div class="drawer-header">
                            <div class="drawer-title">做任务领抽奖机会</div>
                            <div class="drawer-sub">你有 <b class="chance-num">{{ chanceLeft }}</b> 次抽奖机会</div>
                        </div>

                        <div class="task-list">
                            <!-- 看视频抽奖 -->
                            <div class="task-item">
                                <div class="task-left">
                                    <div class="task-title">
                                        看视频抽奖
                                        <span class="light">({{ watchVideoProgress }}/{{ videoTarget }})</span>
                                    </div>
                                    <div class="task-desc">看精彩视频领 {{ videoTarget }} 次抽奖机会</div>
                                </div>
                                <van-button type="danger" size="small" round class="task-btn" @click="handleWatchVideo"
                                    :disabled="videoDone">
                                    {{ videoBtnText }}
                                </van-button>
                            </div>

                            <!-- 阅读抽奖 -->
                            <div class="task-item">
                                <div class="task-left">
                                    <div class="task-title">
                                        阅读抽奖
                                        <span class="light">({{ readProgress }}/{{ readTarget }})</span>
                                    </div>
                                    <div class="task-desc">{{ desc }}</div>
                                </div>
                                <van-button type="danger" size="small" round class="task-btn" :disabled="readingDone"
                                    @click="handleRead">
                                    {{ readingBtnText }}
                                </van-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </van-popup>
    </div>
    <SuccessPopup v-model:visible="showClaimSuccess" :displayAmount="displayAmount" @close="closeClaimPopup" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import RulePopup from '../../components/Popup/RulePopup.vue'
import { showToast, showDialog } from 'vant'
import {
    getLotteryPage,
    postSpin,
    getStreakAndRecords,
    getTasks,
    claimVideoRewardAsync,
    type LotteryPageSnapshotDto,
    type StreakAndRecordsDto,
    type SpinReq,
    type PrizeDto,
} from '@/api/lottery/api'
import { beginPageView, claim, addOnClick } from '@/utils/YMDataH5Bridge'
/** ============== 类型定义 ============== */
interface Prize { id: number; amount: string; isCenter?: boolean }
interface SignDay { day: number; signed: boolean; label: string; reward: string }
interface LotteryRecord { id: string | number; reward: string; time: string }

// 领取成功弹框
const showClaimSuccess = ref(false)
const displayAmount = ref('')
function closeClaimPopup() {
    showClaimSuccess.value = false
}

// 关闭页面通知移动端的数据
const dataObj = { states: 0, page: 'Lottery', key: '', value: '', type: '' }

/** ============== 状态变量 ============== */
// 九宫格奖品
const prizes = ref<Prize[]>([
    { id: 1, amount: '116火花' },
    { id: 2, amount: '88火花' },
    { id: 3, amount: '208火花' },
    { id: 4, amount: '158火花' },
    { id: 5, amount: '抽奖', isCenter: true },
    { id: 6, amount: '66火花' },
    { id: 7, amount: '188火花' },
    { id: 8, amount: '128火花' },
    { id: 9, amount: '98火花' },
])

// 连签数据
const signInDays = ref<SignDay[]>([
    { day: 1, signed: false, label: '第1天', reward: '58' },
    { day: 2, signed: false, label: '第2天', reward: '169' },
    { day: 3, signed: false, label: '第3天', reward: '85' },
    { day: 4, signed: false, label: '第4天', reward: '358' },
    { day: 5, signed: false, label: '第5天', reward: '173' },
    { day: 6, signed: false, label: '第6天', reward: '58' },
    { day: 7, signed: false, label: '第7天', reward: '666' },
])

const signedCountInCycle = ref(0)
const nextItem = ref<string | null>(null)

// 抽奖记录
const lotteryRecords = ref<LotteryRecord[]>([])

// 网络锁
const spinInFlight = ref(false)

// 基础UI状态
const currentIndex = ref<number | null>(null) // 当前亮起的格子索引
const isRunning = ref(false)                 // 是否正在进行抽奖动画流程
const showPrizeDialog = ref(false)
const prizeResult = ref('')

// —— 概览额度 ——
const freeLeftToday = ref(true)
const chanceLeft = ref(0)
const centerCta = computed(() => {
    if (freeLeftToday.value) return '本次免费'
    if (chanceLeft.value > 0) return `${chanceLeft.value}次机会`
    return '领取机会'
})

// 领取机会抽屉 & 任务数据
const showChanceDrawer = ref(false)
const watchVideoProgress = ref(0)
const videoTarget = ref<number>(10)
const videoBtnText = computed(() => (watchVideoProgress.value >= videoTarget.value ? '已完成' : '看视频'))
const videoDone = computed(() => (watchVideoProgress.value >= videoTarget.value))
const readProgress = ref(0)
const readTarget = ref<number>(1)
const readingDone = computed(() => readProgress.value >= readTarget.value)
const readingBtnText = computed(() => (readingDone.value ? '已完成' : '去阅读'))
const desc = ref('')
const tasksInFlight = ref(false)

/** ============== 动画核心控制变量 (新) ============== */
// 顺时针路径 (对应 grid 索引)
const lotteryPath = [0, 1, 2, 5, 8, 7, 6, 3]

const timer = ref<any>(null)       // 定时器引用
const currentSpeed = ref(100)      // 当前速度(ms)
const stepsToStop = ref(0)         // 还需要走多少步
const isStopping = ref(false)      // 是否进入减速停车阶段
const targetGridIndex = ref(-1)    // 目标格子索引

// 动画常量配置
const MIN_SPEED = 50              // 最快速度 (50ms一格)
const EXTRA_CYCLES = 2            // 拿到结果后，额外多转几圈缓冲
const SLOW_DOWN_STEP = 20         // 减速步进 (每格增加20ms延迟)


/** ============== 导航 & 弹窗逻辑 ============== */
function onClickLeft() {
    try {
        dataObj.page = 'Lottery';
        dataObj.key = '';
        dataObj.value = '';
        dataObj.type = '';
        (window as any).H5Bridge?.closePage?.(dataObj)
    } catch { }

    //用户浏览抽奖页面结束-数据埋点
    beginPageView('2', '展示抽奖领取机会时')
}

const showRule = ref(false)
const ruleList = ref<string[]>([
    '参与本活动前，请用户详细阅读活动规则及相关条款。凡参与本活动，则视为用户已阅读、理解并同意活动规则全部内容。',
    '一、 活动介绍',
    '1. 活动名称：抽奖必中火花（以下简称「本活动」）。',
    '2. 活动范围：围炉小说（以下简称「本产品」）最新版本手机客户端的受邀用户。基于设备、位置、客户端版本等原因限制，部分用户可能无法参与本活动或仅能使用本活动的部分功能，敬请谅解。',
    '3. 活动奖励：火花、现金或其他端内权益奖励（以下统称为「奖励」）。',
    '二、参与方式',
    '4. 抽奖赢好礼：活动期间，用户可通过完成看视频、阅读等任务获得抽奖机会，获得次数以活动页面提示为准。获得抽奖机会后可消耗抽奖机会参与抽奖，并随机获得奖励火花、现金或其他端内权益等奖励。',
    '5. 为完成任务获得抽奖机会，用户需在平台内或在指定APP内观看视频、阅读小说，达到一定时长后视为完成任务。抽奖机会将于用户完成任务后自动发放，具体以任务页面说明为准。',
    '6. 用户每日可完成任务获得抽奖次数存在上限，具体以活动页面提示为准。',
    '7. 就“现金红包”而言，需用户授权绑定支付宝 / 微信账号后才可自动打款，若打款失败会发放等额现金奖励至活动钱包，用户可根据提现规则提现。',
    '8. 用户每日可参与的抽奖次数有上限，具体以活动页面提示为准。',
    '9. 连续抽奖领火花：活动期间连续多日前往抽奖活动页面参与抽奖可领取火花，获得的火花数量及连续抽奖天数上限具体以活动页展示为准。',
    '三、特别说明',
    '10. 日历权限：为向用户提示活动开启时间或发送活动预告提醒，在用户同意开启系统日历权限后，本产品可在用户手机系统日历中写入 / 编辑活动信息。若用户希望取消日历提醒，请在手机系统日历中删除本活动相关信息。',
    '11. 剪切板与相册说明：在用户分享或接收被分享的信息时，本产品需要访问用户的剪切板以识别口令、分享码、链接，仅在识别为本产品跳转/分享/联动指令时才会上传相关信息至服务器；此外，可能需要读取用户相册以便分享或接收媒体。下载任务完成情况可能用剪切板口令记录以发放奖励。',
    '12. 账号与设备绑定说明：用户以某个账号首次参与本活动后，为避免该账号下累计的奖励失效，需以该特定账号继续参与。若在同一设备使用其他账号参与，系统会提示切换；活动期间各客户端进度将同步，次数/频率等限制按全部客户端合并计算。活动同步依赖部分设备标识与账号信息。',
    '四、法律声明',
    '13. 同一用户定义：使用同一账号、同一手机号、同一设备、同一提现/支付账户、同一收货地址或其他相关信息任意项相同或系统认定有关联者，均视为同一用户并按同一用户处理。',
    '14. 设备与账号限制：同一设备最多可使用一个账号参与活动，同一账号最多可使用一台设备参与活动；若在同一设备登录多个账号，视为同一用户，仅有一个账号可参与活动。',
    '15. 违规与惩罚：用户不得采取作弊手段参与活动（包括但不限于使用非官方客户端、模拟器、插件、群控、外挂、多个账号、篡改设备/位置信息、买卖账号或活动权益、批量注册、洗钱等）。发现违规，本产品有权取消资格、追回奖励、限制提现、封禁账号并追究法律责任。',
    '16. 活动异常与不可抗力：若因不可抗力、政府政策、平台或第三方故障、网络或支付问题等导致活动无法正常进行，本产品有权暂停或取消活动且不承担责任。',
    '17. 禁止利用活动进行公开砍价/助力等不当行为，若通过此类方式获得奖励，本产品有权不发放或收回奖励，且对因此产生的经济损失不承担责任。',
    '18. 奖励限额：根据相关法律法规，同一用户在同一活动中可领取的奖励总价值不超过人民币5万元，超过部分不予发放。',
    '19. 用户原因导致无法领取奖励：若因用户自身原因无法实际享有奖励，视为用户放弃，产品无义务补偿。',
    '20. 第三方诈骗：任何第三方以本产品名义进行欺诈，本产品无需承担法律责任。',
    '21. 协议适用：本活动同样适用本产品《用户协议》《隐私政策》《围炉活动规则》，若冲突以本活动规则为准，未约定事项仍以前述协议为准。',
    '22. 规则变更：在法律允许范围内，本产品有权变更活动规则，变动公布后即时生效，用户继续参与视为同意变更。',
    '23. 未成年人参与：未成年人应在监护人陪同并经明确同意下参与，或使用儿童/青少年模式（如有）。',
    '24. 反馈与帮助：如遇问题，请在【我的】-【反馈与帮助】中反馈。',
    '25. 本活动与 Apple Inc. 无关。'
])
const showRulePopup = () => { showRule.value = true }
/** ============== 任务逻辑 ============== */
async function loadTasks() {
    if (tasksInFlight.value) return
    tasksInFlight.value = true
    try {
        const dto = await getTasks()
        if (typeof dto?.chanceLeft === 'number') {
            chanceLeft.value = dto.chanceLeft
        }
        const reading = (dto?.tasks || []).find((t: any) => t.taskCode === 'reading')
        if (reading) {
            readProgress.value = Number(reading.progress ?? 0)
            readTarget.value = Number(reading.target ?? 1)
            desc.value = reading.desc
        }
        const video = (dto?.tasks || []).find((t: any) => t.taskCode === 'video')
        if (video) {
            watchVideoProgress.value = Number(video.progress ?? 0)
            videoTarget.value = Number(video.target ?? 1)
        }

    } catch (e: any) {
        console.warn('loadTasks failed:', e?.message || e)
    } finally {
        tasksInFlight.value = false
    }
}
watch(showChanceDrawer, (v) => { if (v) loadTasks() })

/** ============== 数据填充逻辑 ============== */
function applySnapshot(s: LotteryPageSnapshotDto) {
    const mapped: Prize[] = s.prizes.map((p) => ({
        id: p.id,
        amount: p.isCenter ? '抽奖' : (p.label || ''),
        isCenter: !!p.isCenter,
    }))
    // 确保 id 为 5 的在中间
    const centerIdx = mapped.findIndex((x) => x.isCenter)
    if (centerIdx !== -1 && centerIdx !== 4) {
        const tmp = mapped[4]
        mapped[4] = mapped[centerIdx]
        mapped[centerIdx] = tmp
    }
    prizes.value = mapped

    if (s.chanceSummary) {
        freeLeftToday.value = !!s.chanceSummary.freeLeftToday
        chanceLeft.value = s.chanceSummary.chanceLeft ?? 0
    }
}

function applyStreakAndRecords(sr: StreakAndRecordsDto) {
    signInDays.value = (sr.streak?.days || []).map((d) => ({
        day: d.day,
        signed: d.signed,
        label: d.label,
        reward: d.reward,
    }))
    const idx = signInDays.value.map(item => item.signed).lastIndexOf(true);
    nextItem.value = (idx !== -1 && idx < signInDays.value.length - 1)
        ? signInDays.value[idx + 1]?.reward
        : signInDays.value[0]?.reward;

    lotteryRecords.value = (sr.records || []).map((r) => ({
        id: r.id,
        reward: r.reward,
        time: r.time,
    }))
    signedCountInCycle.value = sr.streak?.signedCountInCycle
}

onMounted(async () => {
    loadTasks();
    beginPageView('1', '展示抽奖领取机会时');
    // 监听 Flutter 桥接
    try {
        window.H5Bridge.on('pageRefresh', (data) => {
            if (data?.taskId == 10006) {
                showClaimSuccess.value = true;
                displayAmount.value = '获得一次抽奖机会';
                claimVideoRewardAsync({ clientRefId: data.transId }).then((() => {
                    loadTasks();
                    //权益领取数据埋点
                    claim({ task_id: 10006, benefit_type: '机会', claim_quantity: '一次' });
                }));
            }
        })
    } catch { }

    try {
        const page = await getLotteryPage()
        applySnapshot(page)
    } catch { }

    try {
        const sr = await getStreakAndRecords()
        applyStreakAndRecords(sr)
    } catch { }
})

onUnmounted(() => {
    // 组件销毁时清除定时器，防止报错
    if (timer.value) clearTimeout(timer.value)
})

function getDebugParams() {
    const u = new URL(window.location.href)
    return {
        debugFixedPrizeId: u.searchParams.get('debugId') ? Number(u.searchParams.get('debugId')) : undefined,
        obtainCount: u.searchParams.get('obtain') ? Number(u.searchParams.get('obtain')) : undefined,
    }
}


/**
 * =====================================================
 * 核心动画逻辑 (修改版)
 * 原理：
 * 1. 点击即开始 runLoop (匀速空转)
 * 2. 拿到后端结果后，计算 stepsToStop (平滑减速路径)
 * 3. 按照 stepsToStop 逐帧减速直到停止
 * =====================================================
 */
const runLoop = () => {
    // 1. 移动一步
    if (currentIndex.value === null) {
        currentIndex.value = lotteryPath[0]
    } else {
        const currPathIdx = lotteryPath.indexOf(currentIndex.value)
        const nextPathIdx = (currPathIdx + 1) % lotteryPath.length
        currentIndex.value = lotteryPath[nextPathIdx]
    }

    // 2. 判断是否进入停车阶段
    if (isStopping.value) {
        stepsToStop.value -= 1 // 剩余步数 -1

        // 步数走完 -> 停止
        if (stepsToStop.value <= 0) {
            clearTimeout(timer.value)
            isRunning.value = false

            // 矫正最终位置 (兜底)
            if (targetGridIndex.value !== -1) {
                currentIndex.value = targetGridIndex.value
            }

            // 稍微延时展示弹窗
            setTimeout(() => {
                showPrizeDialog.value = true
            }, 300)
            return
        }

        // 减速算法：线性增加延迟
        currentSpeed.value += SLOW_DOWN_STEP
    }
    else {
        // 3. 还在请求中 -> 保持高速转动
        // 刚开始可以做个简单的加速效果 (从 150 -> 50)
        if (currentSpeed.value > MIN_SPEED) {
            currentSpeed.value -= 10
        } else {
            currentSpeed.value = MIN_SPEED
        }
    }

    // 4. 下一帧
    timer.value = setTimeout(runLoop, currentSpeed.value)
}


// 点击抽奖按钮
const onCenterCtaClick = async () => {
    // 防重复点击
    if (isRunning.value || spinInFlight.value) return
    try {
        const dbg = getDebugParams()
        const req: SpinReq = {
            clientRefId: `spin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ...(Number.isFinite(dbg.debugFixedPrizeId) ? { debugFixedPrizeId: dbg.debugFixedPrizeId } : {}),
            ...(Number.isFinite(dbg.obtainCount) ? { obtainCount: dbg.obtainCount } : {}),
        }

        // --- 2. 并行发送请求 ---
        const res = await postSpin(req).then((res) => {
            // --- 1. 立即启动视觉动画 (不等待请求) ---
            isRunning.value = true
            spinInFlight.value = true

            // 重置动画状态
            isStopping.value = false
            stepsToStop.value = 0
            currentSpeed.value = 150 // 初始速度
            targetGridIndex.value = -1

            // 开始跑
            runLoop()
            //友盟数据埋点-用户点击时
            addOnClick({ taskId: 10006, pageName: '点击去抽奖时' });
            // 更新页面数据
            freeLeftToday.value = res.freeLeftToday
            chanceLeft.value = res.chanceLeft
            prizeResult.value = res.prize?.label || ''

            // 插入记录
            if (res.record) {
                lotteryRecords.value.unshift({
                    id: res.record.id,
                    reward: res.record.reward,
                    time: res.record.time
                })
                if (lotteryRecords.value.length > 30) lotteryRecords.value.length = 30
            }

            // --- 3. 计算平滑停车路径 ---
            const backendPrizeId = res.prize?.id ?? 5
            const finalGridIndex = prizes.value.findIndex(p => p.id === backendPrizeId)

            // 异常校验
            if (finalGridIndex === -1 || !lotteryPath.includes(finalGridIndex)) {
                console.error('Target prize not in path', backendPrizeId)
                throw new Error('奖品配置异常')
            }

            targetGridIndex.value = finalGridIndex

            // 计算从“当前动画位置”到“目标位置”需要的步数
            // 注意：这里必须用 currentIndex.value (当前实时位置)
            const currentPathIdx = lotteryPath.indexOf(currentIndex.value as number)
            const targetPathIdx = lotteryPath.indexOf(finalGridIndex)

            // 计算距离 (考虑跨圈)
            let distance = targetPathIdx - currentPathIdx
            if (distance <= 0) distance += lotteryPath.length

            // 设置总步数：基础距离 + 额外缓冲圈数
            stepsToStop.value = distance + (lotteryPath.length * EXTRA_CYCLES)

            // 标记开始停车 -> runLoop 检测到后会开始减速
            isStopping.value = true

            // 顺便刷新连签
            getStreakAndRecords().then(applyStreakAndRecords).catch(() => { })
        })
    } catch (e: any) {
        // --- 异常处理 ---
        console.error(e)
        // 必须立刻停止动画，否则会死循环空转
        if (timer.value) clearTimeout(timer.value)
        isRunning.value = false
        spinInFlight.value = false

        const msg = e?.message || ''
        if (msg.includes('抽奖机会不足') || msg.includes('免费已用完')) {
            showChanceDrawer.value = true
        } else {
            showToast(msg || '网络抖动，请重试')
        }
    } finally {
        spinInFlight.value = false
        // isRunning 不在这里设为 false，由 runLoop 停下时自己设
    }
}

/** ============== 其他事件处理 ============== */
const handleGridClick = (index: number) => {
    if (!prizes.value[index].isCenter) return
    onCenterCtaClick()
}

const handleWatchVideo = () => {
    if (watchVideoProgress.value >= videoTarget.value) {
        showToast('今日看视频已达上限')
        return
    }
    dataObj.page = 'Lottery';
    dataObj.type = 'ShowVedioAD'
    dataObj.key = 'ShowVedioAD'
    dataObj.value = '10006'
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}

const handleRead = () => {
    if (readingDone.value) {
        showToast('今日阅读任务已完成')
        return
    }
    dataObj.page = 'Lottery';
    dataObj.type = ''
    dataObj.key = 'switchTab'
    dataObj.value = '0'
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}

const onDoTaskAgain = () => {
    showPrizeDialog.value = false
    showChanceDrawer.value = true
    loadTasks()
}

const onIKnow = () => {
    showPrizeDialog.value = false
}
</script>

<style scoped lang="scss">
/* ================== 全局与页面基调 ================== */
.lottery-page {
    min-height: 100vh;
    background-image: url('/img/Lottery/back.png');
    background-size: cover;
    background-position: top center;
    background-repeat: no-repeat;
    background-color: #f5e6d3;
    overflow: hidden;
    --overlap-y: 25px;
    /* 抽奖盘与下方版面叠压距离 */
}

.nav-bar {

    background: transparent;
    padding-top: 35px;

    :deep(.van-nav-bar__arrow) {
        color: rgba(30, 30, 30, 1); // 修改颜色
        font-size: 22px; // 修改大小
        font-weight: bold; // 加粗（可选）
    }

}

.rule-btn {
    font-weight: 600;
    font-style: Semibold;
    font-size: 18px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
}

.page-content {
    overflow-y: auto;
    // padding-bottom: 20px
}

/* ================== 标题图 ================== */
.lottery-title-img {
    background: url(/img/Lottery/title.png) no-repeat top center / contain;
    height: 102px
}

/* —— 自适应大转盘 —— */
.lottery-board {
    aspect-ratio: 1;
    margin: -40px auto 0;
    position: relative;
    background: url(/img/Lottery/转盘背景.png) no-repeat center center / contain;
    z-index: 2;
    display: block;
    --grid-w: clamp(210px, 58%, 320px);
    --grid-top: 31%;
    --gap: clamp(6px, 2.2vw, 12px);

    &::before {
        content: '';
        position: absolute;
        inset: 8px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(255, 255, 255, .2) 0%, transparent 50%);
        pointer-events: none;
    }
}

/* ================== 九宫格 ================== */
.lottery-grid {
    position: absolute;
    top: var(--grid-top);
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    width: var(--grid-w);
    grid-template-columns: repeat(3, 1fr);
    gap: var(--gap);
    z-index: 1;
    margin-left: -13.5px;
    margin-top: 1.5px;
}

.grid-item {
    aspect-ratio: 1;
    border-radius: clamp(6px, 1.4vw, 12px);
    cursor: pointer;
    transition: transform .2s ease, box-shadow .2s ease;
    background: linear-gradient(178.24deg, #FFFEFA 1.48%, #FFF3B2 125.6%);
    border: .5px solid;
    border-image-source: linear-gradient(160.89deg, #FFFFFF -3.09%, #FFDA88 72.27%);
    box-shadow: 0 2px 4px 0 #FFFFFF99 inset, 0 1px 3px rgba(0, 0, 0, .06);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 73px;
    height: 75px;
}

/* 普通奖励卡片 */
.prize-card {
    // width: 76%;
    height: 76%;
    // padding: 4%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(4px, 1.2vw, 8px);
    margin: auto;
}

.coin-icon {
    width: clamp(18px, 7.6vw, 28px);
    height: clamp(18px, 7.6vw, 28px);
    border-radius: 50%;
    background: url('/img/Lottery/金币.png') no-repeat center / contain;
}

.prize-amount {
    font-size: 11px;
    width: 110%;
    height: clamp(16px, 5.5vw, 26px);
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    // line-height: 1.1;
    font-weight: 500;
    color: rgba(112, 90, 5, 1);
    background: linear-gradient(178.1deg, #FFECB5 1.6%, #FFD57B 98.4%);
    border: .5px solid;
    border-image-source: linear-gradient(160.89deg, #FFFFFF -3.09%, #FFDA88 72.27%);
    box-shadow: 0 2px 4px 0 #FFFFFF99 inset;
    border-radius: clamp(4px, 1.4vw, 8px);
    margin-bottom: -17px;
}

/* —— 中心按钮外观 —— */

.grid-item.is-center {
    /* 1. 设置背景图 */
    background: url(/img/Lottery/抽奖机会按钮.png) no-repeat center center / contain;
    /* 2. 关键：去除默认 .grid-item 的样式干扰 */
    background-color: transparent;
    /* 去掉底部的黄色渐变色 */
    border: none;
    /* 去掉边框 */
    box-shadow: none;
    /* 去掉阴影和内发光 */
}

/* 保持点击时的反馈或运行时的状态*/
.grid-item.is-running.is-center {
    pointer-events: none;
    opacity: .95;
}

.grid-item.is-running.is-center {
    pointer-events: none;
    opacity: .95
}

.grid-item.is-middle-left {
    background: linear-gradient(178.1deg, #FFFEFC 1.6%, #FFE571 98.4%);
    border: 0.5px solid;
    border-image-source: linear-gradient(160.89deg, #FFFFFF -3.09%, #FFDA88 72.27%);
    box-shadow: 0px 2px 4px 0px #FFFFFF99 inset;
}

.grid-item.is-middle-right {
    background: linear-gradient(178.1deg, #FFFEFC 1.6%, #FFE571 98.4%);
    border: 0.5px solid;
    border-image-source: linear-gradient(160.89deg, #FFFFFF -3.09%, #FFDA88 72.27%);
    box-shadow: 0px 2px 4px 0px #FFFFFF99 inset;
}

/* 走马灯高亮 */
.grid-item.is-active {
    transform: scale(.95);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, .9), 0 0 20px rgba(255, 107, 53, .6);
    animation: pulse .3s ease-in-out;
}

@keyframes pulse {

    0%,
    100% {
        transform: scale(.95)
    }

    50% {
        transform: scale(.9)
    }
}

/* 中心内部布局 */
.center-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    /* 垂直居中 */
    gap: 4px;
}

.center-title {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Heavy;
    font-size: 16px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
    color: rgba(255, 255, 255, 1);
    line-height: 1.5;
}

.center-note {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 10px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
    color: rgba(255, 255, 255, 1);
}

/* ================== 连签与记录（保持不变） ================== */
.bottom {
    margin-top: calc(-1 * var(--overlap-y));
    padding-top: var(--overlap-y);
    background: url('/img/Lottery/bottom-back.png') no-repeat center top;
    background-size: 100% auto;
    position: relative;
    z-index: 1;
    padding-bottom: 30px;
}

.sign-section,
.record-section {
    padding: 0 16px;
    padding-top: 36px
}

.section-title {
    /* 基础布局 - 保持绝对定位悬浮在内容框上方 */
    position: absolute;
    /* 替换为你上传的图片的路径，假设你保存为 title_bg.png */
    background: url(/img/Lottery/连续抽奖.png) no-repeat center center / contain;
    /* 或者直接使用 Base64，如果图片很小 */

    width: 153px;
    /* 根据图片比例设定的宽度，可按需微调 */
    height: 53px;
    /* 根据图片比例设定的高度 */

    /* 清除原本的阴影和边框，因为新图自带设计感 */
    box-shadow: none;
    border-radius: 0;
    padding: 0;

    /* 确保文字层级正确 */
    z-index: 10;
}

/* 新增 .day-number 用于精准定位数字 */
.section-title .day-number {
    position: absolute;

    /* === 核心定位参数 (根据你的图片空隙调整) === */
    right: 35px;
    /* 距离右侧边缘的距离，控制左右位置 */
    top: 41%;
    /* 垂直居中 */
    transform: translateY(-50%);
    /* 垂直居中修正 */

    /* === 字体样式还原 === */
    font-family: 'Alibaba PuHuiTi', 'PingFang SC', sans-serif;
    font-weight: 900;
    /* 极粗字体 */
    font-size: 25px;
    /* 字号大小，根据空隙大小调整 */
    color: #BF604A;
    /* 深棕色，匹配图片上的文字颜色 */
    /* 如果觉得颜色不够深，可以尝试 #4A2E00 */

    line-height: 1;
    text-align: center;
    min-width: 20px;
    /* 防止数字只有1位时位置偏移 */
}

.section-title-list {
    display: inline-block;
    padding: 2.5641vw 5.12821vw;
    border-radius: 4.10256vw 4.10256vw 0 0;
    font-weight: bold;
    color: #5c3d00;
    font-size: 3.84615vw;
    box-shadow: 0 0.51282vw 2.05128vw rgba(255, 205, 60, 0.3);
    /* margin-left: -1.28205vw; */
    background: url(/img/Lottery/我的抽奖记录.png) no-repeat center center / contain;
    position: absolute;
    /* margin-top: 0px; */
    width: 153px;
    height: 53px;
}

.section-content {
    max-height: 230px;
    background: rgba(255, 249, 233, 1);
    outline: 4px solid #ffb80b;
    border: 5px solid rgba(248, 230, 183, 1);
    border-radius: 5px;

    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
    margin-top: 42px
}

.sign-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-size: 14px
}

.info-text {
    color: #333;
    font-weight: 500
}

.tip-text {
    opacity: 0.9;
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 12px;
    leading-trim: NONE;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;
    color: rgba(136, 110, 11, 1)
}

/* ==== 连续抽奖小卡片：由图片驱动（已领取/未领取） ==== */
/* 基础位移与尺寸保持原来布局，只覆盖背景与内部排版 */
.sign-days {
    display: flex;
    gap: 2px;
}

.day-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    // gap: 6px;
    flex: 1
}

.day-box {
    position: relative;
    /* --- 修改开始：强制固定宽高 --- */
    width: 38px;
    height: 52px;
    flex-shrink: 0;
    /* 防止在某些小屏幕下被挤压变形 */
    /* --- 修改结束 --- */

    /* 背景图设置：contain 保持图片比例，或者用 100% 100% 强制拉伸填满 */
    background: url('/img/Lottery/未领取红包.png') no-repeat center center / 100% 100%;

    border: none !important;
    box-shadow: none !important;
    margin: 0 auto;
    /* 确保在父容器中水平居中 */
}

/* 已领取 → 换图：已领取红包.png */
.day-item.is-signed .day-box {
    background-image: url('/img/Lottery/已领取红包.png');
}

/* 顶部奖励数字（例：1825） */
.day-amount {
    position: absolute;
    top: 23%;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 2px;
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: .5px;
    color: rgba(254, 98, 14, 1);
    /* 未领取文字颜色 */
    line-height: 1;
    white-space: nowrap;
}

/* 红包里的金币（金币.png） */
.day-coin {
    position: absolute;
    left: 50%;
    bottom: 22%;
    transform: translateX(-50%);
    width: 1rem;
    height: 1rem;
    background: url('/img/Lottery/金币1.png') no-repeat center / contain;
}

.day-item.is-signed .day-amount {
    color: #FFFFFF;
    /* 已领取文字颜色，配合深色底更清晰 */
}

.check-icon {
    color: #fff;
    font-size: 20px;
    font-weight: bold
}

.day-reward {
    font-size: 11px;
    color: #ff8c42;
    font-weight: bold
}

.day-item.is-signed .day-reward {
    color: #fff
}

.day-label {
    margin-top: 5px;
    font-family: PingFang SC;
    font-weight: 500;
    font-style: Medium;
    leading-trim: NONE;
    line-height: 100%;
    letter-spacing: 0.47px;
    font-size: 9.45px;
    color: #A79277;
}

.record-list {
    display: flex;
    flex-direction: column;
    height: 210px;
    overflow: auto;
}

.record-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid #f5f5f5
}

.record-item:last-of-type {
    border-bottom: none
}

.record-reward {
    opacity: 0.9;
    font-weight: 500;
    color: rgba(105, 66, 33, 1);
    font-size: 14px
}

.record-time {
    font-size: 12px;
    color: rgba(152, 132, 107, 1);
    opacity: 0.9;
}

.record-tip {
    text-align: center;
    font-size: 12px;
    color: #ccc;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f5f5f5
}

/* ================== 领取机会抽屉（Bottom Drawer） ================== */
/* 关键：允许 Popup 根元素溢出（scoped 下用 :deep 覆盖） */
:deep(.van-popup--bottom) {
    overflow: visible !important;
    background: transparent !important;
}

/* 让关闭按钮永远在最上面 */
:deep(.van-popup__close-icon) {
    color: #9A2D26;
    z-index: 3;
}

:deep(.van-overlay) {
    background: rgba(0, 0, 0, 0.5);
}

.drawer-wrap {
    position: relative;
    height: 100%;
}

.top-icon {
    position: absolute;
    left: 50%;

    /* 【核心修改 1】只保留水平居中，去掉垂直方向的百分比位移 */
    transform: translateX(-50%);

    /* 【核心修改 2】直接用 px 写死位置。
       计算公式：原 top(-66px) + 原 transform(-157px) ≈ -223px
       你可以微调这个数字，直到图片和卡片完美贴合 */
    top: -223px;

    /* 保持原有尺寸设置 */
    width: 390px;
    height: 262px;
    background: url(/img/Lottery/topicon.png) no-repeat center / contain;
    pointer-events: none;
    z-index: 1;
    overflow: hidden !important;
}

/* 把圆角和背景给到内层容器，避免根层 visible 时圆角无效 */
/* 抽屉主体：盖在图片之上并裁圆角 */
.drawer-body {
    position: absolute;
    inset: 0;
    z-index: 2;
    /* 比图片高 → 盖住重叠部分 */
    border-radius: 20px 20px 0 0;
    overflow: hidden;
    /* 内容按圆角裁切 */
    background: linear-gradient(180deg, #FDF5BE -2.36%, #FED888 24.85%, #F6F2EC 102.49%);
}

.chance-drawer {
    padding: 16px
}

.drawer-header {
    text-align: center;
    padding: 15px 12px;
    margin: 4px 4px 12px 4px;
}

.drawer-title {
    font-size: 20px;
    font-weight: 700;
    color: #9a3b00;
    letter-spacing: .5px;
    margin-top: -10px;
    font-family: PingFang SC;
    font-weight: 600;
    font-style: Semibold;
    font-size: 22px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: center;

}

.drawer-sub {
    margin-top: 15px;
    color: #9A2D26;
    font-size: 16px;
    font-weight: 300;
}

.chance-num {
    color: #e05b00
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
    opacity: 0.8;

}

.task-item {
    background: rgba(255, 255, 255, 0.6);
    // opacity: 0.7;
    border-radius: 12px;
    padding: 14px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 10px rgba(0, 0, 0, .05);
}

.task-left {
    display: flex;
    flex-direction: column;
    gap: 6px
}

.task-title {
    font-family: PingFang SC;
    font-weight: 500;
    font-size: 16px;
    line-height: 16px;
    letter-spacing: 0px;
    vertical-align: middle;
    color: #9A2D26;
}

.task-title .light {
    font-weight: 500;
    color: #fa6400;
    margin-left: 6px;
    font-size: 14px
}

.task-desc {
    font-family: PingFang SC;
    font-weight: 500;
    font-style: Medium;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0px;
    color: rgba(154, 154, 154, 1);
}

.task-btn {
    min-width: 84px;
    background: linear-gradient(228.42deg, #FFAC4D 8.11%, #fe0c00 67.38%);
    background: linear-gradient(228.42deg, #FFAC4D 8.11%, #FE5200 67.38%);
    border: none;
}

:deep(.van-button__content) {
    font-weight: 600
}

@media (prefers-reduced-motion: reduce) {
    .grid-item.is-active {
        animation: none;
        box-shadow: 0 0 0 4px rgba(255, 255, 255, .9)
    }
}

@media (max-width:320px) {
    .lottery-board {
        --grid-w: clamp(210px, 58%, 320px);
        --gap: clamp(5px, 1.8vw, 10px)
    }
}

/* ================== 中奖弹窗 ================== */
/* 确保弹窗根元素可溢出 */
:deep(.van-popup) {
    overflow: visible !important;
}

.prize-wrap {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* 顶部装饰图 - 悬浮在弹窗外 */
.prize-top {
    position: absolute;
    left: 50%;
    top: -3%;
    transform: translate(-50%, -50%);
    width: 390px;
    height: 262px;
    background: url(/img/Lottery/topicon.png) no-repeat center center / contain;
    pointer-events: none;
    z-index: 1;
}

/* 主体卡片 */
.prize-body {
    position: relative;
    z-index: 2;
    width: 270px;
    height: 320px;
    margin: 80px;
    background: linear-gradient(180deg, #FFF9E6 0%, #FFFBF0 100%);
    border-radius: 24px;
    padding: 0 24px 32px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    top: -50%;
}

/* 顶部黄条"恭喜获得" */
.prize-head-tab {
    width: 200px;
    margin: 0 -24px 20px;
    background: linear-gradient(180deg, #FFEBAE 0%, #FFDF87 8.65%, #FFD96A 74.04%, #FFC843 87.02%, #FFD14E 100%);
    border-radius: 0 0 16px 16px;
    padding: 6px 0px 0px 0px;
    text-align: center;
    height: 36px;

    span {
        font-size: 16px;
        font-weight: 600;
        color: rgba(154, 45, 38, 1);
        letter-spacing: 2px;
    }
}

/* 中奖弹窗内的奖励金额 - 使用更具体的选择器 */
.prize-body .prize-amount {
    font-size: 20px;
    font-weight: 700;
    color: #8B2500;
    margin: 8px 0 16px;
    letter-spacing: 1px;
    width: auto;
    height: auto;
    padding: 0;
    background: none;
    border: none;
    box-shadow: none;
    border-radius: 0;
    display: block;
}

/* 金币图标 */
.prize-coin {
    width: 100px;
    height: 100px;
    background: url('/img/Lottery/金币正视图.png') no-repeat center / contain;
    margin: 0 0 20px;
    //animation: coinFloat 2s ease-in-out infinite;
}

@keyframes coinFloat {

    0%,
    100% {
        transform: translateY(0) rotate(0deg);
    }

    25% {
        transform: translateY(-8px) rotate(2deg);
    }

    75% {
        transform: translateY(-8px) rotate(-2deg);
    }
}

/* 按钮区域 */
.prize-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .van-button {
        height: 44px;
        font-size: 14.12px;
        font-weight: 400;
        border: none;
    }

    .btn-primary {
        background: linear-gradient(228.42deg, #FFAC4D 8.11%, #FE5200 67.38%);
        color: #fff;
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);

        &:active {
            opacity: 0.9;
        }
    }

    .btn-secondary {
        background: linear-gradient(204.35deg, #FEED4F -5.62%, #F6C128 82.71%);
        color: #8B4500;
        box-shadow: 0 4px 12px rgba(255, 217, 61, 0.3);

        &:active {
            opacity: 0.9;
        }
    }
}

/* 悬浮关闭按钮 */
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
    width: 30px;
    height: 30px;
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
