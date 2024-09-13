import mock from 'jest-mock-extended/lib/Mock';
import { createPlayerForTesting } from '../../TestUtils';
import MemoryGame from './MemoryGame';
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
import { MemoryGameSettings } from '../../types/CoveyTownSocket';
import DefaultMemoryGameSettings from './DefaultMemoryGameSettings';
import LeaderboardDatabase from '../LeaderboardDatabase';

describe('MemoryGame', () => {
  jest.useFakeTimers();
  let game: MemoryGame;

  let mockAreaChangedEmitter = jest.fn();
  let defaultMemoryGameSettingsObject: DefaultMemoryGameSettings;
  let leaderboardDatabase: LeaderboardDatabase;

  const casualSettings: MemoryGameSettings = {
    memorizationTimeSeconds: 5,
    guessingTimeSeconds: 10,
    increasingDifficulty: false,
    targetTilesPercentage: 0.5,
    startingBoardSize: { rows: 4, columns: 4 },
    startingLives: 20,
    isPlayable: true,
  };
  const quickGameCasualSettings: MemoryGameSettings = {
    memorizationTimeSeconds: 5,
    guessingTimeSeconds: 10,
    increasingDifficulty: true,
    targetTilesPercentage: 0.5,
    startingBoardSize: { rows: 2, columns: 2 },
    startingLives: 2,
    isPlayable: true,
  };
  const quickGameCasualSettingsFixedDifficulty: MemoryGameSettings = {
    memorizationTimeSeconds: 10,
    guessingTimeSeconds: 5,
    increasingDifficulty: false,
    targetTilesPercentage: 0.5,
    startingBoardSize: { rows: 2, columns: 2 },
    startingLives: 2,
    isPlayable: true,
  };
  const oneLifeGameCasualSettings: MemoryGameSettings = {
    memorizationTimeSeconds: 10,
    guessingTimeSeconds: 5,
    increasingDifficulty: false,
    targetTilesPercentage: 0.5,
    startingBoardSize: { rows: 3, columns: 3 },
    startingLives: 1,
    isPlayable: true,
  };
  beforeEach(() => {
    defaultMemoryGameSettingsObject = new DefaultMemoryGameSettings();
    leaderboardDatabase = mock<LeaderboardDatabase>();
    game = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase, 'test');
    mockAreaChangedEmitter = jest.fn();
  });
  describe('[T1.1] _join', () => {
    it('should throw an error if the player is already in the game', () => {
      const player = createPlayerForTesting();
      game.join(player);
      expect(() => game.join(player)).toThrow(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    it('should throw an error if the game is full', () => {
      const player1 = createPlayerForTesting();
      const player2 = createPlayerForTesting();
      const player3 = createPlayerForTesting();
      game.join(player1);
      expect(() => game.join(player2)).toThrow(GAME_FULL_MESSAGE);
      expect(() => game.join(player3)).toThrow(GAME_FULL_MESSAGE);
    });
    it('should add the player to the game', () => {
      const player = createPlayerForTesting();
      game.join(player);
      expect(game.state.player).toBe(player.id);
    });
    it('should NOT update the game status from WAITING_FOR_PLAYERS after a player has joined', () => {
      const player = createPlayerForTesting();
      game.join(player);
      expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
    });
  });
  describe('[T1.2] _leave', () => {
    it('should throw an error if the player is not in the game', () => {
      const player = createPlayerForTesting();
      expect(() => game.leave(player)).toThrow(PLAYER_NOT_IN_GAME_MESSAGE);
      game.join(player);
      expect(() => game.leave(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
      game.startGame(true, mockAreaChangedEmitter);
      expect(() => game.leave(createPlayerForTesting())).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    describe('when the game status is WAITING_FOR_PLAYERS and the player is in the game', () => {
      it('should remove the player from the game', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.leave(player);
        expect(game.state.player).toBeUndefined();
      });
      it('should keep the game status to WAITING_FOR_PLAYERS', () => {
        const player = createPlayerForTesting();
        expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
        game.join(player);
        expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
        game.leave(player);
        expect(game.state.status).toBe('WAITING_FOR_PLAYERS');
      });
    });
    describe('when the game is WAITING_TO_START or IN_PROGRESS', () => {
      it('should update the game status to OVER', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        game.leave(player);
        expect(game.state.status).toBe('OVER');

        game = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase, 'test');
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        // waits until the memorization time has ended and the guessing time has started
        // which corresponds with the game stayed switching from WAITING_TO_START to IN_PROGRESS
        jest.advanceTimersByTime(
          defaultMemoryGameSettingsObject.memorizationTimeSeconds +
            0.5 * defaultMemoryGameSettingsObject.guessingTimeSeconds,
        );
        game.leave(player);
        expect(game.state.status).toBe('OVER');
      });
      it('should should not remove the current player from the game state', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        game.leave(player);
        expect(game.state.player).toBe(player.id);

        game = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase, 'test');
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        // waits until the memorization time has ended and the guessing time has started
        // which corresponds with the game stayed switching from WAITING_TO_START to IN_PROGRESS
        jest.advanceTimersByTime(
          defaultMemoryGameSettingsObject.memorizationTimeSeconds +
            0.5 * defaultMemoryGameSettingsObject.guessingTimeSeconds,
        );
        game.leave(player);
        expect(game.state.player).toBe(player.id);
      });
    });
    it('when the game status is "OVER" before the player leaves, it does not update the state', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(true, mockAreaChangedEmitter);
      game.leave(player);
      const stateBeforeLeaving = { ...game.state };
      game.leave(player);
      expect(game.state).toEqual(stateBeforeLeaving);
    });
  });
  describe('[T1.3] _startGame', () => {
    it('should throw an error if competitiveMode is true and the customizedSettings parameter is supplied', () => {
      expect(() => game.startGame(true, mockAreaChangedEmitter, casualSettings)).toThrowError(
        COMPETITIVE_MODE_NOT_CUSTOMIZABLE_MESSAGE,
      );
    });
    it('should throw an error if competitiveMode mode is false and no customizedSettings parameter is supplied', () => {
      const player = createPlayerForTesting();
      game.join(player);
      expect(() => game.startGame(false, mockAreaChangedEmitter)).toThrowError(
        GAME_SETTINGS_MISSING_MESSAGE,
      );
    });
    it('should NOT throw an error if competitiveMode mode is true and no customizedSettings parameter is supplied', () => {
      const player = createPlayerForTesting();
      game.join(player);
      expect(() => game.startGame(true, mockAreaChangedEmitter)).not.toThrowError();
    });
    it("should throw an error if the game status is not WAITING_FOR_PLAYERS, or has already been started or one player hasn't joined", () => {
      const player = createPlayerForTesting();
      expect(() => game.startGame(true, mockAreaChangedEmitter)).toThrowError(
        GAME_NOT_STARTABLE_MESSAGE,
      );
      game.join(player);
      expect(() => game.startGame(true, mockAreaChangedEmitter)).not.toThrowError();
      expect(() => game.startGame(true, mockAreaChangedEmitter)).toThrowError(
        GAME_NOT_STARTABLE_MESSAGE,
      );
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
      });
      expect(() => game.startGame(true, mockAreaChangedEmitter)).toThrowError(
        GAME_NOT_STARTABLE_MESSAGE,
      );
      game.leave(player);
      expect(() => game.startGame(true, mockAreaChangedEmitter)).toThrowError(
        GAME_NOT_STARTABLE_MESSAGE,
      );
    });
    it('should throw an error if the settings are invalid', () => {
      const player = createPlayerForTesting();
      game.join(player);

      // memorizationTimeSeconds is a positive number
      let invalidSettings = { ...casualSettings };
      invalidSettings.memorizationTimeSeconds = -1;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.memorizationTimeSeconds = 0;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );

      // guessingTimeSeconds is a positive number
      invalidSettings = { ...casualSettings };
      invalidSettings.guessingTimeSeconds = -1;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.guessingTimeSeconds = 0;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );

      // startingLives is a positive integer
      invalidSettings = { ...casualSettings };
      invalidSettings.startingLives = -1;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingLives = 0;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingLives = 2.04;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );

      // startingBoardSize is an object with a rows property and a columns property, both of which are positive integers
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: -1, columns: -1 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 2, columns: -1 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: -1, columns: 2 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 0, columns: 0 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 2, columns: 0 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 0, columns: 2 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: -1, columns: 0 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 0, columns: -1 };
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );

      // targetTilesPercentage is a number between 0 and 1 inclusive
      invalidSettings = { ...casualSettings };
      invalidSettings.targetTilesPercentage = -0.5;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
      invalidSettings = { ...casualSettings };
      invalidSettings.targetTilesPercentage = 1.1;
      expect(() => game.startGame(false, mockAreaChangedEmitter, invalidSettings)).toThrowError(
        INVALID_SETTINGS_MESSAGE,
      );
    });
    it('should update the game status to WAITING_TO_START', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    it('should initialize the game with the default settings if competitiveMode is true', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(true, mockAreaChangedEmitter);
      expect(game.state.boardSize).toEqual(defaultMemoryGameSettingsObject.startingBoardSize);
      expect(game.state.lives).toBe(defaultMemoryGameSettingsObject.startingLives);
      expect(game.state.score).toBe(0);
    });
    it('should initialize the game with the custom settings if competitiveMode is false', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.boardSize).toEqual(casualSettings.startingBoardSize);
      expect(game.state.lives).toBe(casualSettings.startingLives);
      expect(game.state.score).toBe(0);
    });
    describe('should generate the solutionBoard board and starting guessesBored successfully', () => {
      it('should generate boards of the correct size', () => {
        // removes the random seed so that the results are randomized
        const casualSettingsCopy = { ...casualSettings };
        for (let i = 0; i < 25; i++) {
          const player = createPlayerForTesting();
          game = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase);
          game.join(player);

          // generate a random number from 1 to 200
          const randomSize = Math.floor(Math.random() * 24) + 1;
          casualSettingsCopy.startingBoardSize = { rows: randomSize, columns: randomSize };
          game.startGame(false, mockAreaChangedEmitter, casualSettingsCopy);
          expect(game.state.solutionBoard.length).toBe(randomSize);
          expect(game.state.solutionBoard[0].length).toBe(randomSize);
          expect(game.state.solutionBoard[randomSize - 1].length).toBe(randomSize);
          expect(game.state.guessesBoard.length).toBe(randomSize);
          expect(game.state.guessesBoard[0].length).toBe(randomSize);
          expect(game.state.guessesBoard[randomSize - 1].length).toBe(randomSize);
        }
      });
      it('should generate boards with the correct contents', () => {
        // removes the random seed so that the results are randomized
        const casualSettingsCopy = { ...casualSettings };
        for (let i = 0; i < 25; i++) {
          const player = createPlayerForTesting();
          game = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase);
          game.join(player);

          // generate a random number from 1 to 200 for the board size
          const randomSize = Math.floor(Math.random() * 24) + 1;
          const randomTilePercentage = Math.random();
          const targetTileCount = Math.ceil(randomSize * randomSize * randomTilePercentage);
          let trueTileCount = 0;
          casualSettingsCopy.startingBoardSize = { rows: randomSize, columns: randomSize };
          casualSettingsCopy.targetTilesPercentage = randomTilePercentage;
          game.startGame(false, mockAreaChangedEmitter, casualSettingsCopy);
          for (let row = 0; row < randomSize; row++) {
            for (let column = 0; column < randomSize; column++) {
              expect(game.state.guessesBoard[row][column]).toBe(undefined);
              if (game.state.solutionBoard[row][column]) {
                trueTileCount++;
              }
            }
          }
          expect(trueTileCount).toBe(targetTileCount);
        }
      });
      it('should not generate boards with a size larger than 24 x 24', () => {
        const player = createPlayerForTesting();
        game.join(player);
        const invalidSettings = { ...casualSettings };
        invalidSettings.startingBoardSize = { rows: 25, columns: 25 };
        game.startGame(false, mockAreaChangedEmitter, invalidSettings);
        expect(game.state.boardSize.columns).toBe(24);
        expect(game.state.boardSize.rows).toBe(24);

        const invalidDefaultMemoryGameSettingsObject = new DefaultMemoryGameSettings();
        invalidDefaultMemoryGameSettingsObject.startingBoardSize = { rows: 25, columns: 25 };
        const game2 = new MemoryGame(defaultMemoryGameSettingsObject, leaderboardDatabase, 'test');

        game2.join(player);
        game2.startGame(true, mockAreaChangedEmitter);
        expect(game.state.boardSize.columns).toBe(24);
        expect(game.state.boardSize.rows).toBe(24);
      });
    });
  });
  describe('[T1.4] _applyMove', () => {
    it('should not increase the board size past 24 x 24', () => {
      const player = createPlayerForTesting();
      game.join(player);
      const invalidSettings = { ...casualSettings };
      invalidSettings.startingBoardSize = { rows: 24, columns: 24 };
      invalidSettings.targetTilesPercentage = 0.0001;

      game.startGame(false, mockAreaChangedEmitter, invalidSettings);
      expect(game.state.solutionBoard[20][9]).toBe(true);
      expect(game.state.score).toBe(0);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 20, column: 9, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.score).toBe(1);
      expect(game.state.boardSize.rows).toBe(24);
      expect(game.state.boardSize.columns).toBe(24);
    });
    describe('should throw an error', () => {
      it('if the game status is not IN_PROGRESS or WAITING_TO_START', () => {
        const player = createPlayerForTesting();
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
        game.join(player);
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).not.toThrowError();
        game.leave(player);
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(GAME_NOT_IN_PROGRESS_MESSAGE);
      });
      it('if the player is not in the game', () => {
        const player = createPlayerForTesting();
        const player2 = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player2.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
      });
      it('if the move is out of bounds', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: -1, column: -1, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: -1, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: -1, column: 1, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: -1, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 4, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 4, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 3, column: -1, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);

        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 4, column: 4, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
      });
      it('if the move is a repeat of a prior move in the same level', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
        });
        expect(() =>
          game.applyMove({
            gameID: game.id,
            playerID: player.id,
            move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
          }),
        ).toThrowError(BOARD_POSITION_NOT_VALID_MESSAGE);
      });
    });

    it('should update the correct square in the guessesBoard based on the solutionBoard', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.solutionBoard).toEqual([
        [false, false, false, false],
        [true, true, false, true],
        [false, true, true, false],
        [true, true, false, true],
      ]);
      expect(game.state.guessesBoard[0][0]).toBe(undefined);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.guessesBoard[0][0]).toBe(false);
      expect(game.state.guessesBoard[3][0]).toBe(undefined);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 3, column: 0, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.guessesBoard[3][0]).toBe(true);
      expect(game.state.guessesBoard[3][3]).toBe(undefined);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 3, column: 3, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.guessesBoard[3][3]).toBe(true);
      expect(game.state.guessesBoard[0][3]).toBe(undefined);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 3, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.guessesBoard[0][3]).toBe(false);
    });
    describe('after three incorrect moves', () => {
      it('should decrement lives by 1', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, true],
          [false, true, true, false],
          [true, true, false, true],
        ]);
        expect(game.state.lives).toBe(20);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(20);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 3, column: 2, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(20);
        // This tests that the number of lives is not decremented when the third move is correct.
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 3, column: 3, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(20);

        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 3, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(19);
      });
      it('should update the game status to WAITING_TO_START if lives > 0', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, true],
          [false, true, true, false],
          [true, true, false, true],
        ]);
        expect(game.state.status).toBe('WAITING_TO_START');
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.status).toBe('IN_PROGRESS');
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 3, column: 2, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.status).toBe('IN_PROGRESS');
        // This tests that the number  when the third move is correct.
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 3, column: 3, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.status).toBe('IN_PROGRESS');
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 3, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.status).toBe('WAITING_TO_START');
      });
      it('should set the game status to OVER if the lives reach 0', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, oneLifeGameCasualSettings);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false],
          [true, false, true],
          [true, true, true],
        ]);
        expect(game.state.lives).toBe(1);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(1);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 1, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(1);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 2, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(0);
        expect(game.state.status).toBe('OVER');
      });
      it('should not transmit the score if transmitScore is true on the move that ends the game but the user is not playing in competitive mode', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, oneLifeGameCasualSettings);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false],
          [true, false, true],
          [true, true, true],
        ]);
        expect(game.state.lives).toBe(1);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 1, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.score).toBe(0);
        // Two correct moves to increment the score to 10
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 2, column: 1, transmitScore: false, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 2, column: 2, transmitScore: false, gamePiece: undefined },
        });
        // expect(leaderboardDatabase.getInstance().scores.length).toBe(0);
        expect(leaderboardDatabase.addScore).toBeCalledTimes(0);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 2, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(0);
        expect(game.state.status).toBe('OVER');
        expect(game.state.score).toBe(10);
        expect(leaderboardDatabase.addScore).toBeCalledTimes(0);
      });
      it('should transmit the score if transmitScore is true on the move that ends the game and the user is playing in competitive mode', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, false],
          [false, true, false, false],
          [false, true, false, false],
        ]);
        expect(game.state.score).toBe(0);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 1, column: 1, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.score).toBe(4);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 2, column: 1, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.score).toBe(8);
        expect(game.state.lives).toBe(3);
        expect(leaderboardDatabase.addScore).toBeCalledTimes(0);
        jest.advanceTimersByTime(
          defaultMemoryGameSettingsObject.memorizationTimeSeconds * 3000 +
            defaultMemoryGameSettingsObject.guessingTimeSeconds * 3000,
        );
        expect(game.state.lives).toBe(0);
        expect(game.state.status).toBe('OVER');
        expect(leaderboardDatabase.addScore).toBeCalledTimes(1);
        expect(leaderboardDatabase.addScore).toBeCalledWith({
          _id: expect.any(String),
          score: 8,
          date: expect.any(Date),
          playerUsername: player.userName,
          gameType: 'MemoryGameArea',
        });
      });
      it('should not transmit the score if transmitScore is false on the move that ends the game and the user is playing in competitive mode', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(true, mockAreaChangedEmitter);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, false],
          [false, true, false, false],
          [false, true, false, false],
        ]);
        expect(game.state.score).toBe(0);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 1, column: 1, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.score).toBe(4);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 2, column: 1, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.score).toBe(8);
        expect(game.state.lives).toBe(3);
        jest.advanceTimersByTime(
          defaultMemoryGameSettingsObject.memorizationTimeSeconds * 3000 +
            defaultMemoryGameSettingsObject.guessingTimeSeconds * 3000,
        );
        expect(game.state.lives).toBe(0);
        expect(game.state.status).toBe('OVER');
        expect(leaderboardDatabase.addScore).toBeCalledTimes(0);
      });
      it('should show the users the same level again if the lives > 0', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, casualSettings);
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, true],
          [false, true, true, false],
          [true, true, false, true],
        ]);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 1, transmitScore: true, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 2, transmitScore: false, gamePiece: undefined },
        });
        expect(game.state.lives).toBe(19);
        expect(game.state.status).toBe('WAITING_TO_START');
        expect(game.state.solutionBoard).toEqual([
          [false, false, false, false],
          [true, true, false, true],
          [false, true, true, false],
          [true, true, false, true],
        ]);
      });
    });
    describe('after guessing all of the correct squares in a level', () => {
      it('should change the game status to WAITING_TO_START', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, quickGameCasualSettings);
        expect(game.state.solutionBoard).toEqual([
          [true, false],
          [true, false],
        ]);
        expect(game.state.status).toBe('WAITING_TO_START');
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.status).toBe('IN_PROGRESS');
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 1, column: 0, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.status).toBe('WAITING_TO_START');
      });
      it('should increase the size of the next round board if increasingDifficulty is true', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, quickGameCasualSettings);
        expect(game.state.solutionBoard).toEqual([
          [true, false],
          [true, false],
        ]);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 1, column: 0, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.solutionBoard).toEqual([
          [false, false, false],
          [true, false, true],
          [true, true, true],
        ]);
      });
      it('should NOT increase the size of the next round board if increasingDifficulty is false', () => {
        const player = createPlayerForTesting();
        game.join(player);
        game.startGame(false, mockAreaChangedEmitter, quickGameCasualSettingsFixedDifficulty);
        expect(game.state.solutionBoard).toEqual([
          [true, false],
          [true, false],
        ]);
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
        });
        game.applyMove({
          gameID: game.id,
          playerID: player.id,
          move: { row: 1, column: 0, transmitScore: true, gamePiece: undefined },
        });
        expect(game.state.solutionBoard).toEqual([
          [true, false],
          [true, false],
        ]);
      });
    });
    it('should update the score if the move is correct', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, quickGameCasualSettings);
      expect(game.state.solutionBoard).toEqual([
        [true, false],
        [true, false],
      ]);
      expect(game.state.score).toBe(0);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
      });
      expect(game.state.score).toBe(2);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 1, transmitScore: true, gamePiece: undefined },
      });
      expect(game.state.score).toBe(2);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 1, column: 0, transmitScore: true, gamePiece: undefined },
      });
      expect(game.state.boardSize).toEqual({ rows: 3, columns: 3 });
      expect(game.state.score).toBe(4);
      expect(game.state.solutionBoard).toEqual([
        [false, false, false],
        [true, false, true],
        [true, true, true],
      ]);
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 1, column: 0, transmitScore: false, gamePiece: undefined },
      });
      expect(game.state.score).toBe(9);
    });
  });
  describe('[T1.5] the timekeeping logic', () => {
    it('should update the game status to IN_PROGRESS after the memorization time has ended', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      jest.advanceTimersByTime(casualSettings.memorizationTimeSeconds * 1000);
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      expect(game.state.status).toBe('IN_PROGRESS');
      jest.advanceTimersByTime(casualSettings.guessingTimeSeconds * 1000);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(mockAreaChangedEmitter).toBeCalledTimes(2);
      jest.advanceTimersByTime(casualSettings.memorizationTimeSeconds * 1000);
      expect(mockAreaChangedEmitter).toBeCalledTimes(3);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
    it('should decrement the lives after the guessing time has ended without the user having finished', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(game.state.lives).toBe(20);
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      jest.advanceTimersByTime(
        casualSettings.memorizationTimeSeconds * 1000 + casualSettings.guessingTimeSeconds * 1000,
      );
      expect(mockAreaChangedEmitter).toBeCalledTimes(2);
      expect(game.state.lives).toBe(19);
      expect(game.state.status).toBe('WAITING_TO_START');
      jest.advanceTimersByTime(
        casualSettings.memorizationTimeSeconds * 1000 + casualSettings.guessingTimeSeconds * 1000,
      );
      expect(mockAreaChangedEmitter).toBeCalledTimes(4);
      expect(game.state.lives).toBe(18);
    });
    it('should reset the timer from memorization time to guessing time after the user has made a move', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, casualSettings);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      jest.advanceTimersByTime(casualSettings.memorizationTimeSeconds * 1000 * 0.5);
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      expect(game.state.status).toBe('WAITING_TO_START');
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 0, transmitScore: false, gamePiece: undefined },
      });
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      expect(game.state.status).toBe('IN_PROGRESS');
      jest.advanceTimersByTime(casualSettings.memorizationTimeSeconds * 1000);
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      expect(game.state.status).toBe('IN_PROGRESS');
      jest.advanceTimersByTime(
        casualSettings.guessingTimeSeconds * 1000 - casualSettings.memorizationTimeSeconds * 1000,
      );
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      expect(game.state.status).toBe('WAITING_TO_START');
    });
    it('should reset the timer from guessing time to memorization time after the user has finished guessing', () => {
      const player = createPlayerForTesting();
      game.join(player);
      game.startGame(false, mockAreaChangedEmitter, quickGameCasualSettings);
      expect(game.state.status).toBe('WAITING_TO_START');
      expect(mockAreaChangedEmitter).toBeCalledTimes(0);
      jest.advanceTimersByTime(quickGameCasualSettings.memorizationTimeSeconds * 1000);
      expect(game.state.status).toBe('IN_PROGRESS');
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      jest.advanceTimersByTime(quickGameCasualSettings.guessingTimeSeconds * 1000 * 0.5);
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      expect(game.state.status).toBe('IN_PROGRESS');

      expect(game.state.solutionBoard).toEqual([
        [true, false],
        [true, false],
      ]);
      expect(game.state.status).toBe('IN_PROGRESS');
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 0, column: 0, transmitScore: true, gamePiece: undefined },
      });
      expect(game.state.status).toBe('IN_PROGRESS');
      game.applyMove({
        gameID: game.id,
        playerID: player.id,
        move: { row: 1, column: 0, transmitScore: true, gamePiece: undefined },
      });
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      expect(game.state.status).toBe('WAITING_TO_START');
      jest.advanceTimersByTime(quickGameCasualSettings.memorizationTimeSeconds * 1000 * 0.5);
      expect(mockAreaChangedEmitter).toBeCalledTimes(1);
      expect(game.state.status).toBe('WAITING_TO_START');
      jest.advanceTimersByTime(quickGameCasualSettings.memorizationTimeSeconds * 1000 * 0.5);
      expect(mockAreaChangedEmitter).toBeCalledTimes(2);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
  });
});
