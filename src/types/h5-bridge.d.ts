/**
 * H5Bridge TypeScript 类型定义
 * @version 2.0
 */

// ============ 原生调用H5的事件类型 ============

/** 用户信息变更事件 */
export interface UserInfoChangeEvent {
    userId: string
    userName: string
    avatar?: string
    isVip?: boolean
}

/** 页面刷新事件 */
export interface PageRefreshEvent {
    reason: 'userAction' | 'dataUpdate' | 'networkReconnect'
    timestamp: number
}

/** 通用通知事件 */
export interface NotificationEvent {
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    data?: any
}

/** 路由跳转事件 */
export interface RouteChangeEvent {
    from: string
    to: string
    params?: Record<string, any>
}

// ============ H5Bridge 方法类型 ============

export interface GetTokenOptions {
    timeoutMs?: number
}

export interface ClosePageOptions {
    type?: string
    states?: 0 | 1  // 0=取消/失败, 1=成功
    page?: string
    data?: any
}

export interface EmitOptions {
    type: string
    payload?: any
}

// ============ H5Bridge 类定义 ============

export interface H5Bridge {
    // 原有功能：H5 → 原生
    getAppToken(options?: GetTokenOptions): Promise<string>
    closePage(options?: ClosePageOptions): void
    emit(type: string, payload?: any): void

    // 新增功能：原生 → H5
    on<T = any>(eventName: string, callback: (data: T) => void): () => void
    off(eventName: string, callback: Function): void
    once<T = any>(eventName: string, callback: (data: T) => void): () => void
    removeAllListeners(eventName?: string): void
    listenerCount(eventName: string): number
    eventNames(): string[]
}

// ============ 全局类型扩展 ============

declare global {
    interface Window {
        H5Bridge: H5Bridge
        H5NativeCall: (eventName: string, params: any) => void
        _tokenCallback?: (token: string) => void
        webkit?: {
            messageHandlers?: {
                getAppToken?: { postMessage: (data: any) => void }
                closePage?: { postMessage: (data: any) => void }
                emit?: { postMessage: (data: any) => void }
            }
        }
        android?: {
            getAppToken?: () => string
            closePage?: (data: string) => void
            emit?: (type: string, data: string) => void
        }
    }
}

export { }