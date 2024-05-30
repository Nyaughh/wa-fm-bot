import { proto } from '@whiskeysockets/baileys'
import { stripIndents } from 'common-tags'
import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('help', {
    aliases: ['menu'],
    category: 'Core',
    description: {
        content: 'Displays the menu'
    }
})
export default class extends BaseCommand {
    override execute = async ({ from, reply, sender }: Message, { text }: IParsedArgs): Promise<void> => {
        const { commands, aliases } = this.handler
        const command = (() => {
            const cmd = text.toLowerCase().trim()
            return commands.get(cmd) || aliases.get(cmd)
        })()
        if (command)
            return void reply(stripIndents`
            Command: ${command.id}
            Category: ${command.options.category}
            Aliases: ${command.options.aliases.join(', ').trim() ?? 'None'}
            Cooldown: ${command.options.cooldown ?? 'None'}
            Admin: ${command.options.admin ? 'True' : 'False'}
            Usage: ${this.client.config.prefix}${command.id}${command.options.description.usage ?? ''}
            Description: ${command.options.description.content}
            ${
                command.options.flags
                    ? `
            Flags: \n${Object.entries(command.options.flags)
                .map(([flag, description]) => `| ${flag} - ${description}`)
                .join('\n')}    
            `
                    : ''
            }
        `)
        let base = '*LastFM Bot Commands*'
        const modules = (this.handler?.categories || [])
            .filter(({ name }) => name !== 'Dev')
            .sort((element) =>
                element.name.toLowerCase() === 'core' ? -1 : element.name.toLowerCase() === 'misc' ? 1 : 0
            )
        const sections = new Array<proto.Message.ListMessage.ISection>()
        for (const mod of modules || []) {
            const cap = this.client.util.capitalize(mod.name)
            const section: proto.Message.ListMessage.ISection = {
                title: cap,
                rows: []
            }
            base += `\n\n*${cap}* => ${
                mod.commands
                    .map((x) => {
                        section.rows?.push({
                            title: `${x.id}`,
                            rowId: `${this.client.config.prefix}help ${x.id}`
                        })
                        return `\`${x.id}\``
                    })
                    .join(', ') || 'None'
            }`
            sections.push(section)
        }
        return void this.client.sendMessage(from, {
            text: base,
            mentions: [sender.jid]
        })
    }
}
