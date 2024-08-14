import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'

@Command('ping', {
    aliases: ['tag'],
    category: 'tools',
    admin: true,
    group: true,
    description: {
        content: 'Tag everyone in the chat'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        return void await M.replyRaw({ text: `Announcement ${text ? `:${text}` : ''}`, mentions: M.group?.participants })
    }
}