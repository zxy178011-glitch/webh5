<template>
  <div class="page">
    <!-- 顶栏：分数 & 倒计时 -->
    <header class="hud">
      <div class="hud-item">
        <div class="label">分数</div>
        <div class="value">{{ score }}</div>
      </div>
      <div class="hud-item">
        <div class="label">剩余</div>
        <div class="value">{{ timeLeft }}s</div>
      </div>
    </header>

    <!-- 游戏区域 -->
    <div class="stage" ref="stageRef">
      <!-- 点击提示 -->
      <div v-if="!running && !finished" class="hint">点击红包得分</div>
      <!-- 开始按钮 -->
      <button v-if="!running && !finished" class="btn start" @click="startGame">开始游戏</button>

      <!-- 红包们（用 v-for 渲染 DOM，便于点击） -->
      <div v-for="p in packets" :key="p.id"
           class="packet"
           :style="packetStyle(p)"
           @click="hit(p.id)">
        <!-- 用 SVG 画一个红包（纯前端，不用图片） -->
        <svg viewBox="0 0 60 72" class="svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ff5858"/>
              <stop offset="1" stop-color="#c91b1b"/>
            </linearGradient>
          </defs>
          <rect x="6" y="10" width="48" height="56" rx="8" fill="url(#g)"/>
          <path d="M6,18 Q30,34 54,18 v-8 H6z" fill="#9e0e0e"/>
          <circle cx="30" cy="40" r="10" fill="#ffd36b" />
          <path d="M25 40 h10 M30 35 v10" stroke="#b37b00" stroke-width="2" />
        </svg>
      </div>

      <!-- +N 漂浮分数 -->
      <div v-for="p in floats" :key="p.k" class="float"
           :style="{ left: p.x + 'px', top: p.y + 'px', opacity: p.opacity }">
        +{{ p.amt }}
      </div>

      <!-- 结束遮罩 -->
      <div v-if="finished" class="overlay">
        <div class="panel">
          <div class="title">时间到！</div>
          <div class="result">本局得分：<b>{{ score }}</b></div>
          <div class="actions">
            <button class="btn again" @click="restart">再来一局</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部 tips -->
    <footer class="footer">红包下落期间不断点击可获得更多分数～</footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/** 配置项 */
const GAME_SECONDS = 20            // 游戏时长（秒）
const SPAWN_INTERVAL = 320         // 生成频率（毫秒）
const SPEED_MIN = 120              // 像素/秒 最小下落速度
const SPEED_MAX = 260              // 像素/秒 最大下落速度
const ROT_MIN = -90                // 旋转速度 deg/秒
const ROT_MAX = 120

const stageRef = ref(null)
const running = ref(false)
const finished = ref(false)
const timeLeft = ref(GAME_SECONDS)
const score = ref(0)

let rafId = 0
let spawnTimer = 0
let lastTs = 0
let idSeq = 1

/** 红包实体：{ id,x,y,vy,rot,rv,scale } */
const packets = ref([])

/** 漂浮 +分数：{ k,x,y,amt,opacity,vy,life } */
const floats = ref([])

function rnd(min, max) { return Math.random() * (max - min) + min }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

/** 生成一个红包 */
function spawnPacket() {
  const stage = stageRef.value
  if (!stage) return
  const w = stage.clientWidth
  const size = rnd(0.9, 1.25)
  const p = {
    id: idSeq++,
    x: rnd(0, w - 60 * size),
    y: -80,
    vy: rnd(SPEED_MIN, SPEED_MAX),  // 像素/秒
    rot: rnd(-20, 20),
    rv: rnd(ROT_MIN, ROT_MAX),      // deg/秒
    scale: size,
  }
  packets.value.push(p)
}

function packetStyle(p) {
  return {
    transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg) scale(${p.scale})`,
  }
}

/** 命中红包 */
function hit(id) {
  if (!running.value) return
  const idx = packets.value.findIndex(p => p.id === id)
  if (idx === -1) return
  const p = packets.value[idx]
  packets.value.splice(idx, 1)

  // 加分（可做权重：越小越难点）
  const add = Math.round(5 + (1.6 - p.scale) * 6) // 约 5~10 分
  score.value += add

  // 漂浮 +N
  floats.value.push({
    k: `${Date.now()}_${Math.random()}`,
    x: p.x + 22, y: p.y + 8, amt: add,
    opacity: 1, vy: -60, life: 600, // 毫秒
  })
}

/** 漂浮数字更新 */
function updateFloats(dt) {
  const arr = floats.value
  for (let i = arr.length - 1; i >= 0; i--) {
    const f = arr[i]
    f.life -= dt
    f.y += (f.vy * dt / 1000)
    f.opacity = clamp(f.life / 600, 0, 1)
    if (f.life <= 0) arr.splice(i, 1)
  }
}

function loop(ts) {
  if (!running.value) return
  if (!lastTs) lastTs = ts
  const dt = ts - lastTs
  lastTs = ts

  // 计时
  timeLeft.value = Math.max(0, timeLeft.value - dt / 1000)
  if (timeLeft.value <= 0) {
    endGame()
    return
  }

  // 生成
  spawnTimer += dt
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0
    // 一次生成 1~2 个，制造“雨”的感觉
    const n = Math.random() < 0.25 ? 2 : 1
    for (let i = 0; i < n; i++) spawnPacket()
  }

  // 更新红包位置
  const stage = stageRef.value
  const h = stage ? stage.clientHeight : 0
  for (let i = packets.value.length - 1; i >= 0; i--) {
    const p = packets.value[i]
    p.y += (p.vy * dt / 1000)
    p.rot += (p.rv * dt / 1000)
    if (p.y > h + 100) packets.value.splice(i, 1) // 落出底部回收
  }

  // 更新漂浮分数
  updateFloats(dt)

  rafId = requestAnimationFrame(loop)
}

function startGame() {
  // 初始化状态
  packets.value = []
  floats.value = []
  running.value = true
  finished.value = false
  timeLeft.value = GAME_SECONDS
  score.value = 0
  spawnTimer = 0
  lastTs = 0

  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(loop)
}

function endGame() {
  running.value = false
  finished.value = true
  cancelAnimationFrame(rafId)
}

function restart() {
  finished.value = false
  startGame()
}

onMounted(() => {
  // 可选：进入页面即开始
  // startGame()
})

onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<style scoped>
.page{
  min-height:100vh;
  display:flex;
  flex-direction:column;
  background: linear-gradient(180deg,#b31313 0%, #8f1010 100%);
  color:#fff;
  -webkit-tap-highlight-color: transparent;
  user-select:none;
}

.hud{
  display:flex;
  justify-content:space-between;
  padding:14px 16px 6px;
  font-family: system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
.hud-item .label{ font-size:12px; opacity:.85 }
.hud-item .value{ font-size:22px; font-weight:900 }

.stage{
  position:relative;
  flex:1;
  overflow:hidden;
  border-radius:16px 16px 0 0;
  background:
    radial-gradient(1200px 500px at 50% -50%, rgba(255,255,255,.12) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(180deg,#b31313 0%, #8f1010 100%);
  box-shadow: inset 0 8px 20px rgba(0,0,0,.25);
}

.hint{
  position:absolute; left:50%; top:30%;
  transform:translateX(-50%);
  font-size:14px; opacity:.9;
}

.btn{
  appearance:none; border:0; outline:0;
  padding:12px 18px; border-radius:999px;
  font-weight:800; font-size:16px;
  color:#8f1010; background:#ffd36b;
  box-shadow: 0 8px 16px rgba(0,0,0,.25);
}
.btn.start{
  position:absolute; left:50%; top:45%;
  transform:translateX(-50%);
}
.btn.again{
  background:#ffd36b; color:#8f1010;
}

.packet{
  position:absolute;
  width:60px; height:72px;
  will-change: transform;
  transform-origin:center center;
  filter: drop-shadow(0 6px 8px rgba(0,0,0,.25));
}
.packet .svg{ width:100%; height:100%; display:block; }

.float{
  position:absolute;
  font-weight:900;
  font-size:16px;
  color:#fff;
  text-shadow: 0 2px 8px rgba(0,0,0,.45);
  pointer-events:none;
  will-change: transform, opacity;
}

.overlay{
  position:absolute; inset:0;
  background: rgba(0,0,0,.35);
  display:flex; align-items:center; justify-content:center;
  backdrop-filter: blur(2px);
}
.panel{
  width:min(86vw,420px);
  background:#fff;
  color:#333;
  border-radius:16px;
  padding:20px 16px;
  text-align:center;
  box-shadow: 0 12px 28px rgba(0,0,0,.35);
}
.panel .title{ font-size:18px; font-weight:800; margin-bottom:8px; }
.panel .result{ font-size:16px; margin: 10px 0 16px; }
.panel .result b{ color:#c91b1b; font-size:22px; }

.footer{
  text-align:center;
  font-size:12px;
  opacity:.85;
  padding:10px 0 14px;
}
</style>
