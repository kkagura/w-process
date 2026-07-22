import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { describe, it } from 'node:test'
import { renderFlowImage } from '../dist/index.mjs'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const fixturePath = join(testDirectory, 'fixtures', 'basic-flow.json')
const cliPath = join(testDirectory, '..', 'dist', 'cli.mjs')

describe('flow-node-renderer', () => {
  it('renders a FlowDocument to a cropped PNG buffer', async () => {
    const document = JSON.parse(await readFile(fixturePath, 'utf8'))
    const image = await renderFlowImage(document, {
      padding: 24,
      pixelRatio: 1.5,
      background: 'transparent',
    })

    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(image.readUInt32BE(16), 612)
    assert.equal(image.readUInt32BE(20), 180)
  })

  it('rejects a canvas that exceeds the physical size limit', async () => {
    const document = JSON.parse(await readFile(fixturePath, 'utf8'))

    await assert.rejects(
      () => renderFlowImage(document, { pixelRatio: 100 }),
      error => error?.code === 'CANVAS_SIZE_EXCEEDED',
    )
  })

  it('renders a scene file through the CLI', async () => {
    const outputPath = join(tmpdir(), `w-process-render-${process.pid}-${Date.now()}.png`)
    try {
      const result = await runProcess([
        cliPath,
        fixturePath,
        '--output',
        outputPath,
        '--padding',
        '16',
        '--background',
        'transparent',
      ])

      assert.equal(result.code, 0, result.stderr)
      assert.match(result.stdout, /已生成图片/)
      const image = await readFile(outputPath)
      assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')

      const duplicateResult = await runProcess([cliPath, fixturePath, '--output', outputPath])
      assert.equal(duplicateResult.code, 1)
      assert.match(duplicateResult.stderr, /OUTPUT_EXISTS/)
    }
    finally {
      await rm(outputPath, { force: true })
    }
  })
})

function runProcess(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', code => resolvePromise({ code, stdout, stderr }))
  })
}
