export const INVALID_MOVE_MESSAGE = 'Invalid move';
export const INVALID_COMMAND_MESSAGE = 'Invalid command';

export const GAME_FULL_MESSAGE = 'Game is full';
export const GAME_NOT_IN_PROGRESS_MESSAGE = 'Game is not in progress';
export const GAME_OVER_MESSAGE = 'Game is over';
export const GAME_ID_MISSMATCH_MESSAGE = 'Game ID mismatch';

export const GAME_NOT_STARTABLE_MESSAGE = 'Game is not startable';

export const BOARD_POSITION_NOT_EMPTY_MESSAGE = 'Board position is not empty';
export const MOVE_NOT_YOUR_TURN_MESSAGE = 'Not your turn';
export const BOARD_POSITION_NOT_VALID_MESSAGE = 'Board position is not valid';

export const PLAYER_NOT_IN_GAME_MESSAGE = 'Player is not in this game';
export const PLAYER_ALREADY_IN_GAME_MESSAGE = 'Player is already in this game';
export const PLAYER_IS_NOT_AN_ADMINISTRATOR = 'Player is not an administrator';
export const NO_NEGATIVE_NUMBERS_MESSAGE = 'Negative numbers are not allowed';

export const COMPETITIVE_MODE_NOT_CUSTOMIZABLE_MESSAGE =
  'Player cannot customize settings in Competitive mode';
export const INVALID_SETTINGS_MESSAGE = 'The provided game settings are invalid';

export const GAME_SETTINGS_MISSING_MESSAGE = 'Game settings are missing but expected';

export const GAME_DISABLED_BY_ADMIN_MESSAGE = 'Game is disabled by an administrator';
export default class InvalidParametersError extends Error {
  public message: string;

  public constructor(message: string) {
    super(message);
    this.message = message;
  }
}
