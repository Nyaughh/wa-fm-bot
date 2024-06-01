import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('fmcompat', {
    aliases: ['fmcompat', 'comp'],
    category: 'LastFM',
    description: {
        content: 'Check the LastFM compatibility between two users based on known artists'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const args = text.split(' ').filter(arg => arg.trim().length > 0 && !arg.includes('@')).map(arg => arg.trim())
        let user1 = args[0]
        let user2 = args[1]

        if (!user1 && !user2) {
            if (M.mentioned.length === 1) {
                const data1 = await this.client.database.User.findOne( { jid: M.sender.jid })
                if (!data1?.lastfm) return void (await M.reply('You must login to LastFM first.'))
                const data2 = await this.client.database.User.findOne({ jid: M.mentioned[0] } )
                if (!data2?.lastfm) return void (await M.reply('The mentioned user must login to LastFM first.'))
                user1 = data1.lastfm
                user2 = data2.lastfm
            } else if (M.mentioned.length === 2) {
                const data1 = await this.client.database.User.findOne( { jid: M.mentioned[0] } )
                if (!data1?.lastfm) return void (await M.reply('The first mentioned user must login to LastFM first.'))
                const data2 = await this.client.database.User.findOne( { jid: M.mentioned[1] } )
                if (!data2?.lastfm) return void (await M.reply('The second mentioned user must login to LastFM first.'))
                user1 = data1.lastfm
                user2 = data2.lastfm
            }
        }

        if (!user2 && user1) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid } )
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
                this.client.lastfm.user.getTopArtists({ user: user1, limit: 100 }),
                this.client.lastfm.user.getTopArtists({ user: user2, limit: 100 })
            ]);

            const knownArtistThreshold = 10; // Adjust as needed
            const user1KnownArtists = user1TopArtists.artists.filter(artist => artist.playcount > knownArtistThreshold);
            const user2KnownArtists = user2TopArtists.artists.filter(artist => artist.playcount > knownArtistThreshold);

            const commonArtists = user1KnownArtists.filter(artist1 =>
                user2KnownArtists.some(artist2 => artist1.name === artist2.name)
            );

            const compatibilityScore = Math.min(commonArtists.length, 10) * 10; // Max score: 100

            let compatibilityRating = '';
            if (compatibilityScore >= 80) {
                compatibilityRating = 'Outstanding';
            } else if (compatibilityScore >= 60) {
                compatibilityRating = 'Super';
            } else if (compatibilityScore >= 40) {
                compatibilityRating = 'Good';
            } else {
                compatibilityRating = 'Fair';
            }

            await M.reply(
                stripIndents`
                    Compatibility between ${user1Info.name} and ${user2Info.name} based on known artists:
                    Compatibility score: ${compatibilityScore}%
                    Rating: ${compatibilityRating}
                    Common known artists: ${commonArtists.map(artist => artist.name).join(', ') || 'None'}
                `
            );
        } catch (e) {
            console.log(e);
            return void (await M.reply(`Couldn't fetch compatibility information.`));
        }
    }
}
