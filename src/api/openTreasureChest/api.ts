// src/api/openTreasureChest/api.ts
import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

export interface ChestDayState {
  openedCount: number
  nextUnlockAt: number | null
  amounts: Record<number, number>
  lastReward: number
  totalPerDay: number
  videoTeaserMax?: number | null
  videoTeaserForIndex?: number | null,
  videoTeaserClaimed?:boolean
}
export interface ChestStateGetData {
  dayKey: string
  serverNow: string
  nextResetAt: number
  state: ChestDayState
}
export interface ChestStatePostReq {
  dayKey: string
  merge?: boolean
  state: Partial<ChestDayState>
}
export interface ChestStatePostData {
  saved: boolean
  dayKey: string
  serverNow: string
}

export async function getChestState(): Promise<ChestStateGetData> {
  return await requestWithError<ChestStateGetData>({
    url: '/api/AccountDetails/GetOpenTreasureChestState',
    method: 'post',
  })

}

/** 严格：用会 throw 的版本（推荐在关键流程上用这个） */
export async function postChestState(body: ChestStatePostReq): Promise<ChestStatePostData> {
  return await requestWithError<ChestStatePostData>({
    url: '/api/AccountDetails/OpenTreasureChestAdd',
    method: 'post',
    data: body,
  })
}


