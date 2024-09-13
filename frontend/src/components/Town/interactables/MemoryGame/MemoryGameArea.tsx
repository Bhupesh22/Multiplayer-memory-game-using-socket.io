import { GameStatus, InteractableID } from '../../../../types/CoveyTownSocket';
import React, { useEffect, useState } from 'react';
import { useInteractableAreaController } from '../../../../classes/TownController';
import MemoryGameAreaController from '../../../../classes/interactable/MemoryGameAreaController';
import {
  Button,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Switch,
  useToast,
} from '@chakra-ui/react';
import MemoryGameBoard from './MemoryGameBoard';
import useTownController from '../../../../hooks/useTownController';
/**
 * The MemoryGameArea component renders the Memory Game area.
 * It renders the current state of the area.
 *
 * It uses Chakra-UI components (does not use other GUI widgets)
 *
 * It uses the MemoryGameAreaController to get the current state of the game.
 * It listens for the 'gameUpdated' and 'gameEnd' events on the controller, and re-renders accordingly.
 * It subscribes to these events when the component mounts, and unsubscribes when the component unmounts. It also unsubscribes when the gameAreaController changes.
 *
 * It renders the following:
 * - The player's username
 *    - If there is no player in the game, the username is '(No player yet!)'
 * - A message indicating the current game status:
 *    - If the game is in progress, the message is 'Game in progress, current score: {score}, lives remaining: {livesRemaining}'.
 *    - If the game is in status WAITING_FOR_PLAYERS, the message is 'Waiting for player to join'
 *    - If the game is in status WAITING_TO_START, the message is 'Showing new game board pattern for {memorizationTimeSeconds} seconds'
 *    - If the game is in status OVER, the toast message pops up with 'Game over, your final score was {score}!'
 *      - If the player allowed for game to be sent to the leaderboard, the message will also say 'Your score has been sent to the leaderboard'
 * - If the game is in status WAITING_FOR_PLAYERS or OVER, a button to join the game is displayed, with the text 'Join New Game'
 *    - Clicking the button calls the joinGame method on the gameAreaController
 *    - Before calling joinGame method, the button is disabled and has the property isLoading set to true, and is re-enabled when the method call completes
 *    - If the method call fails, a toast is displayed with the error message as the description of the toast (and status 'error')
 *    - Once the player joins the game, the button dissapears
 * - If the game is in status WAITING_TO_START
 *    - displays the game board pattern for {memorizationTimeSeconds} seconds, then switches game to IN_PROGRESS and hides the board pattern
 *    - If the method call fails, a toast is displayed with the error message as the description of the toast (and status 'error')
 * - The MemoryGameBoard component, which is passed the current gameAreaController as a prop (@see MemoryGameBoard.tsx)
 *
 * - When the game ends, a toast is displayed with the result of the game:
 *    - 'Game ended, your final score was {score}!'
 *
 */
export default function MemoryGameArea({
  interactableID,
}: {
  interactableID: InteractableID;
}): JSX.Element {
  const gameAreaController =
    useInteractableAreaController<MemoryGameAreaController>(interactableID);
  const townController = useTownController();
  const [joiningGame, setJoiningGame] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>(gameAreaController.status);
  const [memorizationTimeMax, setMemorizationTimeMax] = useState(5);
  const [guessTimeMax, setGuessTimeMax] = useState(15);
  const [transmitScore, setTransmitScore] = useState(false);
  const toast = useToast();
  const [score, setScore] = useState(gameAreaController.score || 0);
  const [livesRemaining, setLivesRemaining] = useState(gameAreaController.livesRemaining);

  //Used for setup in non competitive mode
  const [competitiveMode, setCompetitiveMode] = useState(true);
  const [startingTilesPercentage, setStartingTilesPercentage] = useState(0.15);
  const [startingBoardSize, setStartingBoardSize] = useState(5);
  const [startingLives, setStartingLives] = useState(3);
  const [memorizationTimeCounter, setMemorizationTimeCounter] = useState(5);
  const [guessTimeCounter, setGuessTimeCounter] = useState(15);
  const [isIncreasingDifficulty, setIsIncreasingDifficulty] = useState(true);
  const [isCircle, setIsCircle] = useState(false);
  const [unknownTileColor, setUnknownTileColor] = useState('white');

  useEffect(() => {
    const updateGameState = () => {
      setMemorizationTimeMax(gameAreaController.memorizationTimeSeconds);
      setGuessTimeMax(gameAreaController.guessTimeSeconds);
      setScore(gameAreaController.score || 0);
      setLivesRemaining(gameAreaController.livesRemaining || 0);
      setGameStatus(gameAreaController.status);
      //if the game advances to the next board immediately, reset the memorization time counter as well
      setMemorizationTimeCounter(gameAreaController.memorizationTimeSeconds);
      setIsCircle(gameAreaController.tileShape === 'circle');
      setUnknownTileColor(gameAreaController.unknownTileColor || 'white');
    };
    gameAreaController.addListener('gameUpdated', updateGameState);
    return () => {
      gameAreaController.removeListener('gameUpdated', updateGameState);
    };
  }, [gameAreaController, townController]);

  useEffect(() => {
    const onGameEnd = () => {
      toast({
        title: 'Game over!',
        description: `Your final score was ${score}! ${
          transmitScore ? 'Your score has been sent to the leaderboard!' : ''
        }`,
        status: 'success',
      });
    };
    gameAreaController.addListener('gameEnd', onGameEnd);
    return () => {
      gameAreaController.removeListener('gameEnd', onGameEnd);
    };
  }, [gameAreaController, townController, score, toast, transmitScore]);

  useEffect(() => {
    if (gameStatus === 'IN_PROGRESS' && gameAreaController.isPlayer) {
      setMemorizationTimeCounter(memorizationTimeMax);
    } else if (gameStatus === 'WAITING_TO_START' && gameAreaController.isPlayer) {
      setGuessTimeCounter(guessTimeMax);
    }
    const interval = setInterval(() => {
      if (gameStatus === 'WAITING_TO_START') {
        setMemorizationTimeCounter(oldMemTimeCount => oldMemTimeCount - 1);
      }
      if (gameStatus === 'IN_PROGRESS') {
        setGuessTimeCounter(oldGuessCount => oldGuessCount - 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [gameAreaController.isPlayer, gameStatus, guessTimeMax, memorizationTimeMax]);

  let gameStatusText = <></>;
  if (gameStatus === 'IN_PROGRESS') {
    gameStatusText = (
      <b>
        Game in progress <br />
        Current score: {score} <br />
        Lives remaining: {livesRemaining} <br />
        Guessing time remaining: {guessTimeCounter} seconds
      </b>
    );
  } else if (gameStatus == 'WAITING_FOR_PLAYERS' || gameStatus == 'OVER') {
    const competitiveModeSwitch = (
      <>
        <FormLabel htmlFor='competitive mode'>Competitive mode?</FormLabel>
        <Switch
          id='competitive mode'
          onChange={e => {
            setCompetitiveMode(e.target.checked);
            if (!e.target.checked) {
              setTransmitScore(false);
            }
          }}
          isChecked={competitiveMode}
        />
      </>
    );
    const transmitScoreSwitch = (
      <>
        <FormLabel htmlFor='transmit-score'>Send score to leaderboard?</FormLabel>
        <Switch
          id='transmit-score'
          onChange={e => setTransmitScore(e.target.checked)}
          isChecked={transmitScore}
        />
      </>
    );
    const percentify = (num: number) => {
      return num ? `${Math.round(num * 100)}%` : '0%';
    };
    const decimilize = (num: string) => {
      return parseFloat(num) / 100.0;
    };
    const startingTilesPercentageInput = (
      <>
        <FormLabel htmlFor='starting-tiles-percentage'>Percent of green tiles</FormLabel>
        <NumberInput
          size='sm'
          maxW={24}
          defaultValue={percentify(startingTilesPercentage)}
          value={percentify(startingTilesPercentage)}
          min={1}
          max={100}
          step={1}
          onChange={e => setStartingTilesPercentage(decimilize(e))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </>
    );
    const startingBoardSizeInput = (
      <>
        <FormLabel htmlFor='starting-board-size'>Starting board size</FormLabel>
        <NumberInput
          size='sm'
          maxW={24}
          defaultValue={startingBoardSize}
          min={3}
          max={10}
          step={1}
          onChange={e => setStartingBoardSize(Number(e))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </>
    );
    const startingLivesInput = (
      <>
        <FormLabel htmlFor='starting-lives'>Lives</FormLabel>
        <NumberInput
          size='sm'
          maxW={24}
          defaultValue={startingLives}
          min={1}
          max={10000}
          step={1}
          onChange={e => setStartingLives(Number(e))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </>
    );
    const memorizationTimeInput = (
      <>
        <FormLabel htmlFor='memorization-time'>Memorization time (seconds)</FormLabel>
        <NumberInput
          size='sm'
          maxW={24}
          defaultValue={memorizationTimeMax}
          min={1}
          max={60}
          step={1}
          onChange={e => setMemorizationTimeMax(Number(e))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </>
    );
    const guessTimeInput = (
      <>
        <FormLabel htmlFor='guess-time'>Guessing time (seconds)</FormLabel>
        <NumberInput
          size='sm'
          maxW={24}
          defaultValue={guessTimeMax}
          min={1}
          max={60}
          step={1}
          onChange={e => setGuessTimeMax(Number(e))}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </>
    );
    const increasingDifficultySwitch = (
      <>
        <FormLabel htmlFor='increase-difficulrt'>Increase difficulty every level?</FormLabel>
        <Switch
          id='increase-difficulty'
          onChange={e => setIsIncreasingDifficulty(e.target.checked)}
          isChecked={isIncreasingDifficulty}
        />
      </>
    );
    const startGameButton = (
      <Button
        onClick={async () => {
          setJoiningGame(true);
          try {
            if (!gameAreaController.player || !gameAreaController.isPlayer) {
              await gameAreaController.joinGame();
            }
            await gameAreaController.startGame(competitiveMode, {
              targetTilesPercentage: startingTilesPercentage,
              startingBoardSize: { rows: startingBoardSize, columns: startingBoardSize },
              startingLives,
              memorizationTimeSeconds: memorizationTimeMax,
              guessingTimeSeconds: guessTimeMax,
              increasingDifficulty: isIncreasingDifficulty,
              isPlayable: true,
            });
          } catch (e) {
            toast({
              title: 'Error joining game',
              description: (e as Error).toString(),
              status: 'error',
            });
          }
          setJoiningGame(false);
        }}
        isLoading={joiningGame}
        disabled={joiningGame}>
        Start Game
      </Button>
    );
    gameStatusText = (
      <>
        <ul>
          <li>{competitiveModeSwitch}</li>
          {competitiveMode && <li>{transmitScoreSwitch}</li>}
          {!competitiveMode && <li>{startingTilesPercentageInput}</li>}
          {!competitiveMode && <li>{startingBoardSizeInput}</li>}
          {!competitiveMode && <li>{startingLivesInput}</li>}
          {!competitiveMode && <li>{memorizationTimeInput}</li>}
          {!competitiveMode && <li>{guessTimeInput}</li>}
          {!competitiveMode && <li>{increasingDifficultySwitch}</li>}
        </ul>
        <br />
        {startGameButton}
      </>
    );
  } else if (gameStatus == 'WAITING_TO_START') {
    gameStatusText = (
      <b>
        Game in progress <br />
        Current score: {score} <br />
        Lives remaining: {livesRemaining} <br />
        Memorization Time Remaining: {memorizationTimeCounter} seconds
        <br />
      </b>
    );
  }

  return (
    <>
      {gameStatusText}
      <MemoryGameBoard
        gameAreaController={gameAreaController}
        transmitScore={transmitScore}
        gameStatus={gameStatus}
        isCircle={isCircle}
        unknownTileColor={unknownTileColor}
      />
    </>
  );
}
