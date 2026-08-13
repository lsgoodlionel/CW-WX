#!/usr/bin/env node
/**
 * 从主仓库 CW 拉取共享契约到 src/shared。
 *
 *   node scripts/sync-contract.mjs          # 同步
 *   node scripts/sync-contract.mjs --check  # 只校验,不一致则退出码 1
 *
 * 契约的唯一事实源在主仓库 CW 的 shared/contract(其中 models.generated.ts
 * 由后端 OpenAPI 自动生成)。本仓库把同步产物一并提交,所以单独 clone 也能直接构建;
 * 只有要更新契约时才需要主仓库在旁边。
 *
 * 查找主仓库的顺序:环境变量 CW_REPO → 上级目录 → 同级 ../CW → ../../CW
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WX_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_DIR = join(WX_ROOT, 'src', 'shared')

/** 目录像不像 CW 主仓库 */
const looksLikeCw = (dir) => Boolean(dir) && existsSync(join(dir, 'shared', 'contract', 'models.ts'))

function findCwRepo() {
  const candidates = [
    process.env.CW_REPO,
    resolve(WX_ROOT, '..'),        // WX 直接放在 CW 目录内
    resolve(WX_ROOT, '..', 'CW'),  // 两个仓库并列
    resolve(WX_ROOT, '..', '..', 'CW'),
  ]
  return candidates.find(looksLikeCw) || null
}

// 头注释必须与 CW 的 scripts/sync-shared.mjs 保持一致,否则两边校验会互相判为不同步
const HEADER = `/**
 * ⚠️ 本文件由 scripts/sync-shared.mjs 自动生成,请勿直接修改。
 * 源文件:shared/contract/<NAME>
 * 修改流程:改 shared/contract/<NAME> → 跑 node scripts/sync-shared.mjs
 */
`

const isCheck = process.argv.includes('--check')

const cwRepo = findCwRepo()
if (!cwRepo) {
  console.error('[sync-contract] ❌ 找不到主仓库 CW(需要其中的 shared/contract)。')
  console.error('    · 把 CW 与本仓库放在同一父目录下,或')
  console.error('    · 指定路径:CW_REPO=/path/to/CW node scripts/sync-contract.mjs')
  console.error('    仅构建小程序的话不需要它 —— src/shared 已随仓库提交。')
  process.exit(1)
}

const sourceDir = join(cwRepo, 'shared', 'contract')
const files = readdirSync(sourceDir).filter((f) => f.endsWith('.ts')).sort()
const render = (name) => HEADER.replaceAll('<NAME>', name) + readFileSync(join(sourceDir, name), 'utf8')

const drift = []
let written = 0

if (!isCheck) mkdirSync(TARGET_DIR, { recursive: true })

for (const name of files) {
  const expected = render(name)
  const dest = join(TARGET_DIR, name)
  const actual = existsSync(dest) ? readFileSync(dest, 'utf8') : null
  if (actual === expected) continue
  if (isCheck) drift.push(`src/shared/${name} ${actual === null ? '缺失' : '内容不一致'}`)
  else {
    writeFileSync(dest, expected)
    written += 1
  }
}

// 清掉主仓库已删除、这边残留的文件
if (existsSync(TARGET_DIR)) {
  for (const stale of readdirSync(TARGET_DIR).filter((f) => f.endsWith('.ts') && !files.includes(f))) {
    if (isCheck) drift.push(`src/shared/${stale} 为多余文件`)
    else {
      rmSync(join(TARGET_DIR, stale))
      written += 1
    }
  }
}

if (isCheck) {
  if (drift.length === 0) {
    console.log(`[sync-contract] ✅ 共享契约与主仓库一致(${cwRepo})`)
    process.exit(0)
  }
  console.error('[sync-contract] ❌ 共享契约不同步:')
  drift.forEach((d) => console.error(`  · ${d}`))
  console.error('  修复:node scripts/sync-contract.mjs')
  process.exit(1)
}

console.log(
  written === 0
    ? `[sync-contract] 已是最新,无需改动(源:${cwRepo})`
    : `[sync-contract] ✅ 已从 ${cwRepo} 同步 ${written} 个文件`,
)
