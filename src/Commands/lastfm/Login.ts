import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('login', {
    aliases: ['l'],
    category: 'Core',
    description: {
        content: 'Login to your lastfm account.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        await M.reply('Click on this link to login to your lastfm account.')
    }
}
