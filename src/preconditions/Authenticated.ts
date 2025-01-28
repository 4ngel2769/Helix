import { Precondition, Result, UserError } from '@sapphire/framework';
import type { ApiRequest } from '@sapphire/plugin-api';

export class AuthenticatedPrecondition extends Precondition {
    public async run(request: ApiRequest): Promise<Result<unknown, UserError>> {
        return request.auth?.token
            ? Result.ok()
            : Result.err(new UserError({ identifier: 'unauthorized', message: 'Unauthorized' }));
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        Authenticated: never;
    }
} 