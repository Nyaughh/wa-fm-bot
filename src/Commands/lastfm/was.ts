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
            const { name } = await this.client.lastfm.user.getInfo({ user: user.lastfm })
            const userTracks = await this.client.lastfm.user.getTopTracks({ user: user.lastfm, limit: 1000 })

            const tracks = userTracks.tracks.filter(track => track.artist.name === artistName).sort((a, b) => b.playcount - a.playcount)

            if (!tracks.length) return void (await M.reply(`You haven't listened to any songs by ${artistName}`))
               
            await M.reply(stripIndents`
                *${artistName}* songs known by *${name}*

                *Total*: ${tracks.reduce((acc, track) => acc + track.playcount, 0)} plays

                ${tracks.map((track, i) => `• ${i + 1}. ${track.name} ${track.playcount} plays`).join('\n')}

                ${url}
            `)
            


        } catch (e) {
            console.error(e)
            return void (await M.reply(`Couldn't find the artist or fetch the data`))
        }
    }
}
