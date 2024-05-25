import { Connection } from 'mongoose'
import {
    UserModel,
    GroupModel,
    User,
    Group,
    connect,
    SessionModel,
    TSessionDocument,
    ContactModel,
    ContactX,
    LastFMModel
} from '../Database'
import BotModel from '../Database/Models/BotModel'

export default class Database {
    private readonly DB = {
        user: UserModel,
        group: GroupModel,
        session: SessionModel,
        bot: BotModel,
        contact: ContactModel,
        lastfm: LastFMModel
    } as const

    public get Bot() {
        return this.DB.bot
    }

    public get LastFM() {
        return this.DB.lastfm
    }

    public connection?: Connection

    constructor(public url: string) {}

    public connect = async (): Promise<void> => {
        this.connection = await connect(this.url)
    }

    public get connected(): boolean {
        return this.connection?.readyState === 1
    }

    public get Session(): typeof SessionModel {
        return this.DB.session
    }

    public get User(): typeof UserModel {
        return this.DB.user
    }

    public get Group(): typeof GroupModel {
        return this.DB.group
    }

    public get Contact(): typeof ContactModel {
        return this.DB.contact
    }

    public getContacts = async (): Promise<ContactX[]> => {
        let result = await this.DB.contact.findOne({ ID: 'contacts' })
        if (!result) result = await new this.DB.contact({ ID: 'contacts' }).save()
        return result.data
    }

    public getSession = async (sessionId: string): Promise<TSessionDocument | null> =>
        await this.DB.session.findOne({ sessionId })

    public saveNewSession = async (sessionId: string): Promise<void> => {
        await new this.DB.session({ sessionId }).save()
    }

    public updateSession = async (sessionId: string, session: string): Promise<void> => {
        await this.DB.session.updateOne({ sessionId }, { $set: { session } })
    }

    public removeSession = async (sessionId: string): Promise<void> => {
        await this.DB.session.deleteOne({ sessionId })
    }

    public getUser = async (jid: string, fields?: string) => {
        const user = await this.User.findOne({ jid }).select(fields).lean()
        if (user) return user
        return await new this.DB.user({ jid }).save()
    }

    public getGroup = async (gid: string, fields?: string): Promise<Group> => {
        const group = await this.Group.findOne({ gid }).select(fields)
        if (group) return group
        return await new this.DB.group({ gid }).save()
    }

    public removeUser = async (jid: string): Promise<void> => {
        await this.User.deleteOne({ jid })
    }

    public removeGroup = async (gid: string): Promise<void> => {
        await this.Group.deleteOne({ gid })
    }

    public updateGroup = async (gid: string, data: Partial<Group>): Promise<Group> => {
        const group = await this.getGroup(gid)
        return await group.update(data)
    }

    public getAllUsers = async (fields?: string): Promise<User[]> => {
        return await this.User.find({}, fields).lean()
    }

    public getAllGroups = async (fields?: string): Promise<Group[]> => {
        return await this.Group.find({}, fields)
    }

    public banUser = async (jid: string, reason: string): Promise<void> => {
        const user = await this.getUser(jid)
        if (!user) await new this.DB.user({ jid }).save()
        await this.User.updateOne({ jid }, { $set: { banned: true, banReason: reason } })
    }

    public unbanUser = async (jid: string): Promise<void> => {
        const user = await this.getUser(jid)
        if (!user) await new this.DB.user({ jid }).save()
        await this.User.updateOne({ jid }, { $set: { banned: false, banReason: '' } })
    }
}
