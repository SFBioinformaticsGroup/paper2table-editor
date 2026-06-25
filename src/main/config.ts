import { app } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync } from 'fs'

export interface AppConfig {
  recentDirs: string[]
  lastOpenedParent: string
  userName?: string
  pinnedPapers?: Record<string, string[]>
  archivedPapers?: Record<string, string[]>
}

const MAX_RECENT = 10

function configPath(): string {
  return join(app.getPath('home'), '.paper2table-editor.json')
}

export function readConfig(): AppConfig {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf-8')) as AppConfig
  } catch {
    return { recentDirs: [], lastOpenedParent: '', userName: '' }
  }
}

export function writeConfig(config: AppConfig): void {
  try {
    writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8')
  } catch { /* ignore */ }
}

export function addRecentDir(dirPath: string): void {
  const config = readConfig()
  config.recentDirs = [dirPath, ...config.recentDirs.filter((d) => d !== dirPath)].slice(0, MAX_RECENT)
  config.lastOpenedParent = dirname(dirPath)
  writeConfig(config)
}
