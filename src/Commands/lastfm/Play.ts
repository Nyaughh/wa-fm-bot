import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'
import { userUsage, DAILY_LIMIT, checkAndResetUsage } from '../../Helpers/userUsage'

@Command('play', {
    aliases: ['playsong'],
    category: 'LastFM',
    description: {
        content: 'Plays the specified song'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const userId = M.from // Assuming M.from gives a unique identifier for the user
        const songName = text.trim()

        if (!songName) {
            return void await M.reply('Please provide a song name.')
        }

        // Check and reset the user's usage if a day has passed
        checkAndResetUsage(userId)

        // Check if the user has reached the daily limit
        if (userUsage[userId].count >= DAILY_LIMIT) {
            return void await M.reply(`You have reached your daily limit of ${DAILY_LIMIT} uses. Please try again tomorrow.`)
        }

        try {
            const video = await searchTrackOnYouTube(songName)
            if (!video.id || !video.id.videoId) {
                throw new Error('Video ID is undefined')
            }

            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
            const downloader = new YTDownloader(videoUrl, 'audio')
            if (!(await downloader.validate())) return void (await M.reply('Video not found'))

            const audioBuffer = await downloader.download()
            const vdid = await downloader.parseId()
            const image = `https://i.ytimg.com/vi/${vdid}/hqdefault.jpg`
            const data = await downloader.getInfo()

            console.log(`YouTube video details: ${JSON.stringify(data)}`)

            const externalAdReply = {
                title: data.title,
                body: data.description,
                mediaType: 2,
                thumbnailUrl: image,
                mediaUrl: videoUrl
            }

            await this.client.sendMessage(
                M.from,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    fileName: `${data.title}.mp3`,
                    jpegThumbnail: (await this.client.util.fetchBuffer(image ?? '')).toString('base64'),
                    contextInfo: {
                        externalAdReply
                    },
                    footer: 'Powered by YouTube'
                },
                {
                    quoted: M.raw
                }
            )

            // Increment the user's usage count
            userUsage[userId].count++

        } catch (e) {
            console.error(e)
            M.reply('Song not found or an error occurred while processing your request.')
        }
    }
}
