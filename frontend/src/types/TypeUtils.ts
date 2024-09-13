import {
  ConversationArea,
  Interactable,
  TicTacToeGameState,
  ViewingArea,
  GameArea,
  ConnectFourGameState,
  LeaderboardArea,
  MemoryGameState,
} from './CoveyTownSocket';

/**
 * Test to see if an interactable is a conversation area
 */
export function isConversationArea(interactable: Interactable): interactable is ConversationArea {
  return interactable.type === 'ConversationArea';
}

/**
 * Test to see if an interactable is a viewing area
 */
export function isViewingArea(interactable: Interactable): interactable is ViewingArea {
  return interactable.type === 'ViewingArea';
}

export function isTicTacToeArea(
  interactable: Interactable,
): interactable is GameArea<TicTacToeGameState> {
  return interactable.type === 'TicTacToeArea';
}
export function isConnectFourArea(
  interactable: Interactable,
): interactable is GameArea<ConnectFourGameState> {
  return interactable.type === 'ConnectFourArea';
}
export function isMemoryGameArea(
  interactable: Interactable,
): interactable is GameArea<MemoryGameState> {
  return interactable.type === 'MemoryGameArea';
}
/**
 * Test to see if an interactable is a leaderboard area
 * @param interactable the interactable to check the type of
 * @returns if the interactable is a LeaderboardArea
 */
export function isLeaderboardArea(interactable: Interactable): interactable is LeaderboardArea {
  return interactable.type === 'LeaderboardArea';
}
