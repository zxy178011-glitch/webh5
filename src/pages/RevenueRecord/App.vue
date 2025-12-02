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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRevenueRecords, combinedRecordsDto } from '@/api/RevenueRecord/api'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import RulePopup from '../../components/Popup/RulePopup.vue'
import { windowHeight } from 'vant/lib/utils'
import { it } from 'node:test'

defineOptions({
  name: 'RevenuePage'  // 组件名称,用于 keep-alive 缓存
})

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
const onClickLeft = () => {
  // console.log('route11r', router)
  router.back()
  // dataObj.key = '';
  // dataObj.value = '';
  // dataObj.type = '';
  // try { (window as any).H5Bridge?.closePopup?.(dataObj) } catch { }
}

/* ------------------------ 状态：顶部规则弹窗 ------------------------ */
// —— 规则弹窗 —— 
// 控制弹框显示/隐藏
const showRule = ref(false)
const ruleList = ref([
  '1.您可以通过完成本平台内提供的任务来获取火花或现金红包，具体的任务请参见围炉活动规则并以活动页面的指引为准。',
  '2.完成任务后，系统更新您所获取的火花数量可能会有延迟。',
  '3.火花每日凌晨前后会自动兑换成现金,兑换后的现金可提现。火花与现金的兑换比例大约为[33000:1]，兑换比例受每日广告收益影响可能有浮动，以实际为准。',
  '4.您领取的火花、火花兑换的现金、已提现的现金等福利将在[我的收益/收益记录]页面中展示。您可通过在首页点击下方正中的[福利]，进入对应页面查看。',
  '5.奖励领取方式分为平台自动发放奖励(即无需用户手动领取)和需用户手动领取奖励两种方式，具体以任务页面说明为准。对于需用户手动领取的奖励，用户应在限定时间内手动领取，若未及时领取，视为用户自愿放弃奖励，未领取的奖励将自动清零。',
  '6.若用户连续15个自然日未进入任务页面、或连续15个自然日未领取任何活动奖励的(任一).那么此前本平台发放的所有福利将过期，逾期未提现则视为用户自愿放弃提现的权利，现金账户金额将被清零。',
  '7.您通过平台举办的活动获得收益或奖励的，平台依法可能需要为用户代扣代缴税款或办理纳税申报。',
  '8.我们应用先进的人工智能分析您的行为，如发现您的行为可能存在造假或其他不正当手段及舞弊行为、我们有权暂时中止您使用(领取火花、提现等福利选项)以及收回您获得的福利，具体可参考《围炉活动规则》"法律声明"之"禁止舞弊"条款。',
  '9.本平台发放的火花仅用于在符合本规则的前提下在本平台兑换现金，以鼓励用户使用本平台，属于积分性质的促销手段。火花不可用于买卖、交换、支付等其他用途。',
  '10.除本说明外，平台现行有效的的《用户协议》《隐私政策》以及日常活动规则(统称为"前述协议")同样适用。本说明及相关条款与前述协议相冲突的，以本说明为准;本说明未约定的内容，仍以前述协议为准。',
  '11.在法律法规允许的范围内，平台有权对本说明进行变动或调整，相关变动或调整将公布在页面上，并于公布时即时生效，用户继续参与活动则视为同意并接受变动或者调整后的说明。如果用户拒绝说明的变更或者调整，请放弃参与变更后的活动。'
])
const showRulePopup = () => {
  showRule.value = true
}

// 获取收益记录数据
const fetchRevenueRecords = async () => {
  try {
    const res = await getRevenueRecords()
    if (res) {
      console.log('res', res)
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