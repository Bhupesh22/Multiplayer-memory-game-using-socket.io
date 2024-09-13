import { LeaderboardSettings, MemoryGameSettings } from '../types/CoveyTownSocket';
import LeaderboardAreaController from './interactable/LeaderboardAreaController';
import TownController from './TownController';

/**
 * Class for controlling Leaderboard and Memory game settings as an administrator
 *
 * Changes memory game settings by modifying DefaultMemoryGameSettings,
 * and changes LeaderboardSettings by sending changes to LeaderboardModel
 */
export default class AdminController {
  protected _memoryGameSettings: MemoryGameSettings;

  protected _leaderboardController: LeaderboardAreaController;

  protected _townController: TownController;

  get memoryGameSettings(): MemoryGameSettings {
    return this._memoryGameSettings;
  }

  get leaderboardSettings(): LeaderboardSettings {
    return this._leaderboardController.settings;
  }

  constructor(
    townController: TownController,
    leaderboardController: LeaderboardAreaController,
    memoryGameSettings: MemoryGameSettings,
  ) {
    this._townController = townController;
    this._leaderboardController = leaderboardController;
    this._memoryGameSettings = memoryGameSettings;
  }

  private _differentMemoryGameSettings(newSettings: MemoryGameSettings) {
    return (
      this._memoryGameSettings.startingLives !== newSettings.startingLives ||
      this._memoryGameSettings.startingBoardSize.rows !== newSettings.startingBoardSize.rows ||
      this._memoryGameSettings.startingBoardSize.columns !==
        newSettings.startingBoardSize.columns ||
      this._memoryGameSettings.memorizationTimeSeconds !== newSettings.memorizationTimeSeconds ||
      this._memoryGameSettings.guessingTimeSeconds !== newSettings.guessingTimeSeconds ||
      this._memoryGameSettings.increasingDifficulty !== newSettings.increasingDifficulty ||
      this._memoryGameSettings.targetTilesPercentage !== newSettings.targetTilesPercentage ||
      this._memoryGameSettings.isPlayable !== newSettings.isPlayable ||
      this._memoryGameSettings.unknownTileColor !== newSettings.unknownTileColor ||
      this._memoryGameSettings.tileShape !== newSettings.tileShape
    );
  }

  private _differentLeaderboardSettings(newSettings: LeaderboardSettings) {
    return (
      this._leaderboardController.settings.defaultDisplayCount !==
        newSettings.defaultDisplayCount ||
      this._leaderboardController.settings.defaultSortType !== newSettings.defaultSortType ||
      this._leaderboardController.settings.visibleFields.length !==
        newSettings.visibleFields.length ||
      this._leaderboardController.settings.visibleFields.some(
        field => newSettings.visibleFields.indexOf(field) < 0,
      ) ||
      this._leaderboardController.settings.reset !== newSettings.reset
    );
  }

  public async setMemoryGameSettings(newSettings: MemoryGameSettings): Promise<boolean> {
    try {
      if (!this._differentMemoryGameSettings(newSettings)) {
        return true;
      }
      await this._townController.sendMemoryGameSettingsCommand(newSettings);
      this._memoryGameSettings = { ...newSettings };
      return true;
    } catch (e) {
      return false;
    }
  }

  public async setLeaderboardSettings(newSettings: LeaderboardSettings): Promise<boolean> {
    try {
      if (!this._differentLeaderboardSettings(newSettings)) {
        return true;
      }
      await this._townController.sendInteractableCommand(this._leaderboardController.id, {
        type: 'LeaderboardSettings',
        settings: newSettings,
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
