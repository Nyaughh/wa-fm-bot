import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { stripIndents } from 'common-tags'
import { searchTrack } from '../../Helpers/spotify'

const createCollage = require('@settlin/collage')
@Command('grid', {
    aliases: ['g', 'c'],
    category: 'LastFM',
    description: {
        content: 'Get LastFM User Chart'
    }
})
export default class extends BaseCommand {
    private gridSizes = ['3x3', '4x4', '5x5', '10x10']

    override execute = async (M: Message, { text, flags }: IParsedArgs): Promise<void> => {
        let user = flags.user ?? text.trim()
        if (M.mentioned.length > 0) {
            const data = await this.client.database.User.findOne({ jid: M.mentioned[0] }).lean()
            if (!data?.lastfm)
                return void (await M.reply('The mentioned user has not logged in to their lastfm account.'))
            user = data.lastfm
        }
        if (!user) {
            const data = await this.client.database.User.findOne({ jid: M.sender.jid }).lean()
            if (!data?.lastfm)
                return void (await M.reply(
                    'Please provide a username or login to your lastfm account using `login` command.'
                ))
            user = data.lastfm
        }

        const data = await this.client.lastfm.user.getInfo(user).catch(() => null)
        if (!data) return void (await M.reply('Invalid Username'))

        if (flags.period && flags.grid) {
            const [rows, cols] = flags.grid.split('x').map(Number)
            const limit = rows * cols

            const { albums } = await this.client.lastfm.user.getTopAlbums({
                user,
                period: flags.period as 'overall',
                limit
            })
            if (!albums.length || albums.length < limit) return void (await M.reply('Not enough data to create a grid'))

            const links = albums.map(
                (album) =>
                    album.image.find((img) => img.size === 'extralarge')?.url ||
                    'https://lastfm.freetls.fastly.net/i/u/300x300/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg'
            )
            const options = {
                sources: links,
                width: rows,
                height: cols,
                imageWidth: 300,
                imageHeight: 300,
                backgroundColor: '#36393E'
            }

            const buffer = await createCollage(options).then(
                async (canvas: { toBuffer: (arg0: string) => Promise<Buffer> }) => canvas.toBuffer('image/png')
            )

            const time = flags.period === 'overall' ? 'Overall' : flags.period === '7day' ? 'Weekly' : 'Monthly'

            return void (await M.reply(buffer, 'image', undefined, `${data.name}'s Top Albums (${time})`))
        }

        await M.replyWithButtons(
            stripIndents`
                Choose a Grid Size and Period
             `,
            'text',
            undefined,
            undefined,
            undefined,
            undefined,
            {
                headerText: `*${data.name}'s Top Albums*`,
                footerText: 'Powered by LastFM',
                buttonText: 'Options',
                sections: [
                    {
                        title: 'Weekly',
                        rows: this.gridSizes.map((size) => ({
                            title: size,
                            id: `${this.client.config.prefix}grid --grid=${size} --period=7day --user=${user}`
                        }))
                    },
                    {
                        title: 'Monthly',
                        rows: this.gridSizes.map((size) => ({
                            title: size,
                            id: `${this.client.config.prefix}grid --grid=${size} --period=1month --user=${user}`
                        }))
                    },
                    {
                        title: 'Overall',
                        rows: this.gridSizes.map((size) => ({
                            title: size,
                            id: `${this.client.config.prefix}grid --grid=${size} --period=overall --user=${user}`
                        }))
                    }
                ]
            }
        )
    }
}
