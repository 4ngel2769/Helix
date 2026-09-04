import { Route } from '@sapphire/plugin-api';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';

function listCommands(client: any) {
	const out: Array<{ name: string; description: string; category: string | null }> = [];
	try {
		const store = client.stores?.get?.('commands');
		if (!store) return out;
		for (const cmd of store.values()) {
			const piece: any = cmd;
			out.push({
				name: piece.name ?? 'unknown',
				description: piece.description ?? '',
				category: piece.category ?? piece.location?.directory?.split?.(/[\\/]/)?.pop?.() ?? null
			});
		}
	} catch {
		// ignore
	}
	return out.sort((a, b) => a.name.localeCompare(b.name));
}

@ApplyOptions<RouteOptions>({
	name: 'api-commands',
	route: 'commands',
	methods: ['GET']
})
export class ApiCommandsRoute extends Route {
	public override run(_request: ApiRequest, response: ApiResponse) {
		const commands = listCommands(this.container.client);
		return response.json({ total: commands.length, commands });
	}
}
