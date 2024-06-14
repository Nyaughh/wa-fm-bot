import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('songbyartistwhoknows', {
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

            const { name: username } = await this.client.lastfm.user.getInfo({ user: user.lastfm })

            const songList = tracksWithPlays.map((t: any, index: number) => `${index + 1}. ${t.name} - ${t.plays} plays`).join('\n')

            await M.reply(stripIndents`
                *${artistName}* songs known by ${username}:

                ${songList.length > 0 ? songList : 'No songs known'}

                ${url}
            `, 'text', undefined, undefined)

        } catch (e) {
            console.log(e)
            return void (await M.reply(`Couldn't find the artist or fetch the data`))
        }
    }
}
