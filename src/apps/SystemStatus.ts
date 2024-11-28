import os from 'os'
import si from 'systeminformation'

import { karin } from 'node-karin'

export const unicodeCommand = karin.command(/^#(?:memz)?(?:插件)?系统状态(?:pro(max)?)?$/i, async (e) => {
  // 判断匹配的模式，选择相应的处理函数
  const match = e.raw_message.match(/^#(?:memz)?(?:插件)?系统状态(?:pro(max)?)?$/i)
  const mode = match && match[1] ? 'max' : match && match[0].includes('pro') ? 'extended' : 'basic'

  try {
    switch (mode) {
      case 'basic':
        await getSystemInfo(e)
        break
      case 'extended':
        await getExtendedSystemInfo(e)
        break
      case 'max':
        await getMaxExtendedSystemInfo(e)
        break
    }
  } catch (error: unknown) {
    if (error instanceof Error) { await e.reply(`获取系统状态信息时出错: ${error.message}`) }
  }
  return true
}, {
  priority: 11,
  log: true,
  name: '系统状态',
  permission: 'all',
})

async function getSystemInfo (e:any) {
  try {
    const info = await basicInfo(e)
    await e.reply(info)
  } catch (error: unknown) {
    if (error instanceof Error) { await e.reply(`获取系统信息时出错: ${error.message}`) }
  }
}

async function getExtendedSystemInfo (e:any) {
  try {
    const [
      BasicInfo,
      additionalInfo,
      gpuInfo,
      batteryInfo,
      processInfo,
    ] = await Promise.all([
      basicInfo(e),
      getAdditionalSystemInfo(),
      getGPUInfo(),
      getBatteryInfo(),
      getProcessInfo(),
    ])

    const responses = [
      BasicInfo,
      additionalInfo,
      gpuInfo,
      batteryInfo,
      processInfo,
    ].filter((info) => info && info.trim() !== '')

    await e.reply(responses.join('\n'))
  } catch (error: unknown) {
    if (error instanceof Error) { await e.reply(`获取扩展系统信息时出错: ${error.message}`, true) }
  }
}

async function getMaxExtendedSystemInfo (e:any) {
  try {
    const [
      BasicInfo,
      additionalInfo,
      gpuInfo,
      batteryInfo,
      processInfo,
      diskDetailedInfo
    ] = await Promise.all([
      basicInfo(e),
      getAdditionalSystemInfo(),
      getGPUInfo(),
      getBatteryInfo(),
      getProcessInfo(),
      getDiskDetailedInfo()
    ])

    const responses = [
      BasicInfo,
      additionalInfo,
      gpuInfo,
      batteryInfo,
      processInfo,
      diskDetailedInfo
    ].filter((info) => info && info.trim() !== '')

    await e.reply(responses.join('\n'))
  } catch (error: unknown) {
    if (error instanceof Error) {
      await e.reply(`获取最大扩展系统信息时出错: ${error.message}`, true)
    }
  }
}

// 基本系统信息
async function basicInfo (e: any) {
  try {
    const [osInfo, cpuInfo, currentLoad, memoryInfo] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.currentLoad(),
      si.mem()
    ])

    const systemArchitecture = `${osInfo.distro} ${osInfo.release} ${osInfo.arch}`
    const cpuUsage = `${currentLoad.currentLoad.toFixed(2)}%`
    const cpuSpeed = cpuInfo.speed ? `${cpuInfo.speed} GHz` : null
    const cpuDetails = `${cpuInfo.physicalCores}核 ${cpuInfo.brand}`
    const usedMemoryGiB = (memoryInfo.active / 1024 / 1024 / 1024).toFixed(2)
    const totalMemoryGiB = (memoryInfo.total / 1024 / 1024 / 1024).toFixed(2)
    const memoryUsagePercent = `${((memoryInfo.active / memoryInfo.total) * 100).toFixed(2)}%`
    const memoryUsage = `${usedMemoryGiB} GiB / ${totalMemoryGiB} GiB (${memoryUsagePercent})`

    const swapUsage =
      memoryInfo.swaptotal > 0
        ? `${((memoryInfo.swaptotal - memoryInfo.swapfree) / 1024 / 1024 / 1024).toFixed(2)} GiB / ${(memoryInfo.swaptotal / 1024 / 1024 / 1024).toFixed(2)} GiB`
        : null

    let output = `📊 系统状态
标准协议: ${e.bot.adapter.name}
适配器: ${e.bot.version.app_name || e.bot.version.name}
操作系统: ${osInfo.platform}
系统架构: ${systemArchitecture}
主机名: ${os.hostname()}
Node.js 版本: ${process.version}
CPU 信息: ${cpuDetails}
CPU 使用率: ${cpuUsage}
内存: ${memoryUsage}
系统运行时间: ${(os.uptime() / 86400).toFixed(2)} 天
            `.trim()

    if (cpuSpeed) output += `\nCPU 频率: ${cpuSpeed}`
    if (swapUsage) output += `\n内存交换: ${swapUsage}`

    return output
  } catch (error: unknown) {
    if (error instanceof Error) { return `获取基本系统信息时出错: ${error.message}` }
  }
}

// 获取扩展系统信息
async function getAdditionalSystemInfo () {
  try {
    const [diskInfo, cpuTemperature, networkStats, users, sshService, httpdService] = await Promise.all([
      si.fsSize(),
      si.cpuTemperature(),
      getNetworkBandwidth(),
      si.users(),
      si.services('ssh'),
      si.services('httpd')
    ])

    const services = [sshService, httpdService]

    const diskDetails = diskInfo
      .map((disk) => {
        const total = disk.size ? `${(disk.size / 1024 / 1024 / 1024).toFixed(2)} GB` : null
        const free = disk.available ? `${(disk.available / 1024 / 1024 / 1024).toFixed(2)} GB` : null
        const used = disk.used ? `${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB` : null
        let diskLine = `• ${disk.fs} (${disk.type})`
        if (total) diskLine += `: 总量 ${total}`
        if (free) diskLine += `, 可用 ${free}`
        if (used) diskLine += `, 已用 ${used}`
        return diskLine
      })
      .filter((line) => !line.includes('N/A'))
      .join('\n') || null

    const systemTemperature = cpuTemperature.main ? `${cpuTemperature.main} °C` : null
    const networkBandwidth = networkStats || null
    const loadAvg = os.loadavg().map((val) => val.toFixed(2)).join(' ')
    const loggedInUsers = users.length > 0 ? users.map((user) => `• ${user.user}`).join('\n') : null
    const serviceStatus = services.length > 0
      ? services.map(
        (service:any) => `• ${service.name}: ${service.running ? '✅ Active' : '❌ Inactive'}`
      ).join('\n')
      : null

    let output = `💾 磁盘信息
${diskDetails}
📈 系统负载
${loadAvg}
            `.trim()

    if (systemTemperature) output += `\n🌡️ 系统温度: ${systemTemperature}`
    if (networkBandwidth) output += `\n${networkBandwidth}`
    if (loggedInUsers) output += `\n👥 登录用户:\n${loggedInUsers}`
    if (serviceStatus) output += `\n🛠️ 服务状态:\n${serviceStatus}`

    return output
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `获取扩展系统信息时出错: ${error.message}`
    }
  }
}

// 获取磁盘详细信息
async function getDiskDetailedInfo () {
  try {
    const diskPartitions = await si.diskLayout()
    if (!diskPartitions || diskPartitions.length === 0) {
      return null
    }

    const partitionsInfo = diskPartitions
      .map((partition) => {
        const size = partition.size ? `${(partition.size / 1024 / 1024 / 1024).toFixed(2)} GB` : null
        return `• ${partition.name}: ${size}`
      })
      .join('\n')

    return `📂 磁盘分区:\n${partitionsInfo}`
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `获取磁盘分区信息时出错: ${error.message}`
    }
  }
}

// 获取 GPU 信息
async function getGPUInfo () {
  try {
    const gpuInfo = await si.graphics()
    if (!gpuInfo.controllers || gpuInfo.controllers.length === 0) {
      return '没有检测到 GPU 信息'
    }

    const gpuDetails = gpuInfo.controllers
      .map(
        (gpu:any) => `• ${gpu.model} (VRAM: ${gpu.memory || '未知'})`
      )
      .join('\n')

    return `🎮 GPU 信息:\n${gpuDetails}`
  } catch (error: unknown) {
    if (error instanceof Error) { return `获取 GPU 信息时出错: ${error.message}` }
  }
}

// 获取电池信息
async function getBatteryInfo () {
  try {
    const batteryInfo:any = await si.battery()
    if (!batteryInfo || !Object.prototype.hasOwnProperty.call(batteryInfo, 'percent')) {
      return '没有检测到电池信息'
    }

    return `🔋 电池信息: ${batteryInfo.percent}%`
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `获取电池信息时出错: ${error.message}`
    }
  }
}

// 获取进程信息
async function getProcessInfo () {
  try {
    const processes = await si.processes()
    if (!processes || !Array.isArray(processes)) {
      return '没有检测到进程信息'
    }

    const processList = processes.slice(0, 10)
      .map((proc: any) => `• ${proc.pid} ${proc.name} (${proc.cpu}%)`)
      .join('\n')

    return `🧑‍💻 进程信息:\n${processList}`
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `获取进程信息时出错: ${error.message}`
    }
  }
}

// 获取网络带宽信息
async function getNetworkBandwidth () {
  try {
    const networkStats = await si.networkStats()
    if (!networkStats || networkStats.length === 0) {
      return '没有网络带宽信息'
    }

    const bandwidth = networkStats
      .map(
        (stats:any) =>
          `• ${stats.interface}: 收入 ${stats.rx_bytes} 字节，输出 ${stats.tx_bytes} 字节`
      )
      .join('\n')

    return `🌐 网络带宽:\n${bandwidth}`
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `获取网络带宽信息时出错: ${error.message}`
    }
  }
}
