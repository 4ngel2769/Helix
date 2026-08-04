import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';

export class GeneralModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'General',
            fullName: 'General',
            description: 'Commands used by everyone',
            enabled: true
        });
    }

    public isEnabled(_context: IsEnabledContext): Result<boolean, ModuleError> {
        return this.ok(true);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        General: true;
    }
}
