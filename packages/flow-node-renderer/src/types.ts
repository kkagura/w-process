export interface FontRegistration {
  path: string
  family?: string
}

export interface RenderImageOptions {
  padding?: number
  pixelRatio?: number
  background?: string | 'transparent'
  showGrid?: boolean
  showPorts?: boolean
  fonts?: FontRegistration[]
  maxWidth?: number
  maxHeight?: number
  maxPixels?: number
}

export interface ResolvedRenderImageOptions {
  padding: number
  pixelRatio: number
  background: string | 'transparent' | undefined
  showGrid: boolean
  showPorts: boolean
  fonts: FontRegistration[]
  maxWidth: number
  maxHeight: number
  maxPixels: number
}

export interface RenderImageLayout {
  width: number
  height: number
  physicalWidth: number
  physicalHeight: number
  viewport: {
    x: number
    y: number
    zoom: number
  }
}

export interface CliOptions {
  inputPath: string
  outputPath: string
  force: boolean
  render: RenderImageOptions
}

