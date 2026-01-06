// src/api/activityRules/api.ts
import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

/**
 * 获取规则列表 - 请求参数
 */
export interface GetRulesReq {
  /** 任务类型ID */
  TaskTypeId: number
}

/**
 * 规则项数据结构
 */
export interface RuleItem {
  /** 规则排序序号 */
  ruleOrder: number
  /** 规则内容 */
  ruleContent: string
  /** 层级深度 (1=一级, 2=二级...) */
  ruleLevel: number
  /** 规则类型 (title=标题, content=内容) */
  ruleType: 'title' | 'content'
  /** 父级规则ID (可选) */
  parentId?: number
}

/**
 * 获取活动规则列表
 * @param data 请求参数
 * @returns 规则列表数组
 */
export async function getRulesDataList(data: GetRulesReq): Promise<RuleItem[]> {
  return await requestWithError<RuleItem[]>({
    url: '/api/InvitationActivityRules/GetDataList',
    method: 'post',
    data: data
  })
}

