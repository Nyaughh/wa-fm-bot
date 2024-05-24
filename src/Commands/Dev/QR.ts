import { fetchLatestBaileysVersion } from '@adiwajshing/baileys'
import { AuthenticationFromDatabase } from '../../Structures/Authentication'
import Client from '../../Structures/Client'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import P from 'pino'
import { imageSync } from 'qr-image'

@Command('qr', {
    aliases: [],
    category: 'Dev',
    mod: true,
    description: {
        content: 'SCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const sessionId = text.trim()
        const session = await this.client.database.Session.findOne({ sessionId })
        if (session) return void (await M.reply(`🟥 Session is currently in use`))
        let connected = false
        const { version } = await fetchLatestBaileysVersion()

        const { useDatabaseAuth } = new AuthenticationFromDatabase(sessionId, this.client.database)

        const { state, saveState } = await useDatabaseAuth()
        const conn = new Client(
            {
                ...this.client.config,
                session: sessionId
            },
            this.client.database,
            {
                version,
                logger: P({
                    version,
                    level: 'silent'
                }),
                auth: state,
                getMessage: async () => {
                    return {
                        conversation: ''
                    }
                }
            }
        )

        conn.on('open', async () => {
            connected = true
            await M.reply(
                `🟩 *Connected* 🟩\n\n🧧 *As:* ${
                    conn.user?.notify || conn.user?.id.split('@')[0]
                }\n⚡ *Session:* ${sessionId}`
            )
            conn.end(undefined)
        })

        conn.on('creds.update', saveState)

        conn.on('qr', (data) => {
            M.reply(imageSync(data), 'image', 'image/png', `❗ SCAN TO PROCEED ❗\n\n🍀 *Session: ${sessionId}*`)
        })
        setTimeout(() => {
            if (!connected) {
                conn.end(undefined)
                return void M.reply('🟥 Session Ended!')
            }
        }, 120000)
        conn.connect()
    }
}
