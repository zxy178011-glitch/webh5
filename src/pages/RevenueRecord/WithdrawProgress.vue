<template>
    <div class="withdraw-progress-page">
        <div :class="pageTopClass">
            <!-- 顶部导航栏 -->
            <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
                <template #title>
                    <span class="nav-title">处理进度</span>
                </template>
            </van-nav-bar>

            <!-- 状态卡片(仅完成或失败时显示) -->
            <div v-if="showStatusCard" class="status-card">
                <div class="status-title-wrapper">
                    <img :src="platformIconMax" class="platform-icon-max" alt="" />
                    <div class="status-title">{{ statusTitle }}</div>
                </div>
                <div class="amount">¥{{ data?.drawCashCount }} </div>
            </div>
        </div>

        <div class="page-content">
            <!-- 时间轴 -->
            <div class="timeline">
                <!-- 第一步：已完成 - 提现申请 -->
                <div class="timeline-item completed">
                    <div class="timeline-left">
                        <div class="dot filled"></div>
                        <div class="dashed-line"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="step-title">{{ data?.drawCashCount }}元提现申请</div>
                        <div class="step-time">{{ data?.createDate }}</div>
                    </div>
                </div>

                <!-- 第二步：处理中 -->
                <div class="timeline-item processing-step">
                    <div class="timeline-left">
                        <div :class="['dot', processingDotClass]"></div>
                        <div class="dashed-line"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="result-row">
                            <div class="step-title-row">
                                <span class="step-title">{{ processingTitle }}</span>
                                <img style="margin-left: 6px;" :src="platformIconmin" class="platform-icon-min"
                                    alt="" />
                                <div v-if="currentStatus == 3" class="step-time">
                                    审核未通过
                                </div>
                            </div>
                            <div class="step-desc">
                                <div v-if="currentStatus == 3" class="view-reason" @click="showReasonDialog">
                                    查看原因
                                    <van-icon name="arrow" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第三步：去微信/支付宝确认收款 -->
                <div :class="['timeline-item', wechatAuthorizeStepClass]" v-if="isWechat">
                    <div class="timeline-left">
                        <div :class="['dot', wechatAuthorizeDotClass]"></div>
                        <div class="dashed-line"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="step-content">
                            <div class="step-title-row">
                                <div class="step-title">去{{ platformName }}确认收款</div>
                                <div class="step-desc">
                                    点击授权按钮确认收款
                                </div>
                            </div>
                            <!-- 去确认收款按钮 -->
                            <div class="authorize-button-wrapper">
                                <button :class="['authorize-button', authorizeButtonOpacityClass]"
                                    @click="goToWechatAuthorize">
                                    <span v-if="isAuthorizeConfirmed">已确认</span>
                                    <span v-else>确认收款</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 第四步：到账结果 -->
                <div :class="['timeline-item', resultStepClass]">
                    <div class="timeline-left">
                        <div :class="['dot', resultDotClass]"></div>
                    </div>
                    <div class="timeline-right">
                        <div class="result-row">
                            <div class="result-content">
                                <div class="result-title-wrapper">
                                    <div class="step-title" :class="{ 'error-title': isFailed }">
                                        {{ resultTitle }}
                                    </div>
                                </div>
                                <div v-if="currentStatus == 2 || currentStatus == 4" class="step-time">
                                    {{ data?.modifyDate }}
                                </div>
                                <div class="step-time" v-else>待入账,请耐心等待</div>
                            </div>
                            <div v-if="currentStatus == 4" class="view-reason" @click="showReasonDialog">
                                查看原因
                                <van-icon name="arrow" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 底部按钮 -->
            <div class="bottom-action">
                <van-button type="primary" round block @click="goToEarn">
                    继续赚海量火花
                </van-button>
            </div>
        </div>

        <!-- 失败原因弹框 -->
        <van-popup v-model:show="showReason" round position="bottom" :style="{ height: '100%' }">
            <div class="agreement-popup">
                <van-nav-bar left-arrow @click-left="showReason = false" safe-area-inset-top class="nav-bar">
                </van-nav-bar>
                <div class="drawCashContent">{{ data?.msg }}</div>
            </div>
        </van-popup>
    </div>
</template>

<script setup lang="ts" name="WithdrawProgress">
import { ref, onMounted, computed } from 'vue'
import router from '../../router/index'
import { useRoute } from 'vue-router'
import { GetByIdAsync, GetbillIdData, getByOutBillNoAsync, DrawCashRecordDto } from '@/api/RevenueRecord/withdrawProgressapi'
import { beginPageView, addOnClick } from '@/utils/YMDataH5Bridge'
// 提现状态常量
const WITHDRAW_STATUS = {
    PROCESSING: 1,  // 提现中(处理中)
    COMPLETED: 2,   // 提现完成
    FAILED: 3,      // 处理失败
    ACCOUNT_FAILED: 4,  // 到账失败
    WAIT_AUTHORIZE: 5,  // 系统审核成功
} as const

const dataObj = { states: 0, page: 'WithdrawProgress', value: '', type: '', key: '' }
const route = useRoute()
const data = ref<DrawCashRecordDto | null>(null)
const Id = ref('');
const showReason = ref(false)

// 当前提现状态 - 从数据中获取
const currentStatus = computed(() => data.value?.drawCashStatus ?? WITHDRAW_STATUS.WAIT_AUTHORIZE)

// 状态判断 - 使用常量比较
const isProcessing = computed(() => currentStatus.value === WITHDRAW_STATUS.PROCESSING)
const isCompleted = computed(() => currentStatus.value === WITHDRAW_STATUS.COMPLETED)
const isFailed = computed(() => currentStatus.value === WITHDRAW_STATUS.ACCOUNT_FAILED)
const isWaitAuthorize = computed(() => currentStatus.value === WITHDRAW_STATUS.WAIT_AUTHORIZE)

// 页面顶部样式类
const pageTopClass = computed(() =>
    isCompleted.value || isFailed.value ? "page-top" : "npage-top"
)

// 是否显示状态卡片
const showStatusCard = computed(() =>

    isCompleted.value || isFailed.value
)

/**
 * 判断是否为微信平台
 */
const isWechat = computed(() => {
    const platform = data.value?.drawPlatform || ''
    return platform === '微信' || platform.toLowerCase() === 'wechat'
})

/**
 * 判断是否为支付宝平台
 */
const isAlipay = computed(() => {
    const platform = data.value?.drawPlatform || ''
    return platform === '支付宝' || platform.toLowerCase() === 'alipay'
})

/**
 * 获取平台名称
 */
const platformName = computed(() => data.value?.drawPlatform || '微信')

/**
 * 获取平台大图标路径
 */
const platformIconMax = computed(() => {
    if (isWechat.value) {
        return '/img/MyEarnings/RevenueRecord/WithdrawProgress/wechatMax.png'
    }
    if (isAlipay.value) {
        return '/img/MyEarnings/RevenueRecord/WithdrawProgress/alipayMax.png'
    }
    return '/img/MyEarnings/RevenueRecord/WithdrawProgress/wechatMax.png' // 默认微信
})
const platformIconmin = computed(() => {
    if (isWechat.value) {
        return '/img/MyEarnings/RevenueRecord/WithdrawProgress/wechatMin.png'
    }
    if (isAlipay.value) {
        return '/img/MyEarnings/RevenueRecord/WithdrawProgress/alipayMin.png'
    }
    return '/img/MyEarnings/RevenueRecord/WithdrawProgress/wechatMin.png' // 默认微信
})
/**
 * 获取状态卡片标题
 */
const statusTitle = computed(() => {
    if (isFailed.value) return '提现失败'
    if (isCompleted.value) return '提现成功'
    return ''
})

/**
 * 获取处理中步骤的标题
 */
const processingTitle = computed(() => {
    const status = currentStatus.value
    if (status === WITHDRAW_STATUS.WAIT_AUTHORIZE ||
        status === WITHDRAW_STATUS.ACCOUNT_FAILED ||
        status === WITHDRAW_STATUS.COMPLETED) {
        return '处理完成'
    }
    if (status === WITHDRAW_STATUS.FAILED) {
        return '处理失败'
    }
    return '处理中'
})

/**
 * 获取处理中步骤dot的class
 */
const processingDotClass = computed(() => {
    const status = currentStatus.value
    if (status === WITHDRAW_STATUS.WAIT_AUTHORIZE ||
        status === WITHDRAW_STATUS.ACCOUNT_FAILED ||
        status === WITHDRAW_STATUS.COMPLETED) {
        return 'filled'
    }
    if (status === WITHDRAW_STATUS.FAILED) {
        return 'failed-dot'
    }
    return 'processing-dot'
})

/**
 * 获取微信授权步骤的class
 */
const wechatAuthorizeStepClass = computed(() => {
    if (isWaitAuthorize.value) return 'processing-step'
    if (isCompleted.value) return 'completed'
    return 'pending'
})

/**
 * 获取微信授权步骤dot的class
 */
const wechatAuthorizeDotClass = computed(() => {
    if (isWaitAuthorize.value) return 'processing-dot'
    if (isCompleted.value || isFailed.value) return 'filled'
    return 'hollow-gray'
})

/**
 * 授权按钮是否已确认
 */
const isAuthorizeConfirmed = computed(() =>
    isCompleted.value || isFailed.value
)

/**
 * 授权按钮透明度类
 */
const authorizeButtonOpacityClass = computed(() =>
    isWaitAuthorize.value ? '' : 'opacity'
)

/**
 * 获取结果步骤的标题
 */
const resultTitle = computed(() => {
    const platform = platformName.value
    if (isFailed.value) {
        return `${platform}到账失败`
    }
    return `${platform}到账成功`
})

/**
 * 获取结果步骤的class
 */
const resultStepClass = computed(() => {
    if (isFailed.value) return 'failed'
    if (isCompleted.value) return 'completed'
    return 'pending'
})

/**
 * 获取结果步骤dot的class
 */
const resultDotClass = computed(() => {
    if (isFailed.value) return 'result-dot failed-dot'
    if (isCompleted.value) return 'result-dot success-dot'
    return 'hollow-gray'
})

/**
 * 显示失败原因弹框
 */
const showReasonDialog = () => {
    showReason.value = true
}

/**
 * 去微信/支付宝确认收款
 */
const goToWechatAuthorize = () => {
    if (!isWaitAuthorize.value) {
        return;
    }
    if (data.value?.billId) {
        //友盟数据埋点-用户点击时
        addOnClick({ taskId: 0, pageName: '点击确认收款时' });
        GetbillIdData({ BillId: data.value.billId }).then((res => {
            dataObj.key = 'wechatOpenBusiness';
            dataObj.type = 'wechatOpenBusiness';
            dataObj.page = 'wechatOpenBusiness';
            var packageStr = 'mchId=' + res.mchId
                + '&appId=' + res.appId
                + '&package=' + encodeURIComponent(res.package);

            dataObj.value = packageStr;
            (window as any).H5Bridge?.closePage?.(dataObj)
        }))

    } else {
        alert('操作异常请联系管理员')
    }
}

/**
 * 获取数据
 */
const getDate = () => {
    GetByIdAsync({
        RefId: Id.value
    }).then((res) => {
        data.value = res
    })
}

/**
 * 初始化页面
 */
onMounted(() => {
    initActiveTab()
    getDate()
    //用户浏览提现进度页面开始-数据埋点
    beginPageView('1', '展示处理进度时')
    try {   //  监听 Flutter 调用
        window.H5Bridge.on('pageRefresh', (datas) => {
            console.log('qrsk回调监听', datas);
            if (datas.businessType == 'wechatOpenBusiness') {
                //微信授权成功刷新状态
                if (data.value?.billId) {
                    getByOutBillNoAsync({ BillId: data.value.billId }).then((res => {
                        getDate();
                    }));
                }
                return;
            }
        })
    } catch (e: any) {
        alert(e?.message || ' 监听 Flutter 调用')
    }
})

/**
 * 初始化ID参数
 */
const initActiveTab = () => {
    const refId = route.query.Id;
    Id.value = String(refId)
}

/**
 * 返回上一页
 */
const onClickLeft = () => {
    router.back();
    //用户浏览提现进度页面结束-数据埋点
    beginPageView('2', '展示处理进度时')
}

/**
 * 继续赚海量火花
 */
const goToEarn = () => {
    dataObj.key = '';
    dataObj.value = '';
    dataObj.page = '';
    dataObj.type = '';
    (window as any).H5Bridge?.closePage?.(dataObj)
}
</script>

<style scoped lang="scss">
.withdraw-progress-page {
    min-height: 100vh;
    background: #FFFFFF;
}

:deep(.van-popup--bottom.van-popup--round) {
    border-radius: 0 !important;
}

.page-top {
    z-index: 1;
    height: 218px;
    width: 100%;
    border-bottom: 1px solid #F4F4F4 !important;
}

.npage-top {
    z-index: 2;
    width: 100%;
    margin-top: 20px;
}

.nav-bar {
    background: #FFFFFF;
    padding-top: 45px;
    padding-bottom: 5px;

    &::after {
        display: none !important;
    }

    :deep(.van-nav-bar__content) {
        &::after {
            display: none !important;
        }
    }

    :deep(.van-nav-bar__arrow) {
        color: #1E1E1E;
        font-size: 18px;
        font-weight: bold;
    }

    .nav-title {
        font-family: PingFang SC;
        font-weight: 600;
        font-size: 18px;
        line-height: 26px;
        color: #252525;
    }
}

.page-content {
    padding: 0;
    width: 100%;
    border-bottom: 1px solid #F4F4F4;
}

/* ========== 状态卡片 ========== */
.status-card {
    padding: 24px 16px;
    text-align: center;
    margin-bottom: 8px;

    .status-icon {
        margin-bottom: 8px;
    }

    .status-title-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 8px;

        .platform-icon-max {
            width: 20px;
            height: 18px;
            object-fit: contain;
        }

        .platform-icon-min {
            width: 16px;
            height: 14px;
            object-fit: contain;
        }

        .status-title {
            font-size: 16px;
            line-height: 24px;
            color: #323233;
            font-weight: 500;
        }
    }

    .amount {
        font-size: 32px;
        line-height: 44px;
        color: #323233;
        font-weight: 600;
    }
}

/* ========== 时间轴 ========== */
.timeline {
    padding: 24px 16px 24px 32px;
}

.timeline-item {
    display: flex;
    min-height: 80px;
    position: relative;

    &:last-child {
        min-height: auto;
    }
}

/* 左侧节点和线条 */
.timeline-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 20px;
    margin-right: 20px;
    flex-shrink: 0;
}

.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 13px;
    display: flex;
    align-items: center;
    justify-content: center;

    &.filled {
        background: #ff6b35;
        width: 10px;
        height: 10px;
    }

    &.processing-dot {
        background: #FFE3D7;
        width: 32px;
        height: 32px;
        background-image: url('/img/MyEarnings/RevenueRecord/WithdrawProgress/处理中.png');
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
        margin-top: 5px;
    }

    &.result-dot {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &.success-dot {
            background: #FFE3D7;
            width: 32px;
            height: 32px;
            background-image: url('/img/MyEarnings/RevenueRecord/WithdrawProgress/完成.png');
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            margin-top: 5px;
        }

        &.failed-dot {
            background: #FFE3D7;
            width: 32px;
            height: 32px;
            background-image: url('/img/MyEarnings/RevenueRecord/WithdrawProgress/失败.png');
            background-position: center;
            background-repeat: no-repeat;
            background-size: contain;
            margin-top: 5px;
        }
    }

    &.failed-dot {
        background: #FFE3D7;
        width: 32px;
        height: 32px;
        background-image: url('/img/MyEarnings/RevenueRecord/WithdrawProgress/失败.png');
        background-position: center;
        background-repeat: no-repeat;
        background-size: contain;
        margin-top: 5px;
    }

    &.hollow-gray {
        background: #FFE3D7;
        width: 10px;
        height: 10px;
    }
}

.dashed-line {
    width: 2px;
    flex: 1;
    background-image: linear-gradient(to bottom, #ff6b35 50%, transparent 50%);
    background-size: 2px 8px;
    background-repeat: repeat-y;
    margin-bottom: -15px;
}

/* 右侧内容 */
.timeline-right {
    flex: 1;
    padding-top: 0;

}

.step-content {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.step-title {
    font-size: 14px;
    line-height: 22px;
    color: #323233;
    font-weight: 400;

    &.error-title {
        color: #FF4D4F;
    }
}

.step-title-row {
    // display: flex;
    // align-items: center;
    // gap: 6px;

    .step-title {
        margin-bottom: 0;
    }
}

.step-time {
    font-size: 12px;
    line-height: 18px;
    font-weight: 400;
    color: #7A7A7A;
}

.step-desc {
    font-size: 12px;
    line-height: 20px;
    color: #7A7A7A;
}

/* 授权按钮 */
.authorize-button-wrapper {
    margin-top: 6px;
}

.opacity {
    opacity: 0.5;
}

.authorize-button {
    border: none;
    width: 66px;
    height: 30px;
    angle: 0 deg;

    top: 412px;
    left: 304px;
    border-radius: 110px;
    background: #FA6725;
    font-size: 12px;
    color: #ffffff;
    font-weight: 500;
}

/* 结果行 */
.result-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.result-content {
    flex: 1;
}

.result-title-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;

    .platform-icon-max {
        width: 16px;
        height: 16px;
        object-fit: contain;
        flex-shrink: 0;
    }
}

.view-reason {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    line-height: 18px;
    color: #7A7A7A;
    cursor: pointer;
    flex-shrink: 0;
    padding: 2px 0;
    font-weight: 400;

    &:active {
        opacity: 0.7;
    }

    .van-icon {
        font-size: 12px;
    }
}

/* 状态样式 */
.timeline-item.completed {
    .step-title {
        color: #252525;
    }

    .step-time {
        color: #969799;
    }
}

.timeline-item.processing-step {
    .step-title {
        color: #323233;
        font-weight: 400;
    }
}

.timeline-item.pending {
    // .step-title {
    //     color: #c8c9cc;
    // }

    // .step-time {
    //     color: #7A7A7A;
    // }
}

.timeline-item.failed {
    .step-title {
        color: #FF4D4F;
    }

    .step-time {
        color: #7A7A7A;
    }
}

/* ========== 底部按钮 ========== */
.bottom-action {
    display: flex;
    justify-content: center;
    margin-top: 30px;
    padding-bottom: 30px;

    :deep(.van-button) {
        background: #FA6725;
        border: none;
        height: 42px;
        width: 274px;
        font-size: 16px;
        font-weight: 400;
    }
}

/* ========== 失败原因弹框 ========== */
.reason-content {
    padding: 24px 16px;
    font-size: 14px;
    line-height: 24px;
    color: #323233;
    text-align: center;
}

:deep(.van-dialog) {
    .van-dialog__header {
        font-weight: 600;
        font-size: 16px;
        color: #323233;
    }

    .van-dialog__confirm {
        font-size: 16px;
    }
}

.drawCashContent {
    padding: 0px 20px;
}
</style>