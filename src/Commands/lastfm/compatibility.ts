import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('fmcompat', {
    aliases: ['fmcompat', 'comp'],
    category: 'LastFM',
    description: {
        content: 'Check the LastFM compatibility between two users based on known artists and tracks.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const args = text.split(' ').filter(arg => arg.trim().length > 0 && !arg.includes('@')).map(arg => arg.trim())
        let user1 = args[0]
        let user2 = args[1]

        if (!user1 && !user2) {
            if (M.mentioned.length === 1) {
                const data1 = await this.client.database.User.findOne({ jid: M.sender.jid })
                if (!data1?.lastfm) return void (await M.reply('You must login to LastFM first.'))
                const data2 = await this.client.database.User.findOne({ jid: M.mentioned[0] })
                if (!data2?.lastfm) return void (await M.reply('The mentioned user must login to LastFM first.'))
                user1 = data1.lastfm
                user2 = data2.lastfm
            } else if (M.mentioned.length === 2) {
                const data1 = await this.client.database.User.findOne({ jid: M.mentioned[0] })
                if (!data1?.lastfm) return void (await M.reply('The first mentioned user must login to LastFM first.'))
                const data2 = await this.client.database.User.findOne({ jid: M.mentioned[1] })
                if (!data2?.lastfm) return void (await M.reply('The second mentioned user must login to LastFM first.'))
                user1 = data1.lastfm
                user2 = data2.lastfm
            }
        }

        if (!user2 && user1) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid })
            if (!data?.lastfm) return void (await M.reply('You must login to LastFM first.'))
            user2 = data.lastfm
        }

        if (!user1 || !user2) {
            return void (await M.reply('You must provide two LastFM usernames or mention two users.'))
        }

        try {
            const [user1Info, user2Info] = await Promise.all([
                this.client.lastfm.user.getInfo({ user: user1 }),
                this.client.lastfm.user.getInfo({ user: user2 })
            ]);

            const [user1TopArtists, user2TopArtists] = await Promise.all([
                this.client.lastfm.user.getTopArtists({ user: user1, limit: 200 }),
                this.client.lastfm.user.getTopArtists({ user: user2, limit: 200 })
            ]);

            const [user1Songs, user2Songs] = await Promise.all([
                this.client.lastfm.user.getTopTracks({ user: user1, limit: 100 }),
                this.client.lastfm.user.getTopTracks({ user: user2, limit: 100 })
            ]);

            let score = 0;

            const user1Artists = user1TopArtists.artists.map(artist => artist.name);
            const user2Artists = user2TopArtists.artists.map(artist => artist.name);
            const commonArtists = user1Artists.filter(artist => user2Artists.includes(artist));

            const user1ArtistScore = (commonArtists.length / user1Artists.length) * 50;
            const user2ArtistScore = (commonArtists.length / user2Artists.length) * 50;

            score += (user1ArtistScore + user2ArtistScore) / 2;

            const user1SongsList = user1Songs.tracks.map(track => track.name);
            const user2SongsList = user2Songs.tracks.map(track => track.name);

            const commonSongs = user1SongsList.filter(song => user2SongsList.includes(song));

            const user1SongScore = (commonSongs.length / user1SongsList.length) * 50;
            const user2SongScore = (commonSongs.length / user2SongsList.length) * 50;

            score += (user1SongScore + user2SongScore) / 2;

            const compatibility = Math.round(score);

            let text = stripIndents`
                *Compatibility between ${user1Info.name} and ${user2Info.name}*

                *Score:* ${compatibility}% (${this.getCompatibility(compatibility)})
            `
            
            if (commonArtists.length > 0) {
                text += `\n\n*Common Artists:* ${commonArtists.slice(0, 5).join(', ')} ${commonArtists.length > 5 ? `(${commonArtists.length - 5} more)` : ''}\n`
            }

            if (commonSongs.length > 0) {
                text += `\n*Common Songs:* ${commonSongs.slice(0, 5).join(', ')} ${commonSongs.length > 5 ? `(${commonSongs.length - 5} more)` : ''}`
            }

            await M.reply(text);

        } catch (e) {
            console.log(e);
            return void (await M.reply(`Couldn't fetch compatibility information. Please try again later.`));
        }
    }

    private getCompatibility = (percentage: number): string => {
        if (percentage >= 90) return 'Outstanding'
        if (percentage >= 70) return 'Excellent'
        if (percentage >= 50) return 'Good'
        if (percentage >= 30) return 'Fair'
        return 'Low'
    }
}
