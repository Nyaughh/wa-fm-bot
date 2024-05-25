import { getModelForClass, Prop as prop } from '@typegoose/typegoose'
import { Document } from 'mongoose'

class Users {
    @prop({ type: String, unique: true })
    jid!: string

    @prop({ type: String })
    name?: string

    @prop({ type: String })
    lastfm?: string
}

export type User = Users & Document

export const UserModel = getModelForClass(Users)
