import { karin, logger, segment, render } from 'node-karin'

export const unicodeCommand = karin.command(/^#?unicode(编码|解码)\s*(.+)/, async (e) => {
  const commandType = e.msg.match(/^#?unicode(编码|解码)/)?.[1]
  const text = e.msg.match(/^#?unicode(编码|解码)\s*(.+)$/)?.[2]?.replace(/\s+/g, '')
  if (!text) {
    await e.reply(`请输入有效的 Unicode ${commandType === '编码' ? '文本' : '编码'}！`, { reply: true })
    return true
  }
  try {
    let result: string
    if (commandType === '编码') {
      result = Array.from(text)
        .map(char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
        .join('')
      await e.reply(`编码结果：${result}`, { reply: true })
    } else if (commandType === '解码') {
      result = text
        .split('\\u')
        .filter(s => s)
        .map(hex => String.fromCharCode(parseInt(hex, 16)))
        .join('')
      await e.reply(`解码结果：${result}`, { reply: true })
    }
  } catch (error) {
    await e.reply(`${commandType === '编码' ? '编码' : '解码'}过程中发生错误，请稍后再试。`, { reply: true })
    logger.error(error)
  }
  return true
}, {
  priority: 17,
  name: 'Unicode编码解码',
  permission: 'all',
})

export const urlCommand = karin.command(/^#?url(编码|解码)\s*(.+)/, async (e) => {
  const commandType = e.msg.match(/^#?url(编码|解码)/)?.[1]
  const text = e.msg.match(/^#?url(编码|解码)\s*(.+)$/)?.[2]?.replace(/\s+/g, '')

  if (!text) {
    await e.reply(`请输入有效的 URL ${commandType === '编码' ? '文本' : '编码'}！`, { reply: true })
    return true
  }
  try {
    let result: string
    if (commandType === '编码') {
      result = encodeURIComponent(text)
      await e.reply(`编码结果：${result}`, { reply: true })
    } else if (commandType === '解码') {
      result = decodeURIComponent(text)
      await e.reply(`解码结果：${result}`, { reply: true })
    }
  } catch (error) {
    await e.reply(`${commandType === '编码' ? '编码' : '解码'}过程中发生错误，请稍后再试。`, { reply: true })
    logger.error(error)
  }

  return true
}, {
  priority: 17,
  name: 'URL编码解码',
  permission: 'all',
})
export const screenshotCommand = karin.command(/^#网页截图\s*(\S+.*)/, async (e) => {
  let url = e.msg.match(/^#网页截图\s*(\S+.*)/)?.[1].trim()
  if (!url) {
    await e.reply('请输入有效的网址', { reply: true })
    return true
  }

  url = url.startsWith('http://') || url.startsWith('https://') ? url : 'http://' + url

  try {
    const img = await render.render({
      name: '网页截图',
      file: url,
      type: 'png',
      pageGotoParams: {
        waitUntil: 'networkidle2',  // 等待网络空闲时再截图
      },
      setViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      },
    }) as string

    await e.reply(segment.image(img))
    return true
  } catch (error: any) {
    logger.error('[karin-plugin-memz]网页截图错误:', error)
    await e.reply(`网页截图失败: ${error.message}`, { reply: true })
    return true
  }
}, {
  priority: 11,
  log: true,
  name: '网页截图',
  permission: 'all',
})
