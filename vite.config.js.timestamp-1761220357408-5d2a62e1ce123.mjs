// vite.config.js
import { defineConfig } from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/@vitejs/plugin-vue/dist/index.js";
import Components from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/unplugin-vue-components/dist/vite.js";
import { VantResolver } from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/unplugin-vue-components/dist/resolvers.js";
import { resolve } from "path";
import postcssPxToViewport from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/postcss-px-to-viewport/index.js";
import valueParser from "file:///C:/Users/zxx24/Desktop/h5/activity-h5-vanilla-mod/node_modules/postcss-value-parser/lib/index.js";
var __vite_injected_original_dirname = "C:\\Users\\zxx24\\Desktop\\h5\\activity-h5-vanilla-mod";
var keepNpxPlugin = () => ({
  postcssPlugin: "postcss-keep-npx",
  Declaration(decl) {
    if (!decl.value || decl.value.indexOf("npx") === -1) return;
    const parsed = valueParser(decl.value);
    let changed = false;
    parsed.walk((node) => {
      if (node.type === "function" && node.value.toLowerCase() === "url") return false;
      if (node.type === "word") {
        const m = /^(-?\d+(\.\d+)?)(npx)$/.exec(node.value);
        if (m) {
          node.value = `${m[1]}px`;
          changed = true;
        }
      }
    });
    if (changed) decl.value = parsed.toString();
  }
});
keepNpxPlugin.postcss = true;
var injectVantFnScript = () => ({
  name: "inject-vant-fn-script",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      if (typeof html === "string" && html.includes("/src/app-bootstrap.ts")) return html;
      return [{ tag: "script", attrs: { type: "module", src: "/src/app-bootstrap.ts" }, injectTo: "head" }];
    }
  }
});
var vite_config_default = defineConfig({
  base: "./",
  plugins: [
    vue(),
    Components({
      dts: "src/types/components.d.ts",
      resolvers: [VantResolver({ importStyle: true })]
    }),
    injectVantFnScript()
  ],
  resolve: { alias: { "@": resolve(__vite_injected_original_dirname, "src") } },
  css: {
    postcss: {
      plugins: [
        postcssPxToViewport({
          viewportWidth: 375,
          // 设计稿宽度，根据你的设计稿调整
          viewportHeight: 667,
          // 设计稿高度（可选）
          unitPrecision: 5,
          // 转换后保留的小数位数
          viewportUnit: "vw",
          // 转换成的单位
          selectorBlackList: [".keep-px", ".ignore", /^\.van-/],
          // 不转换的类名，Vant组件建议不转换
          minPixelValue: 1,
          // 小于这个值不转换
          mediaQuery: false,
          // 是否转换媒体查询中的px
          exclude: [/node_modules/]
          // 排除 node_modules 文件夹
        }),
        // 如果页面css设置的是npx 那么这一步时就不会转换 vw 了
        keepNpxPlugin()
      ]
    }
  },
  build: {
    rollupOptions: {
      input: {
        signin: resolve(__vite_injected_original_dirname, "pages/signin/index.html"),
        newSignin: resolve(__vite_injected_original_dirname, "pages/newSignin/index.html"),
        yuyue: resolve(__vite_injected_original_dirname, "pages/yuyue/index.html"),
        hongbao: resolve(__vite_injected_original_dirname, "pages/hongbao/index.html"),
        hongbaoyu: resolve(__vite_injected_original_dirname, "pages/hongbaoyu/index.html"),
        openTreasureChest: resolve(__vite_injected_original_dirname, "pages/openTreasureChest/index.html"),
        lottery: resolve(__vite_injected_original_dirname, "pages/Lottery/index.html"),
        inviteEarn: resolve(__vite_injected_original_dirname, "pages/InviteEarn/index.html"),
        PageSelector: resolve(__vite_injected_original_dirname, "pages/PageSelector/index.html"),
        MyEarnings: resolve(__vite_injected_original_dirname, "pages/MyEarnings/index.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx6eHgyNFxcXFxEZXNrdG9wXFxcXGg1XFxcXGFjdGl2aXR5LWg1LXZhbmlsbGEtbW9kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx6eHgyNFxcXFxEZXNrdG9wXFxcXGg1XFxcXGFjdGl2aXR5LWg1LXZhbmlsbGEtbW9kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy96eHgyNC9EZXNrdG9wL2g1L2FjdGl2aXR5LWg1LXZhbmlsbGEtbW9kL3ZpdGUuY29uZmlnLmpzXCI7Ly8gdml0ZS5jb25maWcuanNcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXG5pbXBvcnQgeyBWYW50UmVzb2x2ZXIgfSBmcm9tICd1bnBsdWdpbi12dWUtY29tcG9uZW50cy9yZXNvbHZlcnMnXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCdcbmltcG9ydCBwb3N0Y3NzUHhUb1ZpZXdwb3J0IGZyb20gJ3Bvc3Rjc3MtcHgtdG8tdmlld3BvcnQnXG5pbXBvcnQgdmFsdWVQYXJzZXIgZnJvbSAncG9zdGNzcy12YWx1ZS1wYXJzZXInXG5cbi8vIFx1MjAxNFx1MjAxNCAgXHU2MjhBIG5weCBcdTIxOTIgcHggXHU3Njg0XHU1NDBFXHU3RjZFXHU2M0QyXHU0RUY2XHVGRjA4XHU1MkExXHU1RkM1XHU2NTNFXHU1NzI4IHB4LXRvLXZpZXdwb3J0IFx1NEU0Qlx1NTQwRVx1RkYwOVx1MjAxNFx1MjAxNFxuY29uc3Qga2VlcE5weFBsdWdpbiA9ICgpID0+ICh7XG4gIHBvc3Rjc3NQbHVnaW46ICdwb3N0Y3NzLWtlZXAtbnB4JyxcbiAgRGVjbGFyYXRpb24oZGVjbCkge1xuICAgIC8vIFx1NkNBMVx1NjcwOSBucHggXHU1QzMxXHU4REYzXHU4RkM3XG4gICAgaWYgKCFkZWNsLnZhbHVlIHx8IGRlY2wudmFsdWUuaW5kZXhPZignbnB4JykgPT09IC0xKSByZXR1cm5cblxuICAgIGNvbnN0IHBhcnNlZCA9IHZhbHVlUGFyc2VyKGRlY2wudmFsdWUpXG4gICAgbGV0IGNoYW5nZWQgPSBmYWxzZVxuXG4gICAgcGFyc2VkLndhbGsobm9kZSA9PiB7XG4gICAgICAvLyBcdThERjNcdThGQzcgdXJsKC4uLikgXHU1MTg1XHU1QkI5XHVGRjBDXHU5MDdGXHU1MTREXHU4QkVGXHU2NTM5XHU1NkZFXHU3MjQ3XHU1NDBEXHU3QjQ5XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnZnVuY3Rpb24nICYmIG5vZGUudmFsdWUudG9Mb3dlckNhc2UoKSA9PT0gJ3VybCcpIHJldHVybiBmYWxzZVxuXG4gICAgICAvLyBcdTUzRUFcdTY1MzlcdTIwMUNcdTY1NzBcdTVCNTcrXHU1MzU1XHU0RjREXHUyMDFEXHU3Njg0XHU4QkNEXHVGRjBDXHU0RjhCXHU1OTgyIDEybnB4IC8gLTAuNW5weFxuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ3dvcmQnKSB7XG4gICAgICAgIGNvbnN0IG0gPSAvXigtP1xcZCsoXFwuXFxkKyk/KShucHgpJC8uZXhlYyhub2RlLnZhbHVlKVxuICAgICAgICBpZiAobSkge1xuICAgICAgICAgIG5vZGUudmFsdWUgPSBgJHttWzFdfXB4YFxuICAgICAgICAgIGNoYW5nZWQgPSB0cnVlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgaWYgKGNoYW5nZWQpIGRlY2wudmFsdWUgPSBwYXJzZWQudG9TdHJpbmcoKVxuICB9XG59KVxua2VlcE5weFBsdWdpbi5wb3N0Y3NzID0gdHJ1ZVxuLy8gXHUyMDE0XHUyMDE0IFx1NjNEMlx1NEVGNlx1NUI5QVx1NEU0OVx1N0VEM1x1Njc1RiBcdTIwMTRcdTIwMTRcblxuLy8gXHU2Q0U4XHU1MTY1XHU1MTY4XHU1QzQwXHU1MUZEXHU2NTcwXHU1RjBGXHU2ODM3XHU1RjBGXHU3Njg0XHU1RjE1XHU1QkZDXHU4MTFBXHU2NzJDXHVGRjFBL3NyYy9hcHAtYm9vdHN0cmFwLnRzXG5jb25zdCBpbmplY3RWYW50Rm5TY3JpcHQgPSAoKSA9PiAoe1xuICBuYW1lOiAnaW5qZWN0LXZhbnQtZm4tc2NyaXB0JyxcbiAgdHJhbnNmb3JtSW5kZXhIdG1sOiB7XG4gICAgb3JkZXI6ICdwcmUnLFxuICAgIGhhbmRsZXIoaHRtbCkge1xuICAgICAgaWYgKHR5cGVvZiBodG1sID09PSAnc3RyaW5nJyAmJiBodG1sLmluY2x1ZGVzKCcvc3JjL2FwcC1ib290c3RyYXAudHMnKSkgcmV0dXJuIGh0bWxcbiAgICAgIHJldHVybiBbeyB0YWc6ICdzY3JpcHQnLCBhdHRyczogeyB0eXBlOiAnbW9kdWxlJywgc3JjOiAnL3NyYy9hcHAtYm9vdHN0cmFwLnRzJyB9LCBpbmplY3RUbzogJ2hlYWQnIH1dXG4gICAgfVxuICB9XG59KVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiAnLi8nLFxuICBwbHVnaW5zOiBbXG4gICAgdnVlKCksXG4gICAgQ29tcG9uZW50cyh7XG4gICAgICBkdHM6ICdzcmMvdHlwZXMvY29tcG9uZW50cy5kLnRzJyxcbiAgICAgIHJlc29sdmVyczogW1ZhbnRSZXNvbHZlcih7IGltcG9ydFN0eWxlOiB0cnVlIH0pXSxcbiAgICB9KSxcbiAgICBpbmplY3RWYW50Rm5TY3JpcHQoKSxcbiAgXSxcbiAgcmVzb2x2ZTogeyBhbGlhczogeyAnQCc6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjJykgfSB9LFxuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgIHBvc3Rjc3NQeFRvVmlld3BvcnQoe1xuICAgICAgICAgIHZpZXdwb3J0V2lkdGg6IDM3NSwgICAgICAvLyBcdThCQkVcdThCQTFcdTdBM0ZcdTVCQkRcdTVFQTZcdUZGMENcdTY4MzlcdTYzNkVcdTRGNjBcdTc2ODRcdThCQkVcdThCQTFcdTdBM0ZcdThDMDNcdTY1NzRcbiAgICAgICAgICB2aWV3cG9ydEhlaWdodDogNjY3LCAgICAgLy8gXHU4QkJFXHU4QkExXHU3QTNGXHU5QUQ4XHU1RUE2XHVGRjA4XHU1M0VGXHU5MDA5XHVGRjA5XG4gICAgICAgICAgdW5pdFByZWNpc2lvbjogNSwgICAgICAgIC8vIFx1OEY2Q1x1NjM2Mlx1NTQwRVx1NEZERFx1NzU1OVx1NzY4NFx1NUMwRlx1NjU3MFx1NEY0RFx1NjU3MFxuICAgICAgICAgIHZpZXdwb3J0VW5pdDogJ3Z3JywgICAgICAvLyBcdThGNkNcdTYzNjJcdTYyMTBcdTc2ODRcdTUzNTVcdTRGNERcbiAgICAgICAgICBzZWxlY3RvckJsYWNrTGlzdDogWycua2VlcC1weCcsICcuaWdub3JlJywgL15cXC52YW4tL10sIC8vIFx1NEUwRFx1OEY2Q1x1NjM2Mlx1NzY4NFx1N0M3Qlx1NTQwRFx1RkYwQ1ZhbnRcdTdFQzRcdTRFRjZcdTVFRkFcdThCQUVcdTRFMERcdThGNkNcdTYzNjJcbiAgICAgICAgICBtaW5QaXhlbFZhbHVlOiAxLCAgICAgICAgLy8gXHU1QzBGXHU0RThFXHU4RkQ5XHU0RTJBXHU1MDNDXHU0RTBEXHU4RjZDXHU2MzYyXG4gICAgICAgICAgbWVkaWFRdWVyeTogZmFsc2UsICAgICAgIC8vIFx1NjYyRlx1NTQyNlx1OEY2Q1x1NjM2Mlx1NUE5Mlx1NEY1M1x1NjdFNVx1OEJFMlx1NEUyRFx1NzY4NHB4XG4gICAgICAgICAgZXhjbHVkZTogWy9ub2RlX21vZHVsZXMvXSwgLy8gXHU2MzkyXHU5NjY0IG5vZGVfbW9kdWxlcyBcdTY1ODdcdTRFRjZcdTU5MzlcbiAgICAgICAgfSksXG5cbiAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU5ODc1XHU5NzYyY3NzXHU4QkJFXHU3RjZFXHU3Njg0XHU2NjJGbnB4IFx1OTBBM1x1NEU0OFx1OEZEOVx1NEUwMFx1NkI2NVx1NjVGNlx1NUMzMVx1NEUwRFx1NEYxQVx1OEY2Q1x1NjM2MiB2dyBcdTRFODZcbiAgICAgICAga2VlcE5weFBsdWdpbigpLFxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBpbnB1dDoge1xuICAgICAgICBzaWduaW46IHJlc29sdmUoX19kaXJuYW1lLCAncGFnZXMvc2lnbmluL2luZGV4Lmh0bWwnKSxcbiAgICAgICAgbmV3U2lnbmluOiByZXNvbHZlKF9fZGlybmFtZSwgJ3BhZ2VzL25ld1NpZ25pbi9pbmRleC5odG1sJyksXG4gICAgICAgIHl1eXVlOiByZXNvbHZlKF9fZGlybmFtZSwgJ3BhZ2VzL3l1eXVlL2luZGV4Lmh0bWwnKSxcbiAgICAgICAgaG9uZ2JhbzogcmVzb2x2ZShfX2Rpcm5hbWUsICdwYWdlcy9ob25nYmFvL2luZGV4Lmh0bWwnKSxcbiAgICAgICAgaG9uZ2Jhb3l1OiByZXNvbHZlKF9fZGlybmFtZSwgJ3BhZ2VzL2hvbmdiYW95dS9pbmRleC5odG1sJyksXG4gICAgICAgIG9wZW5UcmVhc3VyZUNoZXN0OiByZXNvbHZlKF9fZGlybmFtZSwgJ3BhZ2VzL29wZW5UcmVhc3VyZUNoZXN0L2luZGV4Lmh0bWwnKSxcbiAgICAgICAgbG90dGVyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdwYWdlcy9Mb3R0ZXJ5L2luZGV4Lmh0bWwnKSxcbiAgICAgICAgaW52aXRlRWFybjogcmVzb2x2ZShfX2Rpcm5hbWUsICdwYWdlcy9JbnZpdGVFYXJuL2luZGV4Lmh0bWwnKSxcbiAgICAgICAgUGFnZVNlbGVjdG9yOiByZXNvbHZlKF9fZGlybmFtZSwgJ3BhZ2VzL1BhZ2VTZWxlY3Rvci9pbmRleC5odG1sJyksXG4gICAgICAgIE15RWFybmluZ3M6IHJlc29sdmUoX19kaXJuYW1lLCAncGFnZXMvTXlFYXJuaW5ncy9pbmRleC5odG1sJylcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGVBQWU7QUFDeEIsT0FBTyx5QkFBeUI7QUFDaEMsT0FBTyxpQkFBaUI7QUFQeEIsSUFBTSxtQ0FBbUM7QUFVekMsSUFBTSxnQkFBZ0IsT0FBTztBQUFBLEVBQzNCLGVBQWU7QUFBQSxFQUNmLFlBQVksTUFBTTtBQUVoQixRQUFJLENBQUMsS0FBSyxTQUFTLEtBQUssTUFBTSxRQUFRLEtBQUssTUFBTSxHQUFJO0FBRXJELFVBQU0sU0FBUyxZQUFZLEtBQUssS0FBSztBQUNyQyxRQUFJLFVBQVU7QUFFZCxXQUFPLEtBQUssVUFBUTtBQUVsQixVQUFJLEtBQUssU0FBUyxjQUFjLEtBQUssTUFBTSxZQUFZLE1BQU0sTUFBTyxRQUFPO0FBRzNFLFVBQUksS0FBSyxTQUFTLFFBQVE7QUFDeEIsY0FBTSxJQUFJLHlCQUF5QixLQUFLLEtBQUssS0FBSztBQUNsRCxZQUFJLEdBQUc7QUFDTCxlQUFLLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUNwQixvQkFBVTtBQUFBLFFBQ1o7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBRUQsUUFBSSxRQUFTLE1BQUssUUFBUSxPQUFPLFNBQVM7QUFBQSxFQUM1QztBQUNGO0FBQ0EsY0FBYyxVQUFVO0FBSXhCLElBQU0scUJBQXFCLE9BQU87QUFBQSxFQUNoQyxNQUFNO0FBQUEsRUFDTixvQkFBb0I7QUFBQSxJQUNsQixPQUFPO0FBQUEsSUFDUCxRQUFRLE1BQU07QUFDWixVQUFJLE9BQU8sU0FBUyxZQUFZLEtBQUssU0FBUyx1QkFBdUIsRUFBRyxRQUFPO0FBQy9FLGFBQU8sQ0FBQyxFQUFFLEtBQUssVUFBVSxPQUFPLEVBQUUsTUFBTSxVQUFVLEtBQUssd0JBQXdCLEdBQUcsVUFBVSxPQUFPLENBQUM7QUFBQSxJQUN0RztBQUFBLEVBQ0Y7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxJQUNKLFdBQVc7QUFBQSxNQUNULEtBQUs7QUFBQSxNQUNMLFdBQVcsQ0FBQyxhQUFhLEVBQUUsYUFBYSxLQUFLLENBQUMsQ0FBQztBQUFBLElBQ2pELENBQUM7QUFBQSxJQUNELG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssUUFBUSxrQ0FBVyxLQUFLLEVBQUUsRUFBRTtBQUFBLEVBQ3JELEtBQUs7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLFNBQVM7QUFBQSxRQUNQLG9CQUFvQjtBQUFBLFVBQ2xCLGVBQWU7QUFBQTtBQUFBLFVBQ2YsZ0JBQWdCO0FBQUE7QUFBQSxVQUNoQixlQUFlO0FBQUE7QUFBQSxVQUNmLGNBQWM7QUFBQTtBQUFBLFVBQ2QsbUJBQW1CLENBQUMsWUFBWSxXQUFXLFNBQVM7QUFBQTtBQUFBLFVBQ3BELGVBQWU7QUFBQTtBQUFBLFVBQ2YsWUFBWTtBQUFBO0FBQUEsVUFDWixTQUFTLENBQUMsY0FBYztBQUFBO0FBQUEsUUFDMUIsQ0FBQztBQUFBO0FBQUEsUUFHRCxjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsT0FBTztBQUFBLFFBQ0wsUUFBUSxRQUFRLGtDQUFXLHlCQUF5QjtBQUFBLFFBQ3BELFdBQVcsUUFBUSxrQ0FBVyw0QkFBNEI7QUFBQSxRQUMxRCxPQUFPLFFBQVEsa0NBQVcsd0JBQXdCO0FBQUEsUUFDbEQsU0FBUyxRQUFRLGtDQUFXLDBCQUEwQjtBQUFBLFFBQ3RELFdBQVcsUUFBUSxrQ0FBVyw0QkFBNEI7QUFBQSxRQUMxRCxtQkFBbUIsUUFBUSxrQ0FBVyxvQ0FBb0M7QUFBQSxRQUMxRSxTQUFTLFFBQVEsa0NBQVcsMEJBQTBCO0FBQUEsUUFDdEQsWUFBWSxRQUFRLGtDQUFXLDZCQUE2QjtBQUFBLFFBQzVELGNBQWMsUUFBUSxrQ0FBVywrQkFBK0I7QUFBQSxRQUNoRSxZQUFZLFFBQVEsa0NBQVcsNkJBQTZCO0FBQUEsTUFDOUQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
