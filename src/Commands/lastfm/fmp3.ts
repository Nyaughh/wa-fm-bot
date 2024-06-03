import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'
import ytdl from 'ytdl-core'
import fs from 'fs'
import { tmpdir } from 'os'

@Command('fmp3', {
    aliases: ['fmyoutubemp3'],
    category: 'LastFM',
    description: {
        content: 'LastFM User current songs as MP3'
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
                    'Please provide a username or login to your LastFM account using `login` command.'
                ))
            user = data.lastfm
        }

        try {
            const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: user, limit: 1 })
            if (!tracks.length) return void await M.reply(`No data found`)

            const mostRecentTrack = tracks[0]
            const video = await searchTrackOnYouTube(mostRecentTrack.name, mostRecentTrack.artist.name)

            if (!video.id || !video.id.videoId) {
                throw new Error('Video ID is undefined')
            }

            const image =
                mostRecentTrack.image.find((i) => i.size === 'large') ??
                mostRecentTrack.image.find((i) => i.size === 'extralarge')

            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
            const downloader = new YTDownloader(videoUrl, 'audio')
            if (!(await downloader.validate())) return void (await M.reply('Video not found'))
            const audioBuffer = await downloader.download()
            await this.client.sendMessage(
                M.from,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    fileName: `${mostRecentTrack.name}.mp3`,
                    jpegThumbnail: (await this.client.util.fetchBuffer(image?.url ?? '')).toString('base64'),
                    contextInfo: {
                        externalAdReply: {
                            title: mostRecentTrack.name,
                            body: mostRecentTrack.artist.name,
                            mediaType: 1,
                            thumbnailUrl: image?.url ?? ''
                        }
                    },
                    footer: 'Powered by YouTube'
                },
                {
                    quoted: M.raw
                }
            )

            // try
        } catch (e) {
            console.error(e)
            M.reply('Invalid Username or video not found')
        }
    }
}
