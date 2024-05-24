import { prop, getModelForClass } from '@typegoose/typegoose'

// prettier-ignore
class Bots {
    @prop({ type: String })
    session!: string

    @prop({ type: String })
    jid!: string

    @prop({ type: Boolean, default: false })
    active!: boolean
}

export default getModelForClass(Bots)
