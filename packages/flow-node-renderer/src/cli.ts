#!/usr/bin/env node
// @env node

import { constants as fsConstants } from 'node:fs'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import type { FlowDocument } from '@w-process/flow-core'
import { FlowRenderError, toErrorMessage } from './errors'
import { renderFlowImage } from './renderFlowImage'
import type { CliOptions, RenderImageOptions } from './types'

const HELP_TEXT = `w-process-render - 将流程图场景 JSON 渲染为 PNG

用法：
  w-process-render <scene.json> [options]

选项：
  -o, --output <path>       输出 PNG 路径，默认与输入文件同目录
      --padding <number>    内容边距，默认 40
      --pixel-ratio <n>     像素倍率，默认 1
      --background <color>  背景色或 transparent
      --show-grid           显示背景网格
      --show-ports          显示节点端口
      --font <path>         注册字体文件，可重复传入
  -f, --force               覆盖已存在的输出文件
  -h, --help                显示帮助
`

const CLI_PARSE_OPTIONS = {
  output: { type: 'string', short: 'o' },
  padding: { type: 'string' },
  'pixel-ratio': { type: 'string' },
  background: { type: 'string' },
  'show-grid': { type: 'boolean' },
  'show-ports': { type: 'boolean' },
  font: { type: 'string', multiple: true },
  force: { type: 'boolean', short: 'f' },
  help: { type: 'boolean', short: 'h' },
} as const

export async function runCli(args: string[]): Promise<number> {
  try {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
      process.stdout.write(HELP_TEXT)
      return 0
    }

    const options = parseCliOptions(args)
    await assertInputFile(options.inputPath)
    await assertOutputAvailable(options.outputPath, options.force)
    const document = await readFlowDocument(options.inputPath)
    const image = await renderFlowImage(document, options.render)
    await writeOutputAtomically(options.outputPath, image, options.force)
    process.stdout.write(`已生成图片：${options.outputPath}\n`)
    return 0
  }
  catch (error) {
    const code = error instanceof FlowRenderError ? error.code : 'UNEXPECTED_ERROR'
    process.stderr.write(`[${code}] ${toErrorMessage(error)}\n`)
    return 1
  }
}

export function parseCliOptions(args: string[]): CliOptions {
  const parsed = parseArguments(args)

  if (parsed.positionals.length !== 1) {
    throw new FlowRenderError('INVALID_ARGUMENT', '必须且只能指定一个场景 JSON 文件')
  }

  const inputPath = resolve(parsed.positionals[0])
  const outputPath = parsed.values.output
    ? resolve(parsed.values.output)
    : createDefaultOutputPath(inputPath)
  if (inputPath === outputPath) {
    throw new FlowRenderError('INVALID_ARGUMENT', '输出路径不能与输入 JSON 路径相同')
  }

  const render: RenderImageOptions = {
    padding: parseNumber(parsed.values.padding, 'padding'),
    pixelRatio: parseNumber(parsed.values['pixel-ratio'], 'pixel-ratio'),
    background: parsed.values.background,
    showGrid: parsed.values['show-grid'],
    showPorts: parsed.values['show-ports'],
    fonts: parsed.values.font?.map(path => ({ path: resolve(path) })),
  }

  return {
    inputPath,
    outputPath,
    force: parsed.values.force ?? false,
    render,
  }
}

function parseArguments(args: string[]) {
  try {
    return parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: CLI_PARSE_OPTIONS,
    })
  }
  catch (error) {
    throw new FlowRenderError('INVALID_ARGUMENT', toErrorMessage(error), { cause: error })
  }
}

export function createDefaultOutputPath(inputPath: string): string {
  const extension = extname(inputPath)
  const name = basename(inputPath, extension)
  return join(dirname(inputPath), `${name}.png`)
}

async function readFlowDocument(inputPath: string): Promise<FlowDocument> {
  let source: string
  try {
    source = await readFile(inputPath, 'utf8')
  }
  catch (error) {
    throw new FlowRenderError('INPUT_NOT_FOUND', `无法读取输入文件：${inputPath}`, { cause: error })
  }

  try {
    return JSON.parse(source) as FlowDocument
  }
  catch (error) {
    throw new FlowRenderError('INVALID_JSON', `输入文件不是有效 JSON：${inputPath}`, { cause: error })
  }
}

async function assertInputFile(inputPath: string): Promise<void> {
  try {
    await access(inputPath, fsConstants.R_OK)
  }
  catch (error) {
    throw new FlowRenderError('INPUT_NOT_FOUND', `输入文件不存在或不可读：${inputPath}`, { cause: error })
  }
}

async function assertOutputAvailable(outputPath: string, force: boolean): Promise<void> {
  if (force) return
  try {
    await access(outputPath, fsConstants.F_OK)
  }
  catch {
    return
  }
  throw new FlowRenderError('OUTPUT_EXISTS', `输出文件已存在，请使用 --force 覆盖：${outputPath}`)
}

async function writeOutputAtomically(outputPath: string, data: Buffer, force: boolean): Promise<void> {
  const outputDirectory = dirname(outputPath)
  const temporaryPath = join(
    outputDirectory,
    `.${basename(outputPath)}.${process.pid}.${Date.now()}.tmp`,
  )

  await mkdir(outputDirectory, { recursive: true })
  try {
    await writeFile(temporaryPath, data, { flag: 'wx' })
    if (force) await rm(outputPath, { force: true })
    await rename(temporaryPath, outputPath)
  }
  catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined)
    if (error instanceof FlowRenderError) throw error
    throw new FlowRenderError('OUTPUT_FAILED', `无法写入输出文件：${outputPath}`, { cause: error })
  }
}

function parseNumber(value: string | undefined, name: string): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  if (!Number.isFinite(number)) {
    throw new FlowRenderError('INVALID_ARGUMENT', `--${name} 必须是有限数字`)
  }
  return number
}

process.exitCode = await runCli(process.argv.slice(2))
