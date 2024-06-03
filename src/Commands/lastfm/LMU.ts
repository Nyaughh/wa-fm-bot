import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import axios from 'axios'

@Command('lfu', {
    aliases: ['lastfmuser', 'fmu'],
    category: 'LastFM',
    description: {
        content: 'LastFM User Info'
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
            const [userData, recent, weekly, obsession] = await Promise.all([
                this.client.lastfm.user.getInfo(user),
                this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 }),
                this.client.lastfm.user.getWeeklyArtistChart({ user: user, limit: 5 }),
                this.client.lastfm.user.getWeeklyTrackChart({ user: user, limit: 1 })
            ]);

            const image = userData.image.find((i) => i.size === 'large') || userData.image.find((i) => i.size === 'extralarge')

            const totalScrobbles = userData.playcount;
            const totalTracks = userData.trackCount;
            const totalArtists = userData.artistCount;
            const totalAlbums = userData.albumCount;

            const averageScrobblesPerTrack = totalTracks ? Math.round(totalScrobbles / totalTracks) : 0;
            const averageScrobblesPerArtist = totalArtists ? Math.round(totalScrobbles / totalArtists) : 0;
            const averageScrobblesPerAlbum = totalAlbums ? Math.round(totalScrobbles / totalAlbums) : 0;

            const text = stripIndents`
                Username: ${userData.name}
                Total Scrobbles: ${totalScrobbles}
                Total Tracks: ${totalTracks}
                Total Artists: ${totalArtists}
                Total Albums: ${totalAlbums}
                Average Scrobbles per Track: ${averageScrobblesPerTrack}
                Average Scrobbles per Artist: ${averageScrobblesPerArtist}
                Average Scrobbles per Album: ${averageScrobblesPerAlbum}
                ${
                    obsession?.tracks?.[0]?.name ? 
                    `Current Obsession: ${obsession.tracks[0].name} by ${obsession.tracks[0].artist.name}` : ''}
            `;

            if (image?.url) {
                const imageData = await axios.get(image.url, { responseType: 'arraybuffer' })
                if (imageData.request.res.responseUrl.includes('.gif')) {
                    return void (await M.replyRaw({
                        video: await this.client.util.convertGIFToMP4(imageData.data),
                        gifPlayback: true,
                        caption: text
                    }))
                }
                return void (await M.reply(imageData.data, 'image', 'image/png', text).catch(() => {
                    M.reply(text)
                }))
            }

            await M.reply(text)
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
