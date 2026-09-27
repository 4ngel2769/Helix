# Commands

All **187** commands under `src/commands/`, grouped by category. Names and descriptions are read verbatim from each file's `@ApplyOptions` block, so this table matches what Discord shows unless a command's own metadata changes.

## Summary

| Category | Commands | Slash | Prefix | Slash + Prefix | Context menus |
| --- | --- | --- | --- | --- | --- |
| [Administration](#administration) | 17 | 17 | 0 | 0 | 0 |
| [Color](#color) | 4 | 1 | 3 | 0 | 0 |
| [Developer](#developer) | 12 | 6 | 8 | 2 | 1 |
| [Economy](#economy) | 13 | 13 | 11 | 11 | 0 |
| [Emotion](#emotion) | 21 | 1 | 21 | 1 | 0 |
| [Fun](#fun) | 16 | 6 | 11 | 1 | 0 |
| [General](#general) | 27 | 27 | 23 | 23 | 2 |
| [Image](#image) | 20 | 20 | 19 | 19 | 0 |
| [Leveling](#leveling) | 3 | 3 | 0 | 0 | 0 |
| [Misc](#misc) | 4 | 0 | 4 | 0 | 0 |
| [Moderation](#moderation) | 20 | 20 | 1 | 1 | 0 |
| [Pets](#pets) | 12 | 12 | 12 | 12 | 0 |
| [Reaction Roles](#reaction-roles) | 1 | 1 | 0 | 0 | 0 |
| [Reddit](#reddit) | 14 | 14 | 14 | 14 | 0 |
| [Verification](#verification) | 3 | 3 | 0 | 0 | 0 |
| **Total** | **187** | **144** | **127** | **84** | **3** |

## Columns

| Column | Meaning |
| --- | --- |
| **Command** | The literal `name` from `@ApplyOptions`. |
| **Description** | Literal `description`. Shown in the Discord command picker. |
| **Types** | `Slash` = chat-input (`chatInputRun` / `registerApplicationCommands`).<br>`Prefix` = message command (`messageRun`).<br>`User ctx` / `Msg ctx` = right-click context menu entry.<br>`Autocomplete` = has an `autocomplete()` handler. |
| **Aliases** | Prefix-command aliases from `@ApplyOptions({ aliases: [...] })`. |
| **Guards** | Sapphire `preconditions`: `GuildOnly`, `OwnerOnly`, `ModeratorOnly`, `ModuleEnabled`. |
| **Module** | The `module` key for `ModuleEnabled` — the dashboard toggle that switches the command on/off. |
| **Ephemeral** | `flags: true` or `MessageFlags.Ephemeral` — reply visible only to the invoker. |
| **Base** | The class the command extends. |
| **File** | Source path. |

> **Base classes.** `HybridCommand` / `HybridModuleCommand` (`src/lib/structures/HybridCommand.ts`) give an otherwise slash-only command a working `messageRun` by parsing the message body against the command's own registered slash options and running the same `chatInputRun` through a message-backed shim — so prefix and slash stay in lockstep, subcommands included. A plain `ModuleCommand` from `@kbotdev/plugin-modules` is slash-only, and a plain Sapphire `Command` is prefix-only unless it also declares `chatInputRun`.

> **Module.** Blank `Module` means the command declares no `module` key, so `ModuleEnabled` never gates it. `src/config/modules.ts` is the master list of module keys and their default enabled state.

## Administration (17)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `config` | Configure server settings | `Slash` | — | `GuildOnly` | — | — | `HybridCommand` | `src/commands/Administration/configuration.ts` |
| `configmodule` | Configure modules for your server | `Slash` | — | — | — | — | `HybridCommand` | `src/commands/Administration/configmodule.ts` |
| `greetings` | Configure member greetings and departures | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/greetings.ts` |
| `setadminrole` | Set the admin role for your server | `Slash` | `setadminr`<br>`sarole` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setadminrole.ts` |
| `setautorole` | Set the auto-assign role for new members | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setautorole.ts` |
| `setmemberlog` | Set the member join/leave log channel | `Slash` | `setmeml`<br>`smeml` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setmemberlog.ts` |
| `setmessagelog` | Set the message edit/delete log channels | `Slash` | `setmsgl`<br>`smsgl` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setmessagelog.ts` |
| `setmodlog` | Set the moderation log channel | `Slash` | `setml`<br>`sml` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setmodlog.ts` |
| `setmodrole` | Set the moderator role for your server | `Slash` | `setmr`<br>`smr` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setmodrole.ts` |
| `setmuterole` | Set the mute role for your server | `Slash` | `setmute` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setmuterole.ts` |
| `setnicknamelog` | Set the nickname change log channel | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setnicknamelog.ts` |
| `setprefix` | Set the command prefix for your server | `Slash` | `setp`<br>`sp` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setprefix.ts` |
| `setrolelog` | Set the role change log channel | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setrolelog.ts` |
| `setsystemchannel` | Set the system notifications channel | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/setsystemchannel.ts` |
| `settings` | View comprehensive server settings | `Slash` | `conf` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/settings.ts` |
| `setup` | Configure server setup with a restart-safe wizard | `Slash` | — | `GuildOnly` | — | — | `HybridCommand` | `src/commands/Administration/setup.ts` |
| `togglecommand` | Enable or disable a specific command | `Slash` | `togglec`<br>`togc`<br>`tc` | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Administration/togglecommand.ts` |

<details><summary><code>config</code> — 11 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `role` | group | `-` | Configure server roles |
| `admin` | sub | `role` | Set or clear the administrator role |
| `mod` | sub | `role` | Set or clear the moderator role |
| `mute` | sub | `role` | Set or clear the mute role |
| `auto` | sub | `role` | Set or clear the auto-assign role |
| `log` | group | `-` | Configure log channels |
| `(dynamic)` | sub | `log` | — |
| `prefix` | sub | `-` | Set or reset the command prefix |
| `module` | sub | `-` | Enable or disable a module |
| `command` | sub | `-` | Enable or disable a command |
| `help` | sub | `-` | Show the configuration options and usage |

</details>
<details><summary><code>greetings</code> — 8 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `welcome_channel` | sub | `-` | Choose where new members are announced |
| `welcome_message` | sub | `-` | Write the announcement used for new members |
| `farewell_channel` | sub | `-` | Choose where departing members are announced |
| `farewell_message` | sub | `-` | Write the announcement used for departures |
| `ban_message` | sub | `-` | Write the public notice used after a ban |
| `join_dm` | sub | `-` | Write the private note sent to new members |
| `test_greet` | sub | `-` | Preview a greeting in its configured channel |
| `help` | sub | `-` | Show the greeting options and usage |

</details>
<details><summary><code>setmessagelog</code> — 3 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `edit` | sub | `-` | Set the message edit log channel |
| `delete` | sub | `-` | Set the message delete log channel |
| `both` | sub | `-` | Set both message edit and delete log to the same channel |

</details>
<details><summary><code>setup</code> — 9 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `start` | sub | `-` | Start or resume the setup wizard |
| `status` | sub | `-` | Show the current setup step |
| `roles` | sub | `-` | Configure staff and verification roles |
| `channels` | sub | `-` | Configure setup channels |
| `prefix` | sub | `-` | Configure the message command prefix |
| `(dynamic)` | sub | `-` | — |
| `finish` | sub | `-` | Finish the setup wizard |
| `cancel` | sub | `-` | Cancel the setup wizard |
| `legacy` | sub | `-` | Apply optional setup values in one command |

</details>

## Color (4)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `color` | View information about colors and manage your color role | `Slash` | — | — | — | — | `HybridModuleCommand` | `src/commands/Color/color.ts` |
| `colorinfo` | Get detailed info about a hex color | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Color/colorinfo.ts` |
| `mycolor` | Show your current color role | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Color/mycolor.ts` |
| `setcolor` | Set your own name color via a role | `Prefix` | — | `GuildOnly` | — | — | `ModuleCommand` | `src/commands/Color/setcolor.ts` |

<details><summary><code>color</code> — 4 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `colorinfo` | sub | `-` | Get detailed info about a hex color |
| `mycolor` | sub | `-` | Show your current color role |
| `setcolor` | sub | `-` | Set your own name color via a role |
| `help` | sub | `-` | Show the color options and usage |

</details>

## Developer (12)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dm` | DM a user | `Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/dm.ts` |
| `eval` | Evaluates JavaScript code | `Slash` | — | `OwnerOnly` | — | — | `HybridCommand` | `src/commands/Developer/eval.ts` |
| `exec` | Execute shell commands | `Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/exec.ts` |
| `guildlist` | List all guilds the bot is in | `Prefix` | `servers` | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/guildlist.ts` |
| `item-manage` | Manage economy items (Developer Only) | `Slash` | `itemmanage`<br>`manageitems` | `OwnerOnly` | — | — | `HybridCommand` | `src/commands/Developer/item-manage.ts` |
| `leaveserver` | Leave a server by ID | `Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/leaveserver.ts` |
| `note` | Manage developer notes and to-dos | `Slash` | — | `OwnerOnly` | — | — | `HybridCommand` | `src/commands/Developer/note.ts` |
| `perf` | Shows current bot performance metrics and event-loop latency | `Slash`<br>`Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/perf.ts` |
| `restart` | Restart the bot | `Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/restart.ts` |
| `shutdown` | Shut down the bot | `Prefix` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/shutdown.ts` |
| `test` | Test command that replies with "tested" | `Slash`<br>`Prefix`<br>`User ctx`<br>`Msg ctx` | — | `OwnerOnly` | — | — | `Command` | `src/commands/Developer/test.ts` |
| `user-manage` | Manage user economy data (Developer Only) | `Slash` | `usermanage`<br>`manageuser`<br>`eco-admin` | `OwnerOnly` | — | — | `HybridCommand` | `src/commands/Developer/user-manage/index.ts` |

<details><summary><code>item-manage</code> — 4 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `create` | sub | `-` | Create a new economy item |
| `list` | sub | `-` | List all economy items |
| `edit` | sub | `-` | Edit an existing item |
| `delete` | sub | `-` | Delete an item |

</details>
<details><summary><code>note</code> — 3 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `add` | sub | `-` | Add a new note or to-do |
| `list` | sub | `-` | List all your notes |
| `delete` | sub | `-` | Delete a note |

</details>
<details><summary><code>user-manage</code> — 15 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `money` | group | `-` | Manage user money |
| `add` | sub | `money` | Add money to a user |
| `remove` | sub | `money` | Remove money from a user |
| `set` | sub | `money` | Set exact money values for a user |
| `diamonds` | group | `-` | Manage user diamonds |
| `add` | sub | `diamonds` | Add diamonds to a user |
| `remove` | sub | `diamonds` | Remove diamonds from a user |
| `set` | sub | `diamonds` | Set exact diamond count for a user |
| `items` | group | `-` | Manage user inventory items |
| `give` | sub | `items` | Give an item to a user |
| `take` | sub | `items` | Take an item from a user |
| `clear` | sub | `items` | Clear a user\'s inventory |
| `profile` | group | `-` | Manage user profile |
| `reset` | sub | `profile` | Reset a user\'s economy profile |
| `view` | sub | `profile` | View detailed user economy data |

</details>

## Economy (13)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `auction` | Auction system - create, bid, or view auctions | `Slash`<br>`Prefix` | `auc` | — | — | — | `ModuleCommand` | `src/commands/Economy/auction.ts` |
| `balance` | Check your money balance | `Slash`<br>`Prefix` | `bal`<br>`money` | — | — | — | `ModuleCommand` | `src/commands/Economy/balance.ts` |
| `bank-upgrade` | Upgrade your bank storage capacity | `Slash` | `bank-up`<br>`upgrade-bank` | — | — | — | `HybridModuleCommand` | `src/commands/Economy/bank-upgrade.ts` |
| `daily` | Claim your daily coins and rewards | `Slash`<br>`Prefix` | `day` | — | — | — | `ModuleCommand` | `src/commands/Economy/daily.ts` |
| `deposit` | Deposit money from your wallet to your bank | `Slash`<br>`Prefix` | `dep`<br>`d` | — | — | — | `ModuleCommand` | `src/commands/Economy/deposit.ts` |
| `economy` | Economy commands | `Slash` | `econ`<br>`econ-lb`<br>`richest`<br>`rich`<br>`wealth-board` | — | — | — | `HybridModuleCommand` | `src/commands/Economy/economy.ts` |
| `inventory` | View your or another user's inventory | `Slash`<br>`Prefix` | `inv`<br>`bag` | — | — | — | `ModuleCommand` | `src/commands/Economy/inventory.ts` |
| `jobs` | Browse the job market and manage your career | `Slash`<br>`Prefix` | `jobmarket`<br>`careers`<br>`career` | — | — | — | `ModuleCommand` | `src/commands/Economy/jobs.ts` |
| `sell` | Sell items from your inventory | `Slash`<br>`Prefix` | `s` | — | — | — | `ModuleCommand` | `src/commands/Economy/sell.ts` |
| `shop` | Browse and buy items from the shop | `Slash`<br>`Prefix` | — | — | — | — | `ModuleCommand` | `src/commands/Economy/shop.ts` |
| `use` | Use an item from your inventory | `Slash`<br>`Prefix` | `consume`<br>`activate` | — | — | — | `ModuleCommand` | `src/commands/Economy/use.ts` |
| `withdraw` | Withdraw money from your bank to your wallet | `Slash`<br>`Prefix` | `with`<br>`w` | — | — | — | `ModuleCommand` | `src/commands/Economy/withdraw.ts` |
| `work` | Work a shift at your job to earn coins and XP | `Slash`<br>`Prefix` | `job`<br>`shift` | — | — | — | `ModuleCommand` | `src/commands/Economy/work.ts` |

<details><summary><code>auction</code> — 4 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `create` | sub | `-` | Create a new auction |
| `bid` | sub | `-` | Place a bid on an auction |
| `list` | sub | `-` | View active auctions |
| `view` | sub | `-` | View a specific auction |

</details>
<details><summary><code>bank-upgrade</code> — 2 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `info` | sub | `-` | View your current bank tier and available upgrades |
| `buy` | sub | `-` | Purchase a bank upgrade |

</details>
<details><summary><code>economy</code> — 1 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `leaderboard` | sub | `-` | View the economy leaderboard |

</details>
<details><summary><code>jobs</code> — 4 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `board` | sub | `-` | Browse all open jobs |
| `apply` | sub | `-` | Apply for a job (acceptance is not guaranteed) |
| `resign` | sub | `-` | Quit your current job |
| `career` | sub | `-` | View your job status and streaks |

</details>
<details><summary><code>shop</code> — 3 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `list` | sub | `-` | Browse available items |
| `buy` | sub | `-` | Purchase an item |
| `info` | sub | `-` | Get detailed information about an item |

</details>

## Emotion (21)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bite` | bites someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/bite.ts` |
| `blush` | blushes at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/blush.ts` |
| `cuddle` | cuddles someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/cuddle.ts` |
| `dance` | dances with someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/dance.ts` |
| `emote` | Perform an emote, optionally at someone | `Slash`<br>`Prefix` | `emotes` | — | — | — | `ModuleCommand` | `src/commands/Emotion/emote.ts` |
| `facepalm` | facepalms at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/facepalm.ts` |
| `handhold` | holds hands with someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/handhold.ts` |
| `hug` | hugs someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/hug.ts` |
| `kiss` | kisses someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/kiss.ts` |
| `lick` | licks someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/lick.ts` |
| `nuzzle` | nuzzles someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/nuzzle.ts` |
| `pat` | pats someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/pat.ts` |
| `poke` | pokes someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/poke.ts` |
| `punch` | punches someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/punch.ts` |
| `shrug` | shrugs at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/shrug.ts` |
| `slap` | slaps someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/slap.ts` |
| `smile` | smiles at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/smile.ts` |
| `stare` | stares at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/stare.ts` |
| `think` | thinks about someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/think.ts` |
| `tickle` | tickles someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/tickle.ts` |
| `wave` | waves at someone | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Emotion/wave.ts` |

## Fun (16)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `8ball` | Ask the magic 8-ball a question | `Prefix` | `eightball` | — | — | yes | `ModuleCommand` | `src/commands/Fun/8ball.ts` |
| `animal` | Get a random animal image | `Slash` | — | — | — | yes | `HybridModuleCommand` | `src/commands/Fun/animal.ts` |
| `catfact` | Get a random cat fact | `Prefix` | `catfacts` | — | — | yes | `ModuleCommand` | `src/commands/Fun/catfact.ts` |
| `coinflip` | Flip a coin | `Prefix` | `cf` | — | — | yes | `ModuleCommand` | `src/commands/Fun/coinflip.ts` |
| `dogfact` | Get a random dog fact | `Prefix` | `dogfacts` | — | — | yes | `ModuleCommand` | `src/commands/Fun/dogfact.ts` |
| `elephant` | Get a random elephant fact and image | `Slash` | — | — | — | yes | `HybridModuleCommand` | `src/commands/Fun/elephant.ts` |
| `emojify` | Convert text to regional indicator emojis | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/emojify.ts` |
| `game` | Play a game! | `Slash` | — | — | — | — | `HybridModuleCommand` | `src/commands/Fun/game.ts` |
| `game-leaderboard` | View the leaderboard for a specific game. | `Slash` | `gameboard` | — | — | — | `HybridModuleCommand` | `src/commands/Fun/leaderboard.ts` |
| `getimg` | Get a random image | `Slash` | — | — | — | yes | `HybridModuleCommand` | `src/commands/Fun/getimg.ts` |
| `meme` | Get a random meme | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/meme.ts` |
| `roll` | Roll a dice | `Prefix` | `dice` | — | — | yes | `ModuleCommand` | `src/commands/Fun/roll.ts` |
| `rps` | Play rock paper scissors | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/rps.ts` |
| `say` | Make the bot say something | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/say.ts` |
| `topics` | Get a random conversation topic | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/topics.ts` |
| `yesno` | Random yes/no/maybe | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Fun/yesno.ts` |

<details><summary><code>animal</code> — 5 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `reddit` | group | `-` | Get random animal images |
| `(dynamic)` | sub | `reddit` | — |
| `pets` | group | `-` | Get random pet images |
| `help` | sub | `pets` | Show the animal command help |
| `help` | sub | `-` | Show the animal command help |

</details>
<details><summary><code>game</code> — 1 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `tictactoe` | sub | `-` | Play Tic Tac Toe! |

</details>

## General (27)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admins` | List server admins | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/admins.ts` |
| `aliases` | Show all command aliases | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/aliases.ts` |
| `ask` | Ask the AI a question | `Slash` | — | — | — | — | `HybridModuleCommand` | `src/commands/General/ask.ts` |
| `avatar` | Show a user's avatar | `Slash`<br>`Prefix` | `pfp` | — | — | yes | `ModuleCommand` | `src/commands/General/info/avatar.ts` |
| `botinfo` | Show bot information | `Slash`<br>`Prefix` | `info`<br>`bot`<br>`bi` | — | — | yes | `ModuleCommand` | `src/commands/General/info/botinfo.ts` |
| `channelinfo` | Show channel information | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/channelinfo.ts` |
| `embed` | Create a custom embed | `Slash` | — | `ModuleEnabled` | — | — | `HybridModuleCommand` | `src/commands/General/embed.ts` |
| `emojis` | List server emojis | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/emojis.ts` |
| `help` | Shows all available commands | `Slash`<br>`Prefix` | — | — | — | — | `Command` | `src/commands/General/help/index.ts` |
| `inviteme` | Get bot invite link | `Slash`<br>`Prefix` | `invite` | — | — | yes | `ModuleCommand` | `src/commands/General/info/inviteme.ts` |
| `members` | Show member count | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/members.ts` |
| `mods` | List server moderators | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/mods.ts` |
| `permissions` | Show a user's permissions | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/permissions.ts` |
| `ping` | Bot ping | `Slash`<br>`Prefix`<br>`User ctx`<br>`Msg ctx` | `latency` | `ModuleEnabled` | — | yes | `ModuleCommand` | `src/commands/General/ping.ts` |
| `pong` | Check bot latency | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/pong.ts` |
| `prefix` | Show current command prefix | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/prefix.ts` |
| `profile` | View your profile and game statistics. | `Slash` | — | — | — | — | `HybridModuleCommand` | `src/commands/General/profile.ts` |
| `roleinfo` | Show role information | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/roleinfo.ts` |
| `servericon` | Show server icon | `Slash`<br>`Prefix` | `guildicon` | — | — | yes | `ModuleCommand` | `src/commands/General/info/servericon.ts` |
| `serverinfo` | Show server information | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/serverinfo.ts` |
| `serverstaff` | List server staff members | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/serverstaff.ts` |
| `stats` | Show bot statistics and performance metrics | `Slash`<br>`Prefix` | `statistics`<br>`metrics` | `ModuleEnabled` | — | yes | `ModuleCommand` | `src/commands/General/info/stats.ts` |
| `supportserver` | Get support server invite | `Slash`<br>`Prefix` | `support` | — | — | yes | `ModuleCommand` | `src/commands/General/info/supportserver.ts` |
| `uptime` | Show bot uptime | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/uptime.ts` |
| `userinfo` | Information about a given user | `Slash`<br>`User ctx`<br>`Msg ctx` | — | — | — | — | `Command` | `src/commands/General/userinfo.ts` |
| `yeet` | Show a fun user profile display | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/info/yeet.ts` |
| `youtube` | Search YouTube | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/General/youtube.ts` |

## Image (20)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `beautiful` | Apply beautiful filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/beautiful.ts` |
| `blur` | Apply blur filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/blur.ts` |
| `brightness` | Apply brightness filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/brightness.ts` |
| `contrast` | Apply contrast filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/contrast.ts` |
| `delete` | Apply delete filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/delete.ts` |
| `flip` | Apply flip filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/flip.ts` |
| `greyscale` | Apply greyscale filter to an avatar | `Slash`<br>`Prefix` | `gray` | — | — | yes | `ModuleCommand` | `src/commands/Image/greyscale.ts` |
| `image` | Apply an image filter to an avatar | `Slash` | — | — | — | yes | `HybridModuleCommand` | `src/commands/Image/image.ts` |
| `invert` | Apply invert filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/invert.ts` |
| `jail` | Apply jail filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/jail.ts` |
| `jpeg` | Apply jpeg filter to an avatar | `Slash`<br>`Prefix` | `needsmorejpeg` | — | — | yes | `ModuleCommand` | `src/commands/Image/jpeg.ts` |
| `pixelate` | Apply pixelate filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/pixelate.ts` |
| `rainbow` | Apply rainbow filter to an avatar | `Slash`<br>`Prefix` | `gay` | — | — | yes | `ModuleCommand` | `src/commands/Image/rainbow.ts` |
| `rotate` | Apply rotate filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/rotate.ts` |
| `sepia` | Apply sepia filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/sepia.ts` |
| `sharpen` | Apply sharpen filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/sharpen.ts` |
| `threshold` | Apply threshold filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/threshold.ts` |
| `triggered` | Apply triggered filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/triggered.ts` |
| `wanted` | Apply wanted filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/wanted.ts` |
| `wasted` | Apply wasted filter to an avatar | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Image/wasted.ts` |

<details><summary><code>image</code> — 2 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `(dynamic)` | sub | `-` | — |
| `help` | sub | `-` | Show the image filter options and usage |

</details>

## Leveling (3)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `leaderboard` | Top 10 most active members by XP in this server. | `Slash` | — | `ModuleEnabled` | — | — | `HybridModuleCommand` | `src/commands/Leveling/leaderboard.ts` |
| `level` | View leveling information. | `Slash` | — | `ModuleEnabled` | — | — | `HybridModuleCommand` | `src/commands/Leveling/level.ts` |
| `rank` | View your (or another member's) XP rank in this server. | `Slash` | — | `ModuleEnabled` | — | — | `HybridModuleCommand` | `src/commands/Leveling/rank.ts` |

<details><summary><code>level</code> — 5 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `rank` | sub | `-` | Whose rank to view |
| `leaderboard` | sub | `-` | Top 10 most active members by XP in this server. |
| `give-xp` | sub | `-` | Give XP to a member (Manage Server). |
| `remove-xp` | sub | `-` | Remove XP from a member (Manage Server). |
| `help` | sub | `-` | Show the leveling options and usage |

</details>

## Misc (4)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `colorpicker` | Pick a color and show it | `Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Misc/colorpicker.ts` |
| `password` | Generate a random password | `Prefix` | `genpassword`<br>`passgen` | — | — | yes | `ModuleCommand` | `src/commands/Misc/password.ts` |
| `randomnumber` | Generate a random number | `Prefix` | `random`<br>`rng` | — | — | yes | `ModuleCommand` | `src/commands/Misc/randomnumber.ts` |
| `uuid` | Generate a UUID | `Prefix` | `generateuuid` | — | — | yes | `ModuleCommand` | `src/commands/Misc/uuid.ts` |

## Moderation (20)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `addrole` | Add a role to a user | `Slash` | `giverole`<br>`addr`<br>`ar` | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/addrole.ts` |
| `automod` | Manage Discord AutoMod rules | `Slash` | — | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/automod.ts` |
| `ban` | Ban a member from the server | `Slash` | — | — | Moderation | — | `HybridModuleCommand` | `src/commands/Moderation/ban.ts` |
| `emoji` | Add an emoji to the server | `Slash` | — | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/emoji.ts` |
| `guild` | Manages guild settings and information | `Slash`<br>`Prefix` | — | `GuildOnly`<br>`ModeratorOnly` | — | — | `Command` | `src/commands/Moderation/guild.ts` |
| `kick` | Kick a member from the server | `Slash` | — | — | Moderation | — | `HybridModuleCommand` | `src/commands/Moderation/kick.ts` |
| `lock` | Lock a channel | `Slash` | — | `GuildOnly` | Moderation | yes | `HybridModuleCommand` | `src/commands/Moderation/lock.ts` |
| `massaction` | Server-wide moderation actions. | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/massaction.ts` |
| `mute` | Timeout a user | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/mute.ts` |
| `purge` | Bulk delete messages | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/purge.ts` |
| `purgebot` | Bulk delete bot messages | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/purgebot.ts` |
| `removerole` | Remove a role from a user | `Slash` | `remover`<br>`rr` | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/removerole.ts` |
| `setnickname` | Change a user's nickname | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/setnickname.ts` |
| `slowmode` | Set channel slowmode | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/slowmode.ts` |
| `softban` | Ban and immediately unban a user to clear their messages | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/softban.ts` |
| `timeout` | Timeout a member in the server | `Slash` | — | — | Moderation | — | `HybridModuleCommand` | `src/commands/Moderation/timeout.ts` |
| `unban` | Unban a user | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/unban.ts` |
| `unlock` | Unlock a channel | `Slash` | — | `GuildOnly` | Moderation | yes | `HybridModuleCommand` | `src/commands/Moderation/unlock.ts` |
| `unmute` | Remove a timeout from a user | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/unmute.ts` |
| `warn` | Manage moderation warning cases | `Slash` | `warning` | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Moderation/warn.ts` |

<details><summary><code>automod</code> — 14 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `list` | sub | `-` | List all AutoMod rules in the server |
| `create` | sub | `-` | Create a new AutoMod rule |
| `install` | sub | `-` | Install preset AutoMod rules |
| `delete` | sub | `-` | Delete an AutoMod rule |
| `keywords` | group | `-` | Manage AutoMod keyword filters |
| `list` | sub | `keywords` | List custom keywords for a category |
| `add` | sub | `keywords` | Add custom keywords to a category |
| `remove` | sub | `keywords` | Remove custom keywords from a category |
| `clear` | sub | `keywords` | Clear all custom keywords from a category |
| `scope` | group | `-` | Per-channel / per-role Helix filter rules |
| `list` | sub | `scope` | List every channel/role override |
| `exempt` | sub | `scope` | Exempt (or un-exempt) a channel/role from Helix AutoMod |
| `action` | sub | `scope` | Set the punishment for one Helix filter in a channel/role |
| `clear` | sub | `scope` | Remove every override for a channel/role |

</details>
<details><summary><code>emoji</code> — 1 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `add` | sub | `-` | Add a new emoji to the server |

</details>
<details><summary><code>massaction</code> — 5 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `nuke` | sub | `-` | Ban a member and delete their recent messages in every text channel. |
| `clone` | sub | `-` | Duplicate a channel, keeping its overwrites and settings. |
| `lockdown` | sub | `-` | Lock every text channel that is not already locked. |
| `unlockall` | sub | `-` | Unlock every channel Helix has locked. |
| `slowmode` | sub | `-` | Apply a slowmode preset to a channel or the whole server. |

</details>
<details><summary><code>warn</code> — 8 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `alias` | group | `-` | Manage warning reason aliases |
| `set` | sub | `alias` | Set or replace a warning reason alias |
| `remove` | sub | `alias` | Remove a warning reason alias |
| `list` | sub | `alias` | List warning reason aliases |
| `add` | sub | `-` | Create a warning case |
| `list` | sub | `alias` | List active warning cases |
| `clear` | sub | `alias` | Clear a warning case |
| `history` | sub | `alias` | List all warning cases |

</details>

## Pets (12)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `birb` | Get a random birb image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/birb.ts` |
| `bunny` | Get a random bunny image | `Slash`<br>`Prefix` | `bunnies` | — | — | yes | `ModuleCommand` | `src/commands/Pets/bunny.ts` |
| `doggo` | Get a random doggo image | `Slash`<br>`Prefix` | `doggos` | — | — | yes | `ModuleCommand` | `src/commands/Pets/doggo.ts` |
| `ferret` | Get a random ferret image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/ferret.ts` |
| `hamster` | Get a random hamster image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/hamster.ts` |
| `hedgehog` | Get a random hedgehog image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/hedgehog.ts` |
| `kitty` | Get a random kitty image | `Slash`<br>`Prefix` | `kitten`<br>`kittens` | — | — | yes | `ModuleCommand` | `src/commands/Pets/kitty.ts` |
| `otter` | Get a random otter image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/otter.ts` |
| `penguin` | Get a random penguin image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/penguin.ts` |
| `pet` | Get a random pet image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/pet.ts` |
| `pupper` | Get a random pupper image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/pupper.ts` |
| `squirrel` | Get a random squirrel image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Pets/squirrel.ts` |

## Reaction Roles (1)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `reactionroles` | Manage reaction roles | `Slash` | — | `GuildOnly` | — | — | `HybridModuleCommand` | `src/commands/ReactionRoles/reactionroles/index.ts` |

<details><summary><code>reactionroles</code> — 6 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `create` | sub | `-` | Create a new role selection menu |
| `list` | sub | `-` | List all reaction roles menus in this server |
| `delete` | sub | `-` | Delete a reaction roles menu |
| `pause` | sub | `-` | Pause a reaction roles menu |
| `resume` | sub | `-` | Resume a paused reaction roles menu |
| `edit` | sub | `-` | Edit an existing role selection menu |

</details>

## Reddit (14)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bird` | Get a random bird image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/bird.ts` |
| `capybara` | Get a random capybara image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/capybara.ts` |
| `cat` | Get a random cat image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/cat.ts` |
| `dog` | Get a random dog image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/dog.ts` |
| `duck` | Get a random duck image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/duck.ts` |
| `fox` | Get a random fox image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/fox.ts` |
| `frog` | Get a random frog image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/frog.ts` |
| `koala` | Get a random koala image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/koala.ts` |
| `lizard` | Get a random lizard image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/lizard.ts` |
| `panda` | Get a random panda image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/panda.ts` |
| `rabbit` | Get a random rabbit image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/rabbit.ts` |
| `raccoon` | Get a random raccoon image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/raccoon.ts` |
| `redpanda` | Get a random redpanda image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/redpanda.ts` |
| `snake` | Get a random snake image | `Slash`<br>`Prefix` | — | — | — | yes | `ModuleCommand` | `src/commands/Reddit/snake.ts` |

## Verification (3)

| Command | Description | Types | Aliases | Guards | Module | Ephemeral | Base | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `setup-verification` | Quick setup for verification system | `Slash` | — | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Verification/setup-verification.ts` |
| `verification` | Configure verification settings | `Slash` | — | `GuildOnly`<br>`ModeratorOnly` | — | — | `HybridModuleCommand` | `src/commands/Verification/verification.ts` |
| `verify-info` | Information about server verification | `Slash` | — | — | — | — | `HybridModuleCommand` | `src/commands/Verification/verify-info.ts` |

<details><summary><code>verification</code> — 9 subcommands</summary>

| Subcommand | Type | Parent group | Description |
| --- | --- | --- | --- |
| `channel` | sub | `-` | Set the verification channel |
| `message` | sub | `-` | Set verification messages |
| `title` | sub | `-` | Set the verification embed title |
| `footer` | sub | `-` | Set the verification embed footer |
| `thumbnail` | sub | `-` | Set the verification embed thumbnail |
| `role` | sub | `-` | Set the verification role |
| `status` | sub | `-` | Check current verification settings |
| `toggle` | sub | `-` | Enable or disable verification |
| `help` | sub | `-` | Show the verification options and usage |

</details>

## Non-command files under `src/commands/`

13 files carry no `@ApplyOptions` — helper modules, shared renderers, or subcommand shards that the parent command imports. They are not registered with Discord.

| File | Role |
| --- | --- |
| `src/commands/Developer/user-manage/_diamonds.ts` | helper |
| `src/commands/Developer/user-manage/_items.ts` | helper |
| `src/commands/Developer/user-manage/_money.ts` | helper |
| `src/commands/Developer/user-manage/_profile.ts` | helper |
| `src/commands/Developer/user-manage/_utils.ts` | helper |
| `src/commands/General/help/_permissions.ts` | helper |
| `src/commands/General/help/_rendering.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_create.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_delete.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_edit.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_list.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_pause.ts` | helper |
| `src/commands/ReactionRoles/reactionroles/_utils.ts` | helper |
