export type TownJoinResponse = {
  /** Unique ID that represents this player * */
  userID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  sessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Current state of interactables in this town */
  interactables: TypedInteractable[];
  /** Current memory game settings in this town */
  memoryGameSettings?: MemoryGameSettings;
}

export type InteractableType = 'ConversationArea' | 'ViewingArea' | 'TicTacToeArea' | 'ConnectFourArea' | 'MemoryGameArea' | 'LeaderboardArea';

export interface Interactable {
  type: InteractableType;
  id: InteractableID;
  occupants: PlayerID[];
}

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

export type Direction = 'front' | 'back' | 'left' | 'right';

export type PlayerID = string;
export interface Player {
  id: PlayerID;
  userName: string;
  location: PlayerLocation;
  isAdmin?: boolean;
};

export type XY = { x: number, y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
};
export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
  interactableID?: string;
};

export interface ConversationArea extends Interactable {
  topic?: string;
};

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface ViewingArea extends Interactable {
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

export type GameStatus = 'IN_PROGRESS' | 'WAITING_TO_START' | 'OVER' | 'WAITING_FOR_PLAYERS';
/**
 * Base type for the state of a game
 */
export interface GameState {
  status: GameStatus;
} 

/**
 * Type for the state of a game that can be won
 */
export interface WinnableGameState extends GameState {
  winner?: PlayerID;
}
/**
 * Base type for a move in a game. Implementers should also extend MoveType
 * @see MoveType
 */
export interface GameMove<MoveType> {
  playerID: PlayerID;
  gameID: GameInstanceID;
  move: MoveType;
}

export type TicTacToeGridPosition = 0 | 1 | 2;

/**
 * Type for a move in TicTacToe
 */
export interface TicTacToeMove {
  gamePiece: 'X' | 'O';
  row: TicTacToeGridPosition;
  col: TicTacToeGridPosition;
}

/**
 * Type for the state of a MemoryGame.
 */
export interface MemoryGameState extends GameState {
  status: GameStatus;
  player?: PlayerID;
  score: number;
  lives: number;
  boardSize: MemoryBoardSize;
  solutionBoard: MemoryGameBoard;
  guessesBoard: MemoryGameBoard;
  transmiteScore: boolean;
  memorizationTimeSeconds: number;
  guessingTimeSeconds: number;
  // The visual color of the tiles as rendered on the frontend
  unknownTileColor?: UnknownTileColor;
  // The visual shape of the tiles as rendered on the frontend
  tileShape?: TileShape;
  
}
/**
 * Type for a move in MemoryGame.
 */
export interface MemoryGameMove {
  row: number;
  column: number;
  transmitScore: boolean;
  // The game piece field should not be used. It is only included because there are undocumented 
  // assumptions that all GameMove types must have a gamePiece field. Omitting this field causes type errors in ConnectFourGameArea.ts
  gamePiece: undefined;
}
/**
 * Type for the size of a MemoryGame board.
 */
export interface MemoryBoardSize {
  rows: number;
  columns: number;
}

/**
 * Type for the cells in a memory game board
 */
export type MemoryGameCell = boolean | undefined;

/**
 * Type for the state of a MemoryGame board.
 */
export type MemoryGameBoard = MemoryGameCell[][];
/**
 * Type for the settings of a MemoryGame.
 */

export type UnknownTileColor = 'blue' | 'yellow' | 'purple' | 'orange' | 'pink' | 'brown' | 'black' | 'white';
export type TileShape = 'circle' | 'square';
export interface MemoryGameSettings {
  startingLives: number;
  startingBoardSize: MemoryBoardSize;
  memorizationTimeSeconds: number;
  guessingTimeSeconds: number;
  // If this is false, the game will not increase in difficulty through increasing board size or increasing targetTilesPercentage.
  increasingDifficulty: boolean;
  // What percentage of the board's tiles are the target tiles whose position the user needs to correctly memorize and identify.
  // When generating a new board using this value, the number of target tiles are rounded up to the nearest whole number.
  targetTilesPercentage: number;
  // if the memory game is playable. This can be set by the town administrator
  isPlayable: boolean;
  // The visual color of the tiles as rendered on the frontend
  unknownTileColor?: UnknownTileColor;
  // The visual shape of the tiles as rendered on the frontend
  tileShape?: TileShape;
}

/**
 * Type for the state of a TicTacToe game
 * The state of the game is represented as a list of moves, and the playerIDs of the players (x and o)
 * The first player to join the game is x, the second is o
 */
export interface TicTacToeGameState extends WinnableGameState {
  moves: ReadonlyArray<TicTacToeMove>;
  x?: PlayerID;
  o?: PlayerID;
}

/**
 * Type for the state of a ConnectFour game.
 * The state of the game is represented as a list of moves, and the playerIDs of the players (red and yellow)
 */
export interface ConnectFourGameState extends WinnableGameState {
  // The moves in this game
  moves: ReadonlyArray<ConnectFourMove>;
  // The playerID of the red player, if any
  red?: PlayerID;
  // The playerID of the yellow player, if any
  yellow?: PlayerID;
  // Whether the red player is ready to start the game
  redReady?: boolean;
  // Whether the yellow player is ready to start the game
  yellowReady?: boolean;
  // The color of the player who will make the first move
  firstPlayer: ConnectFourColor;
}

/**
 * Type for a move in ConnectFour
 * Columns are numbered 0-6, with 0 being the leftmost column
 * Rows are numbered 0-5, with 0 being the top row
 */
export interface ConnectFourMove {
  gamePiece: ConnectFourColor;
  col: ConnectFourColIndex;
  row: ConnectFourRowIndex;
}

/**
 * Row indices in ConnectFour start at the top of the board and go down
 */
export type ConnectFourRowIndex = 0 | 1 | 2 | 3 | 4 | 5;
/**
 * Column indices in ConnectFour start at the left of the board and go right
 */
export type ConnectFourColIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ConnectFourColor = 'Red' | 'Yellow';

export type InteractableID = string;
export type GameInstanceID = string;

/**
 * Type for the result of a game
 */
export interface GameResult {
  gameID: GameInstanceID;
  scores: { [playerName: string]: number };
}

/**
 * Base type for an *instance* of a game. An instance of a game
 * consists of the present state of the game (which can change over time),
 * the players in the game, and the result of the game
 * @see GameState
 */
export interface GameInstance<T extends GameState> {
  state: T;
  id: GameInstanceID;
  players: PlayerID[];
  result?: GameResult;
}

/**
 * Base type for an area that can host a game
 * @see GameInstance
 */
export interface GameArea<T extends GameState> extends Interactable {
  game: GameInstance<T> | undefined;
  history: GameResult[];
}

export type CommandID = string;

/**
 * Base type for a command that can be sent to an interactable.
 * This type is used only by the client/server interface, which decorates
 * an @see InteractableCommand with a commandID and interactableID
 */
interface InteractableCommandBase {
  /**
   * A unique ID for this command. This ID is used to match a command against a response
   */
  commandID: CommandID;
  /**
   * The ID of the interactable that this command is being sent to
   */
  interactableID: InteractableID;
  /**
   * The type of this command
   */
  type: string;
}

export type InteractableCommand =  ViewingAreaUpdateCommand | JoinGameCommand | GameMoveCommand<TicTacToeMove> | GameMoveCommand<ConnectFourMove> | GameMoveCommand<MemoryGameMove> | StartGameCommand | MemoryGameStartGameCommand | LeaveGameCommand | LeaderboardSettingsCommand | LeaderboardVisibilityCommand;

export interface MemoryGameStartGameCommand {
  type: 'MemoryGameStartGame';
  gameID: GameInstanceID;
  competitiveMode: boolean;
  customizedSettings?: MemoryGameSettings;
}
export interface ViewingAreaUpdateCommand  {
  type: 'ViewingAreaUpdate';
  update: ViewingArea;
}
export interface JoinGameCommand {
  type: 'JoinGame';
}
export interface LeaveGameCommand {
  type: 'LeaveGame';
  gameID: GameInstanceID;
}
export interface StartGameCommand {
  type: 'StartGame';
  gameID: GameInstanceID;
}
export interface GameMoveCommand<MoveType> {
  type: 'GameMove';
  gameID: GameInstanceID;
  move: MoveType;
}

export interface LeaderboardSettingsCommand {
  type: 'LeaderboardSettings';
  settings: LeaderboardSettings
}

export interface LeaderboardVisibilityCommand {
  type: 'LeaderboardVisibility';
  setLeaderboardVisible: boolean;
}


export type InteractableCommandReturnType<CommandType extends InteractableCommand> = 
  CommandType extends JoinGameCommand ? { gameID: string}:
  CommandType extends ViewingAreaUpdateCommand ? undefined :
  CommandType extends GameMoveCommand<TicTacToeMove> ? undefined :
  CommandType extends LeaveGameCommand ? undefined :
  CommandType extends LeaderboardVisibilityCommand ? undefined :
  CommandType extends LeaderboardSettingsCommand ? undefined :
  CommandType extends LeaderboardVisibilityCommand ? undefined :
  never;
  

export type InteractableCommandResponse<MessageType> = {
  commandID: CommandID;
  interactableID: InteractableID;
  error?: string;
  payload?: InteractableCommandResponseMap[MessageType];
}

export type MemoryGameSettingsCommand = {
  commandID: CommandID,
  settings: MemoryGameSettings
}

export type MemoryGameSettingsCommandResponse = {
  commandID: CommandID,
  success: boolean
}

export interface ServerToClientEvents {
  playerMoved: (movedPlayer: Player) => void;
  playerDisconnect: (disconnectedPlayer: Player) => void;
  playerJoined: (newPlayer: Player) => void;
  initialize: (initialData: TownJoinResponse) => void;
  townSettingsUpdated: (update: TownSettingsUpdate) => void;
  townClosing: () => void;
  chatMessage: (message: ChatMessage) => void;
  interactableUpdate: (interactable: Interactable) => void;
  commandResponse: (response: InteractableCommandResponse) => void;
  memoryGameSettingsResponse: (response: MemoryGameSettingsCommandResponse) => void;
}

export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
  interactableCommand: (command: InteractableCommand & InteractableCommandBase) => void;
  memoryGameSettingsUpdate: (command: MemoryGameSettingsCommand) => void;
}

// The fields that make up a ScoreData object
export type LeaderboardField = 'score' | 'date' | 'playerUsername' | 'gameType';

export type ScoreData = {
  _id: string
  // The score value of this entry
  score?: number;
  // The date and time this score entry was created
  date?: Date;
  // The username of the player who played in this score entry
  playerUsername?: string;
  // The type of game this score entry is for
  gameType?: InteractableType;
}

/**
 * Type for the town-wide leaderboard. Only one leaderboard is supported per town.
 */
export interface LeaderboardModel {
  /**
   * Adds a score to the leaderboard database
   */
  addScore: (score: ScoreData) => void;
  /**
   * Gets the scores for a given game type, altered for visible fields.
   * The player ID for the given player always shows even if the visible settings hide names.
   */
  getScores: (gameType: InteractableType, playerUsername: string) => ScoreData[];
  /**
   * Erases all scores from the leaderboard. (administrator)
   */
  resetLeaderboard: (player: Player) => void;
  /**
   * Applies global settings for the leaderboard (administrator)
   */
  applyLeaderboardSettings: (settings: LeaderboardSettings, player: Player) => void;
  /**
   * Sets the default number of scores to display on the leaderboard.
   */
  setDefaultDisplayCount: (numScore: number) => void;
  /**
   * Sets the default sort type for the leaderboard.
   */
  setDefaultSortType: (sortType: LeaderboardField) => void;
  /**
   * Get a list of the player IDs for all players who have the leaderboard hidden.
   */
  getHiddenTownees: () => PlayerID[];
}

export interface LeaderboardSettings {
  defaultDisplayCount: number;
  defaultSortType: LeaderboardField;
  visibleFields: LeaderboardField[];
  reset: boolean;
}

export interface LeaderboardArea extends Interactable {
  settings: LeaderboardSettings;
  scores: ScoreData[];
  hiddenTownees: PlayerID[];
}