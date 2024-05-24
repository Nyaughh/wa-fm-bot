import { stripIndents } from 'common-tags'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('tag', {
    aliases: [],
    category: 'Utils',
    group: true,
    description: {
        content: 'Tag one or multiple roles.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { args }: IParsedArgs): Promise<void> => {
        const { roles } = await this.client.database.getGroup(M.from, 'roles')
        const r = roles.filter((r) => args.includes(r.name))
        if (!r.length) return void (await M.reply('🟥 *Roles not found*'))

        await M.reply(
            stripIndents`
                🟨 *Pinging (${r.length} Roles)*
                ${r.map((r) => r.name).join('\n')}
            `,
            'text',
            undefined,
            undefined,
            r.map((r) => r.members).flat()
        )
    }
}
