import type { UserConfigExport } from '@tarojs/cli'

export default {
  mini: {},
  h5: {
    /**
     * 需要分析打包体积时打开:
     * webpackChain (chain) { chain.plugin('analyzer').use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, []) }
     */
  },
} satisfies UserConfigExport<'webpack5'>
