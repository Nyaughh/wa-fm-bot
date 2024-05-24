import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'

@Command('poll', {
    aliases: [],
    category: 'Utils',
    group: true,
    admin: true,
    description: {
        content: 'Create a Poll'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        let options = text.split('|')
        const title = options.shift()?.trim()
        if (!title) return void (await M.reply('🟥 Poll title is required'))
        options = [
            ...new Set(
                options.map((option) => {
                    option = option.trim()
                    if (option.startsWith('@')) {
                        const num = option.replace('@', '')
                        if (!isNaN(parseInt(num)))
                            return this.client.getContact(`${num}@s.whastapp.net`).username ?? option
                    }
                    return option
                })
            )
        ]
        if (options.length < 2) return void (await M.reply('🟥 Atleast 2 Options are required to create a Poll'))
        if (options.length > 12) options = options.slice(0, 12)
        await this.client.relayMessage(
            M.from,
            {
                pollCreationMessage: {
                    name: title,
                    options: options.map((optionName) => ({ optionName })),
                    selectableOptionsCount: options.length
                }
            },
            {}
        )
    }
}
