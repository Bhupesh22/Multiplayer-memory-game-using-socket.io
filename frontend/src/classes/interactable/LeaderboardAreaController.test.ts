import assert from 'assert';
import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import {
  LeaderboardField,
  LeaderboardArea,
  PlayerID,
  ScoreData,
  LeaderboardSettings,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import LeaderboardAreaController, {
  LEADERBOARD_AREA_FRIENDLY_NAME,
} from './LeaderboardAreaController';
import { LEADERBOARD_AREA_TYPE } from './InteractableAreaController';

describe('[T1] LeaderboardAreaController', () => {
  const ourPlayer = new PlayerController(nanoid(), nanoid(), {
    x: 0,
    y: 0,
    moving: false,
    rotation: 'front',
  });
  const otherPlayers = [
    new PlayerController(nanoid(), nanoid(), { x: 0, y: 0, moving: false, rotation: 'front' }),
    new PlayerController(nanoid(), nanoid(), { x: 0, y: 0, moving: false, rotation: 'front' }),
  ];

  const mockTownController = mock<TownController>();
  Object.defineProperty(mockTownController, 'ourPlayer', {
    get: () => ourPlayer,
  });
  Object.defineProperty(mockTownController, 'players', {
    get: () => [ourPlayer, ...otherPlayers],
  });
  mockTownController.getPlayer.mockImplementation(playerID => {
    const p = mockTownController.players.find(player => player.id === playerID);
    assert(p);
    return p;
  });

  function leaderboardAreaControllerWithProp({
    _id,
    scores,
    sortType,
    displayCount,
    hiddenTownees,
    occupants,
  }: {
    _id?: string;
    scores?: ScoreData[];
    sortType?: LeaderboardField;
    displayCount?: number;
    hiddenTownees?: PlayerID[];
    occupants?: PlayerID[];
  }) {
    const id = _id || nanoid();
    const leaderboardArea: LeaderboardArea = {
      id: _id || nanoid(),
      occupants: occupants || [],
      type: 'LeaderboardArea',
      settings: {
        defaultSortType: sortType || 'score',
        defaultDisplayCount: displayCount || 10,
        visibleFields: ['date', 'gameType', 'playerUsername', 'score'],
        reset: false,
      },
      scores: scores || [],
      hiddenTownees: hiddenTownees || [],
    };
    const ret = new LeaderboardAreaController(id, leaderboardArea, mockTownController);
    return ret;
  }
  describe('[T1.1]', () => {
    describe('scores', () => {
      it('should return empty if there are no scores in the leaderboard', () => {
        const controller = leaderboardAreaControllerWithProp({});
        expect(controller.scores).toStrictEqual([]);
      });
      it('should return scores if there are scores in leaderboard', () => {
        const score1: ScoreData = {
          _id: nanoid(),
          score: 5,
          date: new Date(),
          playerUsername: 'adam',
          gameType: 'MemoryGameArea',
        };
        const controller = leaderboardAreaControllerWithProp({
          scores: [score1],
        });
        expect(controller.scores).toStrictEqual([score1]);
      });
    });
    describe('type', () => {
      it('should return its type appropriately', () => {
        const controller = leaderboardAreaControllerWithProp({});
        expect(controller.type).toBe(LEADERBOARD_AREA_TYPE);
      });
    });
    describe('friendlyName', () => {
      it('should return its user-friendly name appropriately', () => {
        const controller = leaderboardAreaControllerWithProp({});
        expect(controller.friendlyName).toBe(LEADERBOARD_AREA_FRIENDLY_NAME);
      });
    });
    describe('isActive', () => {
      it('should never return as active', () => {
        const score1: ScoreData = {
          _id: nanoid(),
          score: 5,
          date: new Date(),
          playerUsername: 'adam',
          gameType: 'MemoryGameArea',
        };
        const controller = leaderboardAreaControllerWithProp({
          scores: [score1],
          occupants: ['john_id'],
        });
        expect(controller.isActive()).toBe(false);
      });
    });
    describe('isVisible', () => {
      it('should return true if the player is not hidden', () => {
        const controller = leaderboardAreaControllerWithProp({});
        expect(controller.isVisible).toBe(true);
      });
      it('should return false if the player is hidden', () => {
        const controller = leaderboardAreaControllerWithProp({
          hiddenTownees: [ourPlayer.id],
        });
        expect(controller.isVisible).toBe(false);
      });
    });
  });
  describe('[T1.2] _updateFrom', () => {
    let controller: LeaderboardAreaController;
    beforeEach(() => {
      controller = leaderboardAreaControllerWithProp({});
    });
    it('should emit a leaderboardUpdate event when there are new scores', () => {
      const model = controller.toInteractableAreaModel();
      assert(model.scores.length === 0);
      const newScores: ScoreData[] = [
        {
          _id: nanoid(),
          score: 5,
          date: new Date(),
          playerUsername: 'adam',
          gameType: 'MemoryGameArea',
        },
        {
          _id: nanoid(),
          score: 7,
          date: new Date(),
          playerUsername: 'jean',
          gameType: 'MemoryGameArea',
        },
      ];
      const newModel: LeaderboardArea = {
        ...model,
        scores: newScores,
      };
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      const leaderboardUpdateCall = emitSpy.mock.calls.find(
        call => call[0] === 'leaderboardUpdate',
      );
      expect(leaderboardUpdateCall).toBeDefined();
      if (leaderboardUpdateCall) {
        expect(leaderboardUpdateCall[1].scores).toEqual(newScores);
      }
    });
    it('should update the scores returned by the score property', () => {
      const model = controller.toInteractableAreaModel();
      assert(model.scores.length === 0);
      const newScores: ScoreData[] = [
        {
          _id: nanoid(),
          score: 6,
          date: new Date(),
          playerUsername: 'adam',
          gameType: 'MemoryGameArea',
        },
        {
          _id: nanoid(),
          score: 10,
          date: new Date(),
          playerUsername: 'jean',
          gameType: 'MemoryGameArea',
        },
      ];
      const newModel: LeaderboardArea = {
        ...model,
        scores: newScores,
      };
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      expect(controller.scores).toEqual(newScores);
    });
    it('should emit a leaderboardUpdate event when there are new settings', () => {
      const model = controller.toInteractableAreaModel();
      const newSettings: LeaderboardSettings = {
        defaultSortType: 'playerUsername',
        defaultDisplayCount: 5,
        visibleFields: ['date', 'playerUsername', 'score'],
        reset: false,
      };
      const newModel: LeaderboardArea = {
        ...model,
        settings: newSettings,
      };
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      const leaderboardUpdateCall = emitSpy.mock.calls.find(
        call => call[0] === 'leaderboardUpdate',
      );
      expect(leaderboardUpdateCall).toBeDefined();
      if (leaderboardUpdateCall) {
        expect(leaderboardUpdateCall[1].settings).toEqual(newSettings);
      }
    });
    it('should update the settings returned by the settings property', () => {
      const model = controller.toInteractableAreaModel();
      const newSettings: LeaderboardSettings = {
        defaultSortType: 'playerUsername',
        defaultDisplayCount: 5,
        visibleFields: ['date', 'playerUsername', 'score'],
        reset: false,
      };
      const newModel: LeaderboardArea = {
        ...model,
        settings: newSettings,
      };
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      expect(controller.settings).toEqual(newSettings);
    });
    it('should not emit a leaderboardUpdate event when there are no changes', () => {
      const model = controller.toInteractableAreaModel();
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(model, otherPlayers.concat(ourPlayer));
      const leaderboardUpdateCall = emitSpy.mock.calls.find(
        call => call[0] === 'leaderboardUpdate',
      );
      expect(leaderboardUpdateCall).toBeUndefined();
    });
    it("should emit a visibilityUpdate event when the player's visibility changes", () => {
      const model = controller.toInteractableAreaModel();
      const newModel: LeaderboardArea = {
        ...model,
        hiddenTownees: [ourPlayer.id],
      };
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      const visibilityUpdateCall = emitSpy.mock.calls.find(call => call[0] === 'visibilityUpdate');
      expect(visibilityUpdateCall).toBeDefined();
      if (visibilityUpdateCall) {
        expect(visibilityUpdateCall[1]).toBe(false);
      }
    });
    it('should change the visibility returned by the isVisible property', () => {
      const model = controller.toInteractableAreaModel();
      const newModel: LeaderboardArea = {
        ...model,
        hiddenTownees: [ourPlayer.id],
      };
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      expect(controller.isVisible).toBe(false);
    });
    it('should not emit a visibilityUpdate event when the player is already visible', () => {
      const model = controller.toInteractableAreaModel();
      const newModel: LeaderboardArea = {
        ...model,
        hiddenTownees: [],
      };
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      const emitSpy = jest.spyOn(controller, 'emit');
      controller.updateFrom(newModel, otherPlayers.concat(ourPlayer));
      const visibilityUpdateCall = emitSpy.mock.calls.find(call => call[0] === 'visibilityUpdate');
      expect(visibilityUpdateCall).toBeUndefined();
    });
  });
});
