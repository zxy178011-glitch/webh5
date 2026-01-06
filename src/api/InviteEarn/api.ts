import request, { requestWithError, type RequestErrorLike } from '@/utils/request'
export interface InviteRecordItem {
    avatar: string | null;
    name: string;
    invitedAt: string; // 后端返回时间字符串
}

export interface InviteOverviewReq {
    campaignId: number;
    offset: number;
    limit: number;
}

export interface InviteOverviewResp {
    serverTime: string;
    inviteCode: string;
    invitedCount: number;
    incomeSpark: number;
    incomeWan: number;
    records: InviteRecordItem[];
    nextOffset: number;
    hasMore: boolean;
    wechat: boolean;
    globalDailyLimitReached:boolean,
    isLimitReached:boolean
}

export interface ReferralRewardTipResp {
    successCount: number,
    totalReward: number
}

export interface VerifyAndGrantRewardResp {
    successCount: number,
    totalReward: number
}

export interface BindCodeReq {
    campaignId?: number;
    code?: string;     // 用户输入的邀请码
    idemKey?: string;  // 幂等键(前端生成)
    tmpId?: string;   // 可选：临时ID
}
export interface TrackEventReq {
    EventType: string;
}

export interface ApiResp<T> {
    status: number;  // 0/200 视你们约定
    message: string;
    data: T;
}

/** ===== API 调用（requestWithError 风格） ===== */

/** 获取拉新人页面结构快照（首屏） */
export async function fetchInviteOverview(payload: InviteOverviewReq): Promise<InviteOverviewResp> {
    return await requestWithError<InviteOverviewResp>({
        url: `/api/ReferralRelations/GetOverviewAsync`,
        method: 'post',
        data: payload
    })
}
/** 获取拉新成功奖励提示 */
export async function GetReferralRewardTip(): Promise<ReferralRewardTipResp> {
    return await requestWithError<ReferralRewardTipResp>({
        url: `/api/ReferralEvents/GetReferralRewardTip`,
        method: 'post'
    })
}



/** 绑定邀请码 */
export async function bindInvite(payload: BindCodeReq): Promise<ApiResp<unknown>> {
    return await requestWithError<ApiResp<unknown>>({
        url: `/api/ReferralRelations/BindCodeAsync`,
        method: 'post',
        data: payload
    })
}

/** 刷新邀请状态 */
export async function VerifyAndGrantReward(payload: BindCodeReq): Promise<VerifyAndGrantRewardResp> {
    return await requestWithError<VerifyAndGrantRewardResp>({
        url: `/api/ReferralRelations/VerifyAndGrantRewardAsync`,
        method: 'post',
        data: payload
    })
}

/** 记录用户行为（自动去重） */
export async function TrackEventAsync(payload: TrackEventReq): Promise<ApiResp<unknown>> {
    return await requestWithError<ApiResp<unknown>>({
        url: `/api/ReferralRelations/TrackEventAsync`,
        method: 'post',
        data: payload
    })
}
