import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('rs', {
    aliases: [],
    category: 'Dev',
    mod: true,
    description: {
        content: 'Delete Session'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const sessionId = text.trim()
        if (sessionId === this.client.config.session)
            return void (await M.reply(`🟥 Cannont delete the current session`))
        const session = await this.client.database.Session.findOne({ sessionId })
        if (!session) return void (await M.reply(`🟥 Session does not exsit`))
        await this.client.database.removeSession(sessionId)
        return void (await M.reply(`🟩 Session has been deleted`))
    }
}
