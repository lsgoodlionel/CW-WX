/**
 * 数据模型统一出口。
 *
 * 真正的定义在仓库根目录的 shared/contract/models.ts(Web 端与小程序共用),
 * 由 scripts/sync-shared.mjs 同步到 src/shared/。这里只做转出,页面继续
 * 从 '@/types/models' 引入即可,不必关心同步细节。
 */
export * from '@/shared/models'
