// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'
import postcssPxToViewport from 'postcss-px-to-viewport'
import valueParser from 'postcss-value-parser'

// 设计稿宽度配置
const DESIGN_WIDTH = 390

// ——  把 npx → px 的后置插件（务必放在 px-to-viewport 之后）——
const keepNpxPlugin = () => ({
  postcssPlugin: 'postcss-keep-npx',
  Declaration(decl) {
    if (!decl.value || decl.value.indexOf('npx') === -1) return
    const parsed = valueParser(decl.value)
    let changed = false
    parsed.walk(node => {
      if (node.type === 'function' && node.value.toLowerCase() === 'url') return false
      if (node.type === 'word') {
        const m = /^(-?\d+(\.\d+)?)(npx)$/.exec(node.value)
        if (m) {
          node.value = `${m[1]}px`
          changed = true
        }
      }
    })
    if (changed) decl.value = parsed.toString()
  }
})
keepNpxPlugin.postcss = true

// —— 把 pt → vw 的后置插件（直接使用设计稿数值）——
const convertPtToVw = (designWidth = DESIGN_WIDTH) => ({
  postcssPlugin: 'postcss-pt-to-vw',
  Declaration(decl) {
    // 没有 pt 就跳过
    if (!decl.value || decl.value.indexOf('pt') === -1) return
    
    const parsed = valueParser(decl.value)
    let changed = false
    
    parsed.walk(node => {
      // 跳过 url(...) 内容
      if (node.type === 'function' && node.value.toLowerCase() === 'url') return false
      
      // 只改"数字+单位"的词，例如 100pt / 50.5pt / -10pt
      if (node.type === 'word') {
        const m = /^(-?\d+(\.\d+)?)(pt)$/.exec(node.value)
        if (m) {
          const ptValue = parseFloat(m[1])
          // 转换公式: vw = (pt / 设计稿宽度) * 100
          const vwValue = (ptValue / designWidth * 100).toFixed(5)
          node.value = `${vwValue}vw`
          changed = true
        }
      }
    })
    
    if (changed) decl.value = parsed.toString()
  }
})
convertPtToVw.postcss = true
// —— 插件定义结束 ——

// 注入全局函数式样式的引导脚本：/src/app-bootstrap.ts
const injectVantFnScript = () => ({
  name: 'inject-vant-fn-script',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      if (typeof html === 'string' && html.includes('/src/app-bootstrap.ts')) return html
      return [{ tag: 'script', attrs: { type: 'module', src: '/src/app-bootstrap.ts' }, injectTo: 'head' }]
    }
  }
})

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    Components({
      dts: 'src/types/components.d.ts',
      resolvers: [VantResolver({ importStyle: true })],
    }),
    injectVantFnScript(),
  ],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  css: {
    postcss: {
      plugins: [
        postcssPxToViewport({
          viewportWidth: DESIGN_WIDTH,
          viewportHeight: 844,
          unitPrecision: 5,
          viewportUnit: 'vw',
          selectorBlackList: ['.keep-px', '.ignore', /^\.van-/],
          minPixelValue: 1,
          mediaQuery: false,
          exclude: [/node_modules/],
        }),
        // npx 保持为 px（不转换 vw）
        keepNpxPlugin(),
        // pt 转换为 vw（根据设计稿宽度）
        convertPtToVw(DESIGN_WIDTH),
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
})