import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import { BoundingBox, TownEmitter } from '../../types/CoveyTownSocket';
import InteractableArea from '../InteractableArea';
import ConnectFourGameArea from './ConnectFourGameArea';
import TicTacToeGameArea from './TicTacToeGameArea';
import MemoryGameGameArea from './MemoryGameGameArea';
import DefaultMemoryGameSettings from './DefaultMemoryGameSettings';
import LeaderboardDatabase from '../LeaderboardDatabase';

/**
 * Creates a new GameArea from a map object
 * @param mapObject the map object to create the game area from
 * @param broadcastEmitter a broadcast emitter that can be used to emit updates to players
 * @returns the interactable area
 * @throws an error if the map object is malformed
 */
export default function GameAreaFactory(
  mapObject: ITiledMapObject,
  broadcastEmitter: TownEmitter,
  defaultMemoryGameSettings: DefaultMemoryGameSettings,
  leaderboardDatabase: LeaderboardDatabase,
): InteractableArea {
  const { name, width, height } = mapObject;
  if (!width || !height) {
    throw new Error(`Malformed viewing area ${name}`);
  }
  const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };
  const gameType = mapObject.properties?.find(prop => prop.name === 'type')?.value;
  if (gameType === 'TicTacToe') {
    return new TicTacToeGameArea(name, rect, broadcastEmitter);
  }
  if (gameType === 'ConnectFour') {
    return new ConnectFourGameArea(name, rect, broadcastEmitter);
  }
  if (gameType === 'MemoryGame') {
    return new MemoryGameGameArea(
      name,
      rect,
      broadcastEmitter,
      defaultMemoryGameSettings,
      leaderboardDatabase,
    );
  }

  throw new Error(`Unknown game area type ${mapObject.class}`);
}
