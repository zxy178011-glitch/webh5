import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

export const ACCOUNT_BASE = '/api/AccountDetails'

/** ===== 后端 DTO（保持与服务端一致） ===== */

/**
 * 火花记录项
 */
export interface SparkRecordDto {
  /** 获得/消耗的火花数（负数表示消耗） */
  obtainCount: number
  /** 内容描述 */
  obtainContent: string
  /** 创建时间 */
  createDate: string
}

/**
 * 现金记录项
 */
export interface CashRecordDto {
  /** 增加的现金额 */
  cashCount: number
  /** 创建时间 */
  createDate: string
}

/**
 * 收益记录总览 DTO
 */
export interface RevenueRecordDto {
  /** 当前火花余额 */
  sparkCount: number
  /** 已兑换的总现金 */
  alreadySwitchCash: number
  /** 火花记录列表 */
  sparkList: SparkRecordDto[]
  /** 现金记录列表 */
  cashList: CashRecordDto[]
}

/**
 * 统计数据 DTO
 */
export interface RevenueStatisticsDto {
  /** 火花总收益 */
  totalSparkEarned: number
  /** 现金总收益 */
  totalCashEarned: number
  /** 当前火花余额 */
  currentSparkCount: number
  /** 已兑换现金总额 */
  totalCashConverted: number
}


export interface combinedRecordsDto {
  id: number,
  drawCashStatus: number,
  cashCount: number,
  createDate: string,
  cashType: number,
  refId: string
}
/**
 * 获取收益统计数据
 * @returns 收益统计信息
 */
export async function getRevenueRecords(): Promise<RevenueRecordDto> {
  return await requestWithError<RevenueRecordDto>({
    url: `${ACCOUNT_BASE}/GetMyEarningsDataList`,
    method: 'post'
  })
}