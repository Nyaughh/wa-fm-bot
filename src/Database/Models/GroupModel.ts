import { getModelForClass, Prop } from '@typegoose/typegoose'
import { Document } from 'mongoose'
import { IRole } from '../../typings/Client'

class Groups {
    @Prop({
        type: String,
        required: true,
        unique: true
    })
    public gid!: string

    @Prop({
        type: [Object],
        default: []
    })
    public roles!: Array<IRole>

    @Prop({
        type: Boolean,
        default: false
    })
    public events!: boolean

    @Prop({
        type: Boolean,
        default: false
    })
    public roleping!: boolean

    @Prop({
        type: Boolean,
        default: false
    })
    public wild!: boolean

    @Prop({
        type: Boolean,
        default: false
    })
    public cards!: boolean

    @Prop({ type: String })
    public bot?: string
}

export type Group = Groups & Document

export const GroupModel = getModelForClass(Groups)
