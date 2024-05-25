import chalk from 'chalk'
import Client from '../Structures/Client'
import { BaseCommand } from '../Structures/Command/BaseCommand'
import Message from '../Structures/Message'
import { ICategories, IParsedArgs, Permissons } from '../typings/Command'

export class MessageHandler {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly cooldowns = new Map<string, Map<string, any>>()
    public readonly commands = new Map<string, BaseCommand>()
    public readonly aliases = new Map<string, BaseCommand>()
    public readonly categories = new Array<ICategories>()

    constructor(private path: string, public client: Client) {}

    private execute = async (command: BaseCommand, M: Message, args: IParsedArgs): Promise<void> => {
        //M.react('🔄')
        if (!this.cooldowns.has(command.id)) this.cooldowns.set(command.id, new Map())
        const now = Date.now()
        const timestamps = this.cooldowns.get(command.id)
        const cooldownAmount = (command.options.cooldown ?? 3) * 1000
        if (timestamps?.has(M.sender.jid)) {
            const expirationTime = (timestamps.get(M.sender.jid) || 0) + cooldownAmount
            if (now < expirationTime) {
                //await M.react('⏳')
                return void M.reply(
                    `You need to wait ${(expirationTime - now) / 1000} seconds before using this command again.`
                )
            }
            timestamps.set(M.sender.jid, now)
            setTimeout(() => timestamps.delete(M.sender.jid), cooldownAmount)
        } else timestamps?.set(M.sender.jid, now)
        try {
            await command.execute(M, args)
            //await M.react('✅')
            if (!M.group) return
        } catch (error) {
            this.client.log((error as Error).message, true)
            //await M.react('❌')
            console.log(error)
        }
    }

    private logMessage = (command = true, username = 'Someone', chat = 'Direct Message', cmd = '', len = 0) => {
        this.client.log(
            this.client.util.format(
                '%s From: %s In: %s',
                chalk.yellow(command ? 'Command'.concat(' ', cmd, this.client.util.format('[%s]', len)) : 'Message'),
                chalk.cyan(username),
                chalk.green(chat)
            )
        )
    }

    public handle = async (M: Message): Promise<void> => {
        const log = (command = false, cmd = '', len = 0) =>
            this.logMessage(command, M.sender.username, M.group?.title, cmd, len)
        const isCommand = M.content.startsWith(this.client.config.prefix)
        const info = M.group ? await this.client.database.getGroup(M.from) : undefined
        await this.client.database.getUser(M.sender.jid)

        if (!isCommand) return void log()
        const parsedArgs = this.parseArgs(M.content)
        log(true, parsedArgs.cmd, parsedArgs.args.length)
        if (!parsedArgs.cmd) return void M.reply(`Enter a command following ${this.client.config.prefix}`)
        const command = this.commands.get(parsedArgs.cmd) ?? this.aliases.get(parsedArgs.cmd)
        const v = !M.group || !info?.bot || info?.bot === this.client.config.session
        if (!command) {
            if (v) return void M.reply(`🟥 *${parsedArgs.cmd} | Command not found*`)
            return
        }
        const { valid, remarks } = this.validate(M, command)
        if (!valid) {
            if (v) return void (remarks ? M.reply('🟥 '.concat(remarks)) : null)
            return
        }
        if (v || command.options.all) this.execute(command, M, parsedArgs)
    }

    private validate = (
        {
            isAdminMessage,
            chat,
            sender: {
                isMod,
                ban: { is, reason }
            },
            group: gm
        }: Message,
        { id, options: { admin, group, dm, mod, perms } }: BaseCommand
    ): { valid: boolean; remarks?: string } => {
        if (
            perms?.includes(Permissons.ADMIN) &&
            !gm?.admins.includes(this.client.util.sanitizeJid(this.client.user?.id ?? ''))
        ) {
            return { valid: false, remarks: 'Missing admin permission. Try promoting me to admin and try again.' }
        }
        if (is) return { valid: false, remarks: `*You are banned from using commands*\n\n📕 *Reason:* ${reason}` }
        if (admin && !isAdminMessage) return { valid: false, remarks: 'User Missing Admin Permission' }
        if (group && chat === 'dm')
            return { valid: false, remarks: `${id} and its aliases can only be used in a group chat` }
        if (dm && chat !== 'dm')
            return { valid: false, remarks: `${id} and its aliases can only be used in a direct message` }
        if (mod && !isMod) return { valid: false }
        return { valid: true }
    }

    private parseArgs = (raw: string): IParsedArgs => {
        const args = raw.split(' ')
        const cmd = args.shift()?.toLocaleLowerCase().slice(this.client.config.prefix.length) ?? ''
        const text = args.join(' ')
        const flags: Record<string, string> = {}
        for (const arg of args) {
            if (arg.startsWith('--')) {
                const [key, value] = arg.slice(2).split('=')
                flags[key] = value
            } else if (arg.startsWith('-')) {
                flags[arg] = ''
            }
        }
        return {
            cmd,
            text,
            flags,
            args,
            raw
        }
    }

    public loadCommands = (): void => {
        this.client.log(chalk.green('Loading Commands...'))
        const loaded = []
        const files = this.client.util.readdirRecursive(this.path)
        for (const file of files) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const load = require(file).default
            if (!load || !(load.prototype instanceof BaseCommand)) continue
            const command = this.getCommand(file)
            loaded.push(command.id)
            this.registry(command)
            this.client.log(`Loaded: ${chalk.green(command.id)} from ${chalk.green(file)}`)
        }
        this.client.log(`Successfully Loaded ${chalk.greenBright(this.commands.size.toString())} Commands`)
    }

    public registry(command: string | BaseCommand): void {
        if (typeof command === 'string') command = this.getCommand(command)
        this.addToCategory(command)
        this.commands.set(command.id, command)
        for (const alias of command.options.aliases ?? []) this.aliases.set(alias, command)
    }

    public getCommand(path: string): BaseCommand {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command: BaseCommand = new (require(path).default)(this.client)
        if (command.options.dm) {
            const getErr = (message: string) => {
                return new Error(message)
            }
            if (command.options.group) throw getErr('Command cannot be both a group and a direct message command')
            if (command.options.admin) throw getErr('Command cannot be an admin command')
        }
        command.client = this.client
        command.path = path
        command.handler = this
        return command
    }

    public addToCategory(command: BaseCommand): void {
        const category: ICategories = this.categories.find((x) => x.name === command.options.category) ?? {
            name: command.options.category || 'Uncategorized',
            commands: []
        }
        if (!category.commands.some((x) => x.id === command.id)) category.commands.push(command)
        if (!this.categories.some((x) => x.name === command.options.category)) this.categories.push(category)
    }
}
