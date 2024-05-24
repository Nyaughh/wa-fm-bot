import { GroupMetadata } from '@whiskeysockets/baileys'
import { GID } from '../typings/Client'
import { IGroup } from '../typings/Message'
import Client from './Client'

export default class Group implements IGroup {
    title = ''

    participants = new Array<string>()

    admins = new Array<string>()

    constructor(private gid: GID | string, public client: Client) {}

    public build: () => Promise<Group> = async (): Promise<this> => {
        this.metadata = await this.client.groupMetadata(this.gid)
        this.title = this.metadata.subject
        for (const { id, admin } of this.metadata.participants) {
            if (['admin', 'superadmin'].includes(admin ?? 'n')) this.admins.push(id)
            this.participants.push(id)
        }
        return this
    }

    metadata!: GroupMetadata
}
