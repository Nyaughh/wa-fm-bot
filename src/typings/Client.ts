/** Whatsapp User ID */
export type JID = `${string}@s.whatsapp.net`

/** Whatsapp Group ID */
export type GID = `${string}-${string}@g.us`

export interface IClientConfig {
    /**
     * The session of the bot.
     * @type {string}
     * @memberof IConfig
     */
    session: string

    /**
     * The Prefix of the bot.
     * @type {string}
     * @memberof IConfig
     * @default '!'
     */
    prefix: string

    /**
     * The token of the bot.
     * @type {string}
     * @memberof IConfig
     * @default []
     */
    mods: (JID | string)[]

    /**
     * Mod group chat
     * @type {string}
     * @memberof IConfig
     */
    mod_group?: string
}

export interface ISession {
    clientID: string
    serverToken: string
    clientToken: string
    encKey: string
    macKey: string
}

export interface IUser {
    username: string
    jid: string
    isMod: boolean
    ban: {
        is: boolean
        reason: string
    }
}

export interface IRole {
    name: string
    members: (JID | string)[]
}
