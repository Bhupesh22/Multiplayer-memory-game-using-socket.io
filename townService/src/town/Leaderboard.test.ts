import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import { InteractableType, LeaderboardSettings, TownEmitter } from '../types/CoveyTownSocket';
import Leaderboard from './Leaderboard';
import LeaderboardDatabase from './LeaderboardDatabase';

describe('Leaderboard', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: Leaderboard;
  let testLeaderboardDatabase: LeaderboardDatabase;
  const townEmitter = mock<TownEmitter>();
  const id = nanoid();
  let newPlayer: Player;
  const dateToday = new Date();
  const dateYesterday = new Date(new Date().setDate(new Date().getDate() - 1));
  const dateTomorrow = new Date(new Date().setDate(new Date().getDate() + 1));
  const score1 = {
    _id: nanoid(),
    score: 100,
    date: dateYesterday, // Oldest date
    playerUsername: 'a',
    gameType: 'MemoryGameArea' as InteractableType,
  };
  const score2 = {
    _id: nanoid(),
    score: 200,
    date: dateTomorrow, // Most recent date
    playerUsername: 'b',
    gameType: 'MemoryGameArea' as InteractableType,
  };
  const score3 = {
    _id: nanoid(),
    score: 300,
    date: dateToday, // Middle date
    playerUsername: 'c',
    gameType: 'MemoryGameArea' as InteractableType,
  };

  beforeEach(() => {
    mockClear(townEmitter);
    testLeaderboardDatabase = new LeaderboardDatabase([score1, score2, score3]);
    testArea = new Leaderboard(id, testAreaBox, townEmitter, testLeaderboardDatabase);
    newPlayer = new Player(nanoid(), mock<TownEmitter>(), true);
    testArea.add(newPlayer);
  });

  describe('add', () => {
    it('Adds the player to the occupants list and emits an interactableUpdate event', () => {
      expect(testArea.occupantsByID).toEqual([newPlayer.id]);

      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [score1, score2, score3],
        settings: {
          defaultDisplayCount: 10,
          defaultSortType: 'score',
          reset: false,
          visibleFields: ['score', 'date', 'playerUsername', 'gameType'],
        },
        id,
        hiddenTownees: [],
        occupants: [newPlayer.id],
        type: 'LeaderboardArea',
      });
    });
    it("Sets the player's conversationLabel and emits an update for their location", () => {
      expect(newPlayer.location.interactableID).toEqual(id);

      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toEqual(id);
    });
  });
  describe('remove', () => {
    it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
      // Add another player so that we are not also testing what happens when the last player leaves
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      testArea.remove(newPlayer);

      expect(testArea.occupantsByID).toEqual([extraPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [score1, score2, score3],
        settings: {
          defaultDisplayCount: 10,
          defaultSortType: 'score',
          reset: false,
          visibleFields: ['score', 'date', 'playerUsername', 'gameType'],
        },
        id,
        hiddenTownees: [],
        occupants: [extraPlayer.id],
        type: 'LeaderboardArea',
      });
    });
    it("Clears the player's conversationLabel and emits an update for their location", () => {
      testArea.remove(newPlayer);
      expect(newPlayer.location.interactableID).toBeUndefined();
      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toBeUndefined();
    });
  });
  describe('fromMapObject', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        Leaderboard.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
          testLeaderboardDatabase,
        ),
      ).toThrowError();
    });
    it('Creates a new leaderboard using the provided boundingBox and id, with an empty occupants list', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const val = Leaderboard.fromMapObject(
        { x, y, width, height, name, id: 10, visible: true },
        townEmitter,
        testLeaderboardDatabase,
      );
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.occupantsByID).toEqual([]);
    });
  });

  describe('getScores', () => {
    it('Returns all the scores', () => {
      const allScores = testArea.getScores('MemoryGameArea' as InteractableType, 'score');
      expect(allScores).toEqual([score1, score2, score3]);
    });
  });

  describe('resetLeaderboard', () => {
    it('Resets the leaderboard scores', () => {
      expect(testLeaderboardDatabase.scores).toEqual([score1, score2, score3]);
      testArea.resetLeaderboard(newPlayer);
      expect(testLeaderboardDatabase.scores).toEqual([]);
      expect(testArea.getScores('MemoryGameArea' as InteractableType, 'score')).toEqual([]);
    });
    it('Should do nothing if the leaderboard is empty', () => {
      testLeaderboardDatabase.scores = [];
      testArea.resetLeaderboard(newPlayer);
      expect(testLeaderboardDatabase.scores).toEqual([]);
    });
    it('Should throw an error if the player is not an admin', () => {
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>(), false);
      expect(() => testArea.resetLeaderboard(extraPlayer)).toThrowError();
    });
    it('should emit an interactableUpdate event', () => {
      testArea.resetLeaderboard(newPlayer);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [],
        settings: {
          defaultDisplayCount: 10,
          defaultSortType: 'score',
          reset: false,
          visibleFields: ['score', 'date', 'playerUsername', 'gameType'],
        },
        id,
        hiddenTownees: [],
        occupants: [newPlayer.id],
        type: 'LeaderboardArea',
      });
    });
  });

  describe('applyLeaderboardSettings', () => {
    it('Updates the leaderboard settings to have only 3 visible fields', () => {
      const settings: LeaderboardSettings = {
        defaultSortType: testArea.getDefaultSortType(),
        defaultDisplayCount: testArea.getDefaultDisplayCount(),
        visibleFields: ['score', 'date', 'playerUsername'],
        reset: false,
      };
      testArea.applyLeaderboardSettings(settings, newPlayer);
      expect(testLeaderboardDatabase.visibleFields).toEqual(['score', 'date', 'playerUsername']);
    });
    it('Updates the leaderboard settings to sort by date', () => {
      const settings: LeaderboardSettings = {
        defaultSortType: 'date',
        defaultDisplayCount: testArea.getDefaultDisplayCount(),
        visibleFields: testLeaderboardDatabase.visibleFields,
        reset: false,
      };
      testArea.applyLeaderboardSettings(settings, newPlayer);
      expect(testArea.getDefaultSortType()).toEqual('date');
    });
    it('Updates the leaderboard settings to display 2 scores', () => {
      const settings: LeaderboardSettings = {
        defaultSortType: testArea.getDefaultSortType(),
        defaultDisplayCount: 2,
        visibleFields: testLeaderboardDatabase.visibleFields,
        reset: false,
      };
      testArea.applyLeaderboardSettings(settings, newPlayer);
      expect(testArea.getDefaultDisplayCount()).toEqual(2);
    });
    it('Resets the leaderboard if the reset flag is set', () => {
      const settings: LeaderboardSettings = {
        defaultSortType: testArea.getDefaultSortType(),
        defaultDisplayCount: testArea.getDefaultDisplayCount(),
        visibleFields: testLeaderboardDatabase.visibleFields,
        reset: true,
      };
      testArea.applyLeaderboardSettings(settings, newPlayer);
      expect(testLeaderboardDatabase.scores).toEqual([]);
    });
    it('Should throw an error if the player is not an admin', () => {
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>(), false);
      const settings: LeaderboardSettings = {
        defaultSortType: testArea.getDefaultSortType(),
        defaultDisplayCount: testArea.getDefaultDisplayCount(),
        visibleFields: testLeaderboardDatabase.visibleFields,
        reset: false,
      };
      expect(() => testArea.applyLeaderboardSettings(settings, extraPlayer)).toThrowError();
    });
    it('Should emit an interactableUpdate event', () => {
      const settings: LeaderboardSettings = {
        defaultSortType: testArea.getDefaultSortType(),
        defaultDisplayCount: testArea.getDefaultDisplayCount(),
        visibleFields: testLeaderboardDatabase.visibleFields,
        reset: false,
      };
      testArea.applyLeaderboardSettings(settings, newPlayer);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [score1, score2, score3],
        settings,
        id,
        hiddenTownees: [],
        occupants: [newPlayer.id],
        type: 'LeaderboardArea',
      });
    });
  });

  describe('setDefaultDisplayCount', () => {
    it('Should throw an error if the display count is negative', () => {
      expect(() => testArea.setDefaultDisplayCount(-3)).toThrowError();
      expect(() => testArea.setDefaultDisplayCount(-1)).toThrowError();
      expect(() => testArea.setDefaultDisplayCount(-100)).toThrowError();
    });
    it('Sets the default display count to 5', () => {
      testArea.setDefaultDisplayCount(5);
      expect(testArea.getDefaultDisplayCount()).toEqual(5);
    });
    it('Sets the default display count to 0', () => {
      testArea.setDefaultDisplayCount(0);
      expect(testArea.getDefaultDisplayCount()).toEqual(0);
    });
    it('Should emit an interactableUpdate event', () => {
      testArea.setDefaultDisplayCount(5);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [score1, score2, score3],
        settings: {
          defaultDisplayCount: 5,
          defaultSortType: 'score',
          reset: false,
          visibleFields: ['score', 'date', 'playerUsername', 'gameType'],
        },
        id,
        hiddenTownees: [],
        occupants: [newPlayer.id],
        type: 'LeaderboardArea',
      });
    });
  });

  describe('setDefaultSortType', () => {
    it('Sets the default sort type to date', () => {
      testArea.setDefaultSortType('date');
      expect(testArea.getDefaultSortType()).toEqual('date');
    });
    it('Sets the default sort type to playerUsername', () => {
      testArea.setDefaultSortType('playerUsername');
      expect(testArea.getDefaultSortType()).toEqual('playerUsername');
    });
    it('Sets the default sort type to score', () => {
      testArea.setDefaultSortType('score');
      expect(testArea.getDefaultSortType()).toEqual('score');
    });
    it('Should emit an interactableUpdate event', () => {
      testArea.setDefaultSortType('date');
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        scores: [score1, score2, score3],
        settings: {
          defaultDisplayCount: 10,
          defaultSortType: 'date',
          reset: false,
          visibleFields: ['score', 'date', 'playerUsername', 'gameType'],
        },
        id,
        hiddenTownees: [],
        occupants: [newPlayer.id],
        type: 'LeaderboardArea',
      });
    });
  });

  describe('getHiddenTownees', () => {
    it('Returns the hidden townees', () => {
      expect(testArea.getHiddenTownees()).toEqual([]);
    });
  });

  describe('fromMapObject', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        Leaderboard.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
          testLeaderboardDatabase,
        ),
      ).toThrowError();
    });
    it('Creates a new conversation area using the provided boundingBox and id, with an empty occupants list', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const val = Leaderboard.fromMapObject(
        { x, y, width, height, name, id: 10, visible: true },
        townEmitter,
        testLeaderboardDatabase,
      );
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.getDefaultDisplayCount()).toEqual(10);
      expect(val.getDefaultSortType()).toEqual('score');
      expect(val.occupantsByID).toEqual([]);
    });
  });
});
