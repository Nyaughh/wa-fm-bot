import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import { searchTrack } from '../../Helpers/spotify'

@Command('fmspotify', {
    aliases: ['fms'],
    category: 'LastFM',
    description: {
        content: 'LastFM User current songs'
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
            const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 })
            if (!tracks.length) return void (await M.reply(`No data found`))

            const mostRecentTrack = tracks[0]
            const track = await searchTrack(mostRecentTrack.name, mostRecentTrack.artist.name)
            if (!track) return void (await M.reply(`No Spotify link found for this track`))
            const data = await this.client.lastfm.user.getInfo(user)

            await M.reply(
                stripIndents`
                    ${data.name} ${tracks[0].nowplaying ? 'is now listening to' : 'last listened to'}:
                    https://open.spotify.com/track/${track.uri.replace('spotify:track:', '')}
                `
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
