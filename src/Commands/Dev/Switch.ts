import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('switch', {
    aliases: ['bot'],
    category: 'Dev',
    mod: true,
    group: true,
    all: true,
    description: {
        content: 'For Super Users.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        text = text.trim()
        const bot = text !== 'all' ? text : ''
        const { bot: currentBot } = await this.client.database.getGroup(M.from, 'bot')
        const iam = bot === this.client.config.session
        if (bot && bot === currentBot) {
            if (iam) M.reply('🟨 I am already active')
            return void (await M.reply(`🟨 ${this.client.util.capitalize(bot ?? 'all')} is already active`))
        }
        await this.client.database.Group.updateOne({ gid: M.from }, { $set: { bot } })
        if (!bot) return void (await M.reply('🟩 All bots are now active'))
        if (iam) return void (await M.reply("🟩 I'm now active"))
        await M.reply(`🟩 ${this.client.util.capitalize(bot)} is now active`)
    }
}
