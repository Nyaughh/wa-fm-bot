import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('time', {
    aliases: ['listeningtime', 'ltime'],
    category: 'LastFM',
    description: {
        content: 'Show the total listening time and the percentage by artist name'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let user = text.replace('--all', '').trim()
        const showAll = text.includes('--all')

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
            const userInfo = await this.client.lastfm.user.getInfo({ user })
            const topArtists = await this.client.lastfm.user.getTopArtists({ user, limit: showAll ? 100 : 5 })

            const totalScrobbles = userInfo.playcount
            const registeredDate = new Date(userInfo.registered * 1000)
            const daysSinceRegistration = Math.floor((Date.now() - registeredDate.getTime()) / (1000 * 60 * 60 * 24))
            const topTracks = await this.client.lastfm.user.getTopTracks({ user, limit: 1000 })

            const totalListeningTime = topTracks.tracks.reduce(
                (acc, track) => acc + (track.duration || 0) * track.playcount,
                0
            )

            const artistListeningTimes = (
                await Promise.all(
                    topArtists.artists.map(async (artist) => {
                        let artistTime = 0
                        const artistTracks = topTracks.tracks.filter((track) => track.artist.name === artist.name)
                        for (const track of artistTracks) {
                            const trackTime = (track.duration || 0) * track.playcount
                            artistTime += trackTime
                        }
                        return { name: artist.name, time: artistTime }
                    })
                )
            ).map((artist, i) => ({
                ...artist,
                percentage: ((artist.time / totalListeningTime) * 100).toFixed(2)
            }))

            const totalListeningTimeHours = (totalListeningTime / 3600).toFixed(2)
            const scrobblesPerDay = (totalScrobbles / daysSinceRegistration).toFixed(2)
            const hoursPerDay = (Number(totalListeningTimeHours) / daysSinceRegistration).toFixed(2)

            const text = stripIndents`
                Username: ${userInfo.name}
                Registered: ${registeredDate.toDateString()}
                Total Scrobbles: ${totalScrobbles}
                Total Listening Time: ${totalListeningTimeHours} hours
                Average Scrobbles per Day: ${scrobblesPerDay}
                Average Listening Time per Day: ${hoursPerDay} hours

                Listening Time by Artist:
                ${artistListeningTimes
                    .map(
                        (artist, i) => `
                    ${i + 1}. ${artist.name} - ${(artist.time / 3600).toFixed(2)} hours (${artist.percentage}%)
                `
                    )
                    .join('\n')}

                Rest: ${(
                    (totalListeningTime - artistListeningTimes.reduce((acc, artist) => acc + artist.time, 0)) /
                    3600
                ).toFixed(2)} hours

            `

            await M.reply(text)
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username or could not fetch listening time.`))
        }
    }
}
