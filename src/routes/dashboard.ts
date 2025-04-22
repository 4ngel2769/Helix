import { Route } from '../lib/structures/Route';
import { ApplyOptions } from '@sapphire/decorators';
import type { ApiRequest, ApiResponse } from '@sapphire/plugin-api';
import { HttpCodes } from '@sapphire/plugin-api';
import type { RouteOptions } from '@sapphire/plugin-api';
import type { Module } from '@kbotdev/plugin-modules';
import { ErrorHandler } from '../lib/structures/ErrorHandler';

@ApplyOptions<RouteOptions>({
    name: 'dashboard',
    route: 'dashboard'
})
export class DashboardRoute extends Route {
    public override async run(request: ApiRequest, response: ApiResponse) {
        try {
            if (!request.auth?.token) {
                return response.status(HttpCodes.Unauthorized).json({
                    error: 'Unauthorized',
                    message: 'Authentication token is required'
                });
            }

            try {
                const modules = [...this.container.client.modules.values()];
                return response.json({
                    authenticated: true,
                    modules: modules.map((module: Module) => ({
                        name: module.name,
                        enabled: module.enabled,
                        description: module.description
                    }))
                });
            } catch (error) {
                ErrorHandler.logError('Dashboard route - modules fetch', error);
                return ErrorHandler.handleApiError(response, error);
            }
        } catch (error) {
            ErrorHandler.logError('Dashboard route - general', error);
            return response.status(HttpCodes.InternalServerError).json({
                error: 'An unexpected error occurred'
            });
        }
    }
}