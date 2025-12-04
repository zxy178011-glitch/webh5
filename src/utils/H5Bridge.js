// H5Bridge.js
// 说明：每次调用都会创建一个新的 payload 对象，避免复用同一个 dataObj 导致值被覆盖。
// 推荐：在调试时用 console.log(JSON.stringify(payload)) 来查看当时的快照。

// 基础模板，不再复用同一个对象
const baseObj = {
    page: 'webTrackEvent',
    type: 'webTrackEvent',
    key: 'webTrackEvent'
};

/**
 * 浏览页面数据埋点
 * @param {'1'|'2'|number|string} type  '1' 开始, '2' 结束
 * @param {string} name 页面名称 (例如 'my_earnings' / 'earnings_record')
 */
async function beginPageView(type, name) {
    const action = (String(type) === '1') ? 'beginPageView' : 'endPageView';
    const payload = {
        ...baseObj,
        // 这里构造新的字符串（payload 是每次新的对象）
        value: `${action}=1&pageName=${name}`
    };

    // 调试建议：用 JSON.stringify 输出快照
    // console.log(JSON.stringify(payload));

    try {
        // 如果 closePage 返回 Promise，则 await 等待它完成；如果不是 Promise，optional chaining 不会报错
        const fn = window.H5Bridge?.closePage;
        if (typeof fn === 'function') {
            // 如果 closePage 是同步函数，这个 await 也不会有问题（会把非 Promise 值包成 resolved）
            await fn(payload);
        }
    } catch (err) {
        // 捕获并静默错误，必要时打印日志
        console.error('beginPageView error', err);
    }
}

/**
 * 用户看完激励视频成功时
 * @param {{task_id: string|number, benefit_type: string|number, claim_quantity: string|number}} data
 */
async function claim(data = {}) {
    const payload = {
        ...baseObj,
        value: `event=benefit_redemption&task_id=${data.task_id || ''}&benefit_type=${data.benefit_type || ''}&claim_quantity=${data.claim_quantity || 0}`
    };

    // console.log(JSON.stringify(payload));

    try {
        const fn = window.H5Bridge?.closePage;
        if (typeof fn === 'function') {
            await fn(payload);
        }
    } catch (err) {
        console.error('claim error', err);
    }
}

export { beginPageView, claim };
