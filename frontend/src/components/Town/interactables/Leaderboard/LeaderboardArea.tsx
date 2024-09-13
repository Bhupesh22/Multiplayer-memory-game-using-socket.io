import {
  Box,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
  AbsoluteCenter,
  Grid,
  GridItem,
  IconButton,
  Checkbox,
  NumberInputField,
  HStack,
  NumberInput,
  Center,
  Button,
  Spacer,
  Text,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { ExpandLess, ExpandMore, UnfoldMore } from '@material-ui/icons';
import React, { useCallback, useEffect, useState } from 'react';
import LeaderboardAreaController from '../../../../classes/interactable/LeaderboardAreaController';
import { useInteractable, useInteractableAreaController } from '../../../../classes/TownController';
import useTownController from '../../../../hooks/useTownController';
import {
  InteractableID,
  LeaderboardSettings,
  ScoreData,
  LeaderboardArea as LeaderboardAreaModel,
  LeaderboardField,
} from '../../../../types/CoveyTownSocket';
import SettingsIcon from '../../../VideoCall/VideoFrontend/icons/SettingsIcon';
import AdminLeaderboardArea from './AdminLeaderboardArea';
import LeaderboardAreaInteractable from './LeaderboardAreaPhaser';

function ScoreTable({
  scores,
  settings,
  setSettings,
  sortDirections,
  setSortDirections,
}: {
  scores: ScoreData[];
  settings: LeaderboardSettings;
  setSettings: (settings: LeaderboardSettings) => void;
  sortDirections: Record<LeaderboardField, 1 | -1>;
  setSortDirections: (sortDirections: Record<LeaderboardField, 1 | -1>) => void;
}): JSX.Element {
  // MUST declare before using in sortFuncs, mutual recursion requires this
  // eslint-disable-next-line prefer-const
  let tieBreak: (a: ScoreData, b: ScoreData) => number;

  // sort functions for each field type
  const sortFuncs: Record<LeaderboardField, (a: ScoreData, b: ScoreData) => number> = {
    score: (a, b) => {
      if (a.score === undefined || b.score === undefined || a.score === b.score) {
        return tieBreak(a, b);
      } else {
        return (a.score - b.score) * sortDirections.score;
      }
    },
    date: (a, b) => {
      if (a.date === undefined || b.date === undefined || a.date === b.date) {
        return tieBreak(a, b);
      } else {
        return (a.date > b.date ? 1 : -1) * sortDirections.date;
      }
    },
    playerUsername: (a, b) => {
      if (a.playerUsername === undefined || b.playerUsername === undefined) {
        return tieBreak(a, b);
      } else {
        return a.playerUsername.localeCompare(b.playerUsername) * sortDirections.playerUsername;
      }
    },
    gameType: (a, b) => {
      if (a.gameType === undefined || b.gameType === undefined) {
        return tieBreak(a, b);
      } else {
        return a.gameType.localeCompare(b.gameType) * sortDirections.gameType;
      }
    },
  };

  // attempt to sort scores that have equal defaultSortType ordering
  tieBreak = (a, b) => {
    // attempt to break by score first...,
    if (settings.visibleFields.includes('score') && settings.defaultSortType !== 'score') {
      if (sortFuncs.score(a, b) !== 0) {
        return sortFuncs.score(a, b);
      }
    }
    // ...then date,...
    if (settings.visibleFields.includes('date') && settings.defaultSortType !== 'date') {
      if (sortFuncs.date(a, b) !== 0) {
        return sortFuncs.date(a, b);
      }
    }
    // ...then username,...
    if (
      settings.visibleFields.includes('playerUsername') &&
      settings.defaultSortType !== 'playerUsername'
    ) {
      if (sortFuncs.playerUsername(a, b) !== 0) {
        return sortFuncs.playerUsername(a, b);
      }
    }
    // ...then game type,...
    if (settings.visibleFields.includes('gameType') && settings.defaultSortType !== 'gameType') {
      if (sortFuncs.gameType(a, b) !== 0) {
        return sortFuncs.gameType(a, b);
      }
    }

    // ...and finally, if all else fails, order by _id
    if (a._id !== b._id) {
      return a._id.localeCompare(b._id);
    }

    // trying to sort score with itself, throw error
    throw new Error('Cannot sort score with itself');
  };

  const fieldOrder: LeaderboardField[] = ['score', 'playerUsername', 'date', 'gameType'];
  const fieldFriendlyNames: Record<LeaderboardField, string> = {
    score: 'Score',
    playerUsername: 'Player',
    date: 'Date',
    gameType: 'Game',
  };

  const tableFields = fieldOrder.filter(field => settings.visibleFields.includes(field));

  const posP = '0';

  const tableHeadings = tableFields.map((field, idx) => (
    <Th
      key={idx}
      px={posP}
      onClick={() => {
        setSettings({ ...settings, defaultSortType: field });
      }}>
      <Center>
        <Button variant={settings.defaultSortType === field ? 'solid' : 'ghost'} size='sm'>
          {fieldFriendlyNames[field]}
        </Button>
        <IconButton
          aria-label={`sort field ${field}`}
          variant='ghost'
          onClick={() => {
            setSettings({ ...settings, defaultSortType: field });
            setSortDirections({
              ...sortDirections,
              [field]: sortDirections[field] * -1,
            });
          }}
          size='sm'
          icon={
            settings.defaultSortType === field ? (
              sortDirections[field] === 1 ? (
                <ExpandLess />
              ) : (
                <ExpandMore />
              )
            ) : (
              <UnfoldMore />
            )
          }
        />
      </Center>
    </Th>
  ));

  const friendlyGameType = (gameType: string): string => {
    switch (gameType) {
      case 'MemoryGameArea':
        return 'Memory';
      default:
        return gameType;
    }
  };

  const formatDate = (date: Date): string => {
    // in case of serialization issues
    if (typeof date === typeof ' ') {
      date = new Date(date);
    }
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Ensures two digits
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'numeric' }); // Gets the full month name

    return `${month}/${day}, ${hours}:${minutes} ${ampm}`;
  };

  const scoreDataByField = (score: ScoreData, field: LeaderboardField) => {
    switch (field) {
      case 'score':
        return score.score as number;
      case 'playerUsername':
        return score.playerUsername as string;
      case 'date':
        return formatDate(score.date as Date);
      case 'gameType':
        return friendlyGameType(score.gameType as string);
      default:
        throw new Error('Invalid field');
    }
  };

  const toScoreListEntry = (score: ScoreData, score_idx: number) => (
    <Tr key={score_idx}>
      <Td pe={posP} ps={4} width='5px'>
        {score_idx + 1}
      </Td>
      {tableFields.map((field, field_idx) => (
        <Td key={field_idx} px={posP}>
          <Center>{scoreDataByField(score, field)}</Center>
        </Td>
      ))}
    </Tr>
  );

  const displayScores = scores.slice(0, settings.defaultDisplayCount);
  // const ourCutScores = scores.slice(settings.defaultDisplayCount);

  const scoreTable = displayScores
    .sort((a, b) => sortFuncs[settings.defaultSortType](a, b))
    .map((score, idx) => toScoreListEntry(score, idx));

  const tableEmptyMessage = <TableCaption>No Scores to Display</TableCaption>;

  return (
    <TableContainer>
      <Table variant='striped' size='sm'>
        <Thead>
          <Tr>
            <Td pe={posP} ps={4}></Td>
            {tableHeadings}
          </Tr>
        </Thead>
        {scoreTable.length === 0 ? tableEmptyMessage : <Tbody>{scoreTable}</Tbody>}
      </Table>
    </TableContainer>
  );
}

/**
 * A component that renders a town leaderboard.
 *
 * It uses Chakra-UI components (does not use other GUI widgets)
 *
 * It uses the LeaderboardAreaController for the town
 *
 * It renders the following:
 *  - A leaderboard of game scores
 *  - Filter and sorting options
 *  - If the town member is an admin, settings for the leaderboard and memory games
 *
 */
function LeaderboardArea({ interactableID }: { interactableID: InteractableID }): JSX.Element {
  // which way to sort each field by. 1 = ascending, -1 = descending
  const defaultSortDirections: Record<LeaderboardField, 1 | -1> = {
    score: -1,
    date: -1,
    playerUsername: 1,
    gameType: 1,
  };

  const leaderboardController =
    useInteractableAreaController<LeaderboardAreaController>(interactableID);

  const [scores, setScores] = useState<ScoreData[]>(leaderboardController.scores);
  const [settings, setSettings] = useState<LeaderboardSettings>(leaderboardController.settings);
  const [isVisible, setIsVisible] = useState<boolean>(leaderboardController.isVisible);
  const [sortDirections, setSortDirections] =
    useState<Record<LeaderboardField, 1 | -1>>(defaultSortDirections);

  const toast = useToast();
  useEffect(() => {
    const leaderboardChanged = (newLeaderboard: LeaderboardAreaModel) => {
      setScores(newLeaderboard.scores);
      setSettings(newLeaderboard.settings);
    };
    const visibilityUpdated = (nowVisible: boolean) => {
      setIsVisible(nowVisible);
      if (nowVisible) {
        toast({
          title: 'Leaderboard Shown',
          description: 'The leaderboard has been shown',
          status: 'info',
        });
      } else {
        toast({
          title: 'Leaderboard Hidden',
          description: 'The leaderboard has been hidden',
          status: 'info',
        });
      }
    };

    leaderboardController.addListener('leaderboardUpdate', leaderboardChanged);
    leaderboardController.addListener('visibilityUpdate', visibilityUpdated);

    return () => {
      leaderboardController.removeListener('leaderboardUpdate', leaderboardChanged);
      leaderboardController.removeListener('visibilityUpdate', visibilityUpdated);
    };
  }, [leaderboardController, toast]);

  const leaderboardHidden = (
    <Box>
      <Center>
        <Heading size='md'>
          Leaderboard is Hidden{settings.visibleFields.length > 0 ? '' : ' by Town Admin'}
        </Heading>
      </Center>
    </Box>
  );

  const leaderboardBody = (
    <>
      {isVisible && settings.visibleFields.length > 0 ? (
        <ScoreTable
          scores={scores}
          settings={settings}
          setSettings={setSettings}
          sortDirections={sortDirections}
          setSortDirections={setSortDirections}
        />
      ) : (
        leaderboardHidden
      )}
      <br />
    </>
  );

  const disablableText = (text: string): JSX.Element => {
    const disabled = settings.visibleFields.length === 0 || !isVisible;
    return (
      <Text
        opacity={disabled ? '0.4' : '1'}
        cursor={disabled ? 'not-allowed' : 'auto'}
        userSelect='none'>
        {text}
      </Text>
    );
  };

  const userSettings = (
    <Flex w='100%' justifyContent='space-between'>
      <Checkbox
        isChecked={isVisible}
        isDisabled={settings.visibleFields.length === 0}
        onChange={e => leaderboardController.setVisibility(e.target.checked)}>
        Show Leaderboard
      </Checkbox>
      <Spacer />
      <NumberInput
        size='md'
        variant='filled'
        onChange={v => setSettings({ ...settings, defaultDisplayCount: parseInt(v) })}
        allowMouseWheel
        value={settings.defaultDisplayCount}
        min={0}
        max={100}
        isDisabled={!isVisible || settings.visibleFields.length === 0}>
        <HStack>
          {disablableText('Scores Displayed')}
          <NumberInputField maxW={20} value={settings.defaultDisplayCount} />
        </HStack>
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </Flex>
  );

  return (
    <>
      {userSettings}
      <br />
      {leaderboardBody}
    </>
  );
}
/**
 * A wrapper component for the LeaderboardArea component.
 * Determines if the player is currently in the leaderboard area on the map, and if so,
 * renders the leaderboard area component in a modal.
 *
 */
export default function LeaderboardAreaWrapper(): JSX.Element {
  const leaderboardArea = useInteractable<LeaderboardAreaInteractable>('leaderboardArea');
  const townController = useTownController();
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const closeModal = useCallback(() => {
    setSettingsMenuOpen(false);
    if (leaderboardArea) {
      townController.interactEnd(leaderboardArea);
    }
  }, [townController, leaderboardArea]);
  const handleSettingsClick = () => {
    setSettingsMenuOpen(!settingsMenuOpen);
  };
  if (leaderboardArea) {
    const modalBody = settingsMenuOpen ? (
      <AdminLeaderboardArea />
    ) : (
      <LeaderboardArea interactableID={leaderboardArea.id} />
    );

    return (
      <Modal isOpen={true} onClose={closeModal} closeOnOverlayClick={false} size='xl'>
        <ModalOverlay />
        <ModalContent>
          <Flex>
            <ModalHeader flex='1' textAlign='center'>
              <AbsoluteCenter axis='horizontal'>
                {settingsMenuOpen ? 'Settings' : leaderboardArea.id}
              </AbsoluteCenter>
            </ModalHeader>
            <Grid w='80px' h='72px' templateColumns='repeat(2, 1fr)'>
              {townController.ourPlayer.isAdmin && (
                <GridItem w='100%' h='100%'>
                  <IconButton
                    mt='2'
                    aria-label='Settings'
                    icon={<SettingsIcon />}
                    size='sm'
                    variant={settingsMenuOpen ? 'solid' : 'ghost'}
                    onClick={handleSettingsClick}
                  />
                </GridItem>
              )}
              <GridItem w='100%'>
                <ModalCloseButton />
              </GridItem>
            </Grid>
          </Flex>
          <ModalBody>{modalBody}</ModalBody>
        </ModalContent>
      </Modal>
    );
  }
  if (settingsMenuOpen) {
    setSettingsMenuOpen(false);
  }
  return <></>;
}
