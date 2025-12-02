<template>
    <div class="page-selector">
        <div class="header">
            <h1 class="title">H5 页面调试中心</h1>
            <p class="subtitle">点击卡片访问对应页面</p>
        </div>

        <div class="cards-container">
            <div v-for="(page, index) in pages" :key="index" class="page-card" @click="goToPage(page.url)">
                <div class="card-icon">📱</div>
                <h3>{{ page.name }}</h3>
                <p>{{ page.description }}</p>
                <div class="card-footer">
                    <span class="path">{{ page.url }}</span>
                    <van-icon name="arrow" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const pages = ref([
    {
        name: '我的收益',
        description: '微信支付宝体现',
        url: '/MyEarnings'
    },
    {
        name: '红包雨',
        description: '点击参与红包雨活动',
        url: '/hongbaoyu'
    },
    {
        name: '拉新人',
        description: '邀请好友得奖励',
        url: '/InviteEarn'
    },
    {
        name: '抽奖',
        description: '幸运大转盘',
        url: '/Lottery'
    },
    {
        name: '新用户签到',
        description: '新用户专属签到',
        url: '/newSignin'
    },
    {
        name: '老用户签到',
        description: '每日签到领火花',
        url: '/signin'
    },
    {
        name: '预约领取火花',
        description: '预约即可领取',
        url: '/yuyue'
    },
    {
        name: '开宝箱',
        description: '打开神秘宝箱',
        url: '/openTreasureChest'
    },
    {
        name: '红包',
        description: '领取红包',
        url: '/hongbao'
    },
    {
        name: '实名认证',
        description: '完成实名认证',
        url: '/RealNameAuth'
    },
    {
        name: '收益记录',
        description: '查看收益明细',
        url: '/RevenueRecord'
    },
])

const goToPage = (url: string) => {
    router.push(url)
}
</script>

<style scoped>
/* 确保页面可以滚动 */
.page-selector {
    /* 使用动态视口，兼容 iOS 地址栏收起/展开 */
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;

    /* 让真正的滚动发生在内容区，避免被上层 overflow 影响 */
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding-bottom: env(safe-area-inset-bottom, 40px);
}

.header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px 20px;
    backdrop-filter: blur(10px);
}

.title {
    text-align: center;
    color: white;
    font-size: 32px;
    font-weight: bold;
    margin: 0 0 10px 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
    text-align: center;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    margin: 0;
}

.cards-container {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* iOS 惯性滚动 */
    overscroll-behavior-y: contain;
    /* 阻止下拉回弹影响父级 */

    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.page-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
}

.page-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transform: scaleX(0);
    transition: transform 0.3s ease;
}

.page-card:hover::before {
    transform: scaleX(1);
}

.page-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.page-card:active {
    transform: translateY(-4px);
}

.card-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.page-card h3 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 20px;
    font-weight: 600;
}

.page-card p {
    margin: 0 0 16px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
}

.path {
    font-size: 12px;
    color: #999;
    font-family: 'Courier New', monospace;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.card-footer :deep(.van-icon) {
    color: #667eea;
    font-size: 16px;
    margin-left: 8px;
}

/* 响应式 */
@media (max-width: 768px) {
    .header {
        padding: 20px 16px 16px;
    }

    .title {
        font-size: 24px;
    }

    .cards-container {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 16px;
    }
}
</style>
<style>
/* ③ 兜底：若上层（或其它页面）把 body 锁了滚动，这里强制解锁 */
html,
body {
    height: auto;
    min-height: 100%;
    overflow-y: auto !important;
}

/* 你的应用根节点（按实际 id 修改），保证至少占满视口高度 */
#app {
    min-height: 100%;
}
</style>