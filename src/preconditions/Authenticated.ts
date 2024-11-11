import { Precondition } from '@sapphire/framework';
import type { ApiRequest } from '@sapphire/plugin-api';
import type { Result } from '@sapphire/framework';
import { HttpCodes } from '@sapphire/plugin-api';
import type { UserError } from '@sapphire/framework';

export class UserPrecondition extends Precondition {
    public run(request: ApiRequest): Result<unknown, UserError> {
        return request.auth?.token
            ? this.ok()
            : this.error({
                message: 'You must be authenticated.',
                identifier: 'Unauthorized'
            });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        Authenticated: never;
    }
} 