import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import InvalidParametersError, {
  INVALID_COMMAND_MESSAGE,
  NO_NEGATIVE_NUMBERS_MESSAGE,
} from '../lib/InvalidParametersError';
import {
  BoundingBox,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  LeaderboardArea as LeaderboardAreaModel,
  LeaderboardField,
  LeaderboardModel,
  LeaderboardSettings,
  Player,
  PlayerID,
  ScoreData,
  TownEmitter,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';
import LeaderboardDatabase from './LeaderboardDatabase';

export default class Leaderboard extends InteractableArea implements LeaderboardModel {
  private _defaultDisplayCount: number;

  private _defaultSortType: LeaderboardField;

  private _leaderboardDatabase: LeaderboardDatabase;

  public constructor(
    id: string,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
    leaderboardDatabase: LeaderboardDatabase,
    defaultDisplayCount?: number,
    defaultSortType?: LeaderboardField,
  ) {
    super(id, coordinates, townEmitter);
    this._defaultDisplayCount = defaultDisplayCount ?? 10; // Use the passed value or a default
    this._defaultSortType = defaultSortType ?? 'score'; // Use the passed value or a default
    this._leaderboardDatabase = leaderboardDatabase;
    this._leaderboardDatabase.registerScoreAddedCallback(this.addScore.bind(this));
  }

  /**
   * Convert this LeaderboardArea instance to a simple LeaderboardAreaModel suitable for
   * transporting over a socket to a client.
   */
  public toModel(): LeaderboardAreaModel {
    return {
      id: this.id,
      occupants: this.occupantsByID,
      type: 'LeaderboardArea',
      settings: {
        defaultDisplayCount: this._defaultDisplayCount,
        defaultSortType: this._defaultSortType,
        visibleFields: this._leaderboardDatabase.visibleFields,
        reset: false,
      },
      scores: this._leaderboardDatabase.scores,
      hiddenTownees: this._leaderboardDatabase.hiddenTownees,
    };
  }

  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
    player: Player,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'LeaderboardSettings') {
      const { settings } = command;
      this.applyLeaderboardSettings(settings, player);
      this._emitAreaChanged();
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'LeaderboardVisibility') {
      const { setLeaderboardVisible } = command;
      if (setLeaderboardVisible === true) {
        this._leaderboardDatabase.hiddenTownees = this._leaderboardDatabase.hiddenTownees.filter(
          id => id !== player.id,
        );
      } else {
        this._leaderboardDatabase.hiddenTownees.push(player.id);
      }
      this._emitAreaChanged();
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }

  public getDefaultSortType(): LeaderboardField {
    return this._defaultSortType;
  }

  public getDefaultDisplayCount(): number {
    return this._defaultDisplayCount;
  }

  /**
   * Handles adding a new score to a database by emitting the new LeaderboardAreaModel.
   */
  public addScore(): void {
    this._emitAreaChanged();
  }

  /**
   * Gets the scores for a given game type, altered for visible fields.
   * The player ID for the given player always shows even if the visible settings hide names.
   */
  public getScores(gameType: InteractableType, playerUsername: string): ScoreData[] {
    const rawScores: ScoreData[] = this._leaderboardDatabase.scores;
    const scores = rawScores.filter(score => score.gameType === gameType);
    const { visibleFields } = this._leaderboardDatabase;
    for (let i = 0; i < scores.length; i += 1) {
      if (!visibleFields.includes('playerUsername')) {
        if (scores[i].playerUsername !== playerUsername) {
          scores[i].playerUsername = undefined;
        }
      }
      if (!visibleFields.includes('score')) {
        scores[i].score = undefined;
      }
      if (!visibleFields.includes('date')) {
        scores[i].date = undefined;
      }
      if (!visibleFields.includes('gameType')) {
        scores[i].gameType = undefined;
      }
    }
    return scores;
  }

  /**
   * Erases all scores from the leaderboard. (administrator)
   */
  public resetLeaderboard(player: Player): void {
    if (!player.isAdmin) {
      throw new Error('Only administrators can reset the leaderboard');
    }
    this._leaderboardDatabase.scores = [];
    this._emitAreaChanged();
  }

  /**
   * Applies global settings for the leaderboard (administrator)
   */
  public applyLeaderboardSettings(settings: LeaderboardSettings, player: Player): void {
    if (!player.isAdmin) {
      throw new Error('Only administrators can change the leaderboard settings');
    }
    if (settings.reset) {
      this.resetLeaderboard(player);
    }
    if (settings.defaultDisplayCount) {
      this.setDefaultDisplayCount(settings.defaultDisplayCount);
    }
    if (settings.defaultSortType) {
      this.setDefaultSortType(settings.defaultSortType);
    }
    if (settings.visibleFields) {
      this._leaderboardDatabase.visibleFields = settings.visibleFields;
    }
    this._emitAreaChanged();
  }

  /**
   * Sets the default number of scores to display on the leaderboard. No negative numbers allowed.
   */
  public setDefaultDisplayCount(numScore: number): void {
    if (numScore < 0) {
      throw new Error(NO_NEGATIVE_NUMBERS_MESSAGE);
    }
    this._defaultDisplayCount = numScore;
    this._emitAreaChanged();
  }

  /**
   * Sets the default sort type for the leaderboard.
   */
  public setDefaultSortType(sortType: LeaderboardField): void {
    this._defaultSortType = sortType;
    this._emitAreaChanged();
  }

  /**
   * Get a list of the player IDs for all players who have the leaderboard hidden.
   */
  public getHiddenTownees(): PlayerID[] {
    return this._leaderboardDatabase.hiddenTownees;
  }

  /**
   * Creates a new Leaderboard object that will represent a Leaderboard object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this leaderboard exists
   * @param broadcastEmitter An emitter that can be used by this leaderboard to broadcast updates
   * @returns
   */
  public static fromMapObject(
    mapObject: ITiledMapObject,
    broadcastEmitter: TownEmitter,
    leaderboardDatabase: LeaderboardDatabase,
  ): Leaderboard {
    const { name, width, height } = mapObject;
    if (!width || !height) {
      throw new Error(`Malformed viewing area ${name}`);
    }
    const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };
    return new Leaderboard(name, rect, broadcastEmitter, leaderboardDatabase);
  }
}
