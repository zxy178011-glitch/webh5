/* =========================================================
 * common.js —— H5 桥接 & 基础工具（终极合并版 v4.0）
 * 
 * 合并了 common.js 和 token-bridge.js 的所有功能：
 *  - deliverToken / getAppToken / requestToken（Token管理）
 *  - closePage / sendEvent / emit（原生通信）
 *  - deliverEvent / on / once / off（事件监听系统）
 *  - H5Util 工具函数
 * 
 * ⚠️ 使用此文件后，可以删除 token-bridge.js
 * ========================================================= */

(function (win) {
  'use strict';

  const isFn = (f) => typeof f === 'function';
  const now = () => Date.now();

  /* -------------------- token 缓存与等待 -------------------- */
  let _token = null;
  let _tokenUpdatedAt = 0;
  let _waiters = [];

  function normalizeBearer(t) {
    const s = String(t || '').trim();
    if (!s) return s;
    return s.startsWith('Bearer ') ? s : `Bearer ${s}`;
  }

  /** 原生调用：把 token 推给 H5 */
  function deliverToken(rawToken) {
    _token = normalizeBearer(rawToken);
    _tokenUpdatedAt = now();

    const list = _waiters.slice(0);
    _waiters.length = 0;
    list.forEach(resolve => { try { resolve(_token); } catch { } });

    try {
      document.dispatchEvent(new CustomEvent('h5:token', {
        detail: { token: _token, updatedAt: _tokenUpdatedAt }
      }));
    } catch { }

    return true;
  }

  /** 
   * H5 侧取 token（axios 拦截器会用到）
   * ⭐ 这是 request.js 使用的方法！
   */
  function getAppToken(opts = {}) {
    const timeoutMs = Number(opts.timeoutMs ?? 5000);

    // 如果已经有 token，直接返回
    if (_token) return Promise.resolve(_token);

    return new Promise((resolve, reject) => {
      // 开发环境兜底
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        if (import.meta.env.DEV) {
          const urlToken = new URLSearchParams(location.search).get('token');
          if (urlToken) {
            resolve(urlToken);
            return;
          }

          const envToken = import.meta.env.VITE_DEV_TOKEN;
          if (envToken) {
            resolve(envToken);
            return;
          }
        }
      }

      const timer = setTimeout(() => {
        const i = _waiters.indexOf(resolve);
        if (i > -1) _waiters.splice(i, 1);
        reject(new Error(`获取Token超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      try {
        if (win.webkit?.messageHandlers?.getAppToken) {
          // iOS
          win.webkit.messageHandlers.getAppToken.postMessage({});
          win._tokenCallback = (token) => {
            clearTimeout(timer);
            resolve(token);
          };
        } else if (win.android?.getAppToken) {
          // Android
          const token = win.android.getAppToken();
          clearTimeout(timer);
          resolve(token);
        } else {
          // 等待 deliverToken 调用
          _waiters.push(resolve);
        }
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /** （可选）H5 主动对原生"要 token"的握手 */
  function requestToken() {
    // Android
    if (win.AppBridge && isFn(win.AppBridge.requestToken)) {
      try { win.AppBridge.requestToken(); return true; } catch { }
    }
    // iOS
    const mh = win.webkit?.messageHandlers?.requestToken;
    if (mh && isFn(mh.postMessage)) {
      try { mh.postMessage({}); return true; } catch { }
    }
    return false;
  }

  /** 
   * 通用发送：iOS / Flutter / Android / RN，最后 URL-Scheme 兜底
   * ⭐ 基于用户的工作代码
   */
  function _sendToHost(msg) {
    const s = JSON.stringify(msg);

    try {
      // 1. H5Bridge.postMessage（Flutter 常用）
      if (win.H5Bridge?.postMessage && isFn(win.H5Bridge.postMessage)) {
        win.H5Bridge.postMessage(s);
        console.log('[H5Bridge] ✅ postMessage 调用成功');
        return true;
      }

      // // 2. iOS 原生
      // if (win.webkit?.messageHandlers?.closePage) {
      //   win.webkit.messageHandlers.closePage.postMessage(msg);
      //   console.log('[H5Bridge] ✅ iOS 调用成功');
      //   return true;
      // }

      // // 3. Android 原生
      // if (win.android?.closePage) {
      //   win.android.closePage(s);
      //   console.log('[H5Bridge] ✅ Android 调用成功');
      //   return true;
      // }

      // // 4. Flutter JavaScriptChannel
      // if (win.FlutterChannel && isFn(win.FlutterChannel.postMessage)) {
      //   win.FlutterChannel.postMessage(s);
      //   console.log('[H5Bridge] ✅ FlutterChannel 调用成功');
      //   return true;
      // }

      console.warn('[H5Bridge] ⚠️ 没有可用的原生接口');
      return false;
    } catch (error) {
      console.error('[H5Bridge] ❌ 发送失败:', error);
      return false;
    }
  }

  /**
   * 统一发送消息给原生
   * ⭐ 基于用户的工作代码
   */
  function emit(type, payload = {}) {
    // 如果 payload 有 type，使用 payload.type
    if (payload?.type && payload.type !== '') {
      type = payload.type;
    }

    const msg = {
      type: type,
      payload: payload,
      ts: Date.now()
    };
    console.log('[H5Bridge] emit:', type, payload);
    return _sendToHost(msg);
  }

  /** 
   * 关闭弹框/页面（统一入口）
   * ⭐ token-bridge.js 的 closePage 方法
   * ⭐ 支持 iOS/Android/Flutter
   */
  function closePage(options = {}) {
    // console.log('[H5Bridge] closePage:', options);
    return emit('closePage', options);
  }

  /** 
   * 关闭弹窗（兼容旧版本）
   * 别名：closeModal
   */
  function closeModal(payload) {
    return closePage(payload);
  }

  /** 
   * H5→原生事件（兼容旧版本）
   * 别名：sendEvent
   */
  function sendEvent(type, payload = {}) {
    return emit(type, payload);
  }

  /* ==================== 🆕 事件监听系统 ==================== */

  const _listeners = new Map();

  /**
   * 🆕 Flutter/原生调用：发送事件给 H5
   * @param {string} eventName - 事件名称
   * @param {string|Object} params - 参数（可以是JSON字符串或对象）
   */
  function deliverEvent(eventName, params) {
    console.log('[H5Bridge] 📱 收到事件:', eventName, params);

    // 解析参数（可能是JSON字符串）
    let parsedParams = params;
    if (typeof params === 'string') {
      try {
        parsedParams = JSON.parse(params);
      } catch (e) {
        console.warn('[H5Bridge] 参数解析失败，使用原始值', e);
      }
    }

    // 触发所有监听器
    const listeners = _listeners.get(eventName) || [];
    listeners.forEach(callback => {
      try {
        callback(parsedParams);
      } catch (error) {
        console.error('[H5Bridge] 监听器执行失败:', error);
      }
    });

    // 如果没有监听器，给出警告
    if (listeners.length === 0) {
      console.warn(`[H5Bridge] 事件 "${eventName}" 没有注册任何监听器`);
    }

    // 同时触发 CustomEvent（兼容旧代码）
    try {
      document.dispatchEvent(new CustomEvent(`h5:${eventName}`, {
        detail: parsedParams
      }));
    } catch { }

    return true;
  }

  /**
   * 🆕 注册事件监听
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  function on(eventName, callback) {
    if (!isFn(callback)) {
      throw new Error('callback 必须是函数');
    }

    if (!_listeners.has(eventName)) {
      _listeners.set(eventName, []);
    }

    _listeners.get(eventName).push(callback);
    console.log(`[H5Bridge] 已注册监听: ${eventName}`);

    // 返回取消监听的函数
    return () => {
      off(eventName, callback);
    };
  }

  /**
   * 🆕 取消监听
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 要移除的回调函数
   */
  function off(eventName, callback) {
    const listeners = _listeners.get(eventName);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      console.log(`[H5Bridge] 已移除监听: ${eventName}`);
    }

    if (listeners.length === 0) {
      _listeners.delete(eventName);
    }
  }

  /**
   * 🆕 一次性监听（触发一次后自动移除）
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  function once(eventName, callback) {
    const wrappedCallback = (data) => {
      callback(data);
      off(eventName, wrappedCallback);
    };
    return on(eventName, wrappedCallback);
  }

  /**
   * 🆕 移除某个事件的所有监听器
   * @param {string} eventName - 事件名称（不传则移除所有）
   */
  function removeAllListeners(eventName) {
    if (eventName) {
      _listeners.delete(eventName);
      console.log(`[H5Bridge] 已移除 ${eventName} 的所有监听器`);
    } else {
      _listeners.clear();
      console.log(`[H5Bridge] 已移除所有监听器`);
    }
  }

  /**
   * 🆕 获取某个事件的监听器数量
   * @param {string} eventName - 事件名称
   * @returns {number} 监听器数量
   */
  function listenerCount(eventName) {
    return (_listeners.get(eventName) || []).length;
  }

  /**
   * 🆕 获取所有已注册的事件名称
   * @returns {string[]} 事件名称数组
   */
  function eventNames() {
    return Array.from(_listeners.keys());
  }

  /* ==================== 初始化全局回调 ==================== */

  // 供 Flutter/原生调用的全局函数
  win.H5NativeCall = (eventName, params) => {
    deliverEvent(eventName, params);
  };

  // Flutter 直接调用（兼容）
  win.FlutterCallH5 = (eventName, paramsJson) => {
    console.log('[FlutterCallH5] 收到调用:', eventName, paramsJson);
    try {
      const params = typeof paramsJson === 'string' ? JSON.parse(paramsJson) : paramsJson;
      deliverEvent(eventName, params);
    } catch (error) {
      console.error('[FlutterCallH5] 参数解析失败:', error);
    }
  };

  // 导出桥接对象
  // ⭐ 关键：保留已有对象和方法（如 Flutter 注入的 postMessage）
  win.H5Bridge = win.H5Bridge || {};

  // 保存可能存在的 postMessage（Flutter 注入的）
  const existingPostMessage = win.H5Bridge.postMessage;

  // 追加/覆盖方法（不重建整个对象）
  Object.assign(win.H5Bridge, {
    // Token 管理
    deliverToken: deliverToken,
    getAppToken: getAppToken,
    requestToken: requestToken,

    // 原生通信
    closePage: closePage,
    closeModal: closeModal,      // 别名
    closePopup: closePage,       // 别名（兼容旧代码）
    emit: emit,
    sendEvent: sendEvent,         // 别名

    // 事件监听系统
    deliverEvent: deliverEvent,
    on: on,
    once: once,
    off: off,
    removeAllListeners: removeAllListeners,
    listenerCount: listenerCount,
    eventNames: eventNames
  });

  // ⭐ 如果之前有 postMessage，确保保留
  if (existingPostMessage && typeof existingPostMessage === 'function') {
    win.H5Bridge.postMessage = existingPostMessage;
    console.log('[H5Bridge] ✅ 保留了 Flutter 的 postMessage 方法');
  }

  console.log('[H5Bridge] ✅ 初始化完成 (v4.0)');
  console.log('[H5Bridge] 可用方法:', Object.keys(win.H5Bridge));
})(window);


/* ===========================
 * 工具层（保留必要 UI 工具）
 * =========================== */
(function (win) {
  'use strict';

  function formatMD(d) {
    const dt = new Date(d);
    if (isNaN(+dt)) return '';
    return `${dt.getMonth() + 1}-${dt.getDate()}`;
  }

  function setSubtitleRange(selector, start, end) {
    const el = document.querySelector(selector);
    if (!el) return;
    const a = formatMD(start);
    const b = formatMD(end);
    if (!a || !b) return;
    el.textContent = `{${a}}--{${b}}期间登录，轻松入账`;
  }

  /**
   * 成功动效（CSS 版）
   */
  function showSuccessEffect(container, isFinal = false) {
    const host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) return;

    // 金币粒子
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('div');
      p.className = 'fx-particle';
      const rx = (Math.random() * 200 - 100) + 'px';
      const ry = (Math.random() * 150 - 75) + 'px';
      p.style.setProperty('--rx', rx);
      p.style.setProperty('--ry', ry);
      host.appendChild(p);
      setTimeout(() => p.remove(), 1400);
    }

    if (isFinal) {
      for (let i = 0; i < 20; i++) {
        const c = document.createElement('div');
        c.className = 'fx-confetti';
        const rx = (Math.random() * 300 - 150) + 'px';
        const ry = (Math.random() * -220 - 80) + 'px';
        c.style.setProperty('--rx', rx);
        c.style.setProperty('--ry', ry);
        host.appendChild(c);
        setTimeout(() => c.remove(), 2100);
      }
    }
  }

  /**
   * 外部 X 关闭逻辑
   */
  function initOutsideClose({ overlaySel = '#overlay', modalSel = '#modal', buttonSel = '#outsideClose', modalKey = 'signin', onClosed } = {}) {
    const overlay = document.querySelector(overlaySel);
    const modal = document.querySelector(modalSel);
    const btn = document.querySelector(buttonSel);
    if (!overlay || !modal || !btn) return;

    btn.addEventListener('click', () => {
      if (modal.classList.contains('closing')) return;
      modal.classList.add('closing');

      let finished = false;
      const end = () => {
        if (finished) return;
        finished = true;
        overlay.style.display = 'none';
        modal.classList.remove('closing');

        win.H5Bridge.closePage({
          key: modalKey,
          reason: 'user_click_x',
          source: 'h5',
          data: {}
        });

        onClosed && onClosed();
      };

      const timer = setTimeout(end, 250);
      modal.addEventListener('animationend', () => { clearTimeout(timer); end(); }, { once: true });
    });
  }

  win.H5Util = {
    formatMD: formatMD,
    setSubtitleRange: setSubtitleRange,
    showSuccessEffect: showSuccessEffect,
    initOutsideClose: initOutsideClose
  };
})(window);


/* ============ 可选握手：页面就绪时通知原生"我准备接 token 了" ============ */
document.addEventListener('DOMContentLoaded', () => {
  try { window.H5Bridge?.requestToken?.(); } catch { }
});

// 版本标记
window.__H5_COMMON_VERSION__ = 'v4.0';