import { mock } from 'jest-mock-extended';
import {
  LeaderboardSettings,
  MemoryGameSettings,
  LeaderboardSettingsCommand,
} from '../types/CoveyTownSocket';
import TownController from './TownController';
import AdminController from './AdminController';
import LeaderboardAreaController from './interactable/LeaderboardAreaController';

describe('[T1] AdminController', () => {
  const mockTownController = mock<TownController>();
  const defaultLeaderboardSettings: LeaderboardSettings = {
    defaultSortType: 'score',
    defaultDisplayCount: 10,
    visibleFields: ['date', 'gameType', 'playerUsername', 'score'],
    reset: false,
  };
  mockTownController.sendMemoryGameSettingsCommand.mockImplementation(async () => {
    return;
  });
  mockTownController.sendInteractableCommand.mockImplementation(async () => {
    return { success: true };
  });
  const mockLeaderboardController = mock<LeaderboardAreaController>();
  Object.defineProperties(mockLeaderboardController, {
    id: {
      get: () => 'testleaderboard',
    },
    settings: {
      get: () => defaultLeaderboardSettings,
    },
  });

  function adminControllerWithProp() {
    const memoryGameSettings: MemoryGameSettings = {
      startingLives: 3,
      startingBoardSize: {
        rows: 3,
        columns: 3,
      },
      memorizationTimeSeconds: 5,
      guessingTimeSeconds: 10,
      increasingDifficulty: true,
      targetTilesPercentage: 0.3,
      isPlayable: true,
    };
    const ret = new AdminController(
      mockTownController,
      mockLeaderboardController,
      memoryGameSettings,
    );
    return ret;
  }
  describe('[T1] change leaderboard settings', () => {
    describe('emit interactablecommand with new settings', () => {
      let controller: AdminController;
      beforeEach(() => {
        controller = adminControllerWithProp();
        mockTownController.sendInteractableCommand.mockClear();
      });
      it('should send an interactablecommand with new settings', async () => {
        const leaderboardSettings: LeaderboardSettings = {
          defaultDisplayCount: 23,
          defaultSortType: 'score',
          visibleFields: ['score', 'playerUsername'],
          reset: false,
        };
        const emitSpy = jest.spyOn(mockTownController, 'sendInteractableCommand');
        const retValue = await controller.setLeaderboardSettings(leaderboardSettings);
        const settingsChangedCall = emitSpy.mock.calls.find(call => call[0] === 'testleaderboard');
        expect(settingsChangedCall).toBeDefined();
        expect(retValue).toBe(true);
        if (settingsChangedCall) {
          expect((settingsChangedCall[1] as LeaderboardSettingsCommand).settings).toEqual(
            leaderboardSettings,
          );
        }
      });
      it('should not send an interactablecommand if the settings are the same', async () => {
        const leaderboardSettings = controller.leaderboardSettings;
        const emitSpy = jest.spyOn(mockTownController, 'sendInteractableCommand');
        const retValue = await controller.setLeaderboardSettings(leaderboardSettings);
        const settingsChangedCall = emitSpy.mock.calls.find(call => call[0] === 'testleaderboard');
        expect(settingsChangedCall).toBeUndefined();
        expect(retValue).toBe(true);
        expect(controller.leaderboardSettings).toBe(leaderboardSettings);
      });
    });
  });
  describe('[T1] change memory game settings', () => {
    describe('emit memoryGameSettingsUpdate with new settings', () => {
      let controller: AdminController;
      beforeEach(() => {
        controller = adminControllerWithProp();
      });
      it('should call the towncontroller to update with new settings', async () => {
        const memorySettings: MemoryGameSettings = {
          startingLives: 23,
          startingBoardSize: {
            rows: 2,
            columns: 2,
          },
          memorizationTimeSeconds: 2,
          guessingTimeSeconds: 9,
          increasingDifficulty: true,
          targetTilesPercentage: 0.3,
          isPlayable: true,
        };
        const emitSpy = jest.spyOn(mockTownController, 'sendMemoryGameSettingsCommand');
        const retValue = await controller.setMemoryGameSettings(memorySettings);
        const settingsChangedCall = emitSpy.mock.calls.find(call => call[0] === memorySettings);
        expect(settingsChangedCall).toBeDefined();
        expect(retValue).toBe(true);
        expect(controller.memoryGameSettings).toStrictEqual(memorySettings);
      });
      it('should not call the towncontroller when the settings are the same', async () => {
        const settings = controller.memoryGameSettings;
        const emitSpy = jest.spyOn(mockTownController, 'sendMemoryGameSettingsCommand');
        const retValue = await controller.setMemoryGameSettings(settings);
        expect(emitSpy.mock.calls.length === 0);
        expect(retValue).toBe(true);
        expect(controller.memoryGameSettings).toBe(settings);
      });
    });
  });
});
