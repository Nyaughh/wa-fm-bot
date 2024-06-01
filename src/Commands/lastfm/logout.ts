import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'

@Command('logout', {
    aliases: ['lout'],
    dm: true,
    category: 'LastFM',
    description: {
        content: 'Logout from your lastfm account.'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
        if (!user?.lastfm) return void (await M.reply(`You're not logged in.`))
        await M.reply(`Successfully logged out.`)
        await this.client.database.User.updateOne({ jid: M.sender.jid }, { lastfm: null })
    }
}
