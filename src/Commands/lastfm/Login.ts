import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { v4 } from 'uuid'
import { IParsedArgs } from '../../typings/Command'
import { stripIndent } from 'common-tags'
@Command('login', {
    aliases: ['l'],
    dm: true,
    category: 'lastfm',
    description: {
        content: 'Login to your lastfm account.'
    }
})
export default class extends BaseCommand {
    private currentlyLoggingIn: Map<
        string,
        {
            token: string
        }
    > = new Map()

    override execute = async (M: Message, { flags }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()

        if (user?.lastfm) return void (await M.reply(`You're already logged in.`))
        const has = this.currentlyLoggingIn.has(M.sender.jid)
        if ('done' in flags) {
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

        if ('cancel' in flags) {
            if (!has) return void (await M.reply(`You're not currently logging in.`))
            await M.reply(`Cancelled the login process.`)
            this.currentlyLoggingIn.delete(M.sender.jid)
            return
        }

        const token = await this.client.lastfm.auth.getToken()
        this.currentlyLoggingIn.set(M.sender.jid, { token })
        await M.replyWithButtons(
            stripIndent`
                Authenticate with LastFM using this link
                
                https://www.last.fm/api/auth?api_key=${process.env.LASTFM_API_KEY}&token=${token}

                Use the listed actions to continue.
            `,
            'text',
            undefined,
            getUrl(token),
            undefined,
            undefined,
            {
                buttonText: 'Actions',
                sections: [
                    {
                        title: 'Continue Authentication',
                        rows: [
                            {
                                title: 'Finish',
                                id: `${this.client.config.prefix}login --done`
                            },
                            {
                                title: 'Cancel',
                                id: `${this.client.config.prefix}login --cancel`
                            }
                        ]
                    }
                ]
            }
        )
    }
}

const getUrl = (token: string) => `https://www.last.fm/api/auth?api_key=${process.env.LASTFM_API_KEY}&token=${token}`
