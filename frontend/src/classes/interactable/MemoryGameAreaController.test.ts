import assert from 'assert';
import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { PlayerID } from '../../generated/client';
import { GameStatus, MemoryBoardSize, MemoryGameBoard } from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import MemoryGameAreaController from './MemoryGameAreaController';

describe.skip('MemoryGameAreaController', () => {
  const ourPlayer = new PlayerController(nanoid(), nanoid(), {
    x: 0,
    y: 0,
    moving: false,
    rotation: 'front',
  });
  const mockTownController = mock<TownController>();
  Object.defineProperty(mockTownController, 'ourPlayer', {
    get: () => ourPlayer,
  });
  mockTownController.getPlayer.mockImplementation(playerID => {
    const p = mockTownController.players.find(player => player.id === playerID);
    assert(p);
    return p;
  });

  function memoryGameAreaControllerWithProp({
    _id,
    player,
    undefinedGame,
    status,
    score,
    lives,
    boardSize,
    solutionBoard,
    guessesBoard,
    transmiteScore,
    memorizationTimeSeconds,
    guessingTimeSeconds,
  }: {
    _id?: string;
    player?: PlayerID;
    undefinedGame?: boolean;
    status?: GameStatus;
    score?: number;
    lives?: number;
    boardSize?: MemoryBoardSize;
    solutionBoard?: MemoryGameBoard;
    guessesBoard?: MemoryGameBoard;
    transmiteScore?: boolean;
    memorizationTimeSeconds?: number;
    guessingTimeSeconds?: number;
  }) {
    const id = _id || nanoid();
    const ret = new MemoryGameAreaController(
      _id || nanoid(),
      {
        id,
        occupants: player ? [player] : [],
        history: [],
        type: 'MemoryGameArea',
        game: undefinedGame
          ? undefined
          : {
              id,
              players: player ? [player] : [],
              state: {
                status: status || 'WAITING_FOR_PLAYERS',
                score: score || 0, // Assign a default value of 0 if score is undefined
                lives: lives || 3,
                boardSize: boardSize || { rows: 3, columns: 3 },
                solutionBoard: solutionBoard || [[]],
                guessesBoard: guessesBoard || [[]],
                transmiteScore: transmiteScore || false,
                memorizationTimeSeconds: memorizationTimeSeconds || 4,
                guessingTimeSeconds: guessingTimeSeconds || 10,
              },
            },
      },
      mockTownController,
    );
    if (player) {
      ret.occupants = [
        mockTownController.players.find(eachPlayer => eachPlayer.id === player) as PlayerController,
      ];
    }
    return ret;
  }
  describe('getters', () => {
    it('should have a guessesBoard', () => {
      const controller = memoryGameAreaControllerWithProp({
        guessesBoard: [
          [true, true, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
      });
      expect(controller.guessBoard).toEqual([
        [true, true, undefined],
        [undefined, undefined, undefined],
        [undefined, undefined, undefined],
      ]);
    });

    it('should have a player', () => {
      const controller = memoryGameAreaControllerWithProp({ player: ourPlayer.id });
      expect(controller.player).toEqual(ourPlayer.id);
    });

    it('should have a score', () => {
      const controller = memoryGameAreaControllerWithProp({ score: 10 });
      expect(controller.score).toEqual(10);
    });

    it('should have lives remaining', () => {
      const controller = memoryGameAreaControllerWithProp({ lives: 2 });
      expect(controller.livesRemaining).toEqual(2);
    });

    it('should have a status', () => {
      const controller = memoryGameAreaControllerWithProp({ status: 'IN_PROGRESS' });
      expect(controller.status).toEqual('IN_PROGRESS');
    });
  });
  describe('isActive', () => {
    it('should return true if the game is not empty and the game is not waiting for players', () => {
      const controller = memoryGameAreaControllerWithProp({
        player: ourPlayer.id,
        status: 'IN_PROGRESS',
      });
      expect(controller.isActive()).toBeTruthy();
    });

    it('should return false if the game is empty', () => {
      const controller = memoryGameAreaControllerWithProp({});
      expect(controller.isActive()).toBeFalsy();
    });

    it('should return false if the game is waiting for players', () => {
      const controller = memoryGameAreaControllerWithProp({ status: 'WAITING_FOR_PLAYERS' });
      expect(controller.isActive()).toBeFalsy();
    });
  });
  describe('updateFrom', () => {
    let controller: MemoryGameAreaController;
    beforeEach(() => {
      controller = memoryGameAreaControllerWithProp({
        player: ourPlayer.id,
        status: 'IN_PROGRESS',
        score: 10,
        lives: 2,
        boardSize: { rows: 3, columns: 3 },
        solutionBoard: [
          [true, true, false],
          [false, false, false],
          [false, true, false],
        ],
        guessesBoard: [
          [true, true, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
      });
    });
    it('should emit a boardChanged event with the new board', () => {
      const model = controller.toInteractableAreaModel();
      assert(model.game);
      const newModel = {
        ...model,
        game: {
          ...model.game,
          state: {
            ...model.game?.state,
            guessesBoard: [
              [true, true, undefined],
              [undefined, false, undefined],
              [undefined, undefined, undefined],
            ],
          },
        },
      };
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, [ourPlayer]);
      const boardChangedCall = emitSpy.mock.calls.find(call => call[0] === 'boardChanged');
      expect(boardChangedCall).toBeDefined();
      expect(boardChangedCall?.[1]).toEqual([
        [true, true, undefined],
        [undefined, false, undefined],
        [undefined, undefined, undefined],
      ]);
    });
    it('should not emit a boardChanged event if the board has not changed', () => {
      const model = controller.toInteractableAreaModel();
      assert(model.game);
      const newModel = {
        ...model,
        game: {
          ...model.game,
          state: {
            ...model.game?.state,
            guessesBoard: [
              [true, true, undefined],
              [undefined, undefined, undefined],
              [undefined, undefined, undefined],
            ],
          },
        },
      };
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, [ourPlayer]);
      const boardChangedCall = emitSpy.mock.calls.find(call => call[0] === 'boardChanged');
      expect(boardChangedCall).toBeUndefined();
    });
  });
});
