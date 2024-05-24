import { AnyMessageContent, MessageType, WAMessage, MiscMessageGenerationOptions, proto } from '@whiskeysockets/baileys'
import { GID, IUser, JID } from '../typings/Client'
import Client from './Client'
import Group from './Group'

class Message {
    public supportedMediaMessages = new Array<MessageType>('imageMessage', 'videoMessage')

    public content: string

    public group?: Group

    public mentioned = new Array<string>()

    public sender: IUser

    public quoted?: {
        sender: IUser
        message: proto.IMessage
        react: (emoji: string) => Promise<void>
    }

    public urls = new Array<string>()

    public isAdminMessage = false

    constructor(private M: WAMessage, private client: Client) {
        this.sender = this.client.getContact(this.chat === 'dm' ? this.from : (this.M.key.participant as string))
        if (M.pushName) this.sender.username = M.pushName
        if (M.message?.ephemeralMessage) this.M.message = M.message.ephemeralMessage.message
        const { type } = this
        this.content = ((): string => {
            if (this.M.message?.buttonsResponseMessage)
                return this.M.message?.buttonsResponseMessage?.selectedButtonId || ''
            if (this.M.message?.listResponseMessage)
                return this.M.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ''
            return this.M.message?.conversation
                ? this.M.message.conversation
                : this.supportedMediaMessages.includes(type)
                ? this.supportedMediaMessages
                      .map((type) => this.M.message?.[type as 'imageMessage' | 'videoMessage']?.caption)
                      .filter((caption) => caption)[0] || ''
                : this.M.message?.extendedTextMessage?.text
                ? this.M.message?.extendedTextMessage.text
                : ''
        })()
        const array =
            (M?.message?.[type as 'extendedTextMessage']?.contextInfo?.mentionedJid
                ? M?.message[type as 'extendedTextMessage']?.contextInfo?.mentionedJid
                : []) || []

        array.filter(this.client.util.isTruthy).forEach((jid) => this.mentioned.push(jid))

        if (this.M.message?.[type as 'extendedTextMessage']?.contextInfo?.quotedMessage) {
            const { quotedMessage, participant } = this.M.message?.[type as 'extendedTextMessage']?.contextInfo ?? {}
            if (quotedMessage && participant) {
                const { message, stanzaId } = JSON.parse(JSON.stringify(M).replace('quotedM', 'm')).message?.[
                    type as 'extendedTextMessage'
                ].contextInfo
                message.key = {
                    remoteJid: M.key.remoteJid,
                    fromMe: false,
                    participant: participant,
                    id: stanzaId
                }
                this.quoted = {
                    sender: this.client.getContact(participant) ?? { username: '', jid: participant, isMod: false },
                    message,
                    react: async (emoji) => {
                        this.client.relayMessage(
                            this.from,
                            {
                                reactionMessage: {
                                    key: message.key,
                                    text: emoji,
                                    senderTimestampMs: Math.round(Date.now() / 1000)
                                }
                            },
                            {
                                messageId: this.client.generateMessageTag()
                            }
                        )
                    }
                }
            }
        }
    }

    public build: () => Promise<this> = async (): Promise<this> => {
        this.client.util.getUrls(this.content).forEach((url) => this.urls.push(url))
        if (this.chat === 'dm') return this
        this.group = await new Group(this.from, this.client).build()
        if (this.group.admins.includes(this.sender.jid)) this.isAdminMessage = true
        return this
    }

    get raw(): WAMessage {
        return this.M
    }

    get chat(): 'group' | 'dm' {
        return this.from.endsWith('g.us') ? 'group' : 'dm'
    }

    get from(): JID | GID | string {
        return this.M.key.remoteJid as string
    }

    get type(): MessageType {
        return Object.keys(this.M.message || 0)[0] as MessageType
    }

    public reply = async (
        content: string | Buffer,
        type: 'text' | 'image' | 'audio' | 'video' | 'sticker' = 'text',
        mimetype?: string,
        caption?: string,
        mentions?: string[],
        options: MiscMessageGenerationOptions = {}
    ): ReturnType<typeof this.client.sendMessage> => {
        options.quoted = this.M
        if (type === 'text' && Buffer.isBuffer(content)) throw new Error('Cannot send a Buffer as a text message')
        return this.client.sendMessage(
            this.from,
            {
                [type]: content,
                mimetype,
                mentions,
                caption
            } as unknown as AnyMessageContent,
            options
        )
    }

    public replyWithButtons = async (
        text: string,
        button: string[],
        media?: {
            type: string
            content: Buffer
        }
    ): ReturnType<typeof this.client.sendMessage> => {
        const rest = media ? { [media.type]: media.content } : {}
        const buttons = button.map((displayText) => ({
            type: 1,
            buttonId: 'ETHEREAL-BUTTON-'.concat(this.client.util.getRandomString(10)),
            buttonText: {
                displayText
            }
        }))
        return this.client.sendMessage(
            this.from,
            {
                text,
                buttons,
                ...rest
            },
            {
                quoted: this.M
            }
        )
    }

    public replyRaw = async (
        msg: Parameters<typeof this.client.sendMessage>[1]
    ): ReturnType<typeof this.client.sendMessage> => {
        return this.client.sendMessage(this.from, msg, { quoted: this.M })
    }

    public react = async (emoji: string): Promise<void> => {
        await this.client.sendMessage(this.from, {
            react: {
                key: this.M.key,
                text: emoji
            }
        })
    }
}

export default Message
export { WAMessage }
