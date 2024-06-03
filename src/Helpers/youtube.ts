import { google, youtube_v3 } from 'googleapis'
import { readFile, unlink } from 'fs/promises'
import { createWriteStream } from 'fs'
import ytdl from 'ytdl-core'
import { tmpdir } from 'os'
import Utils from './Utils'

const youtube = google.youtube({
    version: 'v3',
    auth: 'AIzaSyCRDP9iB0qgo88uki42KD9_CaXu1_sPih4'
})

export const searchTrackOnYouTube = async (track: string, artist?: string) => {
    try {
        const query = artist ? `${track} ${artist}` : track
        const res = await youtube.search.list({
            part: ['snippet'],
            q: query,
            maxResults: 1,
            type: ['video']
        })

        const items = res.data.items

        if (!items || items.length === 0) {
            throw new Error('No video found')
        }

        return items[0]
    } catch (error) {
        console.error('Error searching YouTube:', error)
        throw new Error('Failed to search YouTube')
    }
}

export class YTDownloader {
    private utils = new Utils()

    constructor(private url: string, private type = 'video') {
        this.url = url
    }

    validate = async () => ytdl.validateURL(this.url)

    getInfo = async () => await ytdl.getInfo(this.url)

    download = async (quality = 'medium') => {
        if (this.type === 'audio' || quality === 'medium') {
            const filename = `${tmpdir()}/${Math.random().toString(36)}.${this.type === 'audio' ? 'mp3' : 'mp4'}`
            const stream = createWriteStream(filename)
            ytdl(this.url, {
                quality: this.type === 'audio' ? 'highestaudio' : 'highest'
            }).pipe(stream)

            await new Promise((resolve, reject) => {
                stream.on('finish', resolve)
                stream.on('error', reject)
            })

            const buffer = await readFile(filename)
            await unlink(filename)
            return buffer
        } else {
            const audioFilename = `${tmpdir()}/${Math.random().toString(36)}.mp3`
            const videoFilename = `${tmpdir()}/${Math.random().toString(36)}.mp4`
            const outputFilename = `${tmpdir()}/${Math.random().toString(36)}.mp4`

            const audioStream = createWriteStream(audioFilename)
            ytdl(this.url, {
                quality: 'highestaudio'
            }).pipe(audioStream)

            await new Promise((resolve, reject) => {
                audioStream.on('finish', resolve)
                audioStream.on('error', reject)
            })

            const videoStream = createWriteStream(videoFilename)
            ytdl(this.url, {
                quality: quality === 'high' ? 'highestvideo' : 'lowestvideo'
            }).pipe(videoStream)

            await new Promise((resolve, reject) => {
                videoStream.on('finish', resolve)
                videoStream.on('error', reject)
            })

            await this.utils.exec(`ffmpeg -i ${videoFilename} -i ${audioFilename} -c:v copy -c:a aac ${outputFilename}`)
            const buffer = await readFile(outputFilename)
            await Promise.all([unlink(videoFilename), unlink(audioFilename), unlink(outputFilename)])
            return buffer
        }
    }
    parseId = (): string => {
        const split = this.url.split('/')
        if (this.url.includes('youtu.be')) return split[split.length - 1]
        return this.url.split('=')[1]
    }
}
