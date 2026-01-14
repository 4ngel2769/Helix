import { Listener, LogLevel, type ContextMenuCommandSuccessPayload, Events } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Logger } from '@sapphire/plugin-logger';
import { logSuccessCommand } from '../../../lib/utils';

@ApplyOptions<Listener.Options>({
	event: Events.ContextMenuCommandSuccess
})
export class UserListener extends Listener {
	public override run(payload: ContextMenuCommandSuccessPayload) {
		logSuccessCommand(payload);
	}

	public override onLoad() {
		this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug;
		return super.onLoad();
	}
}
