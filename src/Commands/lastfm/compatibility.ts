import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('fmcompat', {
    aliases: ['fmcompat', 'compat'],
    category: 'LastFM',
    description: {
        content: 'Check the LastFM compatibility between two users'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const args = text.split(' ').filter(arg => arg.trim().length > 0 && !arg.includes('@')).map(arg => arg.trim())
        console.log(args)
        let user1 = args[0]
        let user2 = args[1]

        if (!user1 && !user2) {
            console.log(M.mentioned)
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


        // try
        console.log(user1, user2)

        if (!user1 || !user2) {
            return void (await M.reply('You must provide two LastFM usernames or mention two users.'))
        }
    


        try {
            const [user1Info, user2Info] = await Promise.all([
                this.client.lastfm.user.getInfo(user1),
                this.client.lastfm.user.getInfo(user2)
            ])

            const [user1TopArtists, user2TopArtists] = await Promise.all([
                this.client.lastfm.user.getTopArtists({ user: user1, limit: 50 }),
                this.client.lastfm.user.getTopArtists({ user: user2, limit: 50 })
            ])

            const user1Artists = user1TopArtists.artists.map(artist => artist.name)
            const user2Artists = user2TopArtists.artists.map(artist => artist.name)

            const commonArtists = user1Artists.filter(artist => user2Artists.includes(artist))
            const compatibilityScore = (commonArtists.length / Math.min(user1Artists.length, user2Artists.length)) * 100

            await M.reply(
                stripIndents`
                    Compatibility between ${user1Info.name} and ${user2Info.name}:
                    ${compatibilityScore.toFixed(2)}%
                    Common artists: ${commonArtists.join(', ') || 'None'}
                ` // watccing, try
            
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Couldn't fetch compatibility information.`))
        }
    }
}
// ???????????????????????????????????????????????????????????????????????