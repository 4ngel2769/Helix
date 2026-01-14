import type { MessageCommandSuccessPayload } from '@sapphire/framework';
import { Listener, LogLevel, Events } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import type { Logger } from '@sapphire/plugin-logger';
import { logSuccessCommand } from '../../../lib/utils';

@ApplyOptions<Listener.Options>({
	event: Events.MessageCommandSuccess
})
export class UserEvent extends Listener {
	public override run(payload: MessageCommandSuccessPayload) {
		logSuccessCommand(payload);
	}

	public override onLoad() {
		this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug;
		return super.onLoad();
	}
}
