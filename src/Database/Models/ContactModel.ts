import { prop, getModelForClass } from '@typegoose/typegoose'
import { Document } from 'mongoose'

export type ContactX = {
    id: string
    notify?: string
    name?: string
    verifiedName?: string
    status?: string
    imgUrl?: string
}

export class Contact {
    @prop({ type: String, required: true, unique: true })
    public ID!: string

    @prop({ type: [Object], required: true, default: [] })
    public data!: ContactX[]
}

export type TContactModel = Contact & Document

export const ContactModel = getModelForClass(Contact)
