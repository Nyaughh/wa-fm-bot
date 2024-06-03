import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('fmall', {
    aliases: ['fmsll'],
    category: 'LastFM',
    description: {
        content: 'LastFM User current songs'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const participants = M.group!.participants.map((p) => p);

        const users = await this.client.database.User.find({
            jid: { $in: participants },
            lastfm: { $ne: null }
        }).lean();

        const data = await Promise.allSettled(users.map(async (u) => {
            const userInfo = await this.client.lastfm.user.getInfo({ user: u.lastfm });
            const { tracks } = await this.client.lastfm.user.getRecentTracks({ user: u.lastfm, limit: 1 });
            if (!tracks.length) return;
            const mostRecentTrack = tracks[0];
            const contact = this.client.getContact(u.jid);
            const waname = contact.username ?? '';

            return {
                username: userInfo.name,
                trackName: mostRecentTrack.name,
                artistName: mostRecentTrack.artist.name,
                nowPlaying: mostRecentTrack.nowplaying ?? false,
                jid: u.jid,
                waname
            };
        }));

        const filteredData = data
            .filter((r): r is PromiseFulfilledResult<{ username: string, trackName: string, artistName: string, nowPlaying: boolean, jid: string, waname: string }| undefined> => r.status === 'fulfilled')
            .filter((r): r is PromiseFulfilledResult<{ username: string, trackName: string, artistName: string, nowPlaying: boolean, jid: string, waname: string }> => r.value !== undefined)
            .map((r) => r.value)
            .filter((r) => r.trackName && r.artistName);

        const nowListening = filteredData.filter(d => d.nowPlaying);
        const lastListened = filteredData.filter(d => !d.nowPlaying);

        const nowListeningResponse = nowListening.map((d, i) => 
            `${i + 1}. ${d.username} ${!d.waname || (d.waname === 'User') ? '' : `(${d.waname})`} - ${d.trackName} - ${d.artistName}\n`
        ).join('\n');

        const lastListenedResponse = lastListened.map((d, i) => 
            `${i + 1}. ${d.username} ${!d.waname || (d.waname === 'User') ? '' : `(${d.waname})`} - ${d.trackName} - ${d.artistName}\n`
        ).join('\n');

        const response = stripIndents`
            Current songs of LastFM users in ${M.group!.title}:

            Now Listening:\n
            ${nowListeningResponse}

            Last Listened:\n
            ${lastListenedResponse}
        `;

        await M.reply(response, 'text', undefined, undefined);
    }
}
