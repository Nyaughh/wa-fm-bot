import {
    AnyMessageContent,
    MessageType,
    WAMessage,
    MiscMessageGenerationOptions,
    proto,
    generateWAMessageContent,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys'
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
            if (this.M.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
                const json = JSON.parse(this.M.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
                if (json.id) return json.id
            }
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

    generateWaContent = async (content: string | Buffer, type: unknown) =>
        await generateWAMessageContent(
            { [type as 'text']: content as string },
            {
                upload: this.client.waUploadToServer
            }
        )

    replyWithButtons = async (
        content: string | Buffer,
        type: 'text' | 'image' | 'video' | 'document',
        button?: [string, string][],
        caption?: string,
        urls?: [string, string][],
        copy?: string,
        options: {
            mentions?: string[]
            sections?: any[]
            buttonText?: string
            headerText?: string
            footerText?: string
        } = {}
    ) => {
        // Validate that a buffer is not sent as a text message
        if (type === 'text' && Buffer.isBuffer(content)) {
            throw new Error('Cannot send a Buffer as a text message')
        }

        // Helper function to generate button objects
        const generateButton = (type: string, params: object) => ({
            name: type,
            buttonParamsJson: JSON.stringify(params)
        })

        // Initialize buttons array
        let buttons: {
            name: string
            buttonParamsJson: string
        }[] = []

        if (button) {
            buttons = button.map(([displayText, id]) =>
                generateButton('quick_reply', { display_text: displayText, id: this.client.config.prefix + id })
            )
        }
        if (copy) {
            buttons.push(generateButton('cta_copy', { display_text: 'Copy', copy_code: copy }))
        }
        if (urls) {
            urls.forEach(([displayText, url]) =>
                buttons.push(generateButton('cta_url', { display_text: displayText, url, merchant_url: url }))
            )
        }

        // Generate media content if type is not text
        const media = type === 'text' ? '' : await this.generateWaContent(content, type)
        const contentType = type + 'Message'

        // Construct the interactive message structure
        const interactiveMessage = {
            body: { text: type === 'text' ? (content as string) : caption },
            footer: { text: options.sections?.length && options.footerText ? options.footerText : '' },
            header: media
                ? {
                      hasMediaAttachment: false,
                      [contentType]: media[contentType as 'imageMessage' | 'videoMessage' | 'documentMessage']
                  }
                : { title: options.sections?.length && options.headerText ? options.headerText : '' },
            contextInfo: { mentionedJid: options.mentions },
            nativeFlowMessage: {
                buttons: options.sections?.length
                    ? [
                          {
                              name: 'single_select',
                              buttonParamsJson: JSON.stringify({
                                  title: options.buttonText,
                                  sections: options.sections
                              })
                          }
                      ]
                    : buttons,
                messageParamsJson: ''
            }
        }

        // Generate the WA message from content
        const { message, key } = generateWAMessageFromContent(
            this.from,
            {
                viewOnceMessage: { message: { interactiveMessage: interactiveMessage } }
            },
            { quoted: this.M } as any
        )

        // Relay the message
        return this.client.relayMessage(this.from, message!, { messageId: key.id! })
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
