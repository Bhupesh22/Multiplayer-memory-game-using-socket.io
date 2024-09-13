import InvalidParametersError, {
  GAME_DISABLED_BY_ADMIN_MESSAGE,
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  BoundingBox,
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  MemoryGameMove,
  MemoryGameState,
  TownEmitter,
} from '../../types/CoveyTownSocket';
import LeaderboardDatabase from '../LeaderboardDatabase';
import DefaultMemoryGameSettings from './DefaultMemoryGameSettings';
import GameArea from './GameArea';
import MemoryGame from './MemoryGame';

export default class MemoryGameGameArea extends GameArea<MemoryGame> {
  public defaultMemoryGameSettings: DefaultMemoryGameSettings;

  private _leaderboardDatabase: LeaderboardDatabase;

  public constructor(
    id: string,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
    defaultMemoryGameSettings: DefaultMemoryGameSettings,
    leaderboardDatabase: LeaderboardDatabase,
  ) {
    super(id, coordinates, townEmitter);
    this.defaultMemoryGameSettings = defaultMemoryGameSettings;
    this._leaderboardDatabase = leaderboardDatabase;
  }

  private _stateUpdated(updatedState: GameInstance<MemoryGameState>) {
    // Since we have our own custom system for recording the outcome of games via the leaderboard,
    // we don't need to record the outcome here.
    this._emitAreaChanged();
  }

  /**
   * Handle a command from a player in this game area.
   * Supported commands:
   * - JoinGame (joins the game `this._game`, or creates a new one if none is in progress)
   * - StartGame (indicates that the player is ready to start the game, and sets the game settings)
   * - GameMove (applies a move to the game)
   * - LeaveGame (leaves the game)
   *
   * If the command is successful (does not throw an error), calls this._emitAreaChanged (necessary
   * to notify any listeners of a state update, including any change to history)
   * If the command is unsuccessful (throws an error), the error is propagated to the caller
   *
   * @see InteractableCommand
   *
   * @param command command to handle
   * @param player player making the request
   * @returns response to the command, @see InteractableCommandResponse
   * @throws InvalidParametersError if the command is not supported or is invalid.
   * Invalid commands:
   * - GameMove, MemoryGameStartGameCommand and LeaveGame: if the game is not in progress (GAME_NOT_IN_PROGRESS_MESSAGE) or if the game ID does not match the game in progress (GAME_ID_MISSMATCH_MESSAGE)
   * - Any command besides JoinGame, GameMove, MemoryGameStartGameCommand and LeaveGame: INVALID_COMMAND_MESSAGE
   */
  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
    player: Player,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'GameMove') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.applyMove({
        gameID: command.gameID,
        playerID: player.id,
        move: command.move as MemoryGameMove,
      });
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'JoinGame') {
      if (this.defaultMemoryGameSettings.isPlayable === false) {
        throw new InvalidParametersError(GAME_DISABLED_BY_ADMIN_MESSAGE);
      } else {
        let game = this._game;
        if (!game || game.state.status === 'OVER') {
          // No game in progress, make a new one
          game = new MemoryGame(this.defaultMemoryGameSettings, this._leaderboardDatabase);
          this._game = game;
        }
        game.join(player);
        this._stateUpdated(game.toModel());
        return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
      }
    }
    if (command.type === 'LeaveGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.leave(player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'MemoryGameStartGame') {
      let game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this._game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      if (game.state.status === 'OVER') {
        // If game is over, make a new one
        game = new MemoryGame(this.defaultMemoryGameSettings, this._leaderboardDatabase);
        game.join(player);
        this._game = game;
      }
      game.startGame(
        command.competitiveMode,
        this._emitAreaChanged.bind(this),
        command.customizedSettings,
      );
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }

  protected getType(): InteractableType {
    return 'MemoryGameArea';
  }
}
