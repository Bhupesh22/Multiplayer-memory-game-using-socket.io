import { nanoid } from 'nanoid';
import { mock } from 'jest-mock-extended';
import Player from '../../lib/Player';
import {
  GameMove,
  MemoryGameMove,
  MemoryGameSettings,
  MemoryGameState,
  TownEmitter,
} from '../../types/CoveyTownSocket';
import MemoryGameGameArea from './MemoryGameGameArea';
import Game from './Game';
import { createPlayerForTesting } from '../../TestUtils';
import DefaultMemoryGameSettings from './DefaultMemoryGameSettings';
import {
  GAME_DISABLED_BY_ADMIN_MESSAGE,
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';
import LeaderboardDatabase from '../LeaderboardDatabase';

class TestingGame extends Game<MemoryGameState, MemoryGameMove> {
  private _tilePercentage: number;

  private _memorizationTime: number;

  private _guessingTimeSeconds: number;

  private _increasingDifficulty: boolean;

  public constructor() {
    super({
      score: 0,
      lives: 0,
      boardSize: { rows: 0, columns: 0 },
      solutionBoard: [],
      guessesBoard: [],
      status: 'WAITING_FOR_PLAYERS',
      transmiteScore: false,
      memorizationTimeSeconds: 0,
      guessingTimeSeconds: 0,
    });
    this._tilePercentage = 0.25;
    this._memorizationTime = 0;
    this._guessingTimeSeconds = 0;
    this._increasingDifficulty = false;
  }

  public applyMove(move: GameMove<MemoryGameMove>): void {}

  public endGame(score?: number) {
    this.state = {
      ...this.state,
      status: 'OVER',
      score: score || 0,
    };
  }

  public startGame(competitiveMode: boolean, customizedSettings: MemoryGameSettings) {
    this._tilePercentage = customizedSettings.targetTilesPercentage;
    this.state.boardSize = customizedSettings.startingBoardSize;
    this.state.lives = customizedSettings.startingLives;
    this.state.score = 0;
    this._memorizationTime = customizedSettings.memorizationTimeSeconds;
    this._guessingTimeSeconds = customizedSettings.guessingTimeSeconds;
    this._increasingDifficulty = customizedSettings.increasingDifficulty;
    this.state.status = 'WAITING_TO_START';
  }

  protected _join(_player: Player): void {
    this.state.player = _player.id;
    this._players.push(_player);
  }

  protected _leave(player: Player): void {}
}

describe('MemoryGameGameArea', () => {
  let gameArea: MemoryGameGameArea;
  let player: Player;
  let game: TestingGame;
  let defaultMemoryGameSettings: DefaultMemoryGameSettings;
  let leaderboardDatabase: LeaderboardDatabase;

  beforeEach(() => {
    player = createPlayerForTesting();
    game = new TestingGame();
    leaderboardDatabase = mock<LeaderboardDatabase>();
    defaultMemoryGameSettings = new DefaultMemoryGameSettings();
    gameArea = new MemoryGameGameArea(
      nanoid(),
      { x: 0, y: 0, width: 100, height: 100 },
      mock<TownEmitter>(),
      defaultMemoryGameSettings,
      leaderboardDatabase,
    );
    gameArea.add(player);
    game.join(player);
  });
  // NOTE: Based on professor recommendations and restrictions related to not disabling linter rules for tests,
  // there are far fewer tests in this class then the other GameArea classes.
  // Instead this class relies on manual testing for everything except error conditions.
  describe('[T3.2] MemoryGameStartGame command', () => {
    it('should throw an error if the command specified is StartGame instead of MemoryGameStartGame', () => {
      expect(() =>
        gameArea.handleCommand({ type: 'StartGame', gameID: nanoid() }, player),
      ).toThrowError(INVALID_COMMAND_MESSAGE);
    });
    it('when there is no game, it should throw an error', () => {
      expect(() =>
        gameArea.handleCommand(
          { type: 'MemoryGameStartGame', gameID: nanoid(), competitiveMode: true },
          player,
        ),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
    });
    it('should throw an error if the game has been desabled by town administrator', () => {
      defaultMemoryGameSettings.isPlayable = false;
      expect(() => gameArea.handleCommand({ type: 'JoinGame' }, player)).toThrowError(
        GAME_DISABLED_BY_ADMIN_MESSAGE,
      );
    });
    describe('when there is a game in progress', () => {
      test('when the game ID mismatches, it should throw an error ', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, player);
        if (!game) {
          throw new Error('Game was not created by the first call to join');
        }
        expect(() =>
          gameArea.handleCommand(
            { type: 'MemoryGameStartGame', gameID: nanoid(), competitiveMode: true },
            player,
          ),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
      });
    });
  });
  describe('[T3.3] GameMove command', () => {
    it('should throw an error if there is no game in progress', () => {
      expect(() =>
        gameArea.handleCommand(
          {
            type: 'GameMove',
            move: { column: 0, row: 0, transmitScore: false, gamePiece: undefined },
            gameID: nanoid(),
          },
          player,
        ),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
    });
    describe('when there is a game in progress', () => {
      it('should throw an error if the gameID does not match the game', () => {
        const { gameID } = gameArea.handleCommand({ type: 'JoinGame' }, player);
        gameArea.handleCommand(
          { type: 'MemoryGameStartGame', gameID, competitiveMode: true },
          player,
        );
        expect(() =>
          gameArea.handleCommand(
            {
              type: 'GameMove',
              move: { column: 0, row: 0, transmitScore: false, gamePiece: undefined },
              gameID: nanoid(),
            },
            player,
          ),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
        // This line below is included to prevent the timers present within the game from running after this test completes.
        gameArea.handleCommand({ type: 'LeaveGame', gameID }, player);
      });
    });
  });
  describe('[T3.4] LeaveGame command', () => {
    it('should throw an error if there is no game in progress', () => {
      expect(() =>
        gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, player),
      ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
    });
    describe('when there is a game in progress', () => {
      it('should throw an error if the gameID does not match the game', () => {
        gameArea.handleCommand({ type: 'JoinGame' }, player);
        expect(() =>
          gameArea.handleCommand({ type: 'LeaveGame', gameID: nanoid() }, player),
        ).toThrowError(GAME_ID_MISSMATCH_MESSAGE);
      });
    });
  });
});
