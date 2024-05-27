import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('wac', {
    aliases: ['weeklyalbumchart'],
    category: 'LastFM',
    description: {
        content: 'LastFM User Weekly Album Chart'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let user = text.trim()
        if (M.mentioned.length > 0) {
            const data = await this.client.database.User.findOne({ jid: M.mentioned[0] }).lean()
            if (!data?.lastfm)
                return void (await M.reply('The mentioned user has not logged in to their lastfm account.'))
            user = data.lastfm
        }
        if (!user) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
            if (!data?.lastfm)
                return void (await M.reply(
                    'Please provide a username or login to your lastfm account using `login` command.'
                ))
            user = data.lastfm
        }

        try {
            const albumc = await this.client.lastfm.user.getWeeklyAlbumChart({ user: user })

            await M.reply(
                stripIndents`  
                Weekly Album Chart:
                ${albumc.albums
                    .map(
                        (album, index) =>
                            `${index + 1}. ${album.name} - ${album.artist.name} (${album.playcount} plays)`
                    )
                    .join('\n')}`
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
