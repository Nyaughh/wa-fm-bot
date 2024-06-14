import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('whoknowsas', {
    aliases: ['was'],
    category: 'LastFM',
    description: {
        content: 'Shows all songs known by a specific user from a specific artist'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
        if (!user?.lastfm) return void (await M.reply('Please login to your LastFM account using `login` command.'))

        const artist = await (async () => {
            let name = text.trim()
            if (!name) {
                const {
                    tracks: [{ artist }]
                } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm })
                name = artist.name
            }
            return name
        })()

        if (!artist) return void (await M.reply('Please provide an artist name.'))

        try {
            const { name: artistName, url } = await this.client.lastfm.artist.getInfo({ artist })

            const allTracks = await this.client.lastfm.artist.getTopTracks({ artist })

            // Fetch detailed track info including play counts for the user
            const tracksWithPlays = await Promise.all(allTracks.tracks.map(async (track: any) => {
                const trackInfo = await this.client.lastfm.track.getInfo({
                    artist: track.artist.name,
                    track: track.name,
                    username: user.lastfm
                })
                return {
                    name: track.name,
                    plays: trackInfo.userplaycount ?? 0
                }
            }))

            // Sort tracks by number of plays in descending order
            tracksWithPlays.sort((a, b) => b.plays - a.plays)

            const { name: username } = await this.client.lastfm.user.getInfo({ user: user.lastfm })

            const songList = tracksWithPlays
                .filter((track) => track.plays > 0) // Remove tracks with 0 plays
                .map((track, index) => `${index + 1}. ${track.name} - ${track.plays} plays`)
                .join('\n')

            await M.reply(stripIndents`
                *${artistName}* songs known by ${username}:

                ${songList.length > 0 ? songList : 'No songs known'}

                ${url}
            `, 'text', undefined, undefined)

        } catch (e) {
            console.error(e)
            return void (await M.reply(`Couldn't find the artist or fetch the data`))
        }
    }
}
