import { SpotifyApi } from '@spotify/web-api-ts-sdk'

const sdk = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID as string,
    process.env.SPOTIFY_CLIENT_SECRET as string
)

export const searchTrack = async (track: string, artist: string) => {
    try {
        console.log(`Searching for track: ${track}, artist: ${artist}`)
        const searchQuery = artist ? `track:${track} artist:${artist}` : `track:${track}`
        const search = await sdk.search(searchQuery, ['track'])

        if (search.tracks.items.length > 0) {
            console.log(`Spotify search results: ${JSON.stringify(search.tracks.items[0])}`)
            return search.tracks.items[0]
        } else {
            console.log(`No tracks found for ${track} by ${artist}`)
            return null
        }
    } catch (error) {
        console.error('Error searching Spotify:', error)
        return null
    }
}
