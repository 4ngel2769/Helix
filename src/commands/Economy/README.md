# Economy Module

Economy module! (Very cool)

## Configuration

- **Target Audience**: users
- **Default Enabled**: Yes
- **Required Permissions**: None

## Commands

### `balance`
Check your money balance

**Type**: both
**Usage**: `/balance`

## Setup

1. Enable the module in your server using `/configmodule`
2. No additional setup required

## Development

To add new commands to this module:
1. Create a new file in `src/commands/Economy/`
2. Extend `ModuleCommand<EconomyModule>`
3. Set the module property to `'Economy'`

### Features Used

- **Command Type**: both
- **Subcommands**: No
- **Context Menus**: No
- **Modals**: No
- **Options**: No

