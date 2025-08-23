import { Route as SapphireRoute } from '@sapphire/plugin-api';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';

export abstract class Route extends SapphireRoute {
	public abstract override run(request: ApiRequest, response: ApiResponse): unknown;
}
