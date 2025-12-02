// src/api/lottery/api.ts
import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

/** 如果你的后端前缀不是 /api/Lottery，只改这里即可 */
export const LOTTERY_BASE = '/api/LotteryLog'

/** ===== 后端 DTO（保持与服务端一致） ===== */
export interface PrizeDto {
  id: number
  label?: string
  spark?: number | null
  isCenter?: boolean
}

export interface ChanceSummaryDto {
  freeLeftToday: boolean
  chanceLeft: number
  limits: { freePerDay: number; maxChancePerDay: number }
}

export interface LotteryPageSnapshotDto {
  serverNow: string
  dayKey: string
  nextResetAt: number
  prizes: PrizeDto[]
  chanceSummary?: ChanceSummaryDto
}

export interface SpinReq {
  clientRefId: string
  /** 仅调试：边位 1..8（或你服务端约定的值） */
  debugFixedPrizeId?: number | null
  /** 仅调试：与 debugFixedPrizeId 对应的奖励数用于严格校验 */
  obtainCount?: number | null
}
export interface VideoRewardReq {
  clientRefId: string
}


export interface LotteryRecordDto {
  id: string
  reward: string
  time: string
}

export interface SpinResp {
  consumed: 'free' | 'chance'
  freeLeftToday: boolean
  chanceLeft: number
  prize: PrizeDto
  record: LotteryRecordDto
}

export interface StreakDayDto {
  day: number
  label: string
  reward: string
  signed: boolean
}

export interface StreakBlockDto {
  needConsecutiveDays: number
  bonusRewardLabel: string
  days: StreakDayDto[]
  signedCountInCycle: number
  remainToBonus: number
}

export interface StreakAndRecordsDto {
  streak: StreakBlockDto
  records: LotteryRecordDto[]
  recordsTip: string
}
export interface TaskItemDto {
  taskCode: string;     // 'reading' | 'watchVideo'（后续可扩展）
  title: string;
  desc: string;
  progress: number;     // 0/1（阅读任务）
  target: number;       // 1
  grantPerStep: number; // 1
}

export interface LotteryTasksDto {
  serverNow: string;
  dayKey: string;
  nextResetAt: number;
  chanceLeft: number;
  tasks: TaskItemDto[];
}
export interface ApiResp<T> {
  status: number;  // 0/200 视你们约定
  message: string;
  data: T;
}
/** ===== API 调用（requestWithError 风格） ===== */

/** 获取抽奖页面结构快照（首屏） */
export async function getLotteryPage(): Promise<LotteryPageSnapshotDto> {
  return await requestWithError<LotteryPageSnapshotDto>({
    url: `${LOTTERY_BASE}/GetLotteryPage`,
    method: 'post',
  })
}
/** 获取任务进度 **/
export async function getTasks(): Promise<LotteryTasksDto> {
  return await requestWithError<LotteryTasksDto>({
    url: `${LOTTERY_BASE}/GetTasksAsync`,
    method: 'post',
  })
}
/** 发起抽奖（优先消耗免费，其次机会；返回服务端命中的格子与额度） */
export async function postSpin(body: SpinReq): Promise<SpinResp> {
  return await requestWithError<SpinResp>({
    url: `${LOTTERY_BASE}/SpinAsync`,
    method: 'post',
    data: body,
  })
}

/** 获取连续抽奖卡片与最近20条抽奖记录 */
export async function getStreakAndRecords(): Promise<StreakAndRecordsDto> {
  return await requestWithError<StreakAndRecordsDto>({
    url: `${LOTTERY_BASE}/GetStreakAndRecordsAsync`,
    method: 'post',
  })
}

/** 领取激励视频奖励（观看完成后调用） */
export async function claimVideoRewardAsync(body: VideoRewardReq): Promise<ApiResp<unknown>> {
  return await requestWithError<ApiResp<unknown>>({
    url: `${LOTTERY_BASE}/ClaimVideoRewardAsync`,
    method: 'post',
    data: body
  })
}
