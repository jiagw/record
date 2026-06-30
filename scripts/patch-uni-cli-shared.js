/**
 * 修复 monorepo 下 easycom 引用根 node_modules 组件时，
 * uni-app 编译 mp-weixin 报 chunkFileNames 相对路径错误的问题。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const target = path.join(
  root,
  '../node_modules/@dcloudio/uni-cli-shared/dist/utils.js',
)

if (!fs.existsSync(target)) {
  process.exit(0)
}

const marker = "str = str.replace(/^(\.\.\/)+/, '');"
let content = fs.readFileSync(target, 'utf8')

if (content.includes(marker)) {
  process.exit(0)
}

const needle = "str = normalizePath(str).replace(NODE_MODULES_REGEX, 'node-modules');"
const patch = `${needle}\n    str = str.replace(/^(\\.\\.\\/)+/, '');`

if (!content.includes(needle)) {
  console.warn('[patch-uni-cli-shared] pattern not found, skip')
  process.exit(0)
}

content = content.replace(needle, patch)
fs.writeFileSync(target, content)
console.log('[patch-uni-cli-shared] patched normalizeNodeModules')
