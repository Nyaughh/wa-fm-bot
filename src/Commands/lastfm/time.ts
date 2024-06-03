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

            // Assume average track duration is 3.5 minutes (210 seconds)
            const averageTrackDuration = 210

            const totalListeningTime = userInfo.playcount * averageTrackDuration
            const totalListeningTimeHours = (totalListeningTime / 3600).toFixed(2)

            const artistListeningTimes = topArtists.artists.map(artist => ({
                name: artist.name,
                time: artist.playcount * averageTrackDuration
            }))

            const text = stripIndents`
                Username: ${userInfo.name}
                Total Listening Time: ${totalListeningTimeHours} hours
                Listening Time by Artist:
                ${artistListeningTimes.map((artist, i) => `
                    ${i + 1}. ${artist.name} - ${((artist.time / totalListeningTime) * 100).toFixed(2)}%
                `).join('\n')}
            `

            await M.reply(text)
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username or could not fetch listening time.`))
        }
    }
}
