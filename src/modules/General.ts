import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';

export class GeneralModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            fullName: 'General Commands',
            description: 'Commands used by everyone',
            enabled: true
        });
    }

    public IsEnabled(_context: IsEnabledContext): Result<Boolean, ModuleError> {
        return this.ok(true);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        GeneralModule: true;
    }
}
