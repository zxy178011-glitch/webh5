import request from '@/utils/request'

//获取用户是否预约
export function IsReservedAsync(data) {
  return request({
    url: '/api/Reservation/IsReservedAsync',
    method: 'post',
    data: data,
  })
}
//用户添加预约
export function CreateActivityReservationAsync(data) {
  return request({
    url: '/api/Reservation/CreateActivityReservationAsync',
    method: 'post',
    data: data,
  })
}
//用户领取预约火花奖励
export function ClaimRewardAsync() {
  return request({
    url: '/api/Reservation/sp_Reserve_ClaimSpark',
    method: 'post'
  })
}

//添加提醒预约消息
export function CreateReservationReminderAsync(data) {
  return request({
    url: '/api/UserMessage/publish',
    method: 'post',
    data: data,
  })
}
//获取用户最新一条预约数据
export function GetEntityAsync(data) {
  return request({
    url: '/api/UserMessage/GetEntity',
    method: 'post',
    data: data,
  })
}


export default { IsReservedAsync, CreateActivityReservationAsync, ClaimRewardAsync, CreateReservationReminderAsync, GetEntityAsync }
