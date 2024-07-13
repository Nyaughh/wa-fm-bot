import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import { searchSong, getSongLyrics } from '../../Helpers/genius'

@Command('lyrics', {
    aliases: ['lyrics'],
    category: 'Music',
    description: {
        content: 'Fetches lyrics for the current or last song listened to by the LastFM user'
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
                    'Please provide a username or login to your LastFM account using the `login` command.'
                ))
            user = data.lastfm
        }

        try {
            const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 })
            const mostRecentTrack = tracks[0]

            const query = `${mostRecentTrack.name} ${mostRecentTrack.artist.name}`
            const hits = await searchSong(query)

            if (hits.length === 0) {
                return void (await M.reply('Lyrics not found.'))
            }
            const data = await this.client.lastfm.user.getInfo(user)
            const lyrics = await getSongLyrics(hits[0].id)
            
            await M.reply(
                stripIndents`
                    ${data.name} ${mostRecentTrack.nowplaying ? 'is now listening to' : 'last listened to'}:
                    ${mostRecentTrack.name} - ${mostRecentTrack.artist.name} (${mostRecentTrack.album.name})
                    
                    Lyrics:
                    ${lyrics}
                `
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Error fetching lyrics.`))
        }
    }
}
