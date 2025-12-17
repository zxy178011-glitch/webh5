import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由配置
 * - 使用 Hash 模式（#/），适合 H5 和原生 WebView
 * - 原生端可通过 https://domain.com/#/signin 直接打开指定页面
 * - 支持页面间路由跳转和传参
 */
const routes = [
  // 默认重定向到页面选择器
  {
    path: '/',
    redirect: '/page-selector'
  },

  // 页面选择器（开发/测试用）
  {
    path: '/page-selector',
    name: 'PageSelector',
    component: () => import('@/pages/PageSelector/App.vue'),
    meta: { title: '页面选择器' }
  },

  // 签到相关
  {
    path: '/signin',
    name: 'Signin',
    component: () => import('@/pages/signin/App.vue'),
    meta: { title: '签到' }
  },
  {
    path: '/newSignin',
    name: 'NewSignin',
    component: () => import('@/pages/newSignin/App.vue'),
    meta: { title: '新用户签到' }
  },

  // 预约
  {
    path: '/yuyue',
    name: 'Yuyue',
    component: () => import('@/pages/yuyue/App.vue'),
    meta: { title: '预约' }
  },
  {
    path: '/hongbaoyu',
    name: 'Hongbaoyu',
    component: () => import('@/pages/hongbaoyu/App.vue'),
    meta: { title: '红包雨' }
  },

  // 宝箱
  {
    path: '/openTreasureChest',
    name: 'OpenTreasureChest',
    component: () => import('@/pages/openTreasureChest/App.vue'),
    meta: { title: '开宝箱' }
  },

  // 抽奖
  {
    path: '/Lottery',
    name: 'Lottery',
    component: () => import('@/pages/Lottery/App.vue'),
    meta: { title: '抽奖' }
  },

  // 邀请赚钱
  {
    path: '/InviteEarn',
    name: 'InviteEarn',
    component: () => import('@/pages/InviteEarn/App.vue'),
    meta: { title: '邀请赚钱' }
  },

  // 我的收益
  {
    path: '/MyEarnings',
    name: 'MyEarnings',
    component: () => import('@/pages/MyEarnings/App.vue'),
    meta: {
      keepAlive: false, // 页面添加缓存
      title: '我的收益'
    }
  },

  // 收益记录
  {
    path: '/RevenueRecord',
    name: 'RevenueRecord',
    component: () => import('@/pages/RevenueRecord/App.vue'),
    meta: {
      keepAlive: false, // 页面添加缓存
      title: '收益记录'
    }
  },

  // 实名认证
  {
    path: '/RealNameAuth',
    name: 'RealNameAuth',
    component: () => import('@/pages/RealNameAuth/App.vue'),
    meta: { title: '实名认证' }
  },
  {
    path: '/WithdrawProgress',
    name: 'WithdrawProgress',
    component: () => import('@/pages/RevenueRecord/WithdrawProgress.vue'),
    meta: {
      keepAlive: false, // 页面添加缓存
      title: '处理进度'
    }
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/PageSelector/App.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHashHistory(), // 使用 Hash 模式
  routes,
  // 滚动行为
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫 - 设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = String(to.meta.title)
  }
  next()
})

// 路由错误处理
router.onError((error) => {
  console.error('Router error:', error)
})

export default router