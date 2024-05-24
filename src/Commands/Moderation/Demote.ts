import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { Permissons } from '../../typings/Command'

@Command('demote', {
    aliases: [],
    category: 'Moderation',
    admin: true,
    perms: [Permissons.ADMIN],
    group: true,
    description: {
        content: 'demote one or more users'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        if (M.quoted?.sender) M.mentioned.push(M.quoted.sender.jid)
        M.mentioned = [...new Set(M.mentioned)]
        if (M.mentioned.length === 0) return void (await M.reply(`🟥 *Mentions are required to demote*`))
        if (M.mentioned.length > 5)
            M.reply(`🟥 *You can only demote up to 5 users at a time, Remove some users and try again*`)
        let text = `🎖️ Demoting Users...\n`
        for (const jid of M.mentioned) {
            const number = jid.split('@')[0]
            if (!M.group?.admins?.includes(jid)) text += `\n🟨 *@${number}* is already an not admin`
            else {
                await this.client.groupParticipantsUpdate(M.from, [jid], 'demote')
                text += `\n🟩 Demoted *@${number}*`
            }
        }
        await M.reply(text, undefined, undefined, undefined, M.mentioned)
    }
}
