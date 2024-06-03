import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import { searchTrackOnYouTube } from '../../Helpers/youtube'

@Command('fma', {
    aliases: ['fmyoutube'],
    category: 'LastFM',
    description: {
        content: 'LastFM User current songs on YouTube'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let user = text.trim()
        if (M.mentioned.length > 0) {
            const data = await this.client.database.User.findOne({ jid: M.mentioned[0] }).lean()
            if (!data?.lastfm)
                return void (await M.reply('The mentioned user has not logged in to their LastFM account.'))
            user = data.lastfm
        }
        if (!user) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
            if (!data?.lastfm)
                return void (await M.reply(
                    'Please provide a username or login to your LastFM account using `login` command.'
                ))
            user = data.lastfm
        }

        try {
            const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 })

            const mostRecentTrack = tracks[0]

            const video = await searchTrackOnYouTube(mostRecentTrack.name, mostRecentTrack.artist.name)

            if (!video.id || !video.id.videoId) {
                return void (await M.reply(`No YouTube link found for this track`))
            }

            const data = await this.client.lastfm.user.getInfo(user)

            await M.reply(
                stripIndents`
                    ${data.name} ${tracks[0].nowplaying ? 'is now listening to' : 'last listened to'}:
                    https://www.youtube.com/watch?v=${video.id.videoId}
                `
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username or video not found`))
        }
    }
}
