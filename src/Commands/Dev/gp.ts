import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { userUsage } from '../../Helpers/userUsage'

@Command('giveusage', {
    aliases: ['grantusage'],
    category: 'Dev',
    description: {
        content: 'Grants additional usages to a specific user'
    }
})
export default class GiveUsageCommand extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        const args = text.trim().split(' ')
        const usageCount = parseInt(args[0], 10)
        const userId = args[1]

        if (isNaN(usageCount) || !userId) {
            return void await M.reply('Please provide a valid number of usages and a user ID.')
        }

        if (!userUsage[userId]) {
            userUsage[userId] = { count: 0, lastReset: Date.now() }
        }

        userUsage[userId].count += usageCount

        await M.reply(`Granted ${usageCount} additional usages to user.`)
    }
}
