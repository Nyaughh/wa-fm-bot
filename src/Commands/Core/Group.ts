import { stripIndents } from 'common-tags'
import { Command } from '../../Structures/Command/Command'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import Message from '../../Structures/Message'

@Command('group', {
    aliases: ['groupinfo', 'gi'],
    category: 'Core',
    group: true,
    description: {
        content: 'Get information about the group.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        const url =
            (await this.client.profilePictureUrl(M.from).catch(() => null)) ??
            'https://media.istockphoto.com/photos/abstract-handpainted-art-background-on-canvas-picture-id1134512518?b=1&k=20&m=1134512518&s=170667a&w=0&h=Rw8w1wEksVA2Her6kJMTkbD8Lp-8n3pZqEa-rDJaKfI='
        const info = await this.client.database.getGroup(M.from)

        await M.replyRaw({
            image: { url },
            jpegThumbnail: (await this.client.util.fetchBuffer(url)).toString('base64'),
            caption: stripIndents`
                🏷️ *Group Subject:* ${M.group?.metadata.subject ?? 'N/A'}

                🎖️ *Admins:* ${M.group?.admins.length ?? 0}

                📋 *Total Members:* ${M.group?.participants.length ?? 0}

                🌀 *Roles:* ${info.roles.length ?? 0}
                
                🍃 *Events:* ${info.events ? 'Enabled' : 'Disabled'}

                🎏 *Roleping:* ${info.roleping ? 'Enabled' : 'Disabled'}

                🌌 *Description:* 
                
                ${M.group?.metadata.desc ?? 'N/A'}
            `
        })
    }
}
