<template>
  <div class="revenue-page">
    <RulePopup v-model="showRule" title="规则" :rules="ruleList" confirmText="我知道了" />
    <div class="page-top">
      <!-- 顶部导航栏 -->
      <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
        <template #title>
          <span class="nav-title">收益记录</span>
        </template>
        <template #right>
          <span class="rule-btn" @click="showRulePopup">规则</span>
        </template>
      </van-nav-bar>
    </div>
    <div class="page-content">
      <!-- 统计卡片 -->
      <div class="stats-card">
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-label">火花收益（火花）</div>
            <div class="stat-value">{{ revenueData.sparkCount || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">现金收益（元）</div>
            <div class="stat-value">{{ revenueData.alreadySwitchCash?.toFixed(2) || '0.00' }}</div>
          </div>
        </div>
        <div class="ad-tip">
          <div> <van-divider :style="{ borderColor: '#252525', heigth: '1px', opacity: '0.5' }" />
          </div>
          汇率受每日广告收益影响会有浮动
        </div>
      </div>

      <!-- Tab切换 -->
      <van-tabs v-model:active="activeTab" sticky offset-top="0" class="van-tabss">
        <van-tab title="火花记录" name="spark">
          <div class="record-list">
            <div v-for="(item, index) in sparkList" :key="index" class="record-item">
              <div class="record-left">
                <div class="record-title">{{ getSparkTitle(item.obtainContent) }}</div>
                <div class="record-time">{{ formatDateStrict(item.createDate) }}</div>
              </div>
              <div class="record-right">
                <span :class="['amount', item.obtainCount > 0 ? 'positive' : 'negative']">
                  {{ item.obtainCount > 0 ? '+' : '' }}{{ item.obtainCount }}
                </span>
              </div>
            </div>

            <div v-if="sparkList.length === 0" class="empty-state">

              <van-empty description="暂无火花记录" />
            </div>
          </div>
        </van-tab>

        <van-tab title="现金记录" name="cash">
          <div class="record-list">
            <div v-for="(item, index) in cashList" :key="index" class="record-item">
              <div class="record-left">
                <div class="record-title">{{ item.title }}</div>
                <div class="record-time">{{ formatDateStrict(item.createDate) }} </div>
              </div>
              <div v-if="item.cashType == 1" class="record-right">
                <span class="amount positive">+ {{ item.cashCount.toFixed(2) }}</span>

              </div>
              <div v-if="item.cashType == 2" class="record-right clickable-area" @click="toWithdrawProgress(item)">
                <span v-if="item.drawCashStatus == 2" class="amount black">
                  - {{ item.cashCount.toFixed(2) }}
                </span>
                <span v-if="item.drawCashStatus != 2" class="Vector-right-icon"></span>
              </div>
            </div>
            <!-- 提现相关记录项 -->
            <div v-if="cashList.length === 0 && !showStaticRecords" class="empty-state">
              <van-empty description="暂无现金记录" />
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>
<script>

</script>
<script setup lang="ts" name="RevenueRecord">
import { ref, onMounted } from 'vue'
import { getRevenueRecords, combinedRecordsDto } from '@/api/RevenueRecord/api'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import RulePopup from '../../components/Popup/RulePopup.vue'
import { windowHeight } from 'vant/lib/utils'
import { it } from 'node:test'
import { beginPageView } from '@/utils/H5Bridge'


const router = useRouter()

// 响应式数据
const activeTab = ref('spark')
const revenueData = ref<any>({})
const sparkList = ref<any[]>([])
const cashList = ref<any[]>([])
const showStaticRecords = ref(false) // 控制是否显示静态的提现记录
//页面通知移动端的数据
const dataObj = { states: 0, page: 'RevenueRecord', value: '', type: '', key: '' }


const initActiveTab = () => {
  const tabParam = router.currentRoute.value.query.tab
  if (tabParam === 'cash') activeTab.value = 'cash'
  else if (tabParam === 'spark') activeTab.value = 'spark'
}

// 返回上一页
const onClickLeft = async () => {
  //用户浏览收益记录页面结束-数据埋点
  await beginPageView('2', 'earnings_record')
  router.back()
}

/* ------------------------ 状态：顶部规则弹窗 ------------------------ */
// —— 规则弹窗 —— 
// 控制弹框显示/隐藏
const showRule = ref(false)
const ruleList = ref([
  '1.您可以通过完成本平台内提供的任务来获取火花或现金红包，具体的任务请参见围炉活动规则并以活动页面的指引为准。',

])
const showRulePopup = () => {
  showRule.value = true
}

// 获取收益记录数据
const fetchRevenueRecords = async () => {
  try {
    const res = await getRevenueRecords()
    if (res) {
      revenueData.value = res
      sparkList.value = res.sparkList || []
      cashList.value = res.cashList || []
    }

  } catch (error) {
    console.error('获取收益记录失败:', error)
    showToast('获取数据失败')
  }
}

// 格式化日期
const pad = (n: number) => (n < 10 ? '0' + n : String(n))

const formatDateStrict = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return ''
  let d: Date
  if (dateInput instanceof Date) d = dateInput
  else {
    const s = String(dateInput).trim()
    // 尝试直接解析 ISO / 时间戳 / 常见格式
    const parsed = Date.parse(s)
    if (isNaN(parsed)) return s.split(/[T\s]/)[0] || ''
    d = new Date(parsed)
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toWithdrawProgress(item: combinedRecordsDto) {
  // 跳转到进度页面，传递 id
  // if (item.drawCashStatus != 2)
  router.push({
    path: '/WithdrawProgress',
    query: { Id: item.refId }
  })
}

const obtainCountstr = (data: string, type: number): string => {
  var str = "";
  if (type == 1) {
    str = "+" + data
  }
  else {
    str = "-" + data
  }
  return str;
}

// 格式化数字（火花数量）
const formatNumber = (num: number) => {
  return Math.abs(num).toLocaleString()
}

// 获取火花记录标题
const getSparkTitle = (content: string) => {
  // 根据内容返回简化的标题
  if (content.includes('兑换')) {
    return '火花兑换现金'
  } else if (content.includes('签到')) {
    return '签到'
  }
  return content
}



// 跳转到提现详情
const goToWithdraw = () => {
  // router.push('/withdraw-detail')
  showToast('查看提现详情')
}

// 页面加载时获取数据
onMounted(() => {
  initActiveTab()
  fetchRevenueRecords()
  //用户浏览收益记录页面开始-数据埋点
  beginPageView('1', 'earnings_record')
})
</script>

<style lang="scss" scoped>
/* ================== 全局与页面基调 ================== */
.revenue-page {
  min-height: 100vh;
  background-image: url('/img/MyEarnings/back.png');
  background-size: 474px auto;
  background-position: top center;
  background-repeat: no-repeat;
  // padding:0 12px 12px 12px;
}

.page-top {
  height: 88px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  background-image: url('/img/MyEarnings/back.png');
  background-size: 474px auto;
  background-position: top center;
  background-repeat: no-repeat;
}

.nav-bar {
  background: transparent;
  padding-top: 45px;
  padding-bottom: 5px;

  // 移除底部边框
  &::after {
    display: none !important;
  }

  :deep(.van-nav-bar__content) {
    &::after {
      display: none !important;
    }
  }

  :deep(.van-nav-bar__arrow) {
    color: #1E1E1E;
    font-size: 18px;
    font-weight: bold;
  }

  .nav-title {
    font-family: PingFang SC;
    font-weight: 600;
    font-size: 18px;
    line-height: 26px;
    color: #252525;
  }

  .rule-btn {
    font-family: PingFang SC;
    font-weight: 400;
    font-size: 14px;
    line-height: 100%;
    text-align: right;
    color: #252525;
    cursor: pointer;
  }
}


.page-content {
  padding: 88px 12px 12px 12px;
}

.header {
  padding: 0 16px;
  padding-top: env(safe-area-inset-top);

  .header-top {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;

    .van-icon {
      font-size: 20px;
      color: #333;
    }

    .title {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-size: 17px;
      font-weight: 500;
      color: #333;
    }

    .rules {
      font-size: 14px;
      color: #666;
    }
  }
}

.stats-card {
  // margin: 16px;
  padding: 8px 20px;
  // background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;

  .stats-row {
    display: flex;
    gap: 90px;

    .stat-label {
      font-family: PingFang SC;
      font-weight: 500;
      font-style: Medium;
      font-size: 12px;
      line-height: 16px;
      letter-spacing: 0px;
      color: #252525;
      margin-bottom: 8px;
    }

    .stat-value {
      font-family: Inter;
      font-weight: 600;
      font-style: Semi Bold;
      font-size: 32px;
      line-height: 38px;
      letter-spacing: 0px;
      color: #333;
    }
  }

  .ad-tip {
    font-family: PingFang SC;
    font-weight: 400;
    font-style: Regular;
    font-size: 12px;
    line-height: 100%;
    letter-spacing: 0px;
    color: #252525;
    opacity: 0.6;
    margin-top: -5px;
    margin-bottom: 10px;
  }
}

:deep(.van-tabs) {
  background: transparent;

  .van-tab {
    border-bottom: 1px solid #EBEBEB;
  }

  .van-tabs__nav {
    // background: rgba(255, 255, 255, 0.95);
    border-radius: 12px 12px 0 0; // 顶部圆角
    overflow: hidden; // 确保圆角生效
  }

  .van-tabs__content {
    background: #fff;
    min-height: calc(100vh - 300px);
    border-radius: 0 0 12px 12px; // 底部圆角
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    transition: transform 180ms ease, box-shadow 180ms ease;
    overflow: hidden; // 确保圆角生效
  }

  // 整体卡片效果
  .van-tabs__wrap {
    border-radius: 12px 12px 0 0;
    overflow: hidden;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04); // 顶部轻微阴影
  }

  .van-tab--active {
    color: #252525;
    font-weight: var(--van-font-bold);
    font-family: PingFang SC;
    font-weight: 500;
    font-style: Medium;
    font-size: 16px;
    line-height: 100%;
    letter-spacing: 0px;
    text-align: right;
    border-bottom: 1px solid #EBEBEB;
  }

  .van-tabs__line {
    background: none;
  }
}

.record-list {
  padding: 0 16px;

  .record-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f5f5f5;

    &.clickable {
      cursor: pointer;

      &:active {
        background: #f5f5f5;
        margin: 0 -16px;
        padding: 16px;
      }
    }

    .record-left {
      flex: 1;

      .record-title {
        font-size: 14px;
        color: #000000;
        margin-bottom: 4px;
      }

      .record-time {
        font-size: 12px;
        color: #999;
      }
    }

    .record-right {
      display: flex;
      align-items: flex-end;
      gap: 8px;

      &.clickable-area {
        padding: 12px 0 12px 12px; // 增加内边距扩大点击区域
        margin: -12px 0 -12px -12px; // 用负边距抵消，保持视觉位置不变
        cursor: pointer; // 添加手型光标提示

        // 点击反馈
        &:active {
          opacity: 0.6;
        }
      }

      .amount {
        font-family: Inter;
        font-weight: 500;
        font-style: Medium;
        font-size: 16px;
        line-height: 20px;
        letter-spacing: 0px;
        text-align: right;


        &.positive {
          color: #FA6725;
        }

        &.black {
          color: #252525;
        }

        &.negative {
          color: #252525;
        }


      }
    }
  }
}

.Vector-right-icon {
  width: 14px;
  height: 14px;
  background-image: url('/img/MyEarnings/RevenueRecord/Vector-right.png');

  background-position: top center;
  background-repeat: no-repeat;
  color: #252525;
}

.empty-state {
  padding: 60px 0;
}
</style>