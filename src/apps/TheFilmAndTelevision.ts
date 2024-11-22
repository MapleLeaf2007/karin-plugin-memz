import { karin, common, segment } from 'node-karin'
export const magnetSearch = karin.command(/^#?搜影视\\s*(\\S+)$/,
    async (e) => await TheFilmAndTelevision(e), {
    priority: 9999,
    log: true,
    name: '搜影视',
    permission: 'all',
})
async function TheFilmAndTelevision(e:any) {
  const match = e.msg.match(/^#?搜影视\s*(\\S+)$/)
  const keyword = match ? match[1] : null

  if (!keyword) {
    return await e.reply('请输入关键词进行搜索！', true)
  }

  try {
    const results = await searchResources(keyword)
    if (results.length > 0) {
        const forward = results.map((row:any) =>
            segment.text(`名称: ${row.title}\n文件大小: ${row.size}\n下载链接: ${row.link}`)
          );
      const msg = common.makeForward(forward, e.self_id, e.bot.account.name)
      await e.bot.sendForwardMessage(e.contact, msg);
    } else {
      await e.reply('未找到匹配的结果。', true)
    }
  } catch (error) {
    await e.reply(`搜索过程中发生错误：${(error as Error).message}`, true)
  }
}

async function searchResources(keyword: string) {
  const apiUrl = `https://ysxjjkl.souyisou.top/api_searchtxt.php?name=${encodeURIComponent(keyword)}`

  try {
    const response = await fetch(apiUrl)
    const text = await response.text()

    if (text.includes('[可怜]对不起，本资源暂未收录')) {
      return []
    }

    const results = []
    const items = text.split('\n名称：').slice(1)

    for (const item of items) {
      const nameMatch = item.match(/^(.*?)\s*链接：/)
      const linkMatch = item.match(/链接：(https:\/\/.+?)(?=\s|$)/)

      if (nameMatch && linkMatch) {
        results.push({
          name: nameMatch[1].trim(),
          category: '影视资源',
          link: linkMatch[1]
        })
      }
    }

    return results
  } catch (error) {
    console.error('请求出错:', error)
    throw new Error('资源搜索失败')
  }
}