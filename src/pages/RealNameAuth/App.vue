<template>
    <div class="real-name-auth-page">
        <!-- 顶部导航栏 -->
        <van-nav-bar left-arrow @click-left="onClickLeft" safe-area-inset-top class="nav-bar">
            <template #title>
                <span class="nav-title">实名认证</span>
            </template>
        </van-nav-bar>

        <div class="auth-container">
            <!-- 提示说明 -->
            <div class="auth-notice">

                <p class="notice-text">
                    <van-icon name="info-o" class="notice-icon" />根据法律法规要求，请填写实名信息，实名信息将用于用户年龄判断、收益提现的报税等，以及其他场景。
                    具体见 <span class="link" @click="showAgreement">《实名认证服务协议》</span>，我们会对信息严格保密。
                    注：18周岁以下用户无法通过实名认证进行提现
                </p>
            </div>

            <!-- 表单区域 -->
            <div class="form-section">
                <van-cell-group inset>
                    <van-field v-model="form.realName" label="姓名" placeholder="请输入真实姓名" :border="false" clearable
                        :error-message="errors.realName" @input="errors.realName = ''" />

                    <van-field v-model="form.idCard" label="身份证号" placeholder="请输入身份证号" :border="false" clearable
                        maxlength="18" :error-message="errors.idCard" @input="errors.idCard = ''" />
                </van-cell-group>
            </div>

            <!-- 协议勾选 -->
            <div class="agreement-section">
                <van-checkbox v-model="agreed" icon-size="12px">
                    <span class="agreement-text">
                        已阅读并同意
                        <span class="link" @click.stop="showAgreement">《实名认证服务协议》</span>
                    </span>
                </van-checkbox>
            </div>

            <!-- 提交按钮 -->
            <div class="submit-section">
                <van-button type="primary" block round :loading="submitting" :disabled="!canSubmit"
                    @click="handleSubmit" class="submit-btn">
                    提交
                </van-button>
            </div>
        </div>

        <!-- 协议弹窗 -->
        <van-popup v-model:show="agreementVisible" round position="bottom" :style="{ height: '100%' }">
            <div class="agreement-popup">
                <van-nav-bar left-arrow @click-left="agreementVisible = false" safe-area-inset-top class="nav-bar">
                    <template #title>
                        <span class="nav-title">实名认证服务协议</span>
                    </template>
                </van-nav-bar>
                <div class="agreement-content" v-html="agreementContent">


                </div>
            </div>
        </van-popup>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { submitRealNameAuth, getAuthStatus } from '@/api/RealNameAuth/api'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()



// 表单数据
const form = reactive({
    realName: '',
    idCard: ''
})

// 错误信息
const errors = reactive({
    realName: '',
    idCard: ''
})

// 协议相关
const agreed = ref(false)
const agreementVisible = ref(false)

// 提交状态
const submitting = ref(false)

// 身份证验证正则
const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/

// 姓名验证正则（2-20个中文字符或字母）
const nameRegex = /^[\u4e00-\u9fa5a-zA-Z·]{2,20}$/

// 验证表单
const validateForm = () => {
    let isValid = true

    // 验证姓名
    if (!form.realName.trim()) {
        errors.realName = '请输入真实姓名'
        isValid = false
    } else if (!nameRegex.test(form.realName.trim())) {
        errors.realName = '姓名格式不正确，请输入2-20个中文或字母'
        isValid = false
    } else {
        errors.realName = ''
    }

    // 验证身份证号
    if (!form.idCard.trim()) {
        errors.idCard = '请输入身份证号'
        isValid = false
    } else if (!idCardRegex.test(form.idCard.trim())) {
        errors.idCard = '身份证号格式不正确'
        isValid = false
    } else if (!validateIdCard(form.idCard.trim())) {
        errors.idCard = '身份证号校验失败，请检查'
        isValid = false
    } else {
        errors.idCard = ''
    }

    return isValid
}

// 身份证号码校验（包含校验码验证）
const validateIdCard = (idCard: string): boolean => {
    if (!idCardRegex.test(idCard)) return false

    // 校验码验证
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

    let sum = 0
    for (let i = 0; i < 17; i++) {
        sum += parseInt(idCard[i]) * factors[i]
    }

    const checkCode = checkCodes[sum % 11]
    return idCard[17].toUpperCase() === checkCode
}

// 计算年龄
const calculateAge = (idCard: string): number => {
    const year = parseInt(idCard.substring(6, 10))
    const month = parseInt(idCard.substring(10, 12))
    const day = parseInt(idCard.substring(12, 14))

    const today = new Date()
    const birthDate = new Date(year, month - 1, day)

    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }

    return age
}

// 是否可以提交
const canSubmit = computed(() => {
    return form.realName.trim() && form.idCard.trim() && agreed.value && !submitting.value
})

// 显示协议
const showAgreement = () => {
    agreementVisible.value = true
}

// 协议内容
const agreementContent = ref(`
  <div style="padding:0px 20px 20px 22px; line-height: 1.8; color: #333;"> 
  <p>欢迎您使用实名认证服务！为了更好地为您提供服务，请您在开始使用本服务前，认真阅读并充分理解本协议。如您未满18周岁，请在法定监护人陪同下仔细阅读并充分理解本协议，并征得法定监护人的同意后使用本服务。</p>
   <p>为便于您使用本服务，您通过网络页面点击或以其他形式确认本协议的， 即视为您已充分理解本协议所有条款，并同意作为本协议的一方当事人接受本协议以及其他与本服务相关的协议和规则（包括但不限于《隐私政策》)的约束。</p>
    <p><strong>一、定义</strong></p>
    <p>1.1 “本服务”：即认证服务，系我们基于您的申请及提交的资料和信息为您提供的一项用户身份校验并视情况确定认证结果和认证信息的服务。</p>
    <p>1.2 “本协议”：即《实名认证服务协议》，是我们与您就认证服务的使用等相关事项所订立的协议。</p>
    <p>1.3 “我们”：系指盐城酷信科技有限公司及其关联公司。</p>
    <p><strong>二、授权</strong></p>
    <p>2.1 根据法律法规及安全保障的相关要求，我们需要收集您的姓名、身份证件号码等信息用于核验您的身份（具体可能包括在依法保护未成年人权益、打击电信网络诈骗、代扣代缴个人所得税、行政执法或司法诉讼中相关主体认定等相关功能年龄和身份校验场景中使用），部分信息是敏感个人信息，您可以拒绝提供，但可能导致无法使用相关服务。</p>
    <p>2.2 为准确验证您的身份，我们需将前款载明的信息提供给合法存有您信息的第三方机构进行比对核验，以便我们核验您的身份真实性。我们会与该等第三方签订协议并要求其做好用户信息安全保障。</p>
    <p>2.3 您承诺您所提供的信息合法、有效、真实、准确且完整，不采取任何违法违规、不正当或欺骗手段使用实名认证服务。</p>
    
    <p><strong>三、您的权利义务</strong></p>
    <p>3.1 您理解并同意，您提交的资料和信息是作出认证结果的重要依据，您应保证提供给我们的所有资料和信息的真实性、合法性、准确性和有效性，任何资料和信息的变更将可能影响认证结果，您应当在资料和信息变更时及时提出补充认证申请。</p>
    <p>3.2 目前我们就本服务不收取任何服务费;如后续本服务需要收费，我们将通过公告的形式告知您收费时间及收费标准。</p>
    <p>3.3 您不得将本服务用于中国法律法规所限制或禁止，以及违背道德风俗的领域，如果存在违反法律法规或本协议约定的情形，我们有权视情进行合理的处置。</p>
    
    <p><strong>四、我们的权利义务</strong></p>
    <p>4.1 我们应按本协议约定向您提供认证服务。</p>
    <p>4.2 我们会根据认证技术的发展及市场风险环境的需要，不断调整完善相应本服务的内容及形式。</p>
    <p>4.3 本服务内容仅限于对您提交的资料及信息进行甄别与核实，我们只能在合法权限和合理能力的范围内将对前述资料及信息进行合理、谨慎的形式审查，我们不为认证结果提供任何担保。</p>
   <p><strong>五、个人信息保护</strong></p>
    <p>5.1 保护用户信息是我们的一项基本原则，我们将努力采取合理的措施保护您的信息安全。除法律法规规定及本协议约定的情形外，未经您的许可我们不会向我们之外的第三方提供您的认证结果及认证相关信息。</p>
    <p>5.2 在本协议许可的范围内，我们及第三方审核机构会对相关资料及信息采用专业加密存储与传输方式进行传输及使用，以保障用户的信息安全。</p>
    <p>5.3 我们承诺，将使信息安全保护达到合理的安全水平。为保障您的信息安全，我们致力于使用各种安全技术及配套的管理体系来防止您的信息被泄露、毁损或者丢失。 同时建立了相关内控制度，对可能接触到您的信息的工作人员采取最小够用授权原则，不断对工作人员培训相关法律法规及隐私安全准则和安全意识强化宣导。</p>
    <p>5.4 请您理解，由于技术水平限制及可能存在的各种恶意手段，有可能因我们可控范围外的因素而出现问题。若不幸发生个人信息安全事件，我们将按照法律法规的要求，及时向您告知安全事件的基本情况和可能的影响、我们已采取或将要采取的处置措施、您可自主防范和降低风险的建议、对您的补救措施等。 同时，我们还将按照监管部门要求，主动上报个人信息安全事件的处置情况。如因我们故意或重大过失导致您的信息泄露并给您造成直接损失的，我们应依法承担赔偿责任。</p>
    <p>5.5 除根据法律法规规定及本协议对您的个人信息予以保护外，在处理您的信息时，我们将依据【隐私政策】严格保护您的信息，请您仔细阅读。</p>
  
    </div>
`)

// 提交认证
const handleSubmit = async () => {
    // 验证表单
    if (!validateForm()) {
        return
    }

    // 验证年龄
    const age = calculateAge(form.idCard.trim())
    if (age < 18) {
        showFailToast('根据相关规定，18周岁以下用户无法进行实名认证')
        return
    }

    // 二次确认
    try {
        await showConfirmDialog({
            title: '确认提交',
            message: '请确认您的信息真实有效，提交后将无法修改',
            confirmButtonText: '确认提交',
            cancelButtonText: '再检查一下'
        })
    } catch {
        return // 用户取消
    }

    // 提交
    submitting.value = true
    try {
        const result = await submitRealNameAuth({
            IdCardNo: form.idCard.trim().toUpperCase(),
            RealName: form.realName.trim(),
        })
        showSuccessToast('认证成功')
        router.back();
    } catch (error: any) {
        console.error('Submit error:', error)
        // 错误已在request拦截器中处理
    } finally {
        submitting.value = false
    }
}

// 返回
const onClickLeft = () => {
    try {
        router.back()
    } catch (e) {
        console.error('Close page error:', e)
    }
}
</script>

<style scoped lang="scss">
.real-name-auth-page {
    min-height: 100vh;
    background: #FFFFFF;
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

.auth-container {
    padding: 16px;
}

// 提示说明
.auth-notice {
    display: flex;
    gap: 8px;
    padding: 12px;
    // margin-bottom: 20px;
    // background: #fff3e8;
    // border-radius: 8px;
    // border-left: 3px solid #ff976a;

    .notice-icon {
        flex-shrink: 0;
        margin-top: 2px;

        width: 14px;
        height: 14px;
        margin-right: 5px;
        font-size: 16px;
    }

    .notice-text {
        flex: 1;
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: #646566;

        .link {
            color: #1989fa;
            text-decoration: none;
            cursor: pointer;

            &:active {
                opacity: 0.7;
            }
        }
    }
}

// 表单区域
.form-section {
    margin-bottom: 20px;

    :deep(.van-cell-group) {
        border-radius: 8px;
        overflow: hidden;
    }

    :deep(.van-cell) {
        padding: 10px 6px;
        border-bottom-color: #EBEBEB;
        border-bottom-width: 1px;
        border-bottom-style: solid;

        &::after {
            border-color: #f0f0f0;
        }
    }

    :deep(.van-cell-group--inset) {
        margin: 0 !important;

    }

    :deep(.van-field__label) {
        width: 80px;
        color: #323233;
        font-weight: 500;
        font-size: 16px;
    }

    :deep(.van-field__control) {
        color: #323233;
    }

    :deep(.van-field__error-message) {
        margin-top: 4px;
    }
}

// 协议勾选
.agreement-section {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
    margin-top: 30px;
    // :deep(.van-checkbox) {
    //     align-items: flex-start;
    // }

    :deep(.van-checkbox__icon) {
        margin-top: 2px;
    }

    :deep(.van-checkbox__icon--checked .van-icon) {
        background: #FA6725;
        border-color: #FA6725
    }

    .agreement-text {
        font-size: 12px;
        color: #646566;
        line-height: 1.5;

        .link {
            color: #1989fa;
            text-decoration: none;
            cursor: pointer;

            &:active {
                opacity: 0.7;
            }
        }
    }
}

// 提交按钮
.submit-section {
    padding: 0 16px;
    display: flex;
    justify-content: center;

    .submit-btn {
        width: 178px;
        height: 42px;
        font-size: 16px;
        font-weight: 500;
        background: #FA6725;
        border: none;
        box-shadow: 0 4px 12px rgba(255, 117, 87, 0.3);

        &:active {
            transform: scale(0.98);
        }

        &.van-button--disabled {
            background: #FA6725;
            box-shadow: none;
        }
    }
}

:deep(.van-popup--bottom.van-popup--round) {
    border-radius: 0 !important;
}

// 协议弹窗
.agreement-popup {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;


    .agreement-content {
        flex: 1;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;

        :deep(h3) {
            font-size: 16px;
            color: #323233;
        }

        :deep(p) {
            margin: 12px 0;
            font-size: 14px;
            line-height: 1.8;
            color: #646566;
        }

        :deep(strong) {
            color: #323233;
            font-weight: 600;
        }
    }
}
</style>