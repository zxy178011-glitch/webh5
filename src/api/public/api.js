import request from '@/utils/request'

//通用插入火花接口(存储过程方式)
export function add(data) {
    return request({
        url: '/api/AccountDetails/sp_Spark_Grant',
        method: 'post',
        data: data,
    })
}
//通用插入火花接口
export function InsertSpark(data) {
    return request({
        url: '/api/AccountDetails/InsertSpark',
        method: 'post',
        data: data,
    })
}

//看广告插入奖励
export function ClaimWatchReward(data) {
    return request({
        url: '/api/AccountDetails/ClaimWatchReward',
        method: 'post',
        data: data,
    })
}
//test
export function testAES(data) {
    return request({
        url: '/api/UserMain/testAES',
        method: 'post',
        data: data,
    })
}

export function DefaultLogin(data) {
    return request({
        url: '/api/UserMain/DefaultLogin',
        method: 'post',
        data: data,
    })
}
export default { add, InsertSpark }
