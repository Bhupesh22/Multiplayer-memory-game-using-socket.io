import { LeaderboardField, PlayerID, ScoreData } from '../types/CoveyTownSocket';

/**
 * A class that holds score data for the leaderboard for a town.
 */
export default class LeaderboardDatabase {
  public scores: ScoreData[];

  public hiddenTownees: PlayerID[];

  public visibleFields: LeaderboardField[];

  constructor(
    scores?: ScoreData[],
    hiddenTownees?: PlayerID[],
    visibleFields?: LeaderboardField[],
  ) {
    this.scores = scores ?? [];
    this.hiddenTownees = hiddenTownees ?? [];
    this.visibleFields = visibleFields ?? ['score', 'date', 'playerUsername', 'gameType'];
  }

  // A callback function that gets called when a new score is added
  private _scoreAddedCallback?: () => void;

  public addScore(score: ScoreData): void {
    this.scores.push(score);
    if (this._scoreAddedCallback) {
      this._scoreAddedCallback();
    }
  }

  public registerScoreAddedCallback(callback: () => void): void {
    this._scoreAddedCallback = callback;
  }
}
