import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('hi', {
    aliases: ['hello'],
    category: 'General',
    description: {
        content: 'Say hello to the bot.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        await M.reply('Hi')
    }
}
