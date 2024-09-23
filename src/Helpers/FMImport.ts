import LastFM from 'lastfm-typed'
import Database from '../Structures/Database'
import EventEmitter from 'events'
import { ScrobbleObject } from 'lastfm-typed/dist/interfaces/trackInterface'

type SpotifySong = {
    ts: string
    username: string
    platform: string
    ms_played: number
    conn_country: string
    ip_addr_decrypted: string
    user_agent_decrypted: string
    master_metadata_track_name: string
    master_metadata_album_artist_name: string
    master_metadata_album_album_name: string
    spotify_track_uri: string
    episode_name: string | null
    episode_show_name: string | null
    spotify_episode_uri: string | null
    reason_start: string
    reason_end: string
    shuffle: boolean
    skipped: string | null
    offline: boolean
    offline_timestamp: number
} | {
    track: string
    artist: string
    album: string
    timestamp: number
}

type SpotifyHistory = SpotifySong[]

export class SpotifyImporter extends EventEmitter {
    private importedSongs: ScrobbleObject[] = []

    constructor(private DB: Database, private jid: string, private fm: LastFM, public data: SpotifyHistory) {
        super()
        this.emit('init')
    }

    private isSameDay(date1: Date, date2: Date): boolean {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        )
    }

    public async isEligible() {
        this.emit('checking')
        const user = await this.DB.User.findOne({ jid: this.jid })
        if (!user || !user.lastfm) return false

        const now = new Date()
        if (!user.lastImport || !this.isSameDay(user.lastImport, now)) {
            user.importedToday = 0
            user.lastImport = now
            await user.save()
        }

        if ((user.importedToday || 0) >= 2000) return false
        return true
    }

    public async howManyCanYouImportToday() {
        const user = await this.DB.User.findOne({ jid: this.jid })
        if (!user) return 0

        const now = new Date()
        if (!user.lastImport || !this.isSameDay(user.lastImport, now)) {
            return 2000
        }

        return Math.max(0, 2000 - (user.importedToday || 0))
    }

    private async isTrackScrobbleable(lastfm: string, song: SpotifySong): Promise<boolean> {
        // try {
        //     const track = await this.fm.track.getInfo({
        //         user: lastfm,
        //         artist: song.master_metadata_album_artist_name,
        //         track: song.master_metadata_track_name
        //     })
        //     return !!track;
        // } catch (error) {
        //     console.error(`Error checking track: ${error}`);
        //     return false;
        // }
        return true
    }

    private async importScrobbles(lastfm: string, scrobbles: ScrobbleObject[]): Promise<number> {
        console.log(scrobbles)
        try {
            const res = await this.fm.track.scrobble(lastfm, scrobbles)
            console.log(res)
            return res.scrobbles.length
        } catch (error) {
            console.error(`Error importing scrobbles: ${error}`)
            return 0
        }
    }

    public async import({ from, to, tillReg = true }: { from?: Date; to?: Date; tillReg?: boolean }) {
        const user = await this.DB.User.findOne({ jid: this.jid })
        if (!user) return

        const lfmUser = await this.fm.user.getInfo(user.lastfm!)
        to = tillReg ? new Date(lfmUser.registered * 1000) : to ? to : new Date()
        from = from ? from : new Date(0)

        const scrobbles: ScrobbleObject[] = []
        const remainingScrobbles: ScrobbleObject[] = []
        let importedCount = 0
        const maxImportCount = 2000 - (user.importedToday || 0)
        for (const song of this.data) {
            if (await this.isTrackScrobbleable(user.lastfm!, song)) {
                const scrobble = (() => {
                    if ('master_metadata_album_artist_name' in song) {
                        return {
                            artist: song.master_metadata_album_artist_name,
                            track: song.master_metadata_track_name,
                            timestamp: parseInt((Date.now() / 1000).toFixed())
                        }
                    } else {
                        return {
                            artist: song.artist,
                            track: song.track,
                            timestamp: parseInt((Date.now() * 1000).toFixed())
                        }
                    }
                })()

                if (importedCount < maxImportCount) {
                    scrobbles.push(scrobble)
                    importedCount++
                } else {
                    remainingScrobbles.push(scrobble)
                }
            }
        }

        this.emit('importing', scrobbles.length)

        let actualImportedCount = 0
        for (let i = 0; i < scrobbles.length; i += 50) {
            const batch = scrobbles.slice(i, i + 50)
            const batchImportedCount = await this.importScrobbles(user.lastfm!, batch)
            actualImportedCount += batchImportedCount
            this.emit('batchImported', batchImportedCount, actualImportedCount, scrobbles.length)
            await new Promise((resolve) => setTimeout(resolve, 10000))
        }

        this.importedSongs = scrobbles.slice(0, actualImportedCount)

        const now = new Date()
        if (!user.lastImport || !this.isSameDay(user.lastImport, now)) {
            user.importedToday = actualImportedCount
        } else {
            user.importedToday = (user.importedToday || 0) + actualImportedCount
        }
        user.lastImport = now
        await user.save()
        this.emit('imported', actualImportedCount, remainingScrobbles)
    }

    public async getImportedCount() {
        const user = await this.DB.User.findOne({ jid: this.jid })
        if (!user) return 0

        const now = new Date()
        if (!user.lastImport || !this.isSameDay(user.lastImport, now)) {
            return 0
        }

        return user.importedToday || 0
    }

    public getImportedSongs(): ScrobbleObject[] {
        return this.importedSongs
    }
}
