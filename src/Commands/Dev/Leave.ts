import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('leave', {
    aliases: ['nikal'],
    category: 'Dev',
    mod: true,
    description: {
        content: 'For Super Users.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        const bye = [`*Goodbye* 👋`, 'Peace out', 'goodbye', 'I’ve got to get going', 'I must be going']
        const rand = this.client.util.getRandomInt(1, bye.length - 1)
        await M.reply(bye[rand])
        await this.client.groupLeave(M.from)
    }
}
