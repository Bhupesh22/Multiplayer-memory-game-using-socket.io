import {
  InteractableID,
  LeaderboardArea as LeaderboardAreaModel,
  ScoreData,
  LeaderboardSettings,
  PlayerID,
  LeaderboardVisibilityCommand,
} from '../../types/CoveyTownSocket';
import TownController from '../TownController';
import InteractableAreaController, {
  BaseInteractableEventMap,
  LEADERBOARD_AREA_TYPE,
} from './InteractableAreaController';

export const LEADERBOARD_AREA_FRIENDLY_NAME = 'Town Leaderboard';

/**
 * The events that the LeaderboardAreaController emits to subscribers (client components).
 * These events are only ever emitted to local components (not to the townService).
 */
export type LeaderboardAreaEvents = BaseInteractableEventMap & {
  leaderboardUpdate: (newLeaderboard: LeaderboardAreaModel) => void;
  visibilityUpdate: (isVisible: boolean) => void;
};

export default class LeaderboardAreaController extends InteractableAreaController<
  LeaderboardAreaEvents,
  LeaderboardAreaModel
> {
  protected _model: LeaderboardAreaModel;

  protected _townController: TownController;

  protected _isVisible: boolean;

  constructor(
    id: InteractableID,
    leaderboardArea: LeaderboardAreaModel,
    townController: TownController,
  ) {
    super(id);
    this._model = leaderboardArea;
    this._townController = townController;
    this._isVisible = this._leaderboardVisible(leaderboardArea.hiddenTownees);
  }

  public get friendlyName(): string {
    return 'Town Leaderboard';
  }

  public get type(): string {
    return LEADERBOARD_AREA_TYPE;
  }

  public get scores(): ScoreData[] {
    return this._model.scores;
  }

  public get settings(): LeaderboardSettings {
    return this._model.settings;
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public async setVisibility(isVisible: boolean) {
    if (this._isVisible !== isVisible) {
      await this._townController.sendInteractableCommand<LeaderboardVisibilityCommand>(this.id, {
        type: 'LeaderboardVisibility',
        setLeaderboardVisible: isVisible,
      });
    }
  }

  toInteractableAreaModel(): LeaderboardAreaModel {
    return this._model;
  }

  private _scoresChanged(newScores: ScoreData[]): boolean {
    const oldScoreIDs = this.scores.map(score => score._id);
    const newScoreIDs = newScores.map(score => score._id);

    return !(
      oldScoreIDs.length === newScoreIDs.length &&
      oldScoreIDs.every(score => newScoreIDs.indexOf(score) >= 0)
    );
  }

  private _settingsChanged(newSettings: LeaderboardSettings): boolean {
    return !(
      this.settings.defaultDisplayCount === newSettings.defaultDisplayCount &&
      this.settings.defaultSortType === newSettings.defaultSortType &&
      this.settings.visibleFields.length === newSettings.visibleFields.length &&
      this.settings.reset === newSettings.reset &&
      this.settings.visibleFields.every(field => newSettings.visibleFields.indexOf(field) >= 0)
    );
  }

  private _leaderboardVisible(hiddenTownees: PlayerID[]): boolean {
    return hiddenTownees.indexOf(this._townController.ourPlayer.id) === -1;
  }

  private _convertScoreDates(newModel: LeaderboardAreaModel): LeaderboardAreaModel {
    if (newModel.settings.visibleFields.indexOf('date') >= 0) {
      newModel.scores = newModel.scores.map(score => ({
        ...score,
        date: new Date(score.date || new Date()),
      }));
    }
    return newModel;
  }

  protected _updateFrom(newModel: LeaderboardAreaModel): void {
    let leaderboardUpdate = false;
    if (this._scoresChanged(newModel.scores)) {
      newModel = this._convertScoreDates(newModel);
      this._model.scores = newModel.scores;
      leaderboardUpdate = true;
    }

    if (this._settingsChanged(newModel.settings)) {
      this._model.settings = newModel.settings;
      leaderboardUpdate = true;
    }

    if (this._leaderboardVisible(newModel.hiddenTownees) != this._isVisible) {
      this._isVisible = !this._isVisible;
      this.emit('visibilityUpdate', this._isVisible);
    }

    if (leaderboardUpdate) {
      this.emit('leaderboardUpdate', this._model);
    }
  }

  public isActive(): boolean {
    // leaderboard should never count as an active interactable area
    return false;
  }
}
