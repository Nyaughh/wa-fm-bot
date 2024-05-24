import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('ping', {
    aliases: [],
    category: 'Moderation',
    group: true,
    description: {
        content: 'Ping Members'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { flags, text }: IParsedArgs): Promise<void> => {
        const { roles } = await this.client.database.getGroup(M.from, 'roles')
        if (flags.role) {
            const role = roles.find((r) => r.name === flags.role)
            if (!role) return void (await M.reply('🟥 *Role not found*'))
            if (!role.members.length) return void (await M.reply('🟥 *No members in this role*'))
            return void (await M.reply(
                `🟨 *Pinging ${role.name} (${role.members.length} members)*`,
                'text',
                undefined,
                undefined,
                role.members
            ))
        }

        if ('admins' in flags)
            return void (await M.reply('🟩 *Pingind Admins', 'text', undefined, undefined, M.group?.admins))

        if (!M.isAdminMessage) return void (await M.reply('🟥 *You must be an admin to ping all users*'))
        return void (await M.reply(
            text ? `🟩 *Pinging Everyone*\n\n*🔈 announcement :* ${text}` : '🟩 *Pinging Everyone* ',
            'text',
            undefined,
            undefined,
            M.group?.participants
        ))
    }
}
