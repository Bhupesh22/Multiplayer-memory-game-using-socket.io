import MemoryGameAreaController from '../../../../classes/interactable/MemoryGameAreaController';
import React, { useEffect, useState } from 'react';
import { Button, chakra, SimpleGrid, useToast } from '@chakra-ui/react';
import { GameStatus, MemoryGameCell } from '../../../../types/CoveyTownSocket';
export type MemoryGameProps = {
  gameAreaController: MemoryGameAreaController;
  transmitScore: boolean;
  gameStatus: GameStatus;
  isCircle: boolean;
  unknownTileColor: string;
};

const StyledMemoryBoard = chakra(SimpleGrid, {
  baseStyle: {
    display: 'grid',
    width: '350px',
    height: '350px',
    padding: '1px',
  },
});
const StyledMemoryBoardSquare = chakra(Button, {
  baseStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px solid black',
    fontSize: '50px',
    padding: '0px',
    minWidth: '1px',
    minHeight: '1px',
  },
});
/**
 * A component that renders the MemoryGame board
 *
 * Renders the MemoryGame board as a "StyledMemoryGameBoard", which consists of "StyledMemoryGameSquare"s
 * (one for each cell in the board, starting from the top left and going left to right, top to bottom).
 *
 * Each StyledMemoryGameSquare has an aria-label property that describes the cell's position in the board,
 * formatted as `Cell ${rowIndex},${colIndex} (Correct|Incorrect|Empty)`.
 *
 * The background color of each StyledMemoryGameSquare is determined by the value of the cell in the board, either
 * 'green' for Correct, 'red' for Incorrect, or '' (an empty for an empty square).
 *
 * The board is re-rendered whenever the board changes, and each cell is re-rendered whenever the value
 * of that cell changes.
 *
 * If the current player is in the game, then each StyledMemoryGameSquare not already clicked is clickable, and clicking
 * on it will place a guess in that coordinate. If there is an error making the move, then a toast will be
 * displayed with the error message as the description of the toast. If the player is not in the game, they cannot make a move.
 *
 * @param gameAreaController the controller for the Memory game
 */
export default function MemoryGameBoard({
  gameAreaController,
  transmitScore,
  gameStatus,
  isCircle,
  unknownTileColor,
}: MemoryGameProps): JSX.Element {
  const [guessBoard, setGuessBoard] = useState<MemoryGameCell[][]>(gameAreaController.guessBoard);
  const [solutionBoard, setSolutionBoard] = useState<MemoryGameCell[][]>(
    gameAreaController.solutionBoard,
  );
  const toast = useToast();

  useEffect(() => {
    gameAreaController.addListener('boardChanged', setGuessBoard);
    gameAreaController.addListener('solutionBoardChanged', setSolutionBoard);
    return () => {
      gameAreaController.removeListener('boardChanged', setGuessBoard);
      gameAreaController.removeListener('solutionBoardChanged', setSolutionBoard);
    };
  }, [gameAreaController]);

  return (
    <StyledMemoryBoard
      aria-label='Memory Game Board'
      gridTemplateColumns={`repeat(${solutionBoard.length}, 1fr)`}>
      {(gameStatus === 'IN_PROGRESS' &&
        guessBoard.map((row, rowIndex) => {
          return row.map((cell, colIndex) => {
            return (
              <StyledMemoryBoardSquare
                key={`${rowIndex}.${colIndex}`}
                height={350 / row.length}
                width={350 / row.length}
                borderRadius={isCircle ? '100%' : '15%'}
                onClick={async () => {
                  try {
                    await gameAreaController.makeMove({
                      column: colIndex,
                      row: rowIndex,
                      transmitScore: transmitScore,
                      gamePiece: undefined,
                    });
                  } catch (e) {
                    toast({
                      title: 'Error making move',
                      description: (e as Error).toString(),
                      status: 'error',
                    });
                  }
                }}
                disabled={!gameAreaController.isPlayer || cell !== undefined}
                _disabled={{
                  opacity: gameAreaController.isPlayer ? '100%' : '20%',
                  _hover: {
                    backgroundColor: cell
                      ? 'lightGreen'
                      : cell === false
                      ? 'orangeRed'
                      : unknownTileColor,
                  },
                }}
                _hover={{
                  backgroundColor: cell
                    ? 'lightGreen'
                    : cell === false
                    ? 'orangeRed'
                    : unknownTileColor,
                }}
                backgroundColor={cell ? 'green' : cell === false ? 'red' : unknownTileColor}
                aria-label={`Cell ${rowIndex},${colIndex} (${cell || 'Empty'})`}
              />
            );
          });
        })) ||
        (gameStatus === 'WAITING_TO_START' &&
          solutionBoard.map((row, rowIndex) => {
            return row.map((cell, colIndex) => {
              return (
                <StyledMemoryBoardSquare
                  key={`${rowIndex}.${colIndex}`}
                  height={350 / row.length}
                  width={350 / row.length}
                  borderRadius={isCircle ? '100%' : '15%'}
                  onClick={async () => {
                    try {
                      await gameAreaController.makeMove({
                        column: colIndex,
                        row: rowIndex,
                        transmitScore: transmitScore,
                        gamePiece: undefined,
                      });
                    } catch (e) {
                      toast({
                        title: 'Error making move',
                        description: (e as Error).toString(),
                        status: 'error',
                      });
                    }
                  }}
                  disabled={!gameAreaController.isPlayer}
                  _hover={{
                    backgroundColor: cell ? 'lightGreen' : cell === false ? 'orangeRed' : 'white',
                  }}
                  backgroundColor={cell === true ? 'green' : cell === false ? 'red' : 'white'}
                  aria-label={`Cell ${rowIndex},${colIndex} (${cell || 'Empty'})`}
                />
              );
            });
          })) || <></>}
    </StyledMemoryBoard>
  );
}
