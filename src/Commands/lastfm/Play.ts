import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { searchTrackOnYouTube, YTDownloader } from '../../Helpers/youtube'
import { searchTrack } from '../../Helpers/spotify'

@Command('play', {
    aliases: ['playsong'],
    category: 'LastFM',
    description: {
        content: 'Plays the specified song'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const songName = text.trim()
        if (!songName) {
            return void await M.reply('Please provide a song name.')
        }

        try {
            // Splitting song name and artist name
            const [track, ...artistArr] = songName.split(' by ')
            const artist = artistArr.join(' ')

            // Search on YouTube
            console.log(`Searching YouTube for: ${track} by ${artist}`)
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

            // Log YouTube video details
            console.log(`YouTube video details: ${JSON.stringify(data.videoDetails)}`)

            const externalAdReply = {
                title: data.videoDetails.title,
                body: data.videoDetails.description,
                mediaType: 2,
                thumbnailUrl: image,
                mediaUrl: videoUrl
            }

            // Send the YouTube MP3 first
            await this.client.sendMessage(
                M.from,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    fileName: `${track}.mp3`,
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

            // Search for the track on Spotify
            console.log(`Searching Spotify for: ${track} by ${artist}`)
            const searchResult = await searchTrack(track, artist)
            const spotifyUrl = searchResult ? searchResult.external_urls.spotify : null

            if (spotifyUrl) {
                console.log(`Spotify URL found: ${spotifyUrl}`)
                await M.reply(`Spotify URL: ${spotifyUrl}`)
            } else {
                console.log('Spotify URL not found')
                await M.reply('Spotify URL not found')
            }
        } catch (e) {
            console.error(e)
            M.reply('Song not found or an error occurred while processing your request.')
        }
    }
}
