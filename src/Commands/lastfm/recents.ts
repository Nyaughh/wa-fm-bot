import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('recents', {
    aliases: ['r'],
    category: 'LastFM',
    description: {
        content: 'LastFM User recent songs'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let user = text.trim()
        if (M.mentioned.length > 0) {
            const data = await this.client.database.User.findOne({ jid: M.mentioned[0] }).lean()
            if (!data?.lastfm)
                return void (await M.reply('The mentioned user has not logged in to their lastfm account.'))
            user = data.lastfm
        }
        if (!user) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
            if (!data?.lastfm)
                return void (await M.reply(
                    'Please provide a username or login to your lastfm account using `login` command.'
                ))
            user = data.lastfm
        }

        try {
            const recent = await this.client.lastfm.user.getRecentTracks({ user: user })

            await M.reply(
                stripIndents`
             
                Recent Tracks:
                ${recent.tracks.map((track, index) => `${index + 1}. ${track.name} - ${track.artist.name}`).join('\n')}
                
   

                `
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply(`Invalid Username`))
        }
    }
}
