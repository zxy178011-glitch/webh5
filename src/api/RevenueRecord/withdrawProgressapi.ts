import request, { requestWithError, type RequestErrorLike } from '@/utils/request'

export const ACCOUNT_BASE = '/api/DrawCashRecord'


/**
 * 提现进度
 */
export interface DrawCashRecordDto {
    //提现申请时间
    createDate: string
    //提现审核时间
    modifyDate: string
    //提现方式
    drawPlatform: string
    //提现金额
    drawCashCount: number
    //备注
    drawCashContent: string
    //当前状态
    drawCashStatus: number,
    //商户订单号
    billId: string,
    //失败原因
    msg: string

}
export interface GetbillIdDataDto {
    mchId: string,
    appId: string,
    package: string
}


export interface ModelDto {
    RefId: string

}
export interface BillDto {
    BillId: string
}
export interface ApiResp<T> {
    status: number;
    message: string;
    data: T;
}
/**
 * 根据Id查询单条数据
 * @returns 根据Id查询单条数据
 */
export async function GetByIdAsync(data: ModelDto): Promise<DrawCashRecordDto> {
    return await requestWithError<DrawCashRecordDto>({
        url: `${ACCOUNT_BASE}/GetByIdAsync`,
        method: 'post',
        data: data
    })
}
/**
 * 根据商户号查询微信授权确认的数据
 * @returns 根据商户号查询微信授权确认的数据
 */
export async function GetbillIdData(data: BillDto): Promise<GetbillIdDataDto> {
    return await requestWithError<GetbillIdDataDto>({
        url: `${ACCOUNT_BASE}/GetbillIdData`,
        method: 'post',
        data: data
    })
}
/**
 * 通过商户号查询商家转账是否成功
 * @returns 通过商户号查询商家转账是否成功
 */
export async function getByOutBillNoAsync(data: BillDto): Promise<ApiResp<unknown>> {
    return await requestWithError<ApiResp<unknown>>({
        url: `${ACCOUNT_BASE}/getByOutBillNoAsync`,
        method: 'post',
        data: data
    })
}

getByOutBillNoAsync