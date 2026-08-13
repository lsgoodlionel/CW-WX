import path from 'path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

// 默认后端地址:小程序不能用相对路径,必须是可访问的绝对地址。
// 打包前通过环境变量 TARO_APP_API_BASE 覆盖,或在小程序「我的 → 服务器设置」里改。
const API_BASE = process.env.TARO_APP_API_BASE || 'https://your-domain.com'

export default defineConfig<'webpack5'>(async (merge, { mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'cw-weapp',
    date: '2026-8-11',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
    },
    plugins: [],
    defineConstants: {
      // 编译期注入后端默认地址,运行时可被本地存储覆盖
      TARO_APP_API_BASE: JSON.stringify(API_BASE),
    },
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false,
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      esnextModules: ['taro-ui'],
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: { enable: false },
      },
    },
  }

  if (mode === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
