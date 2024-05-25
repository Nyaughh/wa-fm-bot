/*
export interface lastFM extends Document {
  jid: string;
  uniqueId: string;
  lastFmToken?: string;
  lastFmSessionKey?: string;
}
 */

import { getModelForClass, prop } from '@typegoose/typegoose'
import { Document } from 'mongoose'

export class LastFM {
    @prop({ type: String, required: true, unique: true })
    public jid!: string

    @prop({ type: String })
    public uniqueId?: string

    @prop({ type: String })
    public lastFmToken?: string

    @prop({ type: String })
    public lastFmSessionKey?: string
}

export type TLastFMDocument = LastFM & Document

export const LastFMModel = getModelForClass(LastFM)
