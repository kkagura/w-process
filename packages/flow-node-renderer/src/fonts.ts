// @env node

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GlobalFonts } from '@napi-rs/canvas'
import type { FontRegistration } from './types'
import { FlowRenderError } from './errors'

export const DEFAULT_FONT_FAMILY = 'Noto Sans SC'

const DEFAULT_FONT_SPECIFIERS = [
  '@expo-google-fonts/noto-sans-sc/400Regular/NotoSansSC_400Regular.ttf',
  '@expo-google-fonts/noto-sans-sc/600SemiBold/NotoSansSC_600SemiBold.ttf',
  '@expo-google-fonts/noto-sans-sc/700Bold/NotoSansSC_700Bold.ttf',
]

let defaultFontRegistered = false

export function registerDefaultFont(): void {
  if (defaultFontRegistered) return

  for (const specifier of DEFAULT_FONT_SPECIFIERS) {
    const fontPath = fileURLToPath(import.meta.resolve(specifier))
    if (!GlobalFonts.registerFromPath(fontPath, DEFAULT_FONT_FAMILY)) {
      throw new FlowRenderError('FONT_REGISTRATION_FAILED', `无法注册默认字体：${fontPath}`)
    }
  }

  defaultFontRegistered = true
}

export function registerFonts(fonts: FontRegistration[]): void {
  for (const font of fonts) {
    const fontPath = resolve(font.path)
    const registered = GlobalFonts.registerFromPath(fontPath, font.family)
    if (!registered) {
      throw new FlowRenderError(
        'FONT_REGISTRATION_FAILED',
        `无法注册字体：${fontPath}`,
      )
    }
  }
}
