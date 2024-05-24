import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('ban', {
    aliases: [],
    category: 'Dev',
    mod: true,
    description: {
        content: 'Bans Users'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender.jid)
        M.mentioned = [...new Set(M.mentioned)]
        if (M.mentioned.length === 0) return void M.reply(`🟥 *Mentions are required to Ban*`)
        const reason = M.mentioned.reduce((acc, cur) => {
            const id = `@${cur.split('@')[0]}`
            acc = acc.replace(id, '')
            return acc
        }, text)
        let message = `🔶 *Ban Users* 🔶\n\n🟥 *Reason:* ${reason}\n`
        const immune = [M.sender.jid, this.client.user?.id]
        for (const user of M.mentioned) {
            if (immune.includes(user) || this.client.isMod(user)) continue
            const num = user.split('@')[0]
            const {
                ban: { is }
            } = this.client.getContact(user)
            if (is) {
                message += `\n🟨 *@${num}:* Already Banned`
                continue
            }
            await this.client.database.banUser(user, reason)
            message += `\n🟩 *@${num}:* Banned`
            this.client.ban(user, reason)
        }
        await M.reply(message, undefined, undefined, undefined, M.mentioned)
    }
}
