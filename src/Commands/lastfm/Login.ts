import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
@Command('login', {
    aliases: ['l'],
    category: 'LastFM',
    description: {
        content:  stripIndents`
        Login process:
        
        - You'll be given a link asking you to authorise, when you use /login.
        - Make a last.fm account if you don't already have one, and authorise.
        - Once you're done authorising, write 'Finish'.
        - You should see a confirmation message saying 'Successfully logged in as username'
        
        Tracking Process:
        
        - If you use Spotify, connect your Spotify account by https://www.last.fm/settings/applications.
        - If you use YouTube, download Pano Scrobbler https://play.google.com/store/apps/details?id=com.arn.scrobble.`
        
    }
})
export default class extends BaseCommand {
    private currentlyLoggingIn: Map<
        string,
        {
            token: string
        }
    > = new Map()

    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()

        if (user?.lastfm) return void (await M.reply(`You're already logged in.`))
        const has = this.currentlyLoggingIn.has(M.sender.jid)
        if (text === 'done') {
            if (!has) return void (await M.reply(`You're not currently logging in.`))
            const session = await this.client.lastfm.auth.getSession(this.currentlyLoggingIn.get(M.sender.jid)!.token)
            console.log(session)
            if (!session.key) {
                await M.reply(`Failed to login to LastFM. Please try again.`)
                this.currentlyLoggingIn.delete(M.sender.jid)
                return
            }
            await M.reply(`Successfully logged in as ${session.name}`)
            await this.client.database.User.updateOne({ jid: M.sender.jid }, { lastfm: session.key })
            this.currentlyLoggingIn.delete(M.sender.jid)
            return
        }

        if (text === 'cancel') {
            if (!has) return void (await M.reply(`You're not currently logging in.`))
            await M.reply(`Cancelled the login process.`)
            this.currentlyLoggingIn.delete(M.sender.jid)
            return
        }

        const token = await this.client.lastfm.auth.getToken()
        this.currentlyLoggingIn.set(M.sender.jid, { token })

        const loginMessage = stripIndents`
            Authenticate with LastFM using this link:
            
            ${getUrl(token)}

            After authorizing, send "/login done" to complete the process.
        `

        if (!M.group) {
            await M.reply(loginMessage)
        } else {
            await this.client.sendMessage(M.sender.jid, { text: loginMessage })
            await M.reply('I\'ve sent the login link to your DM.')
        }
    }
}

const getUrl = (token: string) => `https://www.last.fm/api/auth?api_key=${process.env.LASTFM_API_KEY}&token=${token}`
