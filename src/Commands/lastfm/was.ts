import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('ujhgfvuyfvutgcvgcfxcvhbyfy', {
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

            const topTracks = await this.client.lastfm.user.getTopTracks({
                user: user.lastfm,
                limit: 100  // Adjust the limit as needed
            })
            const { name: username } = await this.client.lastfm.user.getInfo({ user: user.lastfm })

            const artistTracks = topTracks.tracks.filter((t: any) => t.artist.name.toLowerCase() === artist.toLowerCase())
            const songList = artistTracks.map((t: any) => t.name).join('\n')

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
