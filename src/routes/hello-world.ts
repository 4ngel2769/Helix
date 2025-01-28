import { Route } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

export class HelloWorldRoute extends Route {
    public override run(_request: ApiRequest, response: ApiResponse) {
        return response.json({ message: 'Hello World' });
    }
}