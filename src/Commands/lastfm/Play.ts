import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'
import { userUsage, DAILY_LIMIT, checkAndResetUsage } from '../../Helpers/userUsage'
import ffmpeg from 'fluent-ffmpeg'

@Command('play', {
    aliases: ['playsong'],
    category: 'LastFM',
    description: {
        content: 'Plays the specified song with optional start time and duration'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const userId = M.from // Assuming M.from gives a unique identifier for the user
        const [songName, timeParams] = text.trim().split('|').map(item => item.trim())
        let startTime = 0
        let cropDuration: number | null = null

        if (timeParams) {
            const [start, duration] = timeParams.split(',').map(t => parseFloat(t.trim()))
            if (!isNaN(start)) startTime = start
            if (!isNaN(duration)) cropDuration = duration
        }

        if (!songName) {
            return void await M.reply('Please provide a song name and optional start time and duration (in seconds) separated by |.')
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

            let audioBuffer = await downloader.download()

            // Crop audio if start time or duration is specified
            if (startTime > 0 || cropDuration !== null) {
                audioBuffer = await this.cropAudio(audioBuffer, startTime, cropDuration)
            }

            const vdid = await downloader.parseId()
            const image = `https://i.ytimg.com/vi/${vdid}/hqdefault.jpg`
            const data = await downloader.getInfo()

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
            M.reply('Song not found or an error occurred while processing your request.')
        }
    }

    private cropAudio = (buffer: Buffer, startTime: number, duration: number | null): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
            const tempInput = `/tmp/input-${Date.now()}.mp3`
            const tempOutput = `/tmp/output-${Date.now()}.mp3`

            require('fs').writeFileSync(tempInput, buffer)

            let command = ffmpeg(tempInput).setStartTime(startTime)

            if (duration !== null) {
                command = command.setDuration(duration)
            }

            command.output(tempOutput)
                .on('end', () => {
                    const croppedBuffer = require('fs').readFileSync(tempOutput)
                    require('fs').unlinkSync(tempInput)
                    require('fs').unlinkSync(tempOutput)
                    resolve(croppedBuffer)
                })
                .on('error', (err) => {
                    reject(err)
                })
                .run()
        })
    }
}
