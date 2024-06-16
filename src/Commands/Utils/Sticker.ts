import Sticker, { Categories } from 'wa-sticker-formatter'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('sticker', {
    aliases: ['s'],
    category: 'General',
    description: {
        content: 'Convert Images/Videos into Stickers'
    },
    flags: {
        '--crop': 'Crop the image',
        '--quality': 'Set the quality of the image',
        '--pack': 'Set the pack of the sticker',
        '--author': 'Set the author of the sticker'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { flags, text }: IParsedArgs): Promise<void> => {
        const media = ['imageMessage', 'videoMessage'].includes(M.type)
            ? M
            : M.quoted?.message.videoMessage ?? M.quoted?.message.imageMessage
            ? M.quoted.message
            : M.urls[0] ?? null
        if (!media) return void (await M.reply('No media found!'))
        for (const flag in flags) {
            if (flags[flag]) {
                const txt = `--${flag}=${flags[flag]}`
                text = text.replace(txt, '')
            }
            text = text.replace(`--${flag}`, '')
        }
        const [pack, title] = text.split('|')
        const quality = parseInt(flags.quality ?? '0')
        const sticker = new Sticker(
            typeof media === 'string' ? media : await this.client.downloadMediaMessage(media as Message),
            {
                pack: pack ?? flags.pack ?? 'Sticker',
                author: title ?? flags.author ?? 'FMBOT',
                categories: [(flags.category || '🌹') as Categories],
                type: flags.crop ? 'crop' : flags.stretch ? 'default' : 'full',
                quality: quality < 100 && quality > 0 ? quality : 70
            }
        )
        await M.reply(await sticker.build(), 'sticker')
    }
}
