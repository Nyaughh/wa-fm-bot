import { BaseCommand } from '../../Structures/Command/BaseCommand'
import { Command } from '../../Structures/Command/Command'
import Message from '../../Structures/Message'
import { IParsedArgs } from '../../typings/Command'
import { SpotifyImporter } from '../../Helpers/FMImport'
import { stripIndents } from 'common-tags'
import fs from 'fs'
import { readFile, unlink, writeFile } from 'fs/promises'

@Command('import', {
    aliases: ['importscrobbles'],
    category: 'LastFM',
    description: {
        content: 'Import Spotify scrobbles to LastFM'
    },
    flags: {
        '--file': 'Path to the Spotify history JSON file',
        '--check': 'Check import eligibility',
        '--confirm': 'Confirm and start the import process',
        '--from': 'Start date for import (optional)',
        '--to': 'End date for import (optional)'
    }
})
export default class extends BaseCommand {
    private importers: Map<string, SpotifyImporter> = new Map()

    override execute = async (M: Message, { flags }: IParsedArgs): Promise<void> => {
        const user = await this.client.database.User.findOne({ jid: M.sender.jid })

        if (!user || !user.lastfm) {
            return void M.reply('You need to set your LastFM username first. Use the `login` command.')
        }

        if (Object.keys(flags).length === 0) {
            const importer = new SpotifyImporter(this.client.database, M.sender.jid, this.client.lastfm, [])
            const canImport = await importer.howManyCanYouImportToday()
            return void M.reply(
                stripIndents`
                You have ${canImport} imports left for today.

                Available commands:
                
                1. Check import eligibility:
                \`\`\`
                ${this.client.config.prefix}import --check
                \`\`\`

                2. Upload Spotify history file:
                \`\`\`
                ${this.client.config.prefix}import --file
                \`\`\`
                (Send this command with a Spotify JSON file attached)

                3. Import all songs after uploading:
                \`\`\`
                ${this.client.config.prefix}import --confirm
                \`\`\`

                4. Import songs from specific dates:
                \`\`\`
                ${this.client.config.prefix}import --confirm --from=2023-01-01 --to=2023-12-31
                \`\`\`
                `
            )
        }

        if ('check' in flags) {
            const importer = new SpotifyImporter(this.client.database, M.sender.jid, this.client.lastfm, [])
            const eligible = await importer.isEligible()
            const canImport = await importer.howManyCanYouImportToday()
            return void M.reply(
                stripIndents`
                Import eligibility: ${eligible ? '✅' : '❌'}
                You can import up to ${canImport} scrobbles today.
                `
            )
        }

        if ('file' in flags) {
            if (!M.quoted?.message?.documentMessage) {
                return void M.reply('Please provide a Spotify history JSON file using the --file flag.')
            }
            let spotifyData
            let fileSizeInMB
            try {
                const buffer = await this.client.downloadMediaMessage(M.quoted!.message!)
                fileSizeInMB = (buffer.length / (1024 * 1024)).toFixed(2)
                spotifyData = JSON.parse(buffer.toString('utf-8'))
            } catch (error) {
                return void M.reply('Invalid JSON file. Please provide a valid Spotify history JSON file.')
            }

            const importer = new SpotifyImporter(this.client.database, M.sender.jid, this.client.lastfm, spotifyData)
            this.importers.set(M.sender.jid, importer)

            const eligible = await importer.isEligible()
            if (!eligible) {
                this.importers.delete(M.sender.jid)
                return void M.reply('You are not eligible to import scrobbles at this time.')
            }   

            const canImport = await importer.howManyCanYouImportToday()
            const years = [...new Set(importer.data.map((song) => new Date('timestamp' in song ? song.timestamp : song.ts).getFullYear()))].sort(
                (a, b) => b - a
            )

            return void M.reply(
                stripIndents`
                File received and processed. File size: ${fileSizeInMB} MB
                You can import up to ${canImport} scrobbles today.
                Available years: ${years.join(', ')}
                
                To import all songs, use:
                \`\`\`
                ${this.client.config.prefix}import --confirm
                \`\`\`

                To import songs from a specific year, use:
                \`\`\`
                ${this.client.config.prefix}import --confirm --from=YYYY-01-01 --to=YYYY-12-31
                \`\`\`

                Example for year ${years[0]}:
                \`\`\`
                ${this.client.config.prefix}import --confirm --from=${years[0]}-01-01 --to=${years[0]}-12-31
                \`\`\`
                `
            )
        }

        if ('confirm' in flags) {
            const importer = this.importers.get(M.sender.jid)
            if (!importer) {
                return void M.reply('Please provide a Spotify history file first using the --file flag.')
            }

            const from = flags.from ? new Date(flags.from) : undefined
            const to = flags.to ? new Date(flags.to) : undefined

            await M.reply('Import process started. This may take a while...')

            importer.on('importing', (count) => {
                M.reply(`Importing ${count} songs...`)
            })

            importer.on('batchImported', (importedCount, actualImportedCount, totalScrobbles) => {
                if (actualImportedCount % 250 === 0) {
                    M.reply(`Imported ${importedCount} songs. Total imported: ${actualImportedCount}/${totalScrobbles}`)
                }
            })

            importer.on('imported', async (importedCount, remainingScrobbles) => {
                let response = `Successfully imported ${importedCount} songs to LastFM.`
                if (remainingScrobbles.length > 0) {
                    response += `\n${remainingScrobbles.length} songs couldn't be imported due to daily limit.`
                }

                if (importedCount > 0) {
                    response += '\n\nImported songs:'
                    const songList = importer.getImportedSongs().slice(0, 10)
                    songList.forEach((song, index) => {
                        response += `\n${index + 1}. ${song.artist} - ${song.track}`
                    })
                    if (importedCount > 10) {
                        response += `\n... and ${importedCount - 10} more.`
                    }
                }

                await M.reply(response)

                if (remainingScrobbles.length > 0) {
                    const remainingJson = JSON.stringify(remainingScrobbles, null, 2)
                    const buffer = Buffer.from(remainingJson, 'utf-8')
                    const filename = `remaining_songs_${Date.now()}_${M.sender.jid}.json`
                    await writeFile(filename, buffer)
                    await M.replyRaw({
                        document: await readFile(filename),
                        fileName: filename,
                        mimetype: 'application/json',
                        caption:
                            "Here are the remaining songs that couldn't be imported today. You can use this file to continue the import tomorrow"
                    })
                    unlink(filename)
                }
            })

            await importer.import({ from, to })
            return
        }

        M.reply('Please provide a Spotify history JSON file using the --file flag.')
    }
}
