import Client from './Structures/Client'
import getConfig from './getConfig'
import Database from './Structures/Database'
import { MessageHandler } from './Handlers/MessageHandler'
import { join } from 'path'
import P from 'pino'
import { fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import Message from './Structures/Message'
import { EventHandler } from './Handlers/EventHandler'
import { AuthenticationFromDatabase } from './Structures/Authentication'
;import { updateProfilePicture } from './jobs/pfp'
import cron from 'node-cron'
(async () => {
    if (!process.env.MONGO_URI) {
        console.error('No MONGO_URI found!')
        process.exit(1)
    }

    const database = new Database(process.env.MONGO_URI)
    await database.connect()
    const config = getConfig()
    console.log('Connected to database!')
    const { version } = await fetchLatestBaileysVersion()

    const { useDatabaseAuth } = new AuthenticationFromDatabase(config.session, database)

    const { state, saveState } = await useDatabaseAuth()

    const client = new Client(config, database, {
        version,
        printQRInTerminal: true,
        logger: P({
            version,
            level: 'fatal'
        }),
        generateHighQualityLinkPreview: true,
        auth: state,
        getMessage: async () => {
            return {
                conversation: ''
            }
        }
    })

    await client.connect()

    process.on('exit', async (z) => {
        console.log(z)
        console.log('Exiting...')
        const jid = client.util.sanitizeJid(client.user?.id ?? '')
        await client.database.Bot.updateOne({ jid }, { $set: { session: client.config.session, active: false } })
    })

    client.on('creds.update', saveState)
    const messageHandler = new MessageHandler(join(__dirname, 'Commands'), client)
    messageHandler.loadCommands()

    console.log('Loaded bans!')

    const eventHandler = new EventHandler(client)

    eventHandler.load()

    client.on('new.message', (M: Message) => {
        messageHandler.handle(M)
    })

    client.log('<- Mods ->')
    client.config.mods.forEach((m) => client.log('❯', client.getContact(m).username))
    client.log('> Bans:', client.banned.size)

    cron.schedule('*/30 * * * *', () => {
        console.log('Running profile picture update task...')
        updateProfilePicture(client).catch(console.error)
})

})()
