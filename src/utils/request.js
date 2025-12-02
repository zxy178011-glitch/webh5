// src/utils/request.js
import axios from 'axios'
import { showSuccessToast, showFailToast } from 'vant'

const service = axios.create({
    baseURL: import.meta.env.VITE_API_BASE || '',
    timeout: 90000,
    withCredentials: false,
})

/* -------------------- AES-GCM 前端加密/解密工具 (Web Crypto) -------------------- */

/**
 * 从环境变量读取 base64 key 并导入为 CryptoKey（请求加密用）
 */
async function importRequestAesKey() {
    const envVal = import.meta.env.VITE_REQUEST_AES_KEY_BASE64 || ''
    if (!envVal) throw new Error('未配置 VITE_REQUEST_AES_KEY_BASE64')

    if (looksLikeBase64Key(envVal)) {
        const raw = Uint8Array.from(atob(envVal), c => c.charCodeAt(0))
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt'])
    }

    if (!window?.crypto?.subtle) throw new Error('浏览器不支持 Web Crypto API')

    const encoder = new TextEncoder()
    const data = encoder.encode(envVal)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashBytes = new Uint8Array(hashBuffer)
    return await crypto.subtle.importKey('raw', hashBytes, { name: 'AES-GCM' }, false, ['encrypt'])
}

/**
 * 从环境变量读取 base64 key 并导入为 CryptoKey（响应解密用）
 */
async function importResponseAesKey() {
    const envVal = import.meta.env.VITE_RESPONSE_AES_KEY_BASE64 || ''
    if (!envVal) throw new Error('未配置 VITE_RESPONSE_AES_KEY_BASE64')

    if (looksLikeBase64Key(envVal)) {
        const raw = Uint8Array.from(atob(envVal), c => c.charCodeAt(0))
        return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
    }

    if (!window?.crypto?.subtle) throw new Error('浏览器不支持 Web Crypto API')

    const encoder = new TextEncoder()
    const data = encoder.encode(envVal)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashBytes = new Uint8Array(hashBuffer)
    return await crypto.subtle.importKey('raw', hashBytes, { name: 'AES-GCM' }, false, ['decrypt'])
}

// 判断一个字符串是否为 base64 且解码后为 32 字节
function looksLikeBase64Key(str) {
    try {
        if (!/^[A-Za-z0-9+/=]+$/.test(str)) return false
        const decoded = atob(str)
        return decoded.length === 32
    } catch (e) {
        return false
    }
}

function concatUint8Arrays(...arrays) {
    let length = arrays.reduce((s, a) => s + a.length, 0)
    const out = new Uint8Array(length)
    let offset = 0
    for (const a of arrays) {
        out.set(a, offset)
        offset += a.length
    }
    return out
}

function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}

/**
 * 使用 AES-GCM 加密 JSON 对象或字符串（请求用）
 * 返回：Base64 字符串，格式 = base64( nonce(12) || tag(16) || ciphertext )
 */
async function encryptPayloadToBase64(payload) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const encoder = new TextEncoder()
    const plainBytes = encoder.encode(str)

    const key = await importRequestAesKey()
    const nonce = crypto.getRandomValues(new Uint8Array(12))

    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plainBytes)
    const cipherBytes = new Uint8Array(cipherBuffer)

    const tagLen = 16
    if (cipherBytes.length < tagLen) throw new Error('ciphertext length unexpected')

    const tag = cipherBytes.slice(cipherBytes.length - tagLen)
    const ciphertextOnly = cipherBytes.slice(0, cipherBytes.length - tagLen)

    const encryptedPackage = concatUint8Arrays(nonce, tag, ciphertextOnly)
    return arrayBufferToBase64(encryptedPackage.buffer)
}

/**
 * 使用 AES-GCM 解密响应数据
 * 包格式： nonce(12) || tag(16) || ciphertext
 * 返回：解密后的对象或字符串
 */
async function decryptResponseData(encryptedBase64) {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
        return encryptedBase64
    }

    try {
        const encryptedPackage = new Uint8Array(base64ToArrayBuffer(encryptedBase64))

        const nonceLen = 12
        const tagLen = 16

        if (encryptedPackage.length <= nonceLen + tagLen) {
            // 长度不够，可能不是加密数据
            return encryptedBase64
        }

        const nonce = encryptedPackage.slice(0, nonceLen)
        const tag = encryptedPackage.slice(nonceLen, nonceLen + tagLen)
        const ciphertext = encryptedPackage.slice(nonceLen + tagLen)

        // 重组：AES-GCM 需要 ciphertext + tag
        const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length)
        ciphertextWithTag.set(ciphertext, 0)
        ciphertextWithTag.set(tag, ciphertext.length)

        // 解密
        const key = await importResponseAesKey()
        const plainBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: nonce },
            key,
            ciphertextWithTag
        )

        const decoder = new TextDecoder()
        const plainText = decoder.decode(plainBuffer)

        // 尝试解析 JSON
        try {
            return JSON.parse(plainText)
        } catch (e) {
            // 不是 JSON，返回字符串
            return plainText
        }
    } catch (e) {
        // 解密失败，可能不是加密数据，返回原始值
        console.warn('响应解密失败，使用原始数据:', e)
        return encryptedBase64
    }
}

/**
 * 尝试解密响应中的 data 字段
 * 如果 data 是字符串且长度较长，尝试解密；否则保持原样
 */
async function tryDecryptResponseData(res) {
    if (!res || typeof res !== 'object') {
        return res
    }

    // 检查 res.data 是否可能是加密数据
    if (typeof res.IsEncrypted) {
        try {
            const decrypted = await decryptResponseData(res.data)
            res.data = decrypted
            console.log('✅ 响应数据已解密')
        } catch (e) {
            // 解密失败，保持原数据
            console.warn('响应数据解密失败，使用原始数据')
        }
    }

    return res
}

/* -------------------- 你的原有工具函数（保持不变） -------------------- */

async function ensureToken(timeout = 2500) {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_TOKEN) {
        return String(import.meta.env.VITE_DEV_TOKEN)
    }
    if (window.H5Bridge?.getAppToken) {
        try {
            const tk = await window.H5Bridge.getAppToken({ timeoutMs: timeout })
            return tk || ''
        } catch {
            return ''
        }
    }
    return ''
}

function isOk(res) {
    if (!res || typeof res !== 'object') return true

    if (typeof res.status === 'boolean') {
        return res.status === true
    }

    if (res.code !== undefined && res.code !== null) {

        const codeStr = String(res.code).trim()
        if (codeStr !== '') {
            const n = Number(codeStr)
            if (!Number.isNaN(n)) {
                return n === 0 || n === 200 || n === 1
            }
            return ['OK', 'SUCCESS'].includes(codeStr.toUpperCase())
        }
    }

    return true
}

function unwrap(payload) {
    const l1 = payload && typeof payload === 'object' ? (payload.data ?? payload) : payload
    const l2 = l1 && typeof l1 === 'object' ? (l1.data ?? l1) : l1
    return l2
}

function getFriendlyErrorMessage(error, res) {
    if (res) {
        return res.msg || res.message || `接口错误(code=${res.code ?? 'N/A'})`
    }

    if (error.response) {
        const status = error.response.status
        switch (status) {
            case 400: return '请求参数错误'
            case 401: return '未授权，请重新登录'
            case 403: return '拒绝访问'
            case 404: return '请求资源不存在'
            case 500: return '服务器内部错误'
            case 502: return '网关错误'
            case 503: return '服务不可用'
            case 504: return '网关超时'
            default: return `请求失败(${status})`
        }
    }

    if (error.code === 'ECONNABORTED') {
        return '请求超时，请重试'
    }

    if (!error.response) {
        return '网络异常，请检查网络连接'
    }

    return error.message || '未知错误'
}

/* -------------------- 请求拦截器：注入 token + 强制加密 -------------------- */

service.interceptors.request.use(
    async (config) => {
        try {
            const token = await ensureToken(1500)
            if (token) {
                (config.headers ||= {}).Authorization = token
            }

            // 默认 JSON Content-Type（非 GET）
            if (!config.headers['Content-Type'] && (config.method || '').toLowerCase() !== 'get') {
                config.headers['Content-Type'] = 'application/json'
            }

            // ---- 请求体加密（非 GET 请求） ----
            if ((config.method || '').toLowerCase() !== 'get') {
                try {
                    const payload = config.data ?? {}
                    const bodyBase64 = await encryptPayloadToBase64(payload)

                    config.data = bodyBase64
                    config.headers['X-Encrypted'] = 'aes-gcm'
                    config.headers['Content-Type'] = 'text/plain'
                } catch (e) {
                    showFailToast('请求加密失败')
                    console.error('Encrypt request failed:', e)
                    return Promise.reject(e)
                }
            }

            return config
        } catch (error) {
            showFailToast('获取授权信息失败')
            return Promise.reject(error)
        }
    },
    (error) => {
        showFailToast('请求配置错误')
        return Promise.reject(error)
    }
)

/* -------------------- 响应拦截器：添加自动解密 -------------------- */

service.interceptors.response.use(
    async (resp) => {
        // ==================== 响应解密逻辑 ====================
        // 在处理业务逻辑之前，先尝试解密响应数据
        if (resp?.data) {
            resp.data = await tryDecryptResponseData(resp.data)
        }
        // ====================================================

        const res = resp?.data

        if (!isOk(res)) {
            const errorMsg = getFriendlyErrorMessage(null, res)

            // 显示错误提示
            showFailToast(errorMsg)

            // 打印错误信息
            console.error('API Business Error:', {
                url: resp?.config?.url,
                method: resp?.config?.method?.toUpperCase(),
                requestData: resp?.config?.data,
                responseCode: res?.code,
                responseStatus: res?.status,
                errorMessage: errorMsg,
                fullResponse: res
            })

            const error = new Error(errorMsg)
            error.isBusinessError = true
            error.code = res?.code
            error.status = res?.status
            error.response = resp
            error.data = res

            return Promise.reject(error)
        }

        return unwrap(res)
    },
    (error) => {
        const errorMsg = getFriendlyErrorMessage(error, error.response?.data)

        // 显示错误提示
        showFailToast(errorMsg)

        // 打印详细错误信息
        console.error('API Network Error:', {
            url: error?.config?.url,
            method: error?.config?.method?.toUpperCase(),
            requestData: error?.config?.data,
            httpStatus: error?.response?.status,
            errorMessage: errorMsg,
            originalError: error.message,
            fullError: error
        })

        error.message = errorMsg

        return Promise.reject(error)
    }
)

export default (options) => service(options)
export { service as axiosInstance }

/* requestWithError：也添加响应解密支持 */
export const requestWithError = (options) => {
    const instance = axios.create(service.defaults)
    instance.interceptors.request = service.interceptors.request

    instance.interceptors.response.use(
        async (resp) => {
            // ==================== 响应解密逻辑 ====================
            if (resp?.data) {
                resp.data = await tryDecryptResponseData(resp.data)
            }
            // ====================================================

            const res = resp?.data
            if (!isOk(res)) {
                const errorMsg = getFriendlyErrorMessage(null, res)
                const error = Object.assign(new Error(errorMsg), {
                    response: resp,
                    biz: res,
                    code: res?.code,
                    status: res?.status,
                    isBusinessError: true
                })
                // 显示错误提示
                console.log(errorMsg)
               // showFailToast(errorMsg)
                return Promise.reject(error)
            }
            return unwrap(res)
        },
        (error) => {
            const errorMsg = getFriendlyErrorMessage(error, error.response?.data)
            error.message = errorMsg
            return Promise.reject(error)
        }
    )

    return instance(options)
}