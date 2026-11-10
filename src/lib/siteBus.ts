/**
 * 站点内命令总线
 * 预览套件（PC 上的虚拟手机）通过 postMessage 下发命令，
 * previewBridge 转成这里的事件；PC 端 / 手机端各自订阅，互不耦合。
 */
import { useEffect } from 'react'
import type { DeviceMode } from '../hooks/useDeviceMode'
import { sectionSlots } from '../data/sections'

export interface SiteCommand {
  /** sectionSlots 里的 id；null 表示回首页 */
  section?: string | null
  home?: boolean
  theme?: 'light' | 'dark'
}

const COMMAND_EVENT = 'lunar:site-command'
export const SITE_STATE_EVENT = 'lunar:site-state'

export const siteState: {
  mode: DeviceMode
  section: string | null
  light: boolean
} = { mode: 'desktop', section: null, light: false }

export function onSiteCommand(cb: (cmd: SiteCommand) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<SiteCommand>).detail)
  window.addEventListener(COMMAND_EVENT, handler)
  return () => window.removeEventListener(COMMAND_EVENT, handler)
}

export function emitSiteCommand(cmd: SiteCommand) {
  window.dispatchEvent(new CustomEvent(COMMAND_EVENT, { detail: cmd }))
}

function broadcast() {
  window.dispatchEvent(new Event(SITE_STATE_EVENT))
}

export function setSiteMode(mode: DeviceMode) {
  siteState.mode = mode
  broadcast()
}

export function setSiteSection(section: string | null) {
  siteState.section = section
  siteState.light = Boolean(document.querySelector('.doc.light'))
  broadcast()
}

export function setSiteLight(light: boolean) {
  siteState.light = light
  broadcast()
}

/* ───────── 预览套件专用：深链与命令订阅（PC / 手机端共用） ───────── */

/** ?section=slot-3 直接落到该分区；非法 id 一律忽略 */
export function initialSectionFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('section')
  return id && sectionSlots.some((s) => s.id === id) ? id : null
}

/** ?preview=1 跳过启动仪式，方便逐屏验收 */
export function skipIntroFromUrl(): boolean {
  return new URLSearchParams(window.location.search).has('preview')
}

export function useSiteCommands(setView: (v: string | null) => void) {
  useEffect(() => onSiteCommand((cmd) => {
    if (cmd.home) setView(null)
    else if (cmd.section) setView(cmd.section)
    if (cmd.theme) {
      // 文档页可能刚挂载，等一帧再点主题按钮
      window.setTimeout(() => {
        const isLight = Boolean(document.querySelector('.doc.light'))
        if ((cmd.theme === 'light') !== isLight) {
          document.querySelector<HTMLButtonElement>('.doc-bright')?.click()
        }
      }, 180)
    }
  }), [setView])
}
