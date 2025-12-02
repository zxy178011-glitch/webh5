import request from '@/utils/request'

// 新用户/老用户签到接口示例
export function getStatus(taskId) {
  return request({
    url: '/api/SigninLog/sp_Signin_GetStatus',
    method: 'post',
    data: { TaskID: taskId },
  })
}
//新老用户执行签到接口
export function doSignin(mode = 'normal', taskId, clientRefId) {
  return request({
    url: '/api/SigninLog/sp_Signin_Do',
    method: 'post',
    data: { TaskID: taskId, Mode: mode, ClientRefId: clientRefId },
  })
}

export default { getStatus, doSignin }
