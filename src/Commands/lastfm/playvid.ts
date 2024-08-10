import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'

@Command('playvideo', {
    aliases: ['playvid'],
    category: 'LastFM',
    description: {
        content: 'Plays the specified video'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const videoName = text.trim()

        if (!videoName) {
            return void await M.reply('Please provide a video name.')
        }

        try {
            const video = await searchTrackOnYouTube(videoName)
            if (!video.id || !video.id.videoId) {
                throw new Error('Video ID is undefined')
            }

            const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
            const downloader = new YTDownloader(videoUrl, 'video')

            if (!(await downloader.validate())) {
                return void await M.reply('Video not found')
            }

            const videoInfo = await downloader.getInfo()
            if (videoInfo.duration > 600) { // Example limit: 10 minutes
                return void await M.reply('Video is too long. Please provide a shorter video.')
            }

            const videoBuffer = await downloader.download()

            if (videoBuffer.length > 50 * 1024 * 1024) { // Example limit: 50MB
                return void await M.reply('Video file is too large to send.')
            }

            await M.replyRaw({ video: videoBuffer })

        } catch (e) {
            console.error('Error occurred in playvideo command:', e)
            await M.reply('Video not found or an error occurred while processing your request.')
        }
    }
}