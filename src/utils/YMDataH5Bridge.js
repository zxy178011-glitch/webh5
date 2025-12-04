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
        value: `${action}=1&pageName=${name}`
    };

    try {
        const fn = window.H5Bridge?.closePage;
        if (typeof fn === 'function') {
            await fn(payload);
        }
    } catch (err) {
        // 捕获并静默错误，必要时打印日志
        console.error('beginPageView error', err);
    }
}

/**
 * 用户看完激励视频成功时数据埋点
 * @param {{task_id: string|number, benefit_type: string|number, claim_quantity: string|number}} data
 */
async function claim(data = {}) {
    const payload = {
        ...baseObj,
        value: `eventId=benefit_redemption&task_id=${data.task_id || ''}&benefit_type=${data.benefit_type || ''}&claim_quantity=${data.claim_quantity || 0}`
    };
    try {
        const fn = window.H5Bridge?.closePage;
        if (typeof fn === 'function') {
            await fn(payload);
        }
    } catch (err) {
        console.error('claim error', err);
    }
}

/**
 * 用户点击事件数据埋点
 * @param {string} task_id  
 * @param {string} name 页面名称 (例如 '展示日常签到弹窗时' / '展示抽奖领取机会时')
 */
async function addOnClick(data = {}) {
    const payload = {
        ...baseObj,
        value: `eventId=button_click&taskId=${data.taskId}&pageName=${data.pageName}`
    };
    try {
        const fn = window.H5Bridge?.closePage;
        if (typeof fn === 'function') {
            await fn(payload);
        }
    } catch (err) {
        console.error('addOnClick error', err);
    }
}

export { beginPageView, claim, addOnClick };
