import { google, youtube_v3 } from 'googleapis'

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
})

export const searchTrackOnYouTube = async (track: string, artist: string) => {
    try {
        const res = await youtube.search.list({
            part: ['snippet'],
            q: `${track} ${artist}`,
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
