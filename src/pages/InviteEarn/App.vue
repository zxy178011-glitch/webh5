<template>
    <div class="inviteEarn-page">
        <!-- 成功邀请新人提示 -->
        <TopNotification v-model="showNotification" :normalText="notificationText.normal"
            :highlightText="notificationText.highlight" :autoHide="true" :duration="3000" />
        <RulePopup v-model="showRule" title="说明" :rules="ruleList" confirmText="我知道了" />
        <!-- 头图占位（背景图已在容器上），用于控制可视高度 -->
        <div class="hero-space"> <!-- 顶部导航 -->
            <van-nav-bar placeholder safe-area-inset-top left-arrow :border="false" class="nav-bar"
                @click-left="onBack">
                <template #right>
                    <span class="nav-help" @click="showRulePopup">说明</span>
                </template>
            </van-nav-bar>
        </div>
        <!--我的邀请码卡片-->
        <!-- <section class="card invite-code-card">
            <div class="ic-title">
                <div class="h-side">
                    <span class="h-line long"></span>
                    <span class="h-line short"></span>
                </div>
                我的邀请码
                <div class="h-side right">
                    <span class="h-line long"></span>
                    <span class="h-line short"></span>
                </div>
            </div>

            <div class="ic-box">
                <div class="code">{{ inviteCode }}</div>
                <div class="ops">
                    <button type="button" class="pill-btn" @click="copyInvite">复制</button>
                    <button type="button" class="pill-btn aaa" @click="fillInvite">填邀请码</button>
                </div>
            </div>
        </section> -->
        <!-- 填写邀请码弹框 -->
        <van-popup v-model:show="showInviteDlg" :z-index="2001" round class="invite-popup"
            :close-on-click-overlay="false" teleport="body">
            <div class="popup-title">填写邀请码</div>

            <div class="input-wrap">
                <input v-model.trim="inviteInput" type="text" placeholder="请输入邀请码" maxlength="20" />
            </div>

            <div class="btn-row">
                <button type="button" class="btn ghost" @click="cancelInvite">取消</button>
                <button type="button" class="btn primary" :disabled="!canSubmit" @click="submitInvite">
                    提交
                </button>
            </div>
        </van-popup>
        <!-- 绑定微信 -->
        <BindingPopup v-model="showBindingPopup" :method="bindingMethod" customTitle="绑定微信账号"
            customMessage="当前账号未绑定微信,请先绑定实名微信，才能填写邀请码哦！" @confirm="handleGoBinding" />
        <!-- 主卡片：邀请好友，轻松赚火花 + 二步说明 + 按钮 + 倒计时 -->
        <section class="card summary-card">
            <div class="headline">
                <div class="h-side">
                    <span class="h-line long"></span>
                    <span class="h-line short"></span>
                </div>
                邀请好友，轻松赚火花
                <div class="h-side1">
                    <span class="h-line1 long"></span>
                    <span class="h-line1 short"></span>
                </div>
            </div>

            <div class="steps">
                <div class="step" v-for="s in steps" :key="s.id">
                    <div class="icon" :style="{ background: `url(${s.icon}) no-repeat top center / contain` }"></div>
                    <div class="title">{{ s.title }}</div>
                    <div class="desc" v-html="s.desc"></div>
                </div>
            </div>

            <div class="action-btn" @click="copyInvite">
                <div class="btn-text"></div>
                <div class="btn-subtext">邀请码：{{ inviteCode }}</div>
            </div>

            <div class="pill-btn" @click="fillInvite">
                填写邀请码
            </div>
        </section>

        <!-- 奖励记录卡片 -->
        <section class="card reward-card">
            <!-- 标题（中间+左右细线） -->
            <div class="rc-title">
                <div class="h-side">
                    <span class="h-line long"></span>
                    <span class="h-line short"></span>
                </div>
                奖励记录
                <div class="h-side right">
                    <span class="h-line long"></span>
                    <span class="h-line short"></span>
                </div>
            </div>

            <!-- 统计区 -->
            <div class="rc-stats">
                <div class="item">
                    <div class="label">成功邀请（位）</div>
                    <div class="value">{{ invitedCount }}</div>
                </div>
                <i class="v-split"></i>
                <div class="item">
                    <div class="label">我的收益（火花）</div>
                    <div class="value">
                        <b>{{ incomeWan }}</b><span class="unit">万</span>
                    </div>
                </div>
            </div>

            <!-- 表头 -->
            <div class="rc-list-head" v-if="inviteRecords.length">
                <div class="c1">头像</div>
                <div class="c2">昵称</div>
                <div class="c3">邀请时间</div>
            </div>

            <!-- 列表 -->
            <div class="rc-list" v-if="inviteRecords.length">
                <div class="rc-row" v-for="r in inviteRecords" :key="r.id">
                    <img class="avatar" :src="getAvatarUrl(r.avatar)" alt="" />
                    <div class="name" :title="r.name">{{ r.name }}</div>
                    <div class="time">{{ formatDotDate(r.invitedAt) }}</div>
                </div>
                <!-- 列表下方 -->
                <div v-if="hasMore" style="text-align:center;padding:8px 0;">
                    <van-button size="small" round type="primary" plain :loading="loadingMore" @click="loadMore">
                        查看更多
                    </van-button>
                </div>
            </div>
            <div class="rc-empty" v-else>
                <div>暂无记录</div>
                <div>快去邀请好友赚火花吧</div>
            </div>
        </section>

        <div class="safe-bottom" />
    </div>
</template>

<script setup lang="ts">
/**
 * 邀请有奖页面（InviteEarn）
 * - 顶部头图使用容器背景图
 * - 三步说明、填写邀请码弹窗、奖励记录列表
 * - 接入真实后端：概览/列表 & 绑定邀请码（均为 POST）
 */
import { onMounted, onBeforeUnmount, ref, computed } from "vue";
import { showToast, showLoadingToast } from "vant";
import { fetchInviteOverview, bindInvite, GetReferralRewardTip, TrackEventAsync } from "@/api/InviteEarn/api";
import RulePopup from '../../components/Popup/RulePopup.vue'
import { getRulesDataList, RuleItem } from '@/api/InvitationActivityRules/api'
import {
    GetAlipayAuthString,
} from '@/api/MyEarnings/api'
import { Console } from "console";
// 控制显示隐藏
const showNotification = ref(false)
//  通知文本
const notificationText = ref({
    normal: '本次拉新2人获得奖励',
    highlight: '50万火花'
})
// 绑定弹框状态
const showBindingPopup = ref(false)
const bindingMethod = ref<string>('wechat')
function handleGoBinding(method: string) {
    showBindingPopup.value = false
    if (method === 'wechat') {
        dataObj.key = 'wechatAuth';
        dataObj.value = '';
        dataObj.type = 'wechatAuth';
        (window as any).H5Bridge?.closePage?.(dataObj)
    } else {
        GetAlipayAuthString().then((res => {
            dataObj.key = 'alipayAuth';
            dataObj.value = String(res);
            dataObj.type = 'alipayAuth';
            (window as any).H5Bridge?.closePage?.(dataObj)
        }));
    }
}


//关闭页面通知移动端的数据
const dataObj = { states: 0, page: 'InviteEarn', key: '', value: '', type: '' }
//console.log('监听器数量:', window.H5Bridge.listenerCount('pageRefresh'))

/** 三步说明结构 */
interface Step {
    id: number;
    icon: string;
    title: string;
    /** 支持换行/小字，用 v-html 渲染 */
    desc: string;
}

/** 奖励记录项（前端增加 id 作为列表 key） */
interface InviteRecord {
    id: string;              // 前端生成
    avatar?: string | null;
    name: string;
    invitedAt: string;       // ISO 字符串
}

/* ------------------------ 可配常量 ------------------------ */
const campaignId = 10010;      // 活动ID（按需改为从配置/路由获取）
const pageLimit = 20;      // 每页条数（与后端上限一致）

const wechat = ref(false);

/* ------------------------ 状态：顶部规则弹窗 ------------------------ */
// —— 规则弹窗 —— 
// 控制弹框显示/隐藏
const showRule = ref(false)
const ruleList = ref<RuleItem[]>([]);

const showRulePopup = () => {
    getRulesDataList({ TaskTypeId: 10010 }).then((res => {
        ruleList.value = res;
        console.log('ruleList', ruleList)
    }))
    showRule.value = true
}


/* ------------------------ 状态：倒计时 ------------------------ */
const roundEndsAt = ref<number>(
    Date.now() + 7 * 60 * 60 * 1000 + 11 * 60 * 1000 + 17 * 1000
);
const remainText = computed(() => {
    const now = Date.now();
    let diff = Math.max(0, roundEndsAt.value - now);
    const h = Math.floor(diff / 3600000);
    diff -= h * 3600000;
    const m = Math.floor(diff / 60000);
    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
});
let timer: number | undefined;

/* ------------------------ 状态：概览/列表 ------------------------ */
const inviteCode = ref<string>("");     // 邀请码（后端返回，形如 WLxxxx）
const invitedCount = ref<number>(0);    // 成功邀请人数
const incomeWan = ref<number>(0);       // 收益（万）
const inviteRecords = ref<InviteRecord[]>([]);

const loadingOverview = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const nextOffset = ref(0);

/* ------------------------ 三步说明（静态） ------------------------ */
const steps = ref<Step[]>([
    { id: 1, icon: "/img/InviteEarn/yq.png", title: "好友下载并登录", desc: "好友下载app并登录围炉小说" },
    { id: 2, icon: "/img/InviteEarn/xz.png", title: "分享邀请码给好友", desc: "好友填写邀请码并提交" },
    { id: 3, icon: "/img/InviteEarn/hh.png", title: "获得大额奖励", desc: "每天最高可获得120万火花奖励" },
]);

/* ------------------------ 工具函数 ------------------------ */
/** 生成幂等键（前端） */
const newIdemKey = () =>
    (crypto as any)?.randomUUID?.() ?? `idem_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const getAvatarUrl = (avatar: string | null | undefined) => {
    if (!avatar) return '/img/public/avatar-default.png';
    // 如果已经是完整URL就直接返回
    if (avatar.startsWith('http')) return avatar;
    // 否则拼接域名
    return `https://client.mishuwenhua.cn/${avatar.replace(/^\//, '')}`;
};
/** YYYY.MM.DD */
const formatDotDate = (d: string | number | Date) => {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
};

/* ------------------------ 动作：复制邀请码 ------------------------ */
const copyInvite = async () => {

    const text = inviteCode.value || "";
    if (!text) return;
    //插入用户点击复制邀请码统计
    await TrackEventAsync({ EventType: 'invite' });
    try {
        // 调用 H5Bridge给移动端传递页面的邀请码
        try {
            dataObj.value = text;
            dataObj.key = 'copy';
            dataObj.type = 'copy';
            (window as any).H5Bridge?.closePage?.(dataObj);
            showToast({ message: '已复制邀请码', duration: 1500, position: 'top' })
        } catch (e: any) {
            showToast(e?.message || "复制失败");
        }
    } catch (e: any) {
        showToast(e?.message || "复制失败");
    }
};

/* ------------------------ 邀请码弹窗 ------------------------ */
const showInviteDlg = ref(false);
const inviteInput = ref("");

/** 填写校验：允许 WL/字母数字，长度 3~64（兼容 umid） */
const canSubmit = computed(() => /^[A-Za-z0-9]{3,64}$/i.test(inviteInput.value?.trim() || ""));

const fillInvite = () => (showInviteDlg.value = true);
const cancelInvite = () => {
    showInviteDlg.value = false;
    inviteInput.value = "";
};

/** 提交邀请码 → 调后端 */
const submitting = ref(false);

const submitInvite = async () => {
    if (submitting.value) return;
    if (!canSubmit.value) {
        showToast({ message: '请输入正确的邀请码', duration: 1500, position: 'top' });
        return;
    }
    //插入用户点击提交统计
    await TrackEventAsync({ EventType: 'submit' });
    submitting.value = true;
    const loading = showLoadingToast({ message: '绑定中...', forbidClick: true, duration: 0, position: 'top' });
    try {
        const res = await bindInvite({ campaignId, code: inviteInput.value.trim(), idemKey: newIdemKey() });
        loading.close();
        showToast({ message: res.message, duration: 1800, position: 'top' });
        showInviteDlg.value = false;
        inviteInput.value = '';
        await fetchOverview(true);

    } catch (e: any) {
        loading.close();
        showToast({ message: e?.message || '网络异常', duration: 2000, position: 'top' });
        if (e?.message == '请先绑定微信后，再填写邀请码') {
            showInviteDlg.value = false;
            showBindingPopup.value = true
        }
    } finally {
        submitting.value = false;
    }
};
/* ------------------------ 接口：概览+列表 ------------------------ */

const ReferralRewardTip = async () => {
    await GetReferralRewardTip().then((res => {
        if (res?.successCount > 0) {
            notificationText.value = {
                normal: `本次拉新${res.successCount}人获得奖励`,
                highlight: `${res.totalReward}火花`
            }
            showNotification.value = true
        }
    }));
};
/**
 * 进入页面统计用户拉新进度
 * @param campaignId 活动配置Id
 */
// const VerifyGrantReward = async (campaignId = 10010) => {
//     VerifyAndGrantReward({
//         campaignId: campaignId,

//     }).then((res => {
//         if (res?.successCount > 0) {
//             notificationText.value = {
//                 normal: `本次拉新${res.successCount}人获得奖励`,
//                 highlight: `${res.totalReward}火花`
//             }
//             showNotification.value = true
//         }
//     }));
// }
/**
 * 拉取概览与列表
 * @param reset 是否重置分页并清空旧数据
 */
const fetchOverview = async (reset = false) => {
    if (loadingOverview.value) return;
    loadingOverview.value = true;
    try {
        if (reset) {
            nextOffset.value = 0;
            hasMore.value = true;
            inviteRecords.value = [];
        }
        const res = await fetchInviteOverview({
            campaignId,
            offset: nextOffset.value,
            limit: pageLimit,
        });
        const data = res;
        // if (data.isLimitReached) {
        //     showToast({
        //         message: `今日奖励已达领取上线`,
        //         position: 'top'
        //     })
        // }
        // if (data.globalDailyLimitReached) {
        //     showToast({
        //         message: `今日奖励已被瓜分完`,
        //         position: 'top'
        //     })
        // }
        // 方案3：延迟显示第二个
        if (data.isLimitReached) {
            showToast({
                message: '今日奖励已达领取上限',
                position: 'top',
                duration: 2000
            });
        }
        if (data.globalDailyLimitReached) {
            setTimeout(() => {
                showToast({
                    message: '今日奖励已被瓜分完',
                    position: 'top'
                });
            }, data.isLimitReached ? 2200 : 0);
        }
        // 概览
        wechat.value = data.wechat ?? false;
        inviteCode.value = data?.inviteCode ?? "";
        invitedCount.value = Number(data?.invitedCount ?? 0);
        incomeWan.value = Number(data?.incomeWan ?? 0);

        // 列表：为每条加一个稳定 id（避免后端不返回主键）
        const rows = Array.isArray(data?.records) ? data!.records : [];
        const mapped: InviteRecord[] = rows.map((r: any, i: number) => ({
            id: `${r.invitedAt || ""}_${r.name || ""}_${nextOffset.value + i}`,
            avatar: r.avatar ?? null,
            name: r.name ?? "",
            invitedAt: r.invitedAt ?? "",
        }));
        inviteRecords.value.push(...mapped);

        hasMore.value = !!data?.hasMore;
        nextOffset.value = Number(data?.nextOffset ?? (nextOffset.value + rows.length));
    } catch (e: any) {
        showToast(e?.message || "网络异常");
    } finally {
        loadingOverview.value = false;
    }
};

/** 分页加载更多 */
const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) return;
    loadingMore.value = true;
    try {
        const res = await fetchInviteOverview({
            campaignId,
            offset: nextOffset.value,
            limit: pageLimit,
        });
        const data = res;
        const rows = Array.isArray(data?.records) ? data!.records : [];
        const mapped: InviteRecord[] = rows.map((r: any, i: number) => ({
            id: `${r.invitedAt || ""}_${r.name || ""}_${nextOffset.value + i}`,
            avatar: r.avatar ?? null,
            name: r.name ?? "",
            invitedAt: r.invitedAt ?? "",
        }));
        inviteRecords.value.push(...mapped);
        hasMore.value = !!data?.hasMore;
        nextOffset.value = Number(data?.nextOffset ?? (nextOffset.value + rows.length));
    } catch (e: any) {
        showToast(e?.message || "网络异常");
    } finally {
        loadingMore.value = false;
    }
};

/* ------------------------ 生命周期 ------------------------ */
onMounted(() => {
    //  监听 Flutter 调用
    window.H5Bridge.on('pageRefresh', (data) => {
        //console.log('拉新人页面的监听')
    })
    //页面曝光统计
    TrackEventAsync({ EventType: 'pv' });
    //获取拉新奖励提示
    ReferralRewardTip();
    //VerifyGrantReward(10010);
    // 倒计时刷新
    timer = window.setInterval(() => (roundEndsAt.value = roundEndsAt.value), 1000);

    // 首屏拉取
    fetchOverview(true);
});

onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
});

/* ------------------------ 其他交互（返回/说明/分享） ------------------------ */
function onBack() {
    try {
        dataObj.type = '';
        dataObj.key = '';
        dataObj.value = '';
        (window as any).H5Bridge?.closePopup?.(dataObj);
    } catch (e: any) {
        showToast(e?.message || "复制失败");
    }
}
const onExplain = () => showToast("这里可打开活动规则页");
const onInvite = () => {
    try {
        // @ts-ignore 原生桥
        if (window.H5Bridge && typeof window.H5Bridge.emit === "function") {
            // @ts-ignore
            window.H5Bridge.emit("share", {
                scene: "invite",
                title: "邀请你一起领火花",
                desc: "邀请好友，轻松赚火花",
                url: location.href,
            });
            return;
        }
    } catch { }
    showToast("已触发邀请/分享（示例）");
};

/* 导出给模板使用的函数（若模板直接引用可省略） */
defineExpose({
    fillInvite,
    cancelInvite,
    submitInvite,
    copyInvite,
    fetchOverview,
    loadMore,
    formatDotDate,
});
</script>

<style scoped lang="scss">
/* ============================================================================
   页面基础变量
   ========================================================================== */
.inviteEarn-page {
    min-height: 100vh;
    background-color: rgba(252, 240, 219, 1);

    /* 视觉/主题变量 */
    --overlap-y: 25px;
    --brand-start: #ff7c38;
    --brand-end: #ffb057;
    --brand-strong: #ff6b3d;
    --gold-text: #b56b2a;
    --card-radius: 16px;
    --shadow: 0 8px 20px rgba(255, 139, 74, 0.15);
}

/* 说明按钮：手势友好、颜色白 */
.nav-help {
    color: #fff;
    font-size: 14px;
    cursor: pointer;
}

/* ============================================================================
   规则弹窗
   ========================================================================== */
.rule-popup {
    width: 320px;
    /* 300~340 自行调整 */
    padding: 16px 16px 14px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

.rule-title {
    margin-bottom: 10px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: rgba(133, 61, 33, 1);
}

.rule-content {
    max-height: 50vh;
    overflow: auto;
    padding: 6px 2px 10px;

    ol {
        margin: 0;
        padding-left: 10px;
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
    margin-top: 6px;

    .btn.primary {
        min-width: 120px;
        height: 36px;
        padding: 0 16px;
        border: 0;
        border-radius: 999px;
        line-height: 36px;
        font-size: 14px;
        color: #fff;
        // background: linear-gradient(180deg, var(--brand-start) 0%, var(--brand-end) 100%);
    }
}

/* ============================================================================
   顶部导航（覆盖在头图上，背景透明）
   ========================================================================== */
.nav-bar {
    background: transparent;
    padding-top: 45px;
    padding-bottom: 5px;

    :deep(.van-nav-bar__arrow) {
        color: rgba(30, 30, 30, 1); // 修改颜色
        font-size: 22px; // 修改大小
        font-weight: bold; // 加粗（可选）
    }

    :deep(.van-icon) {
        color: #fff;
    }

    :deep(.van-nav-bar__title) {
        color: #fff;
    }

    :deep(.van-nav-bar) {
        background: transparent !important;
        // margin-top: 46px;
    }

    // :deep(.van-nav-bar__content) {
    //     height: 90px !important;
    // }

    :deep(.van-nav-bar__arrow) {
        font-size: 20px !important;
    }
}

/* ============================================================================
   头图区域（作为背景承载）
   ========================================================================== */
.hero-space {
    height: 450px;
    background-image: url('/img/InviteEarn/头图.png');
    background-size: 100% 100%;
    background-position: top center;
    background-repeat: no-repeat;
    background-color: #f5e6d3;
}

/* ============================================================================
   填写邀请码弹窗
   ========================================================================== */
.invite-popup {
    width: 270px;
    height: 191px;
    padding: 16px 16px 14px;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

.popup-title {
    font-family: PingFang SC;
    margin-bottom: 12px;
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    color: #252525;

}

.input-wrap {
    margin-bottom: 14px;
    padding: 12px;
    background: #F5F5F5;
    border: 1px solid rgba(0, 0, 0, 0.02);
    border-radius: 12px;
    width: 230px;
    height: 52px;

    input {
        width: 100%;
        height: 24px;
        line-height: 24px;
        font-size: 14px;
        color: #333;
        background: transparent;
        border: none;
        outline: none;

        &::placeholder {
            color: #8A8A8A;

        }
    }
}

.btn-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 2px;
}

.btn {
    min-width: 102px;
    height: 36px;
    padding: 0 16px;
    border: 0;
    border-radius: 999px;
    line-height: 36px;
    font-size: 14px;

    &.ghost {
        background: #fff;
        color: #FA6725;
        /* border: 1px solid var(--brand-start); */
        border: 1px solid #FA6725;
        width: 109px;
        height: 42px;
    }

    &.primary {
        background: #fa6725;
        color: #fff;
        width: 109px;
        height: 42px;

        &:disabled {
            opacity: .5;
        }
    }
}

/* ============================================================================
   我的邀请码卡片
   ========================================================================== */
.invite-code-card {
    height: 138px !important;
    position: relative;

    .ic-title {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 10px 0 20px;
        font-size: 18px;
        font-weight: 500;
        color: rgba(133, 61, 33, 1);
        line-height: 1;

        /* 标题两侧细线 */
        --line-h: 1.5px;
        --line-long: 44px;
        --line-short: 24px;
        --line-color: #e6d6c6;
        --line-fade: rgba(133, 61, 33, 0);

        .h-side {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            /* 左侧线头朝内 */
            gap: 3px;
            line-height: 0;
            padding-right: 10px;

            &.right {
                align-items: flex-start;
                padding-left: 10px;

                /* 右侧线头朝内 */
                .h-line {
                    transform: scaleX(-1);
                }
            }
        }

        .h-line {
            height: var(--line-h);
            background: linear-gradient(90deg, var(--line-fade) 0%, var(--line-color) 100%);
            border-radius: 1px;
            display: block;
        }

        .long {
            width: var(--line-long);
        }

        .short {
            width: var(--line-short);
        }
    }

    .ic-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        column-gap: 10px;
        padding: 12px;
        background: #f7f7f7;
        border-radius: 12px;
    }

    .code {
        flex: 1;
        font-family: PingFang SC;
        font-weight: 500;
        font-size: 13px;
        line-height: 20px;
        letter-spacing: 0;
        color: rgba(133, 61, 33, 1);
    }

    .ops {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }



    // .pill-btn.aaa {
    //     z-index: 2;
    //     width: 68px;
    //     /* 不要随意用 !important */
    //     height: 28px;
    // }

}

.pill-btn {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 13px;
    leading-trim: NONE;
    line-height: 20px;
    letter-spacing: 0px;
    text-align: center;
    color: #853D21;
    text-align: center;
    padding-bottom: 5px;
}

/* 极小屏：按钮换行避免挤压邀请码 */
@media (max-width: 340px) {
    .invite-code-card .ic-box {
        flex-wrap: wrap;
        row-gap: 8px;
    }

    .invite-code-card .ops {
        width: 100%;
        justify-content: flex-end;
    }
}

/* ============================================================================
   通用卡片
   ========================================================================== */
.card {
    margin: 8px 12px 12px;
    padding: 16px 14px 14px;
    background: #fff;
    border-radius: var(--card-radius);
    box-shadow: var(--shadow);
}

/* ============================================================================
   顶部大卡片（标题细线 + 三步）
   ========================================================================== */
.summary-card {
    .headline {
        margin: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: PingFang SC;
        font-weight: 500;
        font-size: 20px;
        line-height: 100%;
        letter-spacing: 0;
        text-align: center;
        color: #853D21;

        /* 线条变量 */
        --line-h: 1.5px;
        --line-long: 44px;
        --line-short: 24px;
        --line-color: #e6d6c6;
        --line-fade: rgba(133, 61, 33, 0);

        .num {
            margin: 0 4px;
            font-size: 18px;
            font-weight: 700;
            color: #e37b2a;
        }

        .h-side {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 3px;
            line-height: 0;
            padding-right: 10px;
        }

        .h-side1 {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 3px;
            line-height: 0;
            padding-left: 10px;

            .h-line1 {
                transform: scaleX(-1);
            }
        }

        .long {
            width: var(--line-long);
        }

        .short {
            width: var(--line-short);
        }

        .h-line,
        .h-line1 {
            height: var(--line-h);
            background: linear-gradient(90deg, var(--line-fade) 0%, var(--line-color) 100%);
            border-radius: 1px;
            display: block;
        }
    }

    .steps {
        margin-top: 12px;
        height: 136px;
        padding: 15px 8px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        column-gap: 8px;
        position: relative;
        background: linear-gradient(180deg, #fff4e5 0%, #fffdf8 100%);
        border: 1px solid #FFEDD6;
        border-radius: 12px;
    }

    .step {
        position: relative;
        text-align: center;
        padding: 6px 4px;

        &:not(:last-child)::after {
            content: "";
            position: absolute;
            top: 13%;
            right: -15px;
            width: 25px;
            height: 20px;
            background: url(/img/InviteEarn/Frame.png) center/cover no-repeat;
        }

        .icon {
            width: 32px;
            height: 32px;
            margin: 0 auto 6px;
            // background: #fff center/contain no-repeat;
            // border-radius: 15px;
            // box-shadow: 0 2px 8px rgba(255, 158, 68, 0.25);
        }

        .title {
            font-family: PingFang SC;
            font-size: 13px !important;
            font-weight: 500;
            color: #853D21;
            line-height: 18px;
            white-space: nowrap
        }

        .desc {
            margin-top: 5px;
            font-family: PingFang SC;
            font-weight: 400;
            font-size: 11px;
            line-height: 14px;
            letter-spacing: 0;
            text-align: center;
            color: rgba(133, 61, 33, 1);
            opacity: .6;
        }

        .em {
            color: #e37b2a;
            font-weight: 700;
        }
    }

    .action-btn {
        block-size: 48px;
        inline-size: 245px;
        background: #FFFFFF;
        border-radius: 6.66667vw;
        transition: all 0.2s ease;
        align-self: center;
        margin: 16px auto 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding-block-start: 0;
        cursor: pointer;
        text-align: center;
        width: 280px;
        height: 58px;
        background-image: url(/img/InviteEarn/按钮.png);
        background-size: 100% 100%;
        background-position: top center;
        background-repeat: no-repeat;

        .btn-text {
            width: 132px !important;
            height: 20px !important;
            margin-block-end: 0.51282vw;
            background-image: url(/img/InviteEarn/按钮文案.png);
            background-size: 132px 20px;
            background-position: center;
            background-repeat: no-repeat;
        }


        .btn-subtext {
            color: rgba(255, 255, 255, 0.8);
            font-family: PingFang SC;
            font-weight: 400;
            font-style: Regular;
            font-size: 11px;
            leading-trim: NONE;
            // line-height: 20px;
            margin-bottom: -5px;
            letter-spacing: 0px;
            text-align: center;
            margin-top: 2px;
        }
    }
}

/* 倒计时 */
.countdown {
    margin-top: 10px;
    text-align: center;
    font-size: 12px;
    color: #c08a58;

    span {
        margin-right: 2px;
        font-weight: 700;
        color: #a0632e;
    }
}

/* ============================================================================
   奖励记录卡片（标题 + 统计 + 表格）
   ========================================================================== */
.reward-card {
    padding-top: 14px;
    height: auto;

    /* 行高与网格列宽（统一定义，便于维护） */
    --row-h: 52px;
    /* 估算：36(头像) + 8*2 内边距 */
    --col-avatar: 56px;
    /* 头像列宽 */
    --col-time: 96px;
    /* 时间列固定宽度 */
}

/* 标题（中间+左右细线） */
.reward-card .rc-title {
    width: 100%;
    margin: 10px 0 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 500;
    line-height: 1;
    color: #853D21;
    font-family: PingFang SC;
    font-style: Medium;



    --line-h: 1.5px;
    --line-long: 44px;
    --line-short: 24px;
    --line-color: #e6d6c6;
    --line-fade: rgba(133, 61, 33, 0);

    .h-side {
        display: flex;
        flex-direction: column;
        gap: 3px;
        line-height: 0;
        padding: 0 10px;
        align-items: flex-end;

        &.right {
            align-items: flex-start;

            .h-line {
                transform: scaleX(-1);
            }
        }
    }

    .h-line {
        height: var(--line-h);
        background: linear-gradient(90deg, var(--line-fade) 0%, var(--line-color) 100%);
        border-radius: 1px;
        display: block;
    }

    .long {
        width: var(--line-long);
    }

    .short {
        width: var(--line-short);
    }
}

/* 顶部统计 */
.reward-card .rc-stats {
    margin-bottom: 12px;
    padding: 12px 10px;
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: center;
    background: linear-gradient(180deg, #fff4e5 0%, #fffdf8 100%);
    border: 1px solid rgba(255, 237, 214, 1);
    border-radius: 12px;

    .item {
        text-align: center;
        color: rgba(250, 103, 37, 1);
        font-weight: 600;
        font-size: 22px;
        line-height: 28px;
        letter-spacing: -1px;

        .label {
            margin-bottom: 4px;
            font-family: PingFang SC;
            font-weight: 400;
            font-size: 13px;
            line-height: 20px;
            letter-spacing: 0;
            color: #853D21;
            text-align: center;
        }

        .value {
            color: #ff823f;
            font-weight: 800;
            font-size: 20px;
            display: flex;
            justify-content: center;
        }

        b {
            font-weight: 600;
            font-size: 22px;
            line-height: 28px;
            letter-spacing: -1px;
        }

        .unit {
            margin-left: 5px;
            font-weight: 600;
            font-size: 18px;
            line-height: 28px;
            letter-spacing: -1px;
        }
    }

    .v-split {
        width: 1px;
        height: 28px;
        margin: 0 auto;
        background: rgba(133, 61, 33, 1);
        opacity: .2;
        border-radius: 1px;
        display: block;
    }
}

/* 表头 */
.reward-card .rc-list-head {
    padding: 6px 2px 8px;
    display: grid;
    grid-template-columns: var(--col-avatar) 1fr var(--col-time);
    align-items: center;
    justify-items: center;
    text-align: center;
    color: #853D21;
    font-family: PingFang SC;
    font-weight: 400;
    font-size: 13px;
    line-height: 20px;

    .c1,
    .c2,
    .c3 {
        text-align: center;
    }
}

/* 列表容器：最多显示4行，超出滚动；无数据时高度为0 */
.reward-card .rc-list {
    max-height: calc(var(--row-h) * 4);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
}

/* 列表行 */
.reward-card .rc-list .rc-row {
    padding: 8px 2px;
    display: grid;
    grid-template-columns: var(--col-avatar) 1fr var(--col-time);
    align-items: center;
    justify-items: center;
    gap: 0;
    min-height: var(--row-h);
    box-sizing: border-box;
    // border-bottom: 1px solid rgba(236, 209, 179, 0.35);
    opacity: .7;

    &:last-child {
        border-bottom: 0;
    }

    .avatar {
        width: 30px;
        height: 30px;
        display: block;
        border-radius: 50%;
        object-fit: cover;
        justify-self: center;
    }

    .name,
    .time {
        font-size: 12px;
        line-height: 20px;
        letter-spacing: 0;
        color: rgb(133, 61, 33);
        text-align: center;
    }

    .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .time {
        padding-left: 0;
    }
}

/* 空状态 */
.reward-card .rc-empty {
    padding: 16px 0 6px;
    text-align: center;
    font-size: 13px;
    color: rgba(133, 61, 33, 0.6);
    font-weight: 400;
    line-height: 20px
}

/* ============================================================================
   适配与底部安全区
   ========================================================================== */
@media (max-width: 340px) {
    .reward-card .rc-stats .item .value {
        font-size: 18px;
    }

    .reward-card .rc-list .rc-row .avatar {
        width: 32px;
        height: 32px;
    }

    .summary-card .step .desc {
        font-size: 10px;
    }

    .summary-card .cta .cta-btn {
        height: 42px;
    }
}

.safe-bottom {
    height: calc(env(safe-area-inset-bottom, 0) + 8px);
}
</style>
