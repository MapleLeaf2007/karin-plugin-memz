import fs from 'fs'
import Yaml from 'yaml'
import chokidar from 'node-karin/chokidar'
import { dirPath, basename } from '@/utils'
import { logger, YamlEditor } from 'node-karin'

class Cfg {
  /** 配置文件跟路径 */
  dir: string
  /** 默认配置文件根路径 */
  defdir: string
  /** 缓存 不经常用的不建议缓存 */
  change: Map<string, any>
  /** 监听文件 */
  watcher: Map<string, any>
  constructor () {
    this.dir = `./config/plugin/${basename}`
    this.defdir = `${dirPath}/config`
    this.change = new Map()
    this.watcher = new Map()
    this.initCfg()
  }

  /** 初始化配置 */
  async initCfg () {
    /** 读取默认配置的所有yaml */
    const files = fs.readdirSync(this.defdir).filter(file => file.endsWith('.yaml'))
    for (const file of files) {
      const dirPath = `${this.dir}/${file}`
      const defPath = `${this.defdir}/${file}`
      if (!fs.existsSync(dirPath)) fs.copyFileSync(defPath, dirPath)
    }

    this.updateYaml(`${this.dir}/config.yaml`, [
      { key: 'a', val: 'value', comment: '实例配置1', type: true },
      { key: 'b.c', val: 'Value', comment: '实例配置2', type: true },
    ])
  }

  /**
 * 更新yaml文件
 * @param filePath - 文件路径
 * @param settings - 设置项
 */
  updateYaml (filePath: string, settings: {
    /** 键路径 */
    key: string,
    /** 要写入的 */
    val: any,
    /** 需要写入的注释 */
    comment: string,
    /** 是否添加到顶部 否则添加到同一行 */
    type: boolean
  }[]) {
    let yaml = new YamlEditor(filePath)

    /** 先添加内容 */
    settings.forEach(({ key, val }) => {
      try {
        if (!yaml.has(key)) yaml.set(key, val)
      } catch (error: any) {
        logger.error(`[karin-plugin-memz] 更新yaml文件时出错：${error.stack || error.message || error}`)
      }
    })
    /** 先保存 */
    yaml.save()

    /** 重新解析 再次写入注释 直接写入注释会报错 写入的不是node节点模式 */
    yaml = new YamlEditor(filePath)
    settings.forEach(({ key, comment, type }) => {
      try {
        yaml.comment(key, comment, type)
      } catch (error: any) {
        logger.error(`[karin-plugin-memz] 更新yaml文件时出错：${error.stack || error.message || error}`)
      }
    })
    yaml.save()
  }

  /**
   * 基本配置
   */
  get Config (): {
    /** 实例配置1 */
    keya: string
    /** 实例配置2 */
    Keyb: {
      a: string
    }
  } {
    const key = 'change.config'
    const res = this.change.get(key)
    /** 取缓存 */
    if (res) return res

    /** 取配置 */
    const config = this.getYaml('config', 'config', true)
    const defSet = this.getYaml('defSet', 'config', false)
    const data = { ...defSet, ...config }
    /** 缓存 */
    this.change.set(key, data)
    return data
  }

  /**
   * packageon
   * 这里建议采用实时读取 不建议缓存
   */
  get package (): any {
    const data = fs.readFileSync(this.defdir + '/package.json', 'utf8')
    const pkg = JSON.parse(data)
    return pkg
  }

  /**
   * 获取配置yaml
   */
  getYaml (type: 'defSet' | 'config', name: string, isWatch = false) {
    /** 文件路径 */
    const file = type === 'defSet' ? `${this.defdir}/${name}.yaml` : `${this.dir}/${name}.yaml`
    /** 读取文件 */
    const data = Yaml.parse(fs.readFileSync(file, 'utf8'))
    /** 监听文件 */
    if (isWatch) this.watch(type, name, file)
    return data
  }

  /**
   * 监听配置文件
   * @param {'defSet'|'config'} type 类型
   * @param {string} name 文件名称 不带后缀
   * @param {string} file 文件路径
   */
  async watch (type: 'defSet' | 'config', name: string, file: string) {
    const key = `change.${name}`
    /** 已经监听过了 */
    const res = this.change.get(key)
    if (res) return true
    /** 监听文件 */
    const watcher = chokidar.watch(file)
    /** 监听文件变化 */
    watcher.on('change', () => {
      this.change.delete(key)
      logger.mark(`[修改配置文件][${type}][${name}]`)

      /** 文件修改后调用对应的方法 请自行使用 */

      // switch (`change_${name}`) {
      //   case 'change_App':
      //     this.change_App()
      //     break
      //   case 'change_config':
      //     this.change_config()
      //     break
      //   case 'change_group':
      //     this.change_group()
      //     break
      // }
    })

    /** 缓存 防止重复监听 */
    this.watcher.set(key, watcher)
  }
}

/**
 * 配置文件
 */
export const config = new Cfg()
