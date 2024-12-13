import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'

// Constants for video limits
const MAX_VIDEO_DURATION_SECONDS = 600 // 10 minutes
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

@Command('playvideo', {
    aliases: ['playvid'],
    category: 'LastFM',
    description: {
        content: 'Plays a YouTube video (max 10 minutes, 50MB)'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let videoUrl: string

        if (M.urls && M.urls.length > 0) {
            if (!M.urls[0].includes('youtube.com') && !M.urls[0].includes('youtu.be')) {
                return void (await M.reply('Please provide a valid YouTube URL.'))
            }
            videoUrl = M.urls[0]
        } else {
            const videoName = text.trim()

            if (!videoName) {
                return void (await M.reply('Please provide a video name or YouTube URL.'))
            }

            try {
                const video = await searchTrackOnYouTube(videoName)
                if (!video.id?.videoId) {
                    return void (await M.reply('No video found with that name.'))
                }
                videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`
            } catch (e) {
                console.error('Error searching for video:', e)
                return void (await M.reply('Failed to search for the video. Please try again later.'))
            }
        }

        try {
            const downloader = new YTDownloader(videoUrl, 'video')

            if (!(await downloader.validate())) {
                return void (await M.reply('Invalid YouTube URL or video not available.'))
            }

            const videoInfo = await downloader.getInfo()
            if (videoInfo.duration > MAX_VIDEO_DURATION_SECONDS) {
                const minutes = Math.floor(MAX_VIDEO_DURATION_SECONDS / 60)
                return void (await M.reply(`Video is too long. Please provide a video shorter than ${minutes} minutes.`))
            }

            await M.reply('Downloading video... Please wait.')

            const videoBuffer = await downloader.download()

            if (videoBuffer.length > MAX_FILE_SIZE_BYTES) {
                return void (await M.reply(`Video file is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB). Please try a shorter video.`))
            }

            await M.replyRaw({ video: videoBuffer })
        } catch (e) {
            console.error('Error in playvid command:', e)
            const errorMessage = e instanceof Error ? e.message : 'Unknown error'
            await M.reply(`Failed to process video: ${errorMessage}`)
        }
    }
}
