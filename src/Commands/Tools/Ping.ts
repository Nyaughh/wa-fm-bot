import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('ping', {
    aliases: ['announce', 'alert'],
    category: 'Tools',
    admin: true,
    group: true,
    description: {
        content: 'Tags everyone in the group'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const message = text ? text.trim() : ''
        return void (await M.replyRaw({
            text: stripIndents`
            *Announcement*
            ${message ? `\n${message}` : ''}
            `,
            mentions: M.group?.participants
        }))
    }
}
