// src/composables/useBridge.ts
import { onUnmounted, ref, Ref } from 'vue'

// ============ 添加类型声明 ============
declare global {
  interface Window {
    H5Bridge: {
      // H5 → 原生
      getAppToken(options: { timeoutMs?: number }): Promise<string>
      closePage(options?: {
        type?: string
        states?: 0 | 1
        page?: string
        data?: any
      }): void
      emit(type: string, payload?: any): void

      // 原生 → H5
      on<T = any>(eventName: string, callback: (data: T) => void): () => void
      off(eventName: string, callback: Function): void
      once<T = any>(eventName: string, callback: (data: T) => void): () => void
      removeAllListeners(eventName?: string): void
      listenerCount(eventName: string): number
      eventNames(): string[]
    }
    H5NativeCall: (eventName: string, params: any) => void
  }
}

interface BridgeOptions {
  autoCleanup?: boolean
}

export function useBridge(options: BridgeOptions = {}) {
  const { autoCleanup = true } = options

  const cleanupFns: Array<() => void> = []

  function on<T = any>(eventName: string, callback: (data: T) => void) {
    if (!window.H5Bridge) {
      console.warn('[useBridge] H5Bridge 未初始化')
      return () => { }
    }

    const unsubscribe = window.H5Bridge.on(eventName, callback)

    if (autoCleanup) {
      cleanupFns.push(unsubscribe)
    }

    return unsubscribe
  }

  function once<T = any>(eventName: string, callback: (data: T) => void) {
    if (!window.H5Bridge) {
      console.warn('[useBridge] H5Bridge 未初始化')
      return () => { }
    }

    const unsubscribe = window.H5Bridge.once(eventName, callback)

    if (autoCleanup) {
      cleanupFns.push(unsubscribe)
    }

    return unsubscribe
  }

  async function getAppToken(timeoutMs = 1200): Promise<string> {
    if (!window.H5Bridge) {
      throw new Error('H5Bridge 未初始化')
    }
    return window.H5Bridge.getAppToken({ timeoutMs })
  }

  function closePage(options: {
    type?: string
    states?: 0 | 1
    page?: string
    data?: any
  } = {}) {
    if (!window.H5Bridge) {
      console.warn('[useBridge] H5Bridge 未初始化')
      return
    }
    window.H5Bridge.closePage(options)
  }

  function emit(type: string, payload?: any) {
    if (!window.H5Bridge) {
      console.warn('[useBridge] H5Bridge 未初始化')
      return
    }
    window.H5Bridge.emit(type, payload)
  }

  function cleanup() {
    cleanupFns.forEach(fn => fn())
    cleanupFns.length = 0
  }

  function isBridgeAvailable(): boolean {
    return !!window.H5Bridge
  }

  if (autoCleanup) {
    onUnmounted(() => {
      cleanup()
    })
  }

  return {
    on,
    once,
    getAppToken,
    closePage,
    emit,
    cleanup,
    isBridgeAvailable
  }
}

// 预定义事件
export function useUserInfoChange(callback: (data: any) => void) {
  const { on } = useBridge()
  return on('userInfoChange', callback)
}
/** 页面刷新事件 */
export function usePageRefresh(callback: (data: any) => void) {
  const { on } = useBridge()
  return on('pageRefresh', callback)
}
/** 通用通知事件 */
export function useNotification(callback: (data: any) => void) {
  const { on } = useBridge()
  return on('notification', callback)
}
/** 路由跳转事件 */

export function useRouteChange(callback: (data: any) => void) {
  const { on } = useBridge()
  return on('routeChange', callback)
}

// 响应式状态
export function useBridgeState<T>(eventName: string, initialValue?: T): Ref<T | undefined> {
  const state = ref<T | undefined>(initialValue) as Ref<T | undefined>
  const { on } = useBridge()

  on<T>(eventName, (data) => {
    state.value = data
  })

  return state
}