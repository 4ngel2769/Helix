import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import { moduleConfigs } from '../../config/modules';

@ApplyOptions<RouteOptions>({
	name: 'api-modules',
	route: 'modules',
	methods: ['GET']
})
export class ApiModulesRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		const modules = Object.entries(moduleConfigs).map(([key, cfg]) => ({
			key,
			name: cfg.name,
			description: cfg.description,
			emoji: String(cfg.emoji ?? ''),
			defaultEnabled: cfg.defaultEnabled
		}));
		return response.json({ total: modules.length, modules });
	}
}
