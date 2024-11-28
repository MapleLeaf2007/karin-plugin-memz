import { logger } from 'node-karin'
import { basename, config } from '@/utils'

logger.info(`${logger.violet(`[karin-plugin-memz:${config.package.version}]`)} ${logger.green(basename)} 初始化完成~`)
