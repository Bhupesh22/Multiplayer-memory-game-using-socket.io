import seedrandom from 'seedrandom';
import { nanoid } from 'nanoid';
import Player from '../../lib/Player';
import {
  GameMove,
  MemoryGameMove,
  MemoryGameState,
  MemoryBoardSize,
  MemoryGameSettings,
  MemoryGameCell,
} from '../../types/CoveyTownSocket';
import {
  BOARD_POSITION_NOT_VALID_MESSAGE,
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  GAME_NOT_STARTABLE_MESSAGE,
  INVALID_SETTINGS_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
  COMPETITIVE_MODE_NOT_CUSTOMIZABLE_MESSAGE,
  GAME_SETTINGS_MISSING_MESSAGE,
} from '../../lib/InvalidParametersError';
import Game from './Game';
import DefaultMemoryGameSettings from './DefaultMemoryGameSettings';
import LeaderboardDatabase from '../LeaderboardDatabase';

export default class MemoryGame extends Game<MemoryGameState, MemoryGameMove> {
  private _randomNumberGenerator: seedrandom.PRNG;

  private _tilePercentage: number;

  private _increasingDifficulty: boolean;

  private _tilesToMemorize: number;

  private _currentScoreIncrement: number;

  private _gameStarted: boolean;

  private _timerId: NodeJS.Timeout | null = null;

  private _remainingMistakesPerLevel: number;

  private _areaChangedEmitter: () => void;

  protected _defaultMemoryGameSettings: DefaultMemoryGameSettings;

  private _leaderboardDatabase: LeaderboardDatabase;

  private _playerUsername: string;

  private _competitiveMode: boolean;

  // Timer methods created with the help of chatGPT
  // Method to start the timer
  private _startTimer(duration: number, callback: () => void) {
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
    this._timerId = setTimeout(() => {
      callback();
      this._areaChangedEmitter();
    }, duration * 1000);
  }

  // Method to interrupt and clear the timer
  private _interruptTimer() {
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  /**
   * Creates a new MemoryGame.
   * Does not populate the MemoryGameState with values until the game is started, as the player may
   * choose to play in casual mode with different settings.
   *
   * @param seed A seed to use for the random number generator. If not provided, a random seed will be used.
   * A seed should only be provided for testing purposes.
   */
  public constructor(
    defaultMemoryGameSettings: DefaultMemoryGameSettings,
    leaderboardDatabase: LeaderboardDatabase,
    seed?: string,
  ) {
    super({
      score: 0,
      lives: 0,
      boardSize: { rows: 0, columns: 0 },
      solutionBoard: [],
      guessesBoard: [],
      transmiteScore: false,
      status: 'WAITING_FOR_PLAYERS',
      memorizationTimeSeconds: 0,
      guessingTimeSeconds: 0,
    });
    if (seed) {
      this._randomNumberGenerator = seedrandom(seed);
    } else {
      this._randomNumberGenerator = seedrandom();
    }
    this._tilePercentage = defaultMemoryGameSettings.targetTilesPercentage;
    this._increasingDifficulty = false;
    this._tilesToMemorize = 0;
    this._gameStarted = false;
    this._remainingMistakesPerLevel = 3;
    this._currentScoreIncrement = 0;
    this._areaChangedEmitter = () => {};
    this._defaultMemoryGameSettings = defaultMemoryGameSettings;
    this._leaderboardDatabase = leaderboardDatabase;
    this._playerUsername = '';
    this._competitiveMode = false;
  }

  /**
   * Applies a move to the game. If the move is correct, increments the score by the number of tiles the user
   * needs to memorize for that level. After three wrong moves, decrements the lives by one, and shows the
   * same pattern to the user so that they can try again.
   *
   *
   * If the move ends the game, updates the game state to reflect the end of the game,
   * setting the status to "OVER".
   *
   * @param move The move to attempt to apply
   *
   * @throws InvalidParametersError if the game is not IN_PROGRESS or WAITING_TO_STAR  (GAME_NOT_IN_PROGRESS_MESSAGE)
   * @throws InvalidParametersError if the player is not in the game (PLAYER_NOT_IN_GAME_MESSAGE)
   * @throws InvalidParametersError if the move is invalid (out of bounds or a repeat of a prior move in the same level) (BOARD_POSITION_NOT_VALID_MESSAGE)
   *
   */
  public applyMove(move: GameMove<MemoryGameMove>): void {
    if (this.state.status !== 'IN_PROGRESS' && this.state.status !== 'WAITING_TO_START') {
      this._interruptTimer();
      throw new Error(GAME_NOT_IN_PROGRESS_MESSAGE);
    }
    if (this.state.player !== move.playerID) {
      this._interruptTimer();
      throw new Error(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    if (this.state.status === 'WAITING_TO_START') {
      this._interruptTimer();
      this._startGuessingPeriod();
    }
    this.state.transmiteScore = move.move.transmitScore;
    const { row, column } = move.move;
    if (
      row < 0 ||
      row >= this.state.boardSize.rows ||
      column < 0 ||
      column >= this.state.boardSize.columns
    ) {
      this._interruptTimer();
      throw new Error(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
    if (this.state.guessesBoard[row][column] !== undefined) {
      this._interruptTimer();
      throw new Error(BOARD_POSITION_NOT_VALID_MESSAGE);
    }
    if (this.state.solutionBoard[row][column]) {
      this.state.guessesBoard[row][column] = true;
      this.state.score += this._currentScoreIncrement;
      this._tilesToMemorize--;
      if (this._tilesToMemorize === 0) {
        if (this._increasingDifficulty) {
          this.state.boardSize = {
            rows: Math.min(24, this.state.boardSize.rows + 1),
            columns: Math.min(24, this.state.boardSize.columns + 1),
          };
        }
        this._initializedNewLevel(this.state.boardSize);
      }
    } else {
      this.state.guessesBoard[row][column] = false;
      this._remainingMistakesPerLevel--;
      if (this._remainingMistakesPerLevel === 0) {
        this._levelFailed();
      }
    }
  }

  /**
   * Joins a player to the game.
   *
   * Note: Does not update the game status from WAITING_FOR_PLAYERS, as game status is handled
   * differently from other games for this game.
   *
   * @throws InvalidParametersError if the player is already in the game (PLAYER_ALREADY_IN_GAME_MESSAGE)
   * @throws InvalidParametersError if the game is full (GAME_FULL_MESSAGE)
   *
   * @param player the player to join the game
   */
  protected _join(player: Player): void {
    if (this.state.player === player.id) {
      this._interruptTimer();
      throw new Error(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (this.state.player) {
      throw new Error(GAME_FULL_MESSAGE);
    }
    this.state.player = player.id;
    this._playerUsername = player.userName;
  }

  /**
   * When called indicates that a player has left the game.
   *
   * Removes a player from the game if the game status is WAITING_FOR_PLAYERS.
   * Updates the game's state to reflect the player leaving.
   *
   * If the game state is currently "IN_PROGRESS" or "gT", updates the game's status to OVER.
   *
   * If the game state is currently "WAITING_FOR_PLAYERS" or "OVER", the game state is unchanged.
   *
   * @param player The player to remove from the game
   * @throws InvalidParametersError if the player is not in the game (PLAYER_NOT_IN_GAME_MESSAGE)
   */
  protected _leave(player: Player): void {
    if (this.state.player !== player.id) {
      throw new Error(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    if (this.state.status === 'WAITING_FOR_PLAYERS') {
      this.state.player = undefined;
    } else {
      this.state.status = 'OVER';
    }
    this._interruptTimer();
  }

  /**
   * Starts the game.
   *
   * If the player chooses to play in competitive mode, the game will begin with default settings as defined in
   * the DefaultMemoryGameSettings class.
   *
   * If the player chooses to play in casual mode, they can optionally pick their own starting settings
   * and input them in the customizedSettings parameter.
   *
   * The game status will be updated to "WAITING_TO_START" after this method is called, as this is
   * the state indicating that a pattern is being displayed for memorization.
   *
   * @throws InvalidParametersError if competitiveMode is true and the customizedSettings parameter is
   * supplied (COMPETITIVE_MODE_NOT_CUSTOMIZABLE_MESSAGE)
   *
   * @throws InvalidParametersError if the game is not in the WAITING_FOR_PLAYERS state with one player having
   * joined already and the game has not already been started (GAME_NOT_STARTABLE_MESSAGE)
   *
   * @throws InvalidParametersError if any of the settings in the customizedSettings parameter are invalid.
   * Any settings that do not conform to the following specifications are invalid:
   * - targetTilesPercentage: a number between 0 and 1
   * - startingBoardSize: an object with a rows property and a columns property, both of which are positive integers
   * - startingLives: a positive integer
   * - memorizationTimeSeconds: a positive number
   * - guessingTimeSeconds: a positive number
   *
   *  Note: the isPlayable setting is not checked, as it is not used in this method.
   *
   * @param competitiveMode whether the game should be played in competitive mode
   * @param customizedSettings the settings to use for the game if playing in casual mode.
   *
   */
  public startGame(
    competitiveMode: boolean,
    emitter: () => void,
    customizedSettings?: MemoryGameSettings,
  ): void {
    if (competitiveMode && customizedSettings) {
      this._interruptTimer();
      throw new Error(COMPETITIVE_MODE_NOT_CUSTOMIZABLE_MESSAGE);
    }
    if (!competitiveMode && !customizedSettings) {
      this._interruptTimer();
      throw new Error(GAME_SETTINGS_MISSING_MESSAGE);
    }
    if (
      this.state.status !== 'WAITING_FOR_PLAYERS' ||
      this.state.player === undefined ||
      this._gameStarted
    ) {
      throw new Error(GAME_NOT_STARTABLE_MESSAGE);
    }
    if (customizedSettings) {
      this._throwErrorIfCustomSettingsAreInvalid(customizedSettings);

      // Limit the maxima size of the board to 24x24
      const rows = Math.min(24, customizedSettings.startingBoardSize.rows);
      const columns = Math.min(24, customizedSettings.startingBoardSize.columns);

      this._tilePercentage = customizedSettings.targetTilesPercentage;
      this.state.boardSize = { rows, columns };
      this.state.lives = customizedSettings.startingLives;
      this.state.score = 0;
      this.state.memorizationTimeSeconds = customizedSettings.memorizationTimeSeconds;
      this.state.guessingTimeSeconds = customizedSettings.guessingTimeSeconds;
      this._increasingDifficulty = customizedSettings.increasingDifficulty;
    } else {
      const rows = Math.min(24, this._defaultMemoryGameSettings.startingBoardSize.rows);
      const columns = Math.min(24, this._defaultMemoryGameSettings.startingBoardSize.columns);

      const settings = this._defaultMemoryGameSettings;
      this._tilePercentage = settings.targetTilesPercentage;
      this.state.boardSize = { rows, columns };
      this.state.lives = settings.startingLives;
      this.state.score = 0;
      this.state.memorizationTimeSeconds = settings.memorizationTimeSeconds;
      this.state.guessingTimeSeconds = settings.guessingTimeSeconds;
      this._increasingDifficulty = settings.increasingDifficulty;
      this._competitiveMode = true;
    }
    this.state.unknownTileColor = this._defaultMemoryGameSettings.unknownTileColor ?? 'white';
    this.state.tileShape = this._defaultMemoryGameSettings.tileShape ?? 'square';
    this._areaChangedEmitter = emitter;
    this._gameStarted = true;
    this._initializedNewLevel(this.state.boardSize);
  }

  private _throwErrorIfCustomSettingsAreInvalid(customizedSettings: MemoryGameSettings) {
    if (
      customizedSettings.targetTilesPercentage < 0 ||
      customizedSettings.targetTilesPercentage > 1
    ) {
      this._interruptTimer();
      throw new Error(INVALID_SETTINGS_MESSAGE);
    }
    if (
      customizedSettings.startingBoardSize.rows < 1 ||
      customizedSettings.startingBoardSize.rows % 1 !== 0 ||
      customizedSettings.startingBoardSize.columns < 1 ||
      customizedSettings.startingBoardSize.columns % 1 !== 0
    ) {
      this._interruptTimer();
      throw new Error(INVALID_SETTINGS_MESSAGE);
    }
    if (customizedSettings.startingLives < 1 || customizedSettings.startingLives % 1 !== 0) {
      this._interruptTimer();
      throw new Error(INVALID_SETTINGS_MESSAGE);
    }
    if (customizedSettings.memorizationTimeSeconds <= 0) {
      this._interruptTimer();
      throw new Error(INVALID_SETTINGS_MESSAGE);
    }
    if (customizedSettings.guessingTimeSeconds <= 0) {
      this._interruptTimer();
      throw new Error(INVALID_SETTINGS_MESSAGE);
    }
  }

  private _initializedNewLevel(boardSize: MemoryBoardSize): void {
    this._generateBoard(boardSize);
    this.state.boardSize = boardSize;
    this._interruptTimer();
    this._startTimer(this.state.memorizationTimeSeconds, this._startGuessingPeriod.bind(this));
    this.state.status = 'WAITING_TO_START';
    this._remainingMistakesPerLevel = 3;
  }

  private _startGuessingPeriod(): void {
    this.state.status = 'IN_PROGRESS';
    this._interruptTimer();
    this._startTimer(this.state.guessingTimeSeconds, this._levelFailed.bind(this));
  }

  private _levelFailed(): void {
    this._interruptTimer();
    this.state.lives--;
    if (this.state.lives === 0) {
      this._endGame();
    } else {
      this._restartLevel();
    }
  }

  private _restartLevel(): void {
    // Reset the guesses board
    this.state.guessesBoard = [];
    for (let i = 0; i < this.state.boardSize.rows; i++) {
      const rowGuesses: MemoryGameCell[] = [];
      for (let j = 0; j < this.state.boardSize.columns; j++) {
        rowGuesses.push(undefined);
      }
      this.state.guessesBoard.push(rowGuesses);
    }
    this._interruptTimer();
    this._startTimer(this.state.memorizationTimeSeconds, this._startGuessingPeriod.bind(this));
    this.state.status = 'WAITING_TO_START';
    this._remainingMistakesPerLevel = 3;
    this._tilesToMemorize = this._currentScoreIncrement;
  }

  private _endGame(): void {
    this._interruptTimer();
    this.state.status = 'OVER';
    this.state.player = undefined;
    if (this.state.transmiteScore && this._competitiveMode) {
      this._leaderboardDatabase.addScore({
        _id: nanoid(),
        score: this.state.score,
        date: new Date(),
        playerUsername: this._playerUsername,
        gameType: 'MemoryGameArea',
      });
    }
  }

  /**
   * Generates a new game board. The number of true tiles is determined by the tilePercentage, and
   * the positions of the true tiles are determined by the random number generator.
   * The game board is a 2D array of booleans.
   * Each boolean represents whether a card is face up or face down.
   *
   * @param boardSize the size of the board that should be generated
   */
  private _generateBoard(boardSize: MemoryBoardSize): void {
    this.state.guessesBoard = [];
    this.state.solutionBoard = [];
    const trueTileTarget = Math.ceil(boardSize.rows * boardSize.columns * this._tilePercentage);
    this._tilesToMemorize = trueTileTarget;
    this._currentScoreIncrement = trueTileTarget;
    let trueTilesPlaced = 0;

    for (let i = 0; i < boardSize.rows; i++) {
      const rowSolution: MemoryGameCell[] = [];
      const rowGuesses: MemoryGameCell[] = [];
      for (let j = 0; j < boardSize.columns; j++) {
        rowSolution.push(false);
        rowGuesses.push(undefined);
      }
      this.state.solutionBoard.push(rowSolution);
      this.state.guessesBoard.push(rowGuesses);
    }

    while (trueTilesPlaced < trueTileTarget) {
      const row = Math.floor(this._randomNumberGenerator() * boardSize.rows);
      const column = Math.floor(this._randomNumberGenerator() * boardSize.columns);
      if (this.state.solutionBoard[row][column] === false) {
        this.state.solutionBoard[row][column] = true;
        trueTilesPlaced++;
      }
    }
  }
}
