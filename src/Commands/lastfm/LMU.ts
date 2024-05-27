import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import axios from 'axios'

@Command('lfu', {
    aliases: ['lastfmuser'],
    category: 'LastFM',
    description: {
        content: 'LastFM User Info'
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
            const data = await this.client.lastfm.user.getInfo(user)
            const recent = await this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 })
            const weekly = await this.client.lastfm.user.getWeeklyArtistChart({ user: user, limit: 5 })
            const obsession = await this.client.lastfm.user.getWeeklyTrackChart({ user: user, limit: 1 })

            const image = data.image.find((i) => i.size === 'large') ?? data.image.find((i) => i.size === 'extralarge')

            const text = stripIndents`
                    Username: ${data.name}
                    Playcount: ${data.playcount}
                    Current Obsession: ${obsession.tracks[0].name} by ${obsession.tracks[0].artist.name}
            `
            if (image) {
                const imageData = await axios.get(image.url, { responseType: 'arraybuffer' })
                console.log(imageData)
                if (imageData.request.res.responseUrl.includes('.gif')) {
                    return void (await M.replyRaw({
                        video: await this.client.util.convertGIFToMP4(imageData.data),
                        gifPlayback: true,
                        caption: text
                    }))
                }
                return void (await M.reply(imageData.data, 'image', 'image/png', text).catch(() => {
                    M.reply(text)
                }))
            }

            await M.reply(text)
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
