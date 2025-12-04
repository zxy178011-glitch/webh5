<template>
    <div class="myearnings-page">

        <RulePopup v-model="showRule" title="规则" :rules="ruleList" confirmText="我知道了" />
        <!-- 顶部导航栏 -->
        <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
            <template #title>
                <span class="nav-title">我的收益</span>
            </template>
            <template #right>
                <span class="rule-btn" @click="showRulePopup">规则</span>
            </template>
        </van-nav-bar>

        <div class="page-content">
            <!-- 实名认证提示 -->
            <div class="myearnings-alert" @click="goToAuth" v-if="!userBindings.isRealNameAuthenticated">
                <van-icon name="info-o" />
                <span>点击进行实名认证，提现更安心</span>
                <van-icon name="arrow" />
            </div>

            <!-- 收益展示卡片 -->
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

            <!-- 白色内容卡片 -->
            <div class="content-card">
                <!-- 自定义 Tab 切换 - 胶囊风格 -->
                <div class="custom-tabs capsule">
                    <div class="custom-tabs-wrap">
                        <div class="custom-tabs-nav">
                            <div :class="['custom-tab', { 'custom-tab--active': activeTab === 'wechat' }]"
                                @click="handleTabClick('wechat')">
                                <div class="tab-title">
                                    <span class="wechat-pay"></span>
                                    <span>微信</span>
                                </div>
                            </div>
                            <div :class="['custom-tab', { 'custom-tab--active': activeTab === 'alipay' }]"
                                @click="handleTabClick('alipay')">
                                <div class="tab-title">
                                    <span class="alipay"></span>
                                    <span>支付宝</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 提现说明 -->
                <div class="withdraw-tips">
                    23点到次日11点为提现高峰期，可能会延迟到账
                </div>

                <!-- 加载状态 -->
                <van-loading v-if="loading" type="spinner" class="loading-container">加载中...</van-loading>

                <!-- 提现金额网格（每行3列） -->
                <div v-else class="amount-grid">
                    <div v-for="(opt, idx) in withdrawOptions" :key="idx" :class="[
                        'amount-option',
                        opt.amount >= 20 ? 'large' : 'small',
                        {
                            'highlight': opt.highlight,
                            'is-selected': selectedIndex === idx,
                            'is-disabled': isDisabled(opt)
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

                <!-- 操作按钮 -->
                <div class="action-btn" :class="{ 'is-disabled': isActionBtnDisabled }" @click="handleActionBtn">
                    <div class="btn-text">{{ actionBtnText }}</div>
                    <div class="btn-subtext">{{ actionBtnSubtext }}</div>
                </div>
            </div>
        </div>

        <!-- 绑定弹框 -->
        <van-popup v-model:show="showBindingPopup" class="success-popup" round>
            <div class="popup-content">
                <h3 class="binding-title">{{ bindingInfo.title }}</h3>
                <div class="binding-message">{{ bindingInfo.message }}</div>
                <van-button type="danger" class="binding-btn" round block @click="handleGoBinding(bindingMethod)">
                    {{ bindingMethod === 'wechat' ? '去微信绑定' : '去支付宝绑定' }}
                </van-button>
            </div>
            <button class="outside-close" type="button" aria-label="Close" @click="handleCloseBindingPopup"></button>
        </van-popup>
    </div>
    <SuccessPopup v-model:visible="showClaimSuccess" :displayAmount="displayAmount" @close="closeClaimPopup" />
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
    type WithdrawOptionDto,
    type WithdrawRequestDto
} from '@/api/MyEarnings/api'
import { beginPageView, addOnClick } from '@/utils/YMDataH5Bridge'
import { onBeforeRouteLeave } from 'vue-router'

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

// 页面加载时获取数据
onMounted(async () => {
    try {
        //  监听 Flutter 调用
        window.H5Bridge.on('pageRefresh', (data) => {
            // console.log('微信授权回值', data);
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
                        fetchWithdrawOptions();
                    }));
                } else {
                    showToast('hdid不正确')
                }
            }
        })
    } catch (e: any) {
        showToast(e?.message || ' 监听 Flutter 调用')
    }
    await Promise.all([
        fetchRevenueRecords(),
        fetchWithdrawOptions(),
        fetchBindingStatus()
    ])
    //用户浏览我的收益页面开始-数据埋点
    beginPageView('1', '展示我的收益时')
})


// 当前选择的 tab
const activeTab = ref<string>('wechat')

// 选中的提现卡片索引（用于高亮）
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

// 提现金额选项（从接口获取）
const withdrawOptions = ref<Array<{
    amount: number
    badge: string
    desc: string
    highlight: boolean
    condition: string
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
// 看视频获得一次体现机会（ 
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
        // 映射到前端的数据结构
        withdrawOptions.value = options.map(opt => ({
            amount: opt.amount,
            badge: opt.badge,
            desc: opt.desc,
            highlight: opt.highlight,
            condition: opt.condition
        }))

        // 更新任务状态
        if (options.length > 0) {
            const videoOpt = options.find(o => o.condition === 'video')
            const readOpt = options.find(o => o.condition === 'read')
            const signinOpt = options.find(o => o.condition === 'signin')

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
    }
}

/** ===== 页面交互方法 ===== */

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
            message: '绑定微信账号才可以进行提现，只需绑定一次，后续均提现至该微信账号'
        },
        alipay: {
            title: '绑定支付宝账号',
            message: '绑定支付宝账号才可以进行提现，只需绑定一次，后续均提现至该支付宝账号'
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
 * 判断卡片是否可选：现金不足则不可选
 */
const isDisabled = (opt: any) => earnings.value.cash < opt.amount

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
    return earnings.value.cash < minWithdrawAmount.value
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

    // 根据条件类型返回相应文案
    switch (option.condition) {
        case 'video':
            return taskStatus.value.video.completed ? '立即提现' : '去看视频'
        case 'read':
            return taskStatus.value.read.completed ? '立即提现' : '继续阅读'
        case 'signin':
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
/**
 * 计算按钮副文案
 */
const actionBtnSubtext = computed(() => {
    if (isInsufficientBalance.value || selectedIndex.value === null) {
        return ''
    }

    const option = currentSelectedOption.value
    if (!option) return ''

    // 根据条件类型返回相应副文案
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
    //用户浏览我的收益页面结束-数据埋点
    beginPageView('2', '展示我的收益时')
}

/** ===== 规则弹窗 ===== */
const showRule = ref(false)
const ruleList = ref([
    '1.本平台提供现金提现功能，可提取到您的支付账户(如微信、支付宝账户等，以页面实际展示为准)。',
    '2.用户收益达到最低提现金额要求后，可以申请提现。我们将在提现页面内设置固定提现额度(具体金额以页面展示为准)，固定提现额度每日仅可择一使用一次，总次数不限。每次提现时您可以选择所需的一档进行提现，仅当前金额超过发起提现的金额才可以申请提现，剩余金额可在下次满足前述提现额度时申请提现。特别而言，我们可能向新用户下发单次小额提现福利(如1元)，新人提现额度为单次福利，仅限新用户使用一次。同时，为了给您提供更好的福利提现体验，围炉小说将不时对部分或者全部(新)用户提供临时提现额度或满足一定要求可提现的额度，如用户获得此类额度，使用次数有限制，具体要求、额度及次数限制请以页面展示为准。',
    '3. 如果用户需要通过支付宝等第三方支付账号提现，需按照要求绑定第三方支付账号并填写提现金额或其他提现所需信息，请确保提供的信息准确无误，以免提现失败。如果用户需要通过银行卡提现，需按照第三方支付机构的页面要求完成实名认证、添加银行卡并填写提现金额。请确保提供的信息准确无误，以免提现失败。',
    '4.提现一般3~5天内到账(您理解并同意如遇提现高峰或节假日，提现到账时间会延长)。活动高峰期间，由于网络拥堵，用户可能存在短时间内无法提现的情况。平台将尽最大努力及时恢复提现功能，但无需因此承担任何责任。',
    '5.为保证用户顺利提现，提现需用户按照提现页面规范操作，如用户未按提现要求操作或不符合第三方支付平台的要求等原因导致不能收款(如未做实名认证或提现前与平台账号解绑等)，所获得的金币等将无法提现，本平台无需承担任何责任。',
    '6.若您连续15个白然日未进入任务页面、或连续15个自然日未领取任何活动连续您的所有福利将过期，逾期未提现则视奖励的(任一)，那么此前本平台发放给为用户自愿放弃提现的权利，现金账户金额将被清零，平台将不会也无义务给予任何形式的补偿。',
    '7.未成年人用户应在其监护人的陪同下使用本APP并应在征得其监护人的同意后进行，用户均应确保提供的信息准确无误，如因填写信息错误等非本平台原连弃全部金额，平台不承担责任。因导致不能提现/兑换，视为用户自愿放弃全部金额，平台不承担责任。',
    '8.我们应用先进的人工智能分析您的行为，在提现/兑换过程中，为更好的保护用户账号及相关资产的安全，本平台有权审核您的订单，对您的提现的次数、金额和/或账号的数量进行限制，并随时提高安全校验措施(包括但不限于短信验证、身份验证等手段)，如您未能通过安全校验，则将无法提现/兑换，如发现造假或其他不正当手段及舞弊行为，我们有权阻止您使用(填写邀请码、领取金币、提现、获取红包)以及取消您获得的红包。用户应自行承担因此不能提现/兑换所导致的不利后果，本平台对此不承担责任。',
    '9.用户通过平台举办的活动获得收益或奖励的，平台可能需要为用户代扣代缴税款或办理纳税申报。为履行上述法定义务，平台需依照税务机关实际要求，收集并提供用户实名信息、收益金额等涉税信息和资料。如用户未向平台提供信息或提供错误信息，可能导致平台无法办理，用户应自行申报纳税，由此造成的其他不利后果由用户自行承担。',
    '10.平台现行有效的《用户协议》《隐私政策》以及日常活动规则(统称为「前述协议」)同样适用。本规则及相关条款与前述协议相冲突的，以本规则为准;本规则未约定的内容，仍以前述协议为准。',
    '11.在法律法规允许的范围内，平台有权。对本规则进行变动或调整，相关变动或调整将公布在规则页面上，并于公布时即时生效，用户继续参与活动则视为同意并接受变动或者调整后的规则。如果用户拒绝规则的变更或者调整，请放弃参与变更后的活动。'
])

const showRulePopup = () => {
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
    showToast(`已切换至${method}提现`)
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 0, pageName: '点击' + method + '提现时' });
}

/**
 * 实名认证
 */
const goToAuth = () => {
    showDialog({
        title: '实名认证',
        message: '完成实名认证后，提现更快更安全！',
        confirmButtonText: '去认证',
        cancelButtonText: '稍后再说',
        showCancelButton: true
    }).then(() => {
        router.push('/RealNameAuth')
    }).catch(() => { /* 用户取消 */ })
}

/**
 * 点击卡片：设置选中态
 */
const onSelect = (option: any, idx: number) => {
    if (isDisabled(option)) return
    selectedIndex.value = idx
}

/**
 * 处理按钮点击
 */
const handleActionBtn = () => {
    // 检查余额不足
    if (isInsufficientBalance.value) {
        showToast('余额不足，无法提现')
        return
    }

    // 检查是否选择了卡片
    if (selectedIndex.value === null) {
        showToast('请选择提现金额')
        return
    }

    //验证是否实名
    if (!userBindings.value.isRealNameAuthenticated) {
        showToast('请先进行实名认证')
        return
    }
    const option = currentSelectedOption.value
    if (!option) return
    //友盟数据埋点-用户点击时
    addOnClick({ taskId: 0, pageName: '点击提现按钮时' });
    // 根据条件类型处理
    switch (option.condition) {
        case 'video':
            if (taskStatus.value.video.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                //showToast('请先完成看视频任务')
                // router.push('/video')
                handleWatchVideo();
            }
            break
        case 'read':
            if (taskStatus.value.read.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                showToast('请先完成阅读任务')
                // router.push('/read')
            }
            break
        case 'signin':
            if (taskStatus.value.signin.completed) {
                proceedWithdraw(option.amount, option.condition)
            } else {
                showToast('请先完成签到任务')
                // router.push('/signin')
            }
            break
        case 'normal':
            proceedWithdraw(option.amount, option.condition)
            break
    }
}

/**
 * 进行提现（需要检查绑定）
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
        message: `确认提现 ${amount.toFixed(2)} 元至${methodName}？`,
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        showCancelButton: true
    }).then(async () => {
        // 执行提现逻辑
        showToast({
            message: '提现中...',
            forbidClick: true,
            duration: 0 // 不自动关闭
        })

        try {
            const params: WithdrawRequestDto = {
                amount,
                paymentMethod: activeTab.value,
                condition
            }
            await validateWithdraw(params).then((async res => {
                var data = await createWithdraw(params)
                showToast('提现申请成功！')
                // 刷新页面数据
                selectedIndex.value = null
                // 跳转到进度页面，传递 id
                router.push({
                    path: '/WithdrawProgress',
                    query: { Id: data.refId }
                })
            }))
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
.myearnings-page {
    min-block-size: 100vh;
    background-image: url('/img/MyEarnings/back.png');
    background-size: 474px auto;
    background-position: top center;
    background-repeat: no-repeat;
}

.nav-bar {
    background: transparent;
    padding-block-start: 45px;
    padding-block-end: 5px;
    // block-size: 88px;

    :deep(.van-nav-bar__arrow) {
        color: #1E1E1E;
        font-size: 18px;
        font-weight: bold;
    }

    // 彻底移除所有边框和hairline
    &::after,
    &::before {
        display: none !important;
        content: none !important;
        border: 0 !important;
    }

    // 移除 van-hairline--bottom 的效果
    &.van-hairline--bottom::after,
    &.van-hairline--top::after {
        display: none !important;
    }

    .nav-title {
        font-family: PingFang SC;
        font-weight: 600;
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

/* ============================================================================
   规则弹窗
   ========================================================================== */
.rule-popup {
    inline-size: 320px;
    /* 300~340 自行调整 */
    padding: 16px 16px 14px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

.rule-title {
    margin-block-end: 10px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: rgba(133, 61, 33, 1);
}

.rule-content {
    max-block-size: 50vh;
    overflow: auto;
    padding: 6px 2px 10px;

    ol {
        margin: 0;
        padding-inline-start: 20px;
    }

    li {
        margin: 6px 0;
        font-size: 13px;
        line-height: 20px;
        color: #8b6a4b;
    }
}

.rule-actions {
    display: flex;
    justify-content: center;
    margin-block-start: 6px;

    .btn.primary {
        min-inline-size: 120px;
        block-size: 36px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        line-height: 36px;
        font-size: 14px;
        background: #fa6725;
        color: #fff;
        // background: linear-gradient(180deg, var(--brand-start) 0%, var(--brand-end) 100%);
    }
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
    }

    .amount {
        text-align: start;
        font-size: 32px;
        font-weight: bold;
        color: #1E1E1E;
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
    box-shadow: 0 3px 10px rgba(255, 107, 53, 0.25);
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
    color: #999;
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

/* 激活状态时隐藏分隔线 */
.custom-tab--active::after,
.custom-tab--active+.custom-tab::before {
    display: none;
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
}

/* 图标基础样式 */
.wechat-pay,
.alipay {
    display: inline-block;
    inline-size: 16px;
    block-size: 16px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: all .25s;
}

.wechat-pay {
    background-image: url(/img/MyEarnings/wechat-pay.png);
}

.alipay {
    background-image: url(/img/MyEarnings/alipay.png);
}

/* 第一个tab激活状态 */
.custom-tab:nth-child(1).custom-tab--active {
    background-position: 0 0;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-image: url(/img/MyEarnings/tab_left.png);
    //background: #FFFFFF;
}

.custom-tab:nth-child(1).custom-tab--active .tab-title {
    color: #252525;
    font-size: 18px;
}

.custom-tab:nth-child(1).custom-tab--active .wechat-pay {
    inline-size: 18px;
    block-size: 18px;
}

/* 第二个tab激活状态 */
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

.custom-tab:nth-child(2).custom-tab--active .alipay {
    inline-size: 18px;
    block-size: 18px;
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

/* 提现金额网格（每行3列） */
.amount-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 0 15px 15px;
}

/* 卡片样式 */
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

    /* 选中状态 */
    &.is-selected {
        // border-color: #FA6725;
        //  box-shadow: 0 0 0 1px rgba(250, 103, 37, 0.08), 0 6px 12px rgba(250, 103, 37, 0.12);
        background: #FFF6F2;

        .value {
            color: #FA6725;
        }

        .desc {
            color: #FA6725;
        }
    }

    /* 不可选状态 */
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
    box-shadow: 0 0.8vw 2.66667vw rgba(255, 107, 53, 0.25);
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
        box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
    }

    &.is-disabled {
        background: #CCCCCC;
        cursor: not-allowed;
        box-shadow: 0 0.8vw 2.66667vw rgba(0, 0, 0, 0.08);
    }

    .btn-text {
        font-family: PingFang SC;
        font-weight: 500;
        font-size: 16px;
        line-height: 100%;
        letter-spacing: 0px;
        text-align: center;
        color: #FFFFFF;
        margin-block-end: 2px;
    }

    .btn-subtext {
        font-family: PingFang SC;
        font-weight: 400;
        font-size: 10px;
        letter-spacing: 0px;
        text-align: center;
        color: #FFFFFF;
    }
}

/* Vant 绑定弹框 */
.success-popup {
    inline-size: 270px !important;
    block-size: 185px !important;
    background: #FFFFFF;
    border-radius: 16px !important;
    overflow: visible !important;
}

/* 弹框内容与图片尺寸 */
.popup-content {
    font-size: 14px;
    font-family: PingFang SC;
    font-weight: 400;
    padding: 14px;
    line-height: 26px;
    letter-spacing: 0px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.binding-title {
    font-size: 18px;
    font-weight: 600;
    color: #2C2C2C;
    margin: 0;
    line-height: 1.3;
}

//文案
.binding-message {
    line-height: 26px;
}

/* 弹框主按钮 */
.binding-btn {
    inline-size: 230px;
    block-size: 42px;
    font-size: 16px;
    font-weight: 600;
    margin-block-start: 8px;
    background: #FA6725 !important;
    border: none !important;
}

/* 自定义外部关闭按钮 */
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

.outside-close:active {
    transform: translateX(-50%) scale(0.92);
}
</style>