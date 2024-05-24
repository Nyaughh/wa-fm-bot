import { ICommandOptions } from '../../typings/Command'
import Client from '../Client'
import { BaseCommand, CommandParams } from './BaseCommand'

export const Command = (id: string, options: ICommandOptions): ClassDecorator => {
    return (<T extends BaseCommand>(target: new (...args: CommandParams) => T): new (client: Client) => T => {
        return new Proxy(target, {
            construct: (ctx, [client]): T => new ctx(client, id, options)
        }) as new (client: Client) => T
    }) as ClassDecorator
}
