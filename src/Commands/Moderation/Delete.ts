import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { Permissons } from '../../typings/Command'

@Command('delete', {
    aliases: ['d'],
    category: 'Moderation',
    admin: true,
    perms: [Permissons.ADMIN],
    group: true,
    description: {
        content: 'Delete a message'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        if (!M.quoted) return void (await M.reply('🟥 *You need to quote a message to delete*'))
        await this.client.sendMessage(M.from, {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete: (M.quoted.message as any).key
        })
    }
}
