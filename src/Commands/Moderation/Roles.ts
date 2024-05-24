import { stripIndents } from 'common-tags'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IRole } from '../../typings/Client'
import { IParsedArgs } from '../../typings/Command'

@Command('roles', {
    aliases: [],
    category: 'Moderation',
    group: true,
    description: {
        content: 'Role Management'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { flags }: IParsedArgs): Promise<void> => {
        const { roles } = await this.client.database.getGroup(M.from, 'roles')
        if (flags.create) {
            if (!M.isAdminMessage) return void (await M.reply('🟥 *You must be an admin to create a role*'))
            if (flags.create.length < 3 || flags.create.length > 20)
                return void (await M.reply('🟥 *Role name must be between 3 and 20 characters long*'))
            if (roles.find(({ name }) => name === flags.create)) return void (await M.reply('🟥 *Role already exists*'))
            const role: IRole = {
                name: flags.create,
                members: M.mentioned
            }
            await this.client.database.Group.updateOne({ gid: M.from }, { $push: { roles: role } })
            return void (await this.client.sendMessage(M.from, {
                title: `*${M.group?.metadata.subject} Roles Creation*`,
                text: `🟩 *Role ${role.name} created*`,
                sections: [
                    {
                        title: `${role.name}`,
                        rows: [
                            {
                                title: `Join Role`,
                                rowId: `${this.client.config.prefix}roles --join=${role.name}`
                            },
                            {
                                title: `Leave Role`,
                                rowId: `${this.client.config.prefix}roles --leave=${role.name}`
                            }
                        ]
                    }
                ],
                buttonText: 'View Role',
                footer: `Gaia © ${new Date().getFullYear()}`
            }))
        }
        if (flags.join) {
            const role = roles.find((r) => r.name === flags.join)
            if (!role) return void (await M.reply('🟥 *Role not found*'))
            if (role.members.includes(M.sender.jid)) return void (await M.reply('🟥 *You already have this role*'))
            role.members.push(M.sender.jid)
            await this.client.database.Group.updateOne({ gid: M.from }, { $set: { roles } })
            return void (await M.reply(`🟩 *You have been added to Role "${role.name}"*`))
        }

        if (flags.leave) {
            const role = roles.find((r) => r.name === flags.leave)
            if (!role) return void (await M.reply('🟥 *Role not found*'))
            if (!role.members.includes(M.sender.jid)) return void (await M.reply('🟥 *You do not have this role*'))
            role.members.splice(role.members.indexOf(M.sender.jid), 1)
            await this.client.database.Group.updateOne({ gid: M.from }, { $set: { roles } })
            return void (await M.reply(`🟩 *You have been removed from Role "${role.name}"*`))
        }

        if (flags.remove) {
            if (!M.isAdminMessage) return void (await M.reply('🟥 *You must be an admin to remove a role*'))
            const role = roles.find((r) => r.name === flags.remove)
            if (!role) return void (await M.reply('🟥 *Role not found*'))
            await this.client.database.Group.updateOne({ gid: M.from }, { $pull: { roles: { name: role.name } } })
            return void (await M.reply(`🟩 *Role ${role.name} removed*`))
        }

        return void (await this.client.sendMessage(M.from, {
            title: `🟩 Roles List 🟩`,
            text: stripIndents`

                🍥 *Total Roles:* ${roles.length}

                ${roles.map((r) => `> *${r.name}:* ${r.members.length} Members`).join('\n')}
            `,
            sections: roles.map((r) => ({
                title: `${r.name}`,
                rows: [
                    {
                        title: `Join ${r.name}`,
                        rowId: `${this.client.config.prefix}roles --join=${r.name}`
                    },
                    {
                        title: `Leave ${r.name}`,
                        rowId: `${this.client.config.prefix}roles --leave=${r.name}`
                    },
                    {
                        title: `Remove ${r.name}`,
                        rowId: `${this.client.config.prefix}roles --remove=${r.name}`
                    }
                ]
            })),
            buttonText: 'Role Management',
            footer: `Gaia © ${new Date().getFullYear()}`
        }))
    }
}
