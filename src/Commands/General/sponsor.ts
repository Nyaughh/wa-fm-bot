import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('sponsor', {
    aliases: ['fund'],
    category: 'General',
    description: {
        content: 'Support the creators.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        await M.reply('https://github.com/sponsors/Nyaughh/')
        await M.reply('https://github.com/sponsors/AlenVelocity/')
    }
}
