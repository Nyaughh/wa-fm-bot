import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('whoknowscurrenttrack', {
    aliases: ['wct', 'wt'],
    category: 'LastFM',
    description: {
        content: 'Who knows the currently playing track in this group'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
        if (!user?.lastfm) return void (await M.reply('Please login to your LastFM account using `login` command.'))

        const currentTrack = await (async () => {
            const {
                tracks: [{ name, artist }]
            } = await this.client.lastfm.user.getRecentTracks({ user: user.lastfm })
            return { trackName: name, artistName: artist.name }
        })()

        if (!currentTrack.trackName || !currentTrack.artistName)
            return void (await M.reply('No track is currently playing.'))

        try {
            const {
                name: trackName,
                artist: { name: artistName },
                url
            } = await this.client.lastfm.track.getInfo({
                artist: currentTrack.artistName,
                track: currentTrack.trackName
            })

            const participants = M.group!.participants.map((p) => p)
            const users = await this.client.database.User.find({
                jid: { $in: participants },
                lastfm: { $ne: null }
            }).lean()

            const data = (await Promise.allSettled(users.map(async (u) => {
                const trackInfo = await this.client.lastfm.track.getInfo({
                    artist: currentTrack.artistName,
                    track: currentTrack.trackName
                }, { username: u.lastfm, sk: u.lastfm });
                const { name: username } = await this.client.lastfm.user.getInfo({ user: u.lastfm });
                return { username, plays: trackInfo.userplaycount ?? 0, jid: u.jid };
            }))).sort((a, b) => {
                if (a.status === 'fulfilled' && b.status === 'fulfilled') {
                    return (b.value as any).plays - (a.value as any).plays;
                }
                return 0;
            }).map((r) => r.status === 'fulfilled' ? {
                ...r.value,
                waname: this.client.getContact(r.value.jid).username ?? ''
            } : null).filter((r): r is { username: string, plays: number, jid: string, waname: string } => r !== null && r.plays > 0);

            await M.reply(
                stripIndents`
                *${trackName}* by *${artistName}* in ${M.group!.title}

                ${data
                    .map(
                        (d, i) =>
                            `${i + 1}. ${d.username} ${!d.waname || d.waname === 'user' ? '' : `(${d.waname})`}- ${
                                d.plays
                            } plays`
                    )
                    .join('\n')}

                ${url}
            `,
                'text',
                undefined,
                undefined
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Couldn't find the track`))
        }
    }
}
