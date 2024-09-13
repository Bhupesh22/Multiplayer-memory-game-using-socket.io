import {
  MemoryBoardSize,
  MemoryGameSettings,
  TileShape,
  UnknownTileColor,
} from '../../types/CoveyTownSocket';

/**
 * This is a singleton class that holds settings for the MemoryGame.
 * It is used to store the default settings for the game, which are all set as public so they can be
 * updated as needed.
 */
export default class DefaultMemoryGameSettings implements MemoryGameSettings {
  public startingLives: number;

  public startingBoardSize: MemoryBoardSize;

  public memorizationTimeSeconds: number;

  public guessingTimeSeconds: number;

  public increasingDifficulty: boolean;

  public targetTilesPercentage: number;

  // Can be used to enable or disable playing the game in the town.
  public isPlayable: boolean;

  public unknownTileColor?: UnknownTileColor;

  tileShape?: TileShape;

  constructor() {
    this.startingLives = 3;
    this.startingBoardSize = { rows: 4, columns: 4 };
    this.memorizationTimeSeconds = 5;
    this.guessingTimeSeconds = 15;
    this.isPlayable = true;
    this.increasingDifficulty = true;
    this.targetTilesPercentage = 0.25;
    this.isPlayable = true;
    this.unknownTileColor = 'white';
    this.tileShape = 'square';
  }
}
