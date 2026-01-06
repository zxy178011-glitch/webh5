<template>
    <div class="app">
        <div class="myearnings-page">

            <RulePopup v-model="showRule" title="规则" :rules="ruleList" confirmText="我知道了" />
            <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
                <template #title>
                    <span class="nav-title">我的收益</span>
                </template>
                <template #right>
                    <span class="rule-btn" @click="showRulePopup">规则</span>
                </template>
            </van-nav-bar>

            <div class="page-content">
                <div class="myearnings-alert" @click="goToAuth"
                    v-if="bindingStatusLoaded && !userBindings.isRealNameAuthenticated">
                    <van-icon name="info-o" />
                    <span>点击进行实名认证,提现更安心</span>
                    <van-icon name="arrow" />
                </div>

                <div class="earnings-card">
                    <div class="earnings-row">
                        <div class="earnings-item" @click="goToRevenueRecord('spark')">
                            <div class="label">火花收益 (火花) <van-icon name="arrow" size="12" /></div>
                            <div class="amount">{{ earnings.spark }}</div>
                        </div>
                        <div class="earnings-item" @click="goToRevenueRecord('cash')">
                            <div class="label">现金收益 (元) <van-icon name="arrow" size="12" /></div>
                            <div class="amount">{{ earnings.cash.toFixed(2) }}</div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <div class="custom-tabs capsule">
                        <div class="custom-tabs-wrap">
                            <div class="custom-tabs-nav">
                                <div :class="['custom-tab', { 'custom-tab--active': activeTab === 'alipay' }]"
                                    @click="handleTabClick('alipay')">
                                    <div class="tjpay">推荐</div>
                                    <div class="tab-title">
                                        <span class="alipay"></span>
                                        <span>支付宝</span>
                                    </div>
                                </div>
                                <div :class="['custom-tab', { 'custom-tab--active': activeTab === 'wechat' }]"
                                    @click="handleTabClick('wechat')">
                                    <div class="tab-title">
                                        <span class="wechat-pay"></span>
                                        <span>微信</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div class="withdraw-tips">
                        {{ withdrawtips }}
                    </div>

                    <van-loading v-if="loading" type="spinner" class="loading-container">加载中...</van-loading>

                    <div v-else class="amount-grid">
                        <div v-for="(opt, idx) in withdrawOptions" :key="idx" :class="[
                            'amount-option',
                            opt.amount >= 20 ? 'large' : 'small',
                            {
                                'highlight': opt.highlight,
                                'is-selected': selectedIndex === idx,
                                'is-disabled': isDisabled(opt)  //  这里会调用更新后的 isDisabled 方法
                            }
                        ]" @click="onSelect(opt, idx)">
                            <span v-if="opt.badge" class="badge" :class="{ limited: opt.badge === '限时' }">
                                {{ opt.badge }}
                            </span>

                            <div class="value">
                                {{ opt.amount.toFixed(2) }}<span class="unit">元</span>
                            </div>
                            <div class="desc" v-if="opt.desc">{{ opt.desc }}</div>
                        </div>
                    </div>

                    <div class="action-btn" :class="{ 'is-disabled': isActionBtnDisabled }" @click="handleActionBtn">
                        <div class="btn-text">{{ actionBtnText }}</div>
                        <div class="btn-subtext">{{ actionBtnSubtext }}</div>
                    </div>
                </div>
            </div>

            <BindingPopup v-model="showBindingPopup" :method="bindingMethod" @confirm="handleGoBinding" />

            <van-popup v-model:show="showAuthPopup" class="custom-pink-popup" round :close-on-click-overlay="true">
                <div class="popup-wrapper">
                    <div class="content-top">
                        <h3 class="pop-title">实名认证</h3>
                        <div class="pop-message">
                            完成实名认证后,提现更快更安全!<br>
                        </div>
                    </div>
                    <div class="content-bottom">
                        <!-- <van-button class="action-btn-main" round block @click="handleGoRealNameAuth">
                            去认证
                        </van-button> -->
                        <div class="confirm-btns">
                            <button class="btn btn-cancel" @click="showAuthPopup = false">
                                取消
                            </button>
                            <button class="btn btn-confirm" @click="handleGoRealNameAuth">
                                去认证
                            </button>
                        </div>
                    </div>
                </div>
                <!-- <button class="outside-close-btn" @click="showAuthPopup = false"></button> -->
            </van-popup>

        </div>
        <SuccessPopup v-model:visible="showClaimSuccess" :displayAmount="displayAmount" @close="closeClaimPopup" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import router from '../../router/index'
import { showToast, showDialog } from 'vant'
import RulePopup from '../../components/Popup/RulePopup.vue'
import { getRevenueRecords } from '@/api/RevenueRecord/api'
import {
    getWithdrawOptions,
    validateWithdraw,
    getUserBindingStatus,
    createWithdraw,
    claimVideoRewardAsync,
    GetAlipayAuthString,
    type WithdrawRequestDto
} from '@/api/MyEarnings/api'
import { beginPageView, addOnClick } from '@/utils/YMDataH5Bridge'
import { getRulesDataList, RuleItem } from '@/api/InvitationActivityRules/api'
const withdrawtips = ref('推荐使用支付宝提现,高效便捷到账快')
/** 是否已上报开始埋点 */
const hasReportedStart = ref(false)
//领取成功弹框
const showClaimSuccess = ref(false)
const displayAmount = ref('')
function closeClaimPopup() {
    showClaimSuccess.value = false
}
const dataObj = { states: 0, page: 'MyEarnings', value: '', type: '', key: '' }

// 加载状态
const loading = ref(false)

// 绑定状态加载完成标识
const bindingStatusLoaded = ref(false)

// 当前选择的 tab
const activeTab = ref<string>('alipay')

// 选中的提现卡片索引(用于高亮)
const selectedIndex = ref<number | null>(null)

// 收益数据
const earnings = ref({
    spark: 0,
    cash: 0.00
})

// 用户绑定信息
const userBindings = ref({
    wechat: false,
    alipay: false,
    isRealNameAuthenticated: false
})

// 绑定弹框状态
const showBindingPopup = ref(false)
const bindingMethod = ref<string>('wechat')

// 实名认证弹框状态 (新增)
const showAuthPopup = ref(false)

// 任务完成情况
const taskStatus = ref({
    video: {
        completed: false
    },
    read: {
        completed: false,
        remainingMinutes: 0
    },
    signin: {
        completed: false,
        remainingDays: 0
    }
})

// 提现金额选项(从接口获取)
const withdrawOptions = ref<Array<{
    amount: number
    badge: string
    desc: string
    highlight: boolean
    condition: string
    isDisabled?: boolean
}>>([])


/**
 * 获取收益记录数据
 */
const fetchRevenueRecords = async () => {
    try {
        const res = await getRevenueRecords()
        if (res) {
            earnings.value.spark = res.sparkCount
            earnings.value.cash = Number(res.alreadySwitchCash?.toFixed(2) || '0.00')
        }
    } catch (error) {
        console.error('获取收益记录失败:', error)
        showToast('获取收益数据失败')
    }
}
// 看视频获得一次体现机会
const handleWatchVideo = () => {
    dataObj.type = 'ShowVedioAD'
    dataObj.key = 'ShowVedioAD';
    dataObj.value = '10022';
    try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}
/**
 * 获取提现选项列表
 */
const fetchWithdrawOptions = async () => {
    loading.value = true
    try {
        const options = await getWithdrawOptions()
        //  映射后端返回的完整数据，包括 isDisabled 状态
        withdrawOptions.value = options.map(opt => ({
            amount: opt.amount,
            badge: opt.badge,
            desc: opt.desc,
            highlight: opt.highlight,
            condition: opt.condition,
            isDisabled: opt.isDisabled || false  //  同步后端禁用状态
        }))

        // 更新任务状态（保持原有逻辑）
        if (options.length > 0) {
            const videoOpt = options.find(o => o.condition === 'video')
            const readOpt = options.find(o => o.condition === 'read')
            const signinOpt = options.find(o => o.condition === 'signin' || o.condition === 'signin_repeatable')

            if (videoOpt?.taskStatus) {
                taskStatus.value.video.completed = videoOpt.taskStatus.completed
            }
            if (readOpt?.taskStatus) {
                taskStatus.value.read.completed = readOpt.taskStatus.completed
                taskStatus.value.read.remainingMinutes = readOpt.taskStatus.remainingMinutes || 0
            }
            if (signinOpt?.taskStatus) {
                taskStatus.value.signin.completed = signinOpt.taskStatus.completed
                taskStatus.value.signin.remainingDays = signinOpt.taskStatus.remainingDays || 0
            }
        }
    } catch (error) {
        console.error('获取提现选项失败:', error)
        showToast('获取提现选项失败')
    } finally {
        loading.value = false
    }
}


/**
 * 获取用户绑定状态
 */
const fetchBindingStatus = async () => {
    try {
        const status = await getUserBindingStatus()
        userBindings.value.wechat = status.wechat
        userBindings.value.alipay = status.alipay
        userBindings.value.isRealNameAuthenticated = status.isRealNameAuthenticated
    } catch (error) {
        console.error('获取绑定状态失败:', error)
    } finally {
        bindingStatusLoaded.value = true
    }
}

/** ===== 页面交互方法 ===== */

/**
 * 判断卡片是否可选:现金不足则不可选
 */
/**
 * 判断卡片是否可选
 * 1. 现金不足则不可选
 * 2. 后端返回的 isDisabled=true 则不可选（今日已提现或任务未完成）
 */
const isDisabled = (opt: any) => {
    // 余额不足
    if (earnings.value.cash < opt.amount) {
        return true
    }

    // 后端标记为禁用（今日已提现 或 任务未完成）
    if (opt.isDisabled === true) {
        return true
    }

    return false
}

/**
 * 自动选择第一个可用的提现选项
 */
const autoSelectFirstAvailableOption = () => {
    if (withdrawOptions.value.length === 0) {
        selectedIndex.value = null
        return
    }

    const firstAvailableIndex = withdrawOptions.value.findIndex((opt) => {
        return !isDisabled(opt)
    })

    if (firstAvailableIndex !== -1) {
        selectedIndex.value = firstAvailableIndex
    } else {
        selectedIndex.value = null
    }
}

// 页面加载时获取数据
onMounted(async () => {
    try {
        //  监听 Flutter 调用
        window.H5Bridge.on('pageRefresh', (data: any) => {
            if (data?.businessType) {
                if (data.businessType == 'wechatAuth') {
                    //微信授权成功刷新状态
                    fetchBindingStatus();
                    return;
                }
                if (data.businessType == 'alipayAuth') {
                    //支付宝授权成功刷新状态
                    fetchBindingStatus();
                    return;
                }
            }
            else {
                // 校验参数
                if (!data?.userId || !data?.transId || !data?.taskId) {
                    console.warn('pageRefresh 数据不完整', data);
                    return;
                }
                if (data.taskId == 10022) {
                    //插入看视频给的抽奖机会
                    claimVideoRewardAsync({ clientRefId: data.transId }).then((res => {
                        //刷新页面列表任务进度
                        fetchWithdrawOptions().then(() => {
                            // 重新获取选项后,执行自动选择
                            autoSelectFirstAvailableOption();
                        });
                    }));
                } else {
                    showToast('hdid不正确')
                }
            }
        })
    } catch (e: any) {
        showToast(e?.message || ' 监听 Flutter 调用')
    }

    // 确保收益和选项数据加载完毕
    await Promise.all([
        fetchRevenueRecords(), // 确保 earnings.cash 有值
        fetchWithdrawOptions(), // 确保 withdrawOptions 有值
        fetchBindingStatus()
    ])

    // 在所有数据加载完成后,执行一次默认选择
    autoSelectFirstAvailableOption()

    //用户浏览我的收益页面开始-数据埋点
    beginPageView('1', '展示我的收益时')
})


/**
 * 跳转到收益记录页面
 */
const goToRevenueRecord = (tab: 'spark' | 'cash') => {
    router.push({
        path: '/RevenueRecord',
        query: { tab }
    })
}

/**
 * 获取绑定弹框信息
 */
const bindingInfo = computed(() => {
    const info = {
        wechat: {
            title: '绑定微信账号',
            message: '绑定微信账号才可以进行提现,只需绑定一次,后续均提现至该微信账号'
        },
        alipay: {
            title: '绑定支付宝账号',
            message: '绑定支付宝账号才可以进行提现,只需绑定一次,后续均提现至该支付宝账号'
        }
    }
    return info[bindingMethod.value as 'wechat' | 'alipay'] || info.wechat
})

/**
 * 处理绑定按钮
 */
function handleGoBinding(data: string) {
    showBindingPopup.value = false
    if (data === 'wechat') {
        dataObj.key = 'wechatAuth';
        dataObj.value = '';
        dataObj.type = 'wechatAuth';
        (window as any).H5Bridge?.closePage?.(dataObj)
    } else {
        GetAlipayAuthString().then((res => {
            dataObj.key = 'alipayAuth';
            dataObj.value = String(res);
            dataObj.type = 'alipayAuth';
            console.log('dataObj', dataObj);
            (window as any).H5Bridge?.closePage?.(dataObj)
        }));
    }
}
/**
 * 关闭绑定弹框
 */
const handleCloseBindingPopup = () => {
    showBindingPopup.value = false
}


/**
 * 获取最小提现金额
 */
const minWithdrawAmount = computed(() => {
    if (withdrawOptions.value.length === 0) return 0
    return Math.min(...withdrawOptions.value.map(opt => opt.amount))
})

/**
 * 当前是否有余额不足
 */
const isInsufficientBalance = computed(() => {
    if (withdrawOptions.value.length === 0) return false
    return !withdrawOptions.value.some(opt => !isDisabled(opt))
})

/**
 * 获取当前选中的卡片
 */
const currentSelectedOption = computed(() => {
    if (selectedIndex.value === null) return null
    return withdrawOptions.value[selectedIndex.value]
})

/**
 * 计算按钮禁用状态
 */
const isActionBtnDisabled = computed(() => {
    if (isInsufficientBalance.value) return true
    if (selectedIndex.value === null) return true
    return false
})

/**
 * 计算按钮文案
 */
const actionBtnText = computed(() => {
    if (isInsufficientBalance.value) {
        return '余额少于最低提现挡位'
    }

    if (selectedIndex.value === null) {
        return '请选择提现金额'
    }

    const option = currentSelectedOption.value
    if (!option) return '立即提现'

    //  如果档位被禁用（今日已提现）
    if (option.isDisabled && option.desc === '今日已提现') {
        return '今日已提现'
    }

    // 根据条件类型返回不同文案
    switch (option.condition) {
        case 'video':
            return taskStatus.value.video.completed ? '立即提现' : '去看视频'
        case 'read':
            return taskStatus.value.read.completed ? '立即提现' : '继续阅读'
        case 'signin':
        case 'signin_repeatable':  //  新增可重复档位
            return taskStatus.value.signin.completed ? '立即提现' : '继续签到'
        case 'normal':
            return '立即提现'
        default:
            return '立即提现'
    }
})


/**
 * 计算按钮副文案
 */
const actionBtnSubtext = computed(() => {
    if (isInsufficientBalance.value || selectedIndex.value === null) {
        return ''
    }

    const option = currentSelectedOption.value
    if (!option) return ''

    //  如果今日已提现，显示提示
    if (option.isDisabled && option.desc === '今日已提现') {
        return '每天只能提现一次'
    }

    // 根据条件类型返回不同副文案
    switch (option.condition) {
        case 'video':
            if (taskStatus.value.video.completed) return ''
            return `看一个视频即可提现${option.amount.toFixed(2)}元`
        case 'read':
            if (taskStatus.value.read.completed) return ''
            return `再阅读${taskStatus.value.read.remainingMinutes}分钟可提现${option.amount.toFixed(2)}元`
        case 'signin':
            if (taskStatus.value.signin.completed) return ''
            return `还需连续签到${taskStatus.value.signin.remainingDays}天可提现${option.amount.toFixed(2)}元`
        case 'signin_repeatable':  //  新增可重复档位
            if (taskStatus.value.signin.completed) {
                return '' // 任务已完成，无副文案
            }
            return `还需连续签到${taskStatus.value.signin.remainingDays}天可提现${option.amount.toFixed(2)}元`
        default:
            return ''
    }
})


/**
 * 返回上一页
 */
const onClickLeft = () => {
    router.back();
    dataObj.key = '';
    dataObj.value = '';
    dataObj.type = '';
    (window as any).H5Bridge?.closePage?.(dataObj)
    beginPageView('2', '展示我的收益时')
}

/** ===== 规则弹窗 ===== */
const showRule = ref(false)
const ruleList = ref<RuleItem[]>([]);


const showRulePopup = () => {
    getRulesDataList({ TaskTypeId: 10022 }).then((res => {
        ruleList.value = res;
        console.log('ruleList', ruleList)
    }))
    showRule.value = true
}

/**
 * Tab 切换处理
 */
const handleTabClick = (name: string) => {
    activeTab.value = name
    onTabChange(name)
}

/**
 * Tab 切换事件
 */
const onTabChange = (name: string | number) => {
    const method = name === 'wechat' ? '微信' : '支付宝'
    if (method == '微信') {
        withdrawtips.value = '注意⚠️请在24小时内完成订单的确认收款'
    }
    else if (method == '支付宝') {
        withdrawtips.value = '推荐使用支付宝提现,高效便捷到账快'
    }
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 0, pageName: '点击' + method + '提现时' });
}

/**
 * 实名认证 (已修改为显示自定义弹窗)
 */
const goToAuth = () => {
    // // 替换原有的 showDialog,改为显示自定义弹窗
    // showAuthPopup.value = true
    router.push('/RealNameAuth')
}

/**
 * 处理实名认证跳转
 */
const handleGoRealNameAuth = () => {
    showAuthPopup.value = false
    router.push('/RealNameAuth')
}

/**
 * 点击卡片:设置选中态
 */
const onSelect = (option: any, idx: number) => {
    if (isDisabled(option)) {
        // 根据不同情况显示不同提示
        if (earnings.value.cash < option.amount) {
            showToast({
                message: '余额少于提现档位',
                position: 'top'
            })
        } else if (option.desc === '今日已提现') {
            showToast({
                message: '今日已提现，明天再来吧',
                position: 'top'
            })
        } else if (option.desc && option.desc.includes('签到')) {
            showToast({
                message: option.desc,
                position: 'top'
            })
        } else if (option.desc && option.desc.includes('阅读')) {
            showToast({
                message: option.desc,
                position: 'top'
            })
        } else if (option.desc && option.desc.includes('视频')) {
            showToast({
                message: option.desc,
                position: 'top'
            })
        } else {
            showToast({
                message: '暂时无法提现该档位',
                position: 'top'
            })
        }
        return
    }
    selectedIndex.value = idx
}

/**
 * 处理按钮点击
 */
const handleActionBtn = () => {
    // 检查余额不足
    if (isInsufficientBalance.value) {
        showToast('余额不足,无法提现')
        return
    }

    // 检查是否选择了卡片
    if (selectedIndex.value === null) {
        showToast('请选择提现金额')
        return
    }

    const option = currentSelectedOption.value
    if (!option) return

    //  检查是否今日已提现
    if (option.isDisabled && option.desc === '今日已提现') {
        showToast('今日已提现，明天再来吧')
        return
    }

    // 验证是否实名
    if (!userBindings.value.isRealNameAuthenticated) {
        showAuthPopup.value = true
        return
    }

    // 友盟数据埋点
    addOnClick({ taskId: 0, pageName: '点击提现按钮时' })

    // 根据条件类型处理
    switch (option.condition) {
        case 'video':
            if (taskStatus.value.video.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                handleWatchVideo()
            }
            break
        case 'read':
            if (taskStatus.value.read.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                showToast('请先完成阅读任务')
            }
            break
        case 'signin':
            if (taskStatus.value.signin.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                showToast('请先完成签到任务')
            }
            break
        case 'signin_repeatable':  //  新增可重复档位处理
            if (taskStatus.value.signin.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                showToast('请先完成连续签到7天任务')
            }
            break
        case 'normal':
            proceedWithdraw(option.amount, option.condition)
            break
    }
}

/**
 * 进行提现(需要检查绑定)
 */
const proceedWithdraw = (amount: number, condition: string) => {
    const method = activeTab.value
    const methodName = method === 'wechat' ? '微信' : '支付宝'
    const isBinding = method === 'wechat' ? userBindings.value.wechat : userBindings.value.alipay

    // 检查是否绑定
    if (!isBinding) {
        showBindingDialog(method, methodName)
        return
    }

    // 确认提现
    confirmWithdraw(amount, methodName, condition)
}

/**
 * 显示绑定提示弹框
 */
const showBindingDialog = (method: string, methodName: string) => {
    showBindingPopup.value = true
    bindingMethod.value = method
}

/**
 * 确认提现
 */
const confirmWithdraw = (amount: number, methodName: string, condition: string) => {
    showDialog({
        title: '确认提现',
        message: `确认提现 ${amount.toFixed(2)} 元至${methodName}?`,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        showCancelButton: true
    }).then(async () => {
        showToast({
            message: '提现中...',
            forbidClick: true,
            duration: 0
        })

        try {
            const params: WithdrawRequestDto = {
                amount,
                paymentMethod: activeTab.value,
                condition
            }
            await validateWithdraw(params)
            var refId = ''
            await createWithdraw(params).then((res) => {
                refId = res.refId
                showToast('提现申请成功!')
            })

            // 提现成功后刷新数据
            await Promise.all([
                fetchRevenueRecords(),   // 刷新余额
                fetchWithdrawOptions()   // 刷新档位列表（会更新今日提现状态）
            ])

            // 重新选择可用档位
            autoSelectFirstAvailableOption()

            router.push({
                path: '/WithdrawProgress',
                query: { Id: refId }
            })
        } catch (error) {
            showToast(error instanceof Error ? error.message : String(error))
        }
    }).catch(() => {
        // 用户取消
    })
}
</script>

<style scoped lang="scss">
/* ================== 全局与页面基调 ================== */

.app {
    background: #F2F2F2;
}

.myearnings-page {
    min-block-size: 100vh;
    background-image: url('/img/MyEarnings/back.png');
    background-size: 390px auto;
    background-position: top center;
    background-repeat: no-repeat;
}

.nav-bar {
    background: transparent;
    padding-block-start: 45px;
    padding-block-end: 5px;

    :deep(.van-nav-bar__arrow) {
        color: #1E1E1E;
        font-size: 18px;
        font-weight: bold;
    }

    :deep(.van-nav-bar__arrow) {
        background-image: url(/img/public/back.png);
        background-size: 23px;
        background-position: center;
        background-repeat: no-repeat;
        width: 26px;
        height: 26px;
    }

    :deep(.van-nav-bar__arrow::before) {
        content: none;
    }

    &::after,
    &::before {
        display: none !important;
        content: none !important;
        border: 0 !important;
    }

    &.van-hairline--bottom::after,
    &.van-hairline--top::after {
        display: none !important;
    }

    .nav-title {
        font-family: PingFang SC;
        font-weight: 500;
        font-size: 18px;
        line-height: 26px;
        color: #252525;
        block-size: 44px;
    }

    .rule-btn {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 14px;
        line-height: 100%;
        text-align: end;
        color: #252525;
        cursor: pointer;
    }
}

.page-content {
    padding: 0 15px;
}

/* 实名认证提示 */
.myearnings-alert {
    block-size: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.3s ease;

    :deep(.van-icon) {
        font-size: 16px !important;
    }

    span {
        font-family: PingFang SC;
        font-size: 14px;
        color: #252525;
        flex: 1;
    }

    &:active {
        opacity: 0.8;
    }
}

/* 收益卡片 */
.earnings-card {
    border-radius: 12px;
    padding: 20px;
}

.earnings-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
}

.earnings-item {
    flex: 1;
    text-align: center;

    .label {
        font-family: PingFang SC;
        font-size: 12px;
        color: #252525;
        margin-block-end: 1.6vw;
        display: flex;
        align-items: center;
        gap: 1.06667vw;
        line-height: 16px;
        font-weight: 500;
    }

    .amount {
        text-align: start;
        font-size: 32px;
        font-weight: bold;
        color: #252525;
    }
}

/* 白色内容卡片 */
.content-card {
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
}

/* ================== 自定义 Tab 样式（替代 van-tabs）================== */
.custom-tabs.capsule {
    position: relative;
    z-index: 1;
    background: transparent;
}

.custom-tabs-wrap {
    background: #FFF8E1;
    overflow: hidden;
    box-shadow: none;
    position: relative;
    block-size: 46px;
}

.custom-tabs-nav {
    background: transparent;
    border: 0;
    padding: 0;
    display: flex;
    gap: 2px;
    block-size: 100%;
}

.custom-tab {
    flex: 1;
    margin: 0;
    block-size: 46px;
    background: transparent;
    color: rgba(37, 37, 37, 0.5);
    border: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all .25s;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    user-select: none;
}

/* 第一个tab与第二个tab之间的分隔线 */
.custom-tab:first-child::after {
    content: '';
    position: absolute;
    inset-inline-end: -1px;
    inset-block-start: 0;
    inset-block-end: 0;
    inline-size: 2px;
    background: linear-gradient(135deg, transparent 0%, transparent 45%, #E8E8E8 45%, #E8E8E8 55%, transparent 55%, transparent 100%);
    transform: skewX(-15deg);
    z-index: 1;
}

.custom-tab--active::after,
.custom-tab--active+.custom-tab::before {
    display: none;
}

.tjpay {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    background: linear-gradient(90.22deg, #F56D13 0.19%, #FDA045 99.82%);
    color: #FFFFFF;
    font-size: 2.5641vw;
    padding: 0.51282vw 1.53846vw;
    border-radius: 2.05128vw 0 2.05128vw 0;
    font-weight: 500;
}

.tab-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 16px;
    position: relative;
    z-index: 3;
    transition: all .25s;
    font-weight: 500;
}

.wechat-pay,
.alipay {
    display: inline-block;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: all .25s;
}

.wechat-pay {
    background-image: url(/img/MyEarnings/wechat-pay.png);
    width: 18px;
    height: 16px;
    z-index: 9px;
}

.alipay {
    background-image: url(/img/MyEarnings/alipay.png);
    width: 16px;
    height: 16px;
    z-index: 9px;
}

.custom-tab:nth-child(1).custom-tab--active {
    background-position: 0 0;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url(/img/MyEarnings/tab_left.png);
}

.custom-tab:nth-child(1).custom-tab--active .tab-title {
    color: #252525;
    font-size: 18px;
}

.custom-tab:nth-child(2).custom-tab--active .wechat-pay {
    background-image: url(/img/MyEarnings/wechat-pay.png);
    width: 22px !important;
    height: 20px !important;
    z-index: 10;
}

.custom-tab:nth-child(2).custom-tab--active {
    background-position: 0 0;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url(/img/MyEarnings/tab_right.png);
}

.custom-tab:nth-child(2).custom-tab--active .tab-title {
    color: #252525;
    font-size: 18px;
}

.custom-tab:nth-child(1).custom-tab--active .alipay {
    background-image: url(/img/MyEarnings/alipay.png);
    width: 20px !important;
    height: 20px !important;
    z-index: 10;
}

/* 提现说明 */
.withdraw-tips {
    font-family: PingFang SC;
    font-size: 12px;
    color: #4D4D4D;
    padding: 12px 15px;
    text-align: start;
    font-weight: 400;
}

/* 提现金额网格 */
.amount-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 0 15px 15px;
}

.amount-option {
    background: #F7F8FA;
    border-radius: 8px;
    text-align: center;
    position: relative;
    transition: all .2s ease;
    block-size: 84px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border: 1px solid transparent;
    cursor: pointer;

    &:active {
        transform: scale(0.98);
        opacity: 0.95;
    }

    .badge {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        background: linear-gradient(90.22deg, #F56D13 0.19%, #FDA045 99.82%);
        color: #FFFFFF;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 8px 0 6px 0;
        font-weight: 500;
    }

    .value {
        font-family: Inter;
        font-weight: 600;
        font-size: 22px;
        line-height: 28px;
        color: #252525;

        .unit {
            font-family: PingFang SC;
            font-weight: 400;
            font-size: 12px;
            line-height: 18px;
            margin-inline-start: 2px;
        }
    }

    .desc {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 12px;
        line-height: 18px;
        color: #7C7C7C;
    }

    &.is-selected {
        background: #FFF6F2;

        .value {
            color: #FA6725;
        }

        .desc {
            color: #FA6725;
        }
    }

    &.is-disabled {
        filter: grayscale(20%);
        opacity: 0.55;
        cursor: not-allowed;
    }
}

/* 操作按钮 */
.action-btn {
    block-size: 48px;
    inline-size: 245px;
    background: #FA6725;
    border-radius: 6.66667vw;
    transition: all 0.2s ease;
    align-self: center;
    margin: 16px auto 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-block-start: 0;
    cursor: pointer;
    text-align: center;

    &:active:not(.is-disabled) {
        transform: scale(0.98);
    }

    &.is-disabled {
        background: #CCCCCC;
        cursor: not-allowed;
    }

    .btn-text {
        font-family: PingFang SC;
        font-weight: 500;
        font-size: 16px;
        line-height: 100%;
        color: #FFFFFF;
        margin-block-end: 2px;
    }

    .btn-subtext {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 10px;
        color: #FFFFFF;
    }
}

/* ================== 新增：自定义弹框样式 (复刻图片效果) ================== */
:deep(.custom-pink-popup) {
    width: 270px !important;
    height: 187px;
    background: transparent !important;
    overflow: visible !important;

    .popup-wrapper {
        background: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    /* 上半部分：白色内容区 */
    .content-top {
        background: #ffffff;
        padding: 24px 20px 20px 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;

        .pop-title {
            font-size: 18px;
            font-weight: 500;
            color: #252525;
            margin-top: -5px;
            margin-bottom: 12px;
            line-height: 1.2;
            font-family: PingFang SC;
        }

        .pop-message {
            font-size: 14px;
            font-weight: 400;
            color: #8A8A8A;
            line-height: 20px;
            text-align: center;
            margin-top: 10px;
        }
    }

    /* 下半部分：粉色按钮区 */
    .content-bottom {
        // background: #FFC1C1;
        padding: 0px 24px 24px;
        display: flex;
        justify-content: center;
        align-items: center;

        .action-btn-main {
            font-family: PingFang SC;
            width: 230px !important;
            height: 42px;
            background: #FA6725 !important;
            border: none !important;
            font-size: 14px;
            font-weight: 500;
            color: #ffffff !important;
            //box-shadow: 0 4px 10px rgba(255, 102, 34, 0.2);
            border-radius: 999px;

        }

        .confirm-btns {
            display: flex;
            justify-content: space-between;
            width: 100%;
            gap: 15px;

            .btn {
                flex: 1;
                height: 40px;
                border-radius: 20px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                outline: none;
            }

            .btn-cancel {
                background: #FFFFFF;
                border: 1px solid #FA6725;
                color: #FA6725;
            }

            .btn-confirm {
                background: #FA6725;
                border: none;
                color: #FFFFFF;
                /* box-shadow: 0 0.51282vw 1.53846vw rgba(255, 107, 53, 0.2); */
                width: 109px;
                height: 42px;
            }

            .btn:active {
                opacity: 0.8;
            }
        }
    }

    /* 底部外部关闭按钮 */
    .outside-close-btn {
        position: absolute;
        bottom: -90px;
        left: 50%;
        transform: translateX(-50%);
        width: 32px;
        height: 32px;
        background: url('/img/public/取消按钮.svg') no-repeat center;
        background-size: contain;
        border: none;
        cursor: pointer;
        opacity: 0.9;

        /* 兜底样式，如果没有 SVG 图片 */
        &::before,
        &::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 2px;
            background: #fff;
            display: none;
            /* 有图时隐藏，无图可去掉这行 */
        }

        &::before {
            transform: translate(-50%, -50%) rotate(45deg);
        }

        &::after {
            transform: translate(-50%, -50%) rotate(-45deg);
        }

        &:active {
            transform: translateX(-50%) scale(0.9);
        }
    }
}
</style>