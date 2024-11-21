import { karin } from 'node-karin'

export const magnetSearch = karin.command(/^#?磁力搜索\s*(.+)/, async (e) => {
  const searchQuery = e.msg.match(/^#?磁力搜索\s*(.+)$/)?.[1]
  if (!searchQuery) {
    await e.reply('请输入有效的搜索关键词！', { at: true, recallMsg: 0, reply: true })
    return true
  }

  const url = `https://cili.site/search?q=${encodeURIComponent(searchQuery)}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`请求失败，状态码：${response.status}`)
    }

    const data = await response.text()
    const results: { title: string; size: string; link: string }[] = []
    const regex =
      /<tr>[\s\S]*?<td>[\s\S]*?<a href="([^"]+)">[\s\S]*?<p class="sample">([^<]+)<\/p>[\s\S]*?<\/a>[\s\S]*?<\/td>[\s\S]*?<td class="td-size">([^<]+)<\/td>/g

    let match: RegExpExecArray | null
    while ((match = regex.exec(data)) !== null) {
      const link = `https://cili.site${match[1]}`
      const title = match[2].trim()
      const size = match[3].trim()
      results.push({ title, size, link })
    }

    if (results.length > 0) {
      const forwardMessage = results
        .map(
          (row) =>
            `名称: ${row.title}\n文件大小: ${row.size}\n下载链接: ${row.link}`
        )
        .join('\n\n')

      await e.reply(forwardMessage)
    } else {
      await e.reply('未找到匹配的资源。', { at: true, recallMsg: 0, reply: true })
    }
  } catch (error) {
    await e.reply('搜索过程中发生错误，请稍后再试。', { at: true, recallMsg: 0, reply: true })
  }

  return true
}, {
  priority: 9999,
  log: true,
  name: '磁力搜索',
  permission: 'all',
})
