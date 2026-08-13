/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
declare module '*.css'
declare module '*.less'
declare module '*.scss'
declare module '*.sass'
declare module '*.styl'

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 环境变量 */
    NODE_ENV: 'development' | 'production'
    /** 当前构建的平台 */
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'quickapp' | 'qq' | 'jd'
    /** 后端 API 根地址(构建期注入) */
    TARO_APP_API_BASE: string
  }
}

/** config/index.ts 里通过 defineConstants 注入 */
declare const TARO_APP_API_BASE: string
