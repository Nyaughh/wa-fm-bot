import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'

@Command('artist', {
    aliases: ['artist'],
    category: 'LastFM',
    description: {
        content: 'LastFM User current songs'
    }
})
export default class extends BaseCommand {
    override execute = async (M: Message, { text }: IParsedArgs): Promise<void> => {
        try {
            const artist = text.trim()

            if (!artist) {
                return void (await M.reply('Enter the correct artist name.'))
            }

            const data = await this.client.lastfm.artist.getInfo({ artist })

            // Function to strip HTML tags using regular expressions
            const cleanText = (htmlText: string) => htmlText.replace(/(<([^>]+)>)/gi, '')

            await M.reply(
                stripIndents`
                Name: ${data.name}
                Debuted: ${data.bio?.published ?? 'Unknown'}
                About: ${cleanText(data.bio?.summary ?? 'No summary available')}
                
                Stats:
                Listeners - ${data.stats.listeners ?? 'N/A'}
                Playcount - ${data.stats.playcount ?? 'N/A'}

                Listen: ${data.url}
                `
            )
        } catch (e) {
            console.log(e)
            return void (await M.reply('Invalid Artist Name'))
        }
    }
}
