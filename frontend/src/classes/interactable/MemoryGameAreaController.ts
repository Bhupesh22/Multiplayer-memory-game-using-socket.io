import {
  GameArea,
  GameStatus,
  MemoryGameBoard,
  MemoryGameMove,
  MemoryGameSettings,
  MemoryGameStartGameCommand,
  MemoryGameState,
} from '../../types/CoveyTownSocket';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
} from './GameAreaController';

export type MemoryGameEvents = GameEventTypes & {
  boardChanged: (board: MemoryGameBoard) => void;
  solutionBoardChanged: (solutionBoard: MemoryGameBoard) => void;
};

/**
 * This class is responsible for managing the state of the Memory game, and for sending commands to the server
 */
export default class MemoryGameAreaController extends GameAreaController<
  MemoryGameState,
  MemoryGameEvents
> {
  protected _guessBoard: MemoryGameBoard = [];

  protected _solutionBoard: MemoryGameBoard = [];

  /**
   * Returns the current state of the board.
   *
   * The board is a varriable array of MemoryGame, which is either 'correct', 'incorrect', or undefined.
   *
   * The 2-dimensional array is indexed by row and then column, so board[0][0] is the top-left cell,
   */
  get guessBoard(): MemoryGameBoard {
    this._guessBoard.forEach((row, rowI) =>
      row.forEach((cell, cellI) => {
        if (cell === null) {
          this._guessBoard[rowI][cellI] = undefined;
        }
      }),
    );
    return this._guessBoard;
  }

  /**
   * Returns the solution board.
   *
   * The board is a varriable array of MemoryGame, which is either 'correct', 'incorrect', or undefined.
   *
   * The 2-dimensional array is indexed by row and then column, so board[0][0] is the top-left cell,
   */
  get solutionBoard(): MemoryGameBoard {
    return this._solutionBoard;
  }

  /**
   * Returns the player, if there is one, or undefined otherwise
   */
  get player(): string | undefined {
    return this._model.game?.state.player;
  }

  /**
   * Returns the score of the game, if there is one, or undefined otherwise
   */
  get score(): number | undefined {
    return this._model.game?.state.score || 0;
  }

  /**
   * Returns the amount of lives left in the game if it is started
   */
  get livesRemaining(): number | undefined {
    return this._model.game?.state.lives || 0;
  }

  /**
   * Returns the status of the game
   * If there is no game, returns 'WAITING_FOR_PLAYERS'
   */
  get status(): GameStatus {
    const status = this._model.game?.state.status;
    if (!status) {
      return 'WAITING_FOR_PLAYERS';
    }
    return status;
  }

  /**
   * Returns the max time that the game has given the player to memorize the board
   */
  get memorizationTimeSeconds(): number {
    return this._model.game?.state.memorizationTimeSeconds || 0;
  }

  /**
   * Returns the max time that the game has given the player to make guesses
   */
  get guessTimeSeconds(): number {
    return this._model.game?.state.guessingTimeSeconds || 0;
  }

  /**
   * Returns true if the current player is in the game, false otherwise
   */
  get isPlayer(): boolean {
    return this._model.game?.state.player === this._townController.ourPlayer.id;
  }

  /**
   * Returns the shape of the tiles in the game
   */
  get tileShape(): string {
    return this._model.game?.state.tileShape || 'square';
  }

  /**
   * Returns the color of the unknown tiles in the game
   */
  get unknownTileColor(): string {
    return this._model.game?.state.unknownTileColor || 'white';
  }

  /**
   * Updates the internal state of this MemoryGameAreaController based on the new model.
   *
   * Calls super._updateFrom, which updates the occupants of this game area and other
   * common properties (including this._model)
   *
   * If the board has changed, emits a boardChanged event with the new board.
   * If the board has not changed, does not emit a boardChanged event.
   *
   * If the SolutionBoard has changed, emits a solutionBoardChanged event with the new board.
   * If the SolutionBoard has not changed, does not emit a solutionBoardChanged event.
   */
  protected _updateFrom(newModel: GameArea<MemoryGameState>): void {
    super._updateFrom(newModel);
    const newBoard = newModel.game?.state.guessesBoard;
    const newSolutionBoard = newModel.game?.state.solutionBoard;
    if (newBoard && newBoard !== this._guessBoard) {
      this._guessBoard = newBoard;
      this.emit('boardChanged', this._guessBoard);
    }
    if (newSolutionBoard && newSolutionBoard !== this.solutionBoard) {
      this._solutionBoard = newSolutionBoard;
      this.emit('solutionBoardChanged', this._solutionBoard);
    }
  }

  /**
   * Sends a request to the server to start the game with the given settings.
   * if a game is competitive, it cannot pass settings back
   *
   * If the game is not in the WAITING_TO_START state, throws an error.
   *
   * @throws an error with message NO_GAME_STARTABLE if there is no game waiting to start
   */
  public async startGame(isCompetitive: boolean, settings: MemoryGameSettings): Promise<void> {
    const instanceID = this._instanceID;
    if (
      !instanceID ||
      !(
        this._model.game?.state.status === 'WAITING_FOR_PLAYERS' ||
        this._model.game?.state.status === 'OVER'
      )
    ) {
      throw new Error(NO_GAME_STARTABLE);
    }
    await this._townController.sendInteractableCommand(this.id, {
      gameID: instanceID,
      type: 'MemoryGameStartGame',
      competitiveMode: isCompetitive,
      customizedSettings: isCompetitive ? undefined : settings,
    } as MemoryGameStartGameCommand);
  }

  /**
   * Sends a request to the server to place the current player's game piece in the given row and column.
   * Does not check if the move is valid.
   *
   * @throws an error with message NO_GAME_IN_PROGRESS_ERROR if there is no game in progress
   *
   */
  public async makeMove(move: MemoryGameMove): Promise<void> {
    if (
      !this._instanceID ||
      this._model.game?.state.status === 'WAITING_FOR_PLAYERS' ||
      this._model.game?.state.status === 'OVER'
    ) {
      throw new Error(NO_GAME_IN_PROGRESS_ERROR);
    }
    await this._townController.sendInteractableCommand(this.id, {
      gameID: this._instanceID,
      type: 'GameMove',
      move,
    });
  }

  /**
   * Returns if the game is still active and not over or waiting for players
   */
  public isActive(): boolean {
    return (
      !this.isEmpty() &&
      this.status &&
      this.status !== 'OVER' &&
      this.status !== 'WAITING_FOR_PLAYERS'
    );
  }
}
