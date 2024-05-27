/* eslint-disable @typescript-eslint/no-explicit-any */
import create, {
    WAMessage,
    SocketConfig,
    DisconnectReason,
    MediaType,
    BaileysEventMap,
    downloadContentFromMessage,
    proto,
    makeInMemoryStore
} from '@whiskeysockets/baileys'
import { Chat } from '@whiskeysockets/baileys/lib/Types/Chat'
import Util from '../Helpers/Utils'
import { IClientConfig, IUser, JID } from '../typings/Client'
import Database from './Database'
import chalk from 'chalk'
import Message from './Message'
import EventEmitter from 'events'
import { Boom } from '@hapi/boom'
import { BAILEYS_METHODS } from '../Constants'

import { admins } from '../orion'
import { ContactX } from '../Database'
import LastFM from 'lastfm-typed'

export type DownloadableMessage = Parameters<typeof downloadContentFromMessage>[0]
export type Baileys = ReturnType<typeof create>

export type BailKeys = keyof Baileys
// see what i did there?

export default class Client extends EventEmitter implements Partial<Baileys> {
    public type = 'md' as const

    public qr?: string

    private sock?: Baileys

    public state = 'close'

    public banned = new Map<string, string>()

    public chats = new Array<Chat>()

    public boot = 0

    public bots = new Array<{ jid: string; name: string }>()

    public lastfm = new LastFM(process.env.LASTFM_API_KEY as string, {
        apiSecret: process.env.LASTFM_API_SECRET as string
    })
    constructor(
        public config: IClientConfig,
        public database: Database,
        private sconfig: Partial<SocketConfig> = {},
        public store?: ReturnType<typeof makeInMemoryStore>
    ) {
        super()

        for (const method of BAILEYS_METHODS) {
            this[method] = (() => {
                throw new Error(`${method} cannot be called without connecting`)
            }) as Baileys[typeof method]
        }

        this.on('open', async () => {
            if (!this.sock) return

            this.store?.bind(this.sock.ev)

            this.boot++

            this.sock.ev.on('contacts.update', this.saveContacts as any)

            this.sock.ev.on('chats.upsert', (chats) => {
                console.log('Recieved %d Chats', chats.length)
                this.chats.push(...chats)
            })
            this.sock.ev.on('chats.upsert', (chats) => {
                console.log('Recieved %d Chats', chats.length)
                this.chats.push(...chats)
            })
            for (const group of admins) {
                const { participants } = await this.groupMetadata(group).catch(() => ({ participants: [] }))
                for (const member of participants) {
                    if (member.admin) {
                        console.log(chalk.green('GC MOD:'), chalk.yellow(member.id.replace('@s.whatsapp.net', '')))
                        this.config.mods.push(member.id)
                    }
                }
            }
            await this.database.Session.updateOne(
                { sessionId: this.config.session },
                { $set: { active: true, number: this.user?.id.split('@')[0] ?? '' } }
            )

            const bot = await this.database.Bot.findOne({ name: this.config.session })
            const jid = this.util.sanitizeJid(this.user?.id ?? '')
            if (!bot) await new this.database.Bot({ jid }).save()
            await this.database.Bot.updateOne({ jid }, { $set: { session: this.config.session, active: true } })

            this.config.mods = [...new Set(this.config.mods)]

            for (const { jid, session } of await this.database.Bot.find()) {
                this.bots.push({
                    jid,
                    name: session
                })
            }
        })

        setInterval(() => {
            if (!this.store) return
            for (const id in this.store.messages) {
                this.store.messages[id].clear()
            }
        }, 300000)
    }

    public saveContacts = async (contacts: Partial<ContactX>[]): Promise<void> => {
        if (!this.contacts.has('contacts')) {
            const data = await this.database.getContacts()
            this.contacts.set('contacts', data)
        }
        const data = this.contacts.get('contacts') as ContactX[]
        for (const contact of contacts) {
            if (contact.id) {
                const index = data.findIndex(({ id }) => id === contact.id)
                if (index >= 0) {
                    if (contact.notify !== data[index].notify) data[index].notify = contact.notify
                    continue
                }
                data.push({
                    id: contact.id,
                    notify: contact.notify,
                    status: contact.status,
                    imgUrl: contact.imgUrl,
                    name: contact.name,
                    verifiedName: contact.verifiedName
                })
            }
        }
        this.contacts.set('contacts', data)
        await this.database.Contact.updateOne({ ID: 'contacts' }, { $set: { data } })
    }

    public getContact = (jid: string): IUser => {
        const contact = this.contacts.get('contacts')
        const isMod = this.config.mods.includes(jid)
        const ban = (() => {
            if (this.banned.has(jid))
                return {
                    is: true,
                    reason: this.banned.get(jid) ?? ''
                }
            return { is: false, reason: '' }
        })()
        if (!contact)
            return {
                username: 'User',
                jid,
                isMod,
                ban
            }
        const index = contact.findIndex(({ id }) => id === jid)
        if (index < 0)
            return {
                username: 'User',
                jid,
                isMod,
                ban
            }
        const { notify, verifiedName, name } = contact[index]
        return {
            username: notify || verifiedName || name || 'User',
            jid,
            isMod,
            ban
        }
    }

    private contacts = new Map<'contacts', ContactX[]>()

    public addMod = (jid: string | JID): void => {
        if (this.config.mods.includes(jid)) return
        this.config.mods.push(jid)
    }

    public removeMod = (jid: string): void => {
        this.config.mods = this.config.mods.filter((m) => m !== jid)
    }

    public ban = (jid: string, reason = 'No Reason'): void => {
        this.banned.set(jid, reason)
    }

    public unban = (jid: string): void => {
        this.banned.delete(jid)
    }

    private eventStore = new Map<string | symbol, (...args: any[]) => any>()

    public on = (...args: Parameters<EventEmitter['on']>): this => {
        this.eventStore.set(args[0], args[1])
        this.ev?.on(args[0] as keyof BaileysEventMap, args[1])
        return this
    }

    public emit = (...args: Parameters<EventEmitter['emit']>): boolean => {
        this.ev?.emit(args[0] as keyof BaileysEventMap, args[1])
        return true
    }

    public loadAuth = (auth: SocketConfig['auth']): void => {
        this.sconfig.auth = auth
    }

    public connect = async (): Promise<void> => {
        this.sock = create(this.sconfig as SocketConfig)

        this.eventStore.forEach((value, key) => {
            this.sock?.ev.on(key as unknown as keyof BaileysEventMap, value)
            this.log(`Loaded event ${key.toString()}`)
        })

        this.sock.ev.process((events) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect, qr } = update
                if (qr) {
                    this.qr = qr
                    this.emit('qr', qr)
                }
                if (connection === 'close') {
                    if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut)
                        return void this.connect()
                    process.exit(1)
                }
                //console.log(update)
                if (connection === 'open') return void this.emit('open')
            }

            if (events['messages.upsert']) {
                const { messages } = events['messages.upsert']
                for (const message of messages) {
                    this.emitNewMessage(message)
                }
            }
        })

        for (const key in this.sock) {
            this[key as keyof this] = this.sock[key as keyof Baileys]
        }
    }

    private emitNewMessage = async (M: WAMessage) => {
        this.emit('new.message', await new Message(M, this).build())
    }

    public isMod = (jid: string | JID): boolean => this.config.mods.includes(jid)

    public util = new Util()

    public log = (...args: unknown[]): void => {
        console.log(chalk.blue(new Date().toString()), chalk.green(`[${this.config.session}]`), ...args)
    }

    public downloadMediaMessage = async (M: Message | proto.IMessage): Promise<Buffer> => {
        let msg: DownloadableMessage
        let type: string
        if (M instanceof Message) {
            const { message } = M.raw
            if (!message) throw new Error('Message is not a media message')
            type = M.type
            msg = message[type as keyof typeof message] as DownloadableMessage
        } else {
            type = Object.keys(M)[0] as string
            msg = M[type as keyof typeof M] as DownloadableMessage
        }
        const stream = await downloadContentFromMessage(msg, type.replace('Message', '') as MediaType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    /* Temp Baileys Implementation*/
    public appPatch!: Baileys['appPatch']
    public sendPresenceUpdate!: Baileys['sendPresenceUpdate']
    public presenceSubscribe!: Baileys['presenceSubscribe']
    public profilePictureUrl!: Baileys['profilePictureUrl']
    public onWhatsApp!: Baileys['onWhatsApp']
    public fetchBlocklist!: Baileys['fetchBlocklist']
    public fetchPrivacySettings!: Baileys['fetchPrivacySettings']
    public fetchStatus!: Baileys['fetchStatus']
    public updateProfilePicture!: Baileys['updateProfilePicture']
    public updateBlockStatus!: Baileys['updateBlockStatus']
    public resyncAppState!: Baileys['resyncAppState']
    public chatModify!: Baileys['chatModify']
    public assertSessions!: Baileys['assertSessions']
    public relayMessage!: Baileys['relayMessage']
    public refreshMediaConn!: Baileys['refreshMediaConn']
    public sendMessage!: Baileys['sendMessage']
    public groupMetadata!: Baileys['groupMetadata']
    public groupCreate!: Baileys['groupCreate']
    public groupLeave!: Baileys['groupLeave']
    public groupUpdateSubject!: Baileys['groupUpdateSubject']
    public groupParticipantsUpdate!: Baileys['groupParticipantsUpdate']
    public groupInviteCode!: Baileys['groupInviteCode']
    public groupToggleEphemeral!: Baileys['groupToggleEphemeral']
    public groupSettingUpdate!: Baileys['groupSettingUpdate']
    public ws: Baileys['ws']
    public ev?: Baileys['ev']
    public authState!: Baileys['authState']
    public user!: Baileys['user']
    public generateMessageTag!: Baileys['generateMessageTag']
    public query!: Baileys['query']
    public waitForMessage!: Baileys['waitForMessage']
    public waitForSocketOpen!: Baileys['waitForSocketOpen']
    public sendRawMessage!: Baileys['sendRawMessage']
    public sendNode!: Baileys['sendNode']
    public logout!: Baileys['logout']
    public end!: Baileys['end']
    public waitForConnectionUpdate!: Baileys['waitForConnectionUpdate']
    public groupFetchAllParticipating!: Baileys['groupFetchAllParticipating']
    public sendMessageAck!: Baileys['sendMessageAck']
    public sendRetryRequest!: Baileys['sendRetryRequest']
    public getBusinessProfile!: Baileys['getBusinessProfile']
    public groupUpdateDescription!: Baileys['groupUpdateDescription']
    public groupAcceptInvite!: Baileys['groupAcceptInvite']
    public sendReceipt!: Baileys['sendReceipt']
    public waUploadToServer!: Baileys['waUploadToServer']
    public groupRevokeInvite!: Baileys['groupRevokeInvite']
}
