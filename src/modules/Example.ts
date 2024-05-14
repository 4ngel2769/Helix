import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';

export class ExampleModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            fullName: 'Example Module',
            description: 'An Example Module'
        });
    }

    public IsEnabled(_context: IsEnabledContext): Result<Boolean, ModuleError> {
        return this.ok(true);
        // console.log(context);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        ExampleModule: never;
    }
}
