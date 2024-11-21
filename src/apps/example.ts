import { karin } from 'node-karin'

export const genshin = karin.command(/^为什么不玩原神$/, async (e) => {
  await e.reply('为什么玩原神', { at: false, recallMsg: 0, reply: true })
  return true
})
