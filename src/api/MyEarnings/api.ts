import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

export const WITHDRAW_BASE = '/api/DrawCashRecord'

/** ===== 后端 DTO（保持与服务端一致） ===== */

/**
 * 任务进度信息
 */
export interface TaskProgressDto {
  /** 是否完成 */
  completed: boolean
  /** 剩余分钟数（阅读任务使用） */
  remainingMinutes?: number
  /** 剩余天数（签到任务使用） */
  remainingDays?: number
}

/**
 * 视频任务状态
 */
export interface VideoTaskDto {
  /** 是否完成 */
  completed: boolean
}

/**
 * 阅读任务状态
 */
export interface ReadTaskDto {
  /** 是否完成 */
  completed: boolean
  /** 剩余分钟数 */
  remainingMinutes: number
}

/**
 * 签到任务状态
 */
export interface SignInTaskDto {
  /** 是否完成 */
  completed: boolean
  /** 剩余天数 */
  remainingDays: number
}

/**
 * 任务状态 DTO
 */
export interface TaskStatusDto {
  /** 视频任务 */
  video: VideoTaskDto
  /** 阅读任务 */
  read: ReadTaskDto
  /** 签到任务 */
  signIn: SignInTaskDto
}

/**
 * 提现选项 DTO
 */
export interface WithdrawOptionDto {
  /** 提现金额 */
  amount: number
  /** 徽章文字（新人特权、限时等） */
  badge: string
  /** 描述文字 */
  desc: string
  /** 是否高亮 */
  highlight: boolean
  /** 条件类型（video/read/signin/normal） */
  condition: string
  /** 是否禁用 */
  isDisabled: boolean
  /** 任务状态 */
  taskStatus: TaskProgressDto
}

/**
 * 用户绑定状态 DTO
 */
export interface UserBindingDto {
  /** 是否绑定微信 */
  wechat: boolean
  /** 是否绑定支付宝 */
  alipay: boolean
  /** 是否实名认证 */
  isRealNameAuthenticated: boolean
}

/**
 * 提现申请参数
 */
export interface WithdrawRequestDto {
  /** 提现金额 */
  amount: number
  /** 支付方式（wechat/alipay） */
  paymentMethod: string
  /** 条件类型（video/read/signin/normal） */
  condition: string
}

/**
 * 提现校验结果 DTO
 */
export interface WithdrawValidationDto {
  /** 是否可以提现 */
  canWithdraw: boolean
  /** 提示信息 */
  message: string
  /** 错误列表 */
  errors: string[]
}

/**
 * 提现记录 DTO
 */
export interface DrawCashRecordDto {
  /** 记录ID */
  id: number
  /** 提现金额 */
  amount: number
  /** 支付方式（wechat/alipay） */
  paymentMethod: string
  /** 状态（0待审核/1成功/2失败） */
  status: number
  /** 备注 */
  remark: string
  /** 创建时间 */
  createTime: string
  /** 审核时间 */
  auditTime?: string
  refId: string
}
export interface ApiResp<T> {
  status: number;  // 0/200 视你们约定
  message: string;
  data: T;
}
export interface VideoRewardReq {
  clientRefId: string
}
/** ===== API 接口方法 ===== */

/**
 * 获取提现配置选项列表（包含金额档位、徽章、条件、任务状态等）
 * @returns 提现选项列表
 */
export async function getWithdrawOptions(): Promise<WithdrawOptionDto[]> {
  return await requestWithError<WithdrawOptionDto[]>({
    url: `${WITHDRAW_BASE}/GetWithdrawOptionsAsync`,
    method: 'post'
  })
}

/**
 * 获取用户支付方式绑定状态
 * @returns 用户绑定状态
 */
export async function getUserBindingStatus(): Promise<UserBindingDto> {
  return await requestWithError<UserBindingDto>({
    url: `${WITHDRAW_BASE}/GetUserBindingStatusAsync`,
    method: 'post'
  })
}

/**
 * 校验提现前置条件（余额、任务、绑定等）
 * @param params 提现申请参数
 * @returns 校验结果
 */
export async function validateWithdraw(params: WithdrawRequestDto): Promise<ApiResp<unknown>> {
  return await requestWithError<ApiResp<unknown>>({
    url: `${WITHDRAW_BASE}/ValidateWithdrawAsync`,
    method: 'post',
    data: params
  })
}

/**
 * 创建提现申请
 * @param params 提现申请参数
 * @returns 提现记录
 */
export async function createWithdraw(params: WithdrawRequestDto): Promise<DrawCashRecordDto> {
  return await requestWithError<DrawCashRecordDto>({
    url: `${WITHDRAW_BASE}/CreateWithdrawAsync`,
    method: 'post',
    data: params
  })
}

/**
 * 获取用户提现记录列表（分页）
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 提现记录列表
 */
export async function getDrawCashRecords(page: number = 1, pageSize: number = 20): Promise<{
  total: number
  list: DrawCashRecordDto[]
}> {
  return await requestWithError<{
    total: number
    list: DrawCashRecordDto[]
  }>({
    url: `${WITHDRAW_BASE}/GetDrawCashRecordsAsync`,
    method: 'post',
    data: { page, pageSize }
  })
}

/**
 * 取消提现申请
 * @param recordId 提现记录ID
 * @returns 是否成功
 */
export async function cancelWithdraw(recordId: number): Promise<boolean> {
  return await requestWithError<boolean>({
    url: `${WITHDRAW_BASE}/CancelWithdrawAsync`,
    method: 'post',
    data: { recordId }
  })
}

/** 领取激励视频奖励（观看完成后调用） */
export async function claimVideoRewardAsync(body: VideoRewardReq): Promise<ApiResp<unknown>> {
  return await requestWithError<ApiResp<unknown>>({
    url: `${WITHDRAW_BASE}/ClaimVideoRewardAsync`,
    method: 'post',
    data: body
  })
}


/** 获取支付宝移动端授权参数字符串 */
export async function GetAlipayAuthString(): Promise<ApiResp<unknown>> {
  return await requestWithError<ApiResp<unknown>>({
    url: `api/UserMain/GetAlipayAuthString`,
    method: 'post'
  })
}