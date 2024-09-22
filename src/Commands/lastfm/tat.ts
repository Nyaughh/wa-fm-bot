import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('topartistsandtracks', {
    aliases: ['tat'],
    category: 'LastFM',
    description: {
        content: 'LastFM User top artists with their top tracks'
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
            const topArtists = await this.client.lastfm.user.getTopArtists({ user: user })
            const topTracks = await this.client.lastfm.user.getTopTracks({ user: user, limit: 100 })

            // Create a map of artist names to their tracks
            const artistTracksMap = new Map<string, string[]>()
            topTracks.tracks.forEach((track) => {
                const artistName = track.artist.name
                const trackEntry = `${track.name} - ${track.playcount} plays`
                if (!artistTracksMap.has(artistName)) {
                    artistTracksMap.set(artistName, [])
                }
                artistTracksMap.get(artistName)!.push(trackEntry)
            })

            // Extract top artists' tracks
            const response = topArtists.artists
                .map((artist, index) => {
                    const artistName = artist.name
                    const tracks = artistTracksMap.get(artistName) || []
                    const formattedTracks = tracks.map((track) => `  - ${track}`).join('\n')
                    return `${index + 1}. ${artistName} - ${artist.playcount} plays\n${formattedTracks}`
                })
                .join('\n\n')

            // Extract tracks with artists not in the top artists list
            const topArtistNames = new Set(topArtists.artists.map((artist) => artist.name))
            const otherTracks = topTracks.tracks
                .filter((track) => !topArtistNames.has(track.artist.name))
                .map((track) => `  - ${track.artist.name} - ${track.name} - ${track.playcount} plays`)
                .join('\n')

            const finalResponse = stripIndents`
                Top Artists and Tracks:
                ${response}

                ${otherTracks ? `Other Tracks:\n${otherTracks}` : ''}
            `

            await M.reply(finalResponse)
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
