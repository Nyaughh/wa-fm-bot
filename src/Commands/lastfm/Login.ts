import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { v4 } from 'uuid'
@Command('login', {
    aliases: ['l'],
    dm: true,
    category: 'Core',
    description: {
        content: 'Login to your lastfm account.'
    }
})
export default class extends BaseCommand {
    private currentlyLoggingIn: Set<string> = new Set()

    override execute = async (M: Message): Promise<void> => {
        const has = await this.client.database.LastFM.findOne({ jid: M.sender.jid })
        const lastfmCreds = await this.client.database.LastFM.findOne({ jid: M.sender.jid })
        if (lastfmCreds && lastfmCreds.lastFmToken && lastfmCreds.lastFmSessionKey) {
           if (!has) return void await M.reply('You are already logged in.')
            return void await M.reply('You\'ve successfully logged in.')
        }

        this.currentlyLoggingIn.add(M.sender.jid)
        const uniqueId = v4()

        if (lastfmCreds) {
            await lastfmCreds.deleteOne({ uniqueId })
        }
        await this.client.database.LastFM.create({
            jid: M.sender.jid,
            uniqueId,
            lastFmToken: '',
            lastFmSessionKey: ''
        })
        
        return void await M.reply(`Please visit this link and use this command again: ${getUrl(uniqueId)}`)
        
    }
}

const getUrl = (uniqueId: string) => `https://login-fm.vercel.app/api/login/${uniqueId}`