import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const sdk = SpotifyApi.withClientCredentials(
    process.env.SPOTIFY_CLIENT_ID as string,
    process.env.SPOTIFY_CLIENT_SECRET as string
)

export const searchTrack = async (track: string, artist: string) => {
    const search = await sdk.search(`track:${track} artist:${artist}`, ['track']);
    return search.tracks.items[0]
}