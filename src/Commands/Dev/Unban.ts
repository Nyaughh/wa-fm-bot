import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('unban', {
    aliases: [],
    category: 'Dev',
    mod: true,
    description: {
        content: 'Unban Users'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender.jid)
        M.mentioned = [...new Set(M.mentioned)]
        if (M.mentioned.length === 0) return void M.reply(`🟥 *Mentions are required to Unban*`)
        let message = `🔷 *Unban Users* 🔷\n`
        for (const user of M.mentioned) {
            const num = user.split('@')[0]
            const {
                ban: { is }
            } = this.client.getContact(user)
            if (!is) {
                message += `\n🟨 @${num}: Already Unbanned`
                continue
            }
            await this.client.database.unbanUser(user)
            message += `\n🟩 @${num}: Unbanned`
            this.client.unban(user)
        }
        await M.reply(message, undefined, undefined, undefined, M.mentioned)
    }
}
