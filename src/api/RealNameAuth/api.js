import request from '@/utils/request'

/**
 * 获取实名认证状态
 */
export function getAuthStatus() {
    return request({
        url: '/api/RealName/GetStatus',
        method: 'post',
        data: {}
    })
}

/**
 * 提交实名认证
 * @param {Object} data - 认证数据
 * @param {string} data.RealName - 真实姓名
 * @param {string} data.IdCardNo - 身份证号
 */
export function submitRealNameAuth(data) {
    return request({
        url: '/api/RealNameAuthentication/Submit',
        method: 'post',
        data: data
    })
}

export default {
    getAuthStatus,
    submitRealNameAuth
}