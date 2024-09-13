import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Text,
  useToast,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { useAdminController } from '../../../../classes/TownController';
import useTownController from '../../../../hooks/useTownController';
import {
  LeaderboardField,
  LeaderboardSettings,
  MemoryGameSettings,
  UnknownTileColor,
  TileShape,
} from '../../../../types/CoveyTownSocket';

export const INVALID_GAME_AREA_TYPE_MESSAGE = 'Invalid game area type';

function LeaderboardSettingsComponent({
  settings,
  setSettings,
  saveChanges,
  resetLeaderboard,
}: {
  settings: LeaderboardSettings;
  setSettings: (settings: LeaderboardSettings) => void;
  saveChanges: () => Promise<void>;
  resetLeaderboard: () => Promise<void>;
}): JSX.Element {
  const [showLeaderboardCheckbox, setShowLeaderboardCheckbox] = useState(
    settings.visibleFields.length > 0,
  );
  const [savingChanges, setSavingChanges] = useState(false);
  const toggleFieldVisibility = (field: LeaderboardField) => {
    const newFields = settings.visibleFields.includes(field)
      ? settings.visibleFields.filter(f => f !== field)
      : [...settings.visibleFields, field];
    setSettings({ ...settings, visibleFields: newFields });
    if (newFields.length === 0) {
      setShowLeaderboardCheckbox(false);
    }
  };
  const toast = useToast();

  const handleSave = async () => {
    setSavingChanges(true);
    try {
      await saveChanges();
      toast({
        title: 'Leaderboard Settings Saved',
        description: 'The leaderboard settings have been saved.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error Saving Leaderboard Settings',
        description: 'An error occurred while saving the leaderboard settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingChanges(false);
  };

  const handleReset = async () => {
    setSavingChanges(true);
    try {
      await resetLeaderboard();
      toast({
        title: 'Leaderboard Reset',
        description: 'The leaderboard has been reset.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error Resetting Leaderboard',
        description: 'An error occurred while resetting the leaderboard.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingChanges(false);
  };

  const disablableText = (text: string): JSX.Element => {
    const disabled = !showLeaderboardCheckbox;
    return (
      <Text
        opacity={disabled ? '0.4' : '1'}
        cursor={disabled ? 'not-allowed' : 'auto'}
        userSelect='none'>
        {text}
      </Text>
    );
  };

  return (
    <FormControl>
      <Checkbox
        isChecked={showLeaderboardCheckbox}
        onChange={e => {
          if (e.target.checked) {
            setSettings({
              ...settings,
              visibleFields: ['score', 'playerUsername', 'date', 'gameType'],
            });
          } else {
            setSettings({ ...settings, visibleFields: [] });
          }
          setShowLeaderboardCheckbox(e.target.checked);
        }}
        size='lg'>
        <strong>Show Leaderboard</strong>
      </Checkbox>
      <FormHelperText>Whether the leaderboard is visible to town members</FormHelperText>
      <br />
      <FormLabel>{disablableText('Display Count')}</FormLabel>
      <NumberInput
        isDisabled={!showLeaderboardCheckbox}
        allowMouseWheel
        value={settings.defaultDisplayCount}
        onChange={value => setSettings({ ...settings, defaultDisplayCount: parseInt(value) || 0 })}
        min={1}
        max={30}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <FormHelperText>
        {disablableText('Number of scores to display on the leaderboard, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Sort Field')}</FormLabel>
      <Select
        isDisabled={!showLeaderboardCheckbox}
        value={settings.defaultSortType}
        onChange={e =>
          setSettings({
            ...settings,
            defaultSortType: e.target.value as LeaderboardField,
          })
        }>
        <option value='score'>Score</option>
        <option value='playerUsername'>Player</option>
        <option value='date'>Date</option>
        <option value='gameType'>Game Type</option>
      </Select>
      <FormHelperText>{disablableText('How to sort the leaderboard, by default')}</FormHelperText>
      <br />
      <FormLabel>{disablableText('Visible Fields')}</FormLabel>
      <HStack>
        <Checkbox
          isDisabled={!showLeaderboardCheckbox}
          isChecked={settings.visibleFields.includes('score')}
          onChange={() => toggleFieldVisibility('score')}>
          Score
        </Checkbox>
        <Checkbox
          isDisabled={!showLeaderboardCheckbox}
          isChecked={settings.visibleFields.includes('playerUsername')}
          onChange={() => toggleFieldVisibility('playerUsername')}>
          Player
        </Checkbox>
        <Checkbox
          isDisabled={!showLeaderboardCheckbox}
          isChecked={settings.visibleFields.includes('date')}
          onChange={() => toggleFieldVisibility('date')}>
          Date
        </Checkbox>
        <Checkbox
          isDisabled={!showLeaderboardCheckbox}
          isChecked={settings.visibleFields.includes('gameType')}
          onChange={() => toggleFieldVisibility('gameType')}>
          Game Type
        </Checkbox>
      </HStack>
      <FormHelperText>
        {disablableText('What should be displayed on the leaderboard')}
      </FormHelperText>
      <br />
      <HStack>
        <Button colorScheme='blue' isDisabled={savingChanges} onClick={handleSave}>
          Save
        </Button>
        <Popover>
          <PopoverTrigger>
            <Button colorScheme='red' isDisabled={savingChanges}>
              Reset Leaderboard
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader fontWeight='semibold'>Confirmation</PopoverHeader>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody>
              Are you sure you want to delete all scores from the town leaderboard? This{' '}
              <strong>cannot</strong> be undone.
            </PopoverBody>
            <PopoverFooter display='flex' justifyContent='flex-end'>
              <Button colorScheme='red' size='sm' isDisabled={savingChanges} onClick={handleReset}>
                Reset
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Popover>
      </HStack>
    </FormControl>
  );
}

function MemoryGameSettingsComponent({
  settings,
  setSettings,
  saveChanges,
  resetLeaderboard,
}: {
  settings: MemoryGameSettings;
  setSettings: (settings: MemoryGameSettings) => void;
  saveChanges: () => Promise<void>;
  resetLeaderboard: () => Promise<void>;
}): JSX.Element {
  const [memoryGamePlayableCheckbox, setMemoryGamePlayableCheckbox] = useState(settings.isPlayable);
  const [savingChanges, setSavingChanges] = useState(false);
  const toast = useToast();

  const handleSave = async (reset: boolean) => {
    setSavingChanges(true);
    try {
      await saveChanges();
      if (reset) {
        await resetLeaderboard();
      }
      toast({
        title: 'Memory Game Settings Saved',
        description: `The memory game settings have been saved ${
          reset ? ' and the leaderboard has been reset.' : '.'
        }`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error Saving Memory Game Settings',
        description: 'An error occurred while saving the memory game settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setSavingChanges(false);
  };

  const disablableText = (text: string): JSX.Element => {
    const disabled = !memoryGamePlayableCheckbox;
    return (
      <Text
        opacity={disabled ? '0.4' : '1'}
        cursor={disabled ? 'not-allowed' : 'auto'}
        userSelect='none'>
        {text}
      </Text>
    );
  };

  const unknownTileColors: UnknownTileColor[] = [
    'blue',
    'yellow',
    'purple',
    'orange',
    'pink',
    'brown',
    'black',
    'white',
  ];

  const tileShapes: TileShape[] = ['circle', 'square'];

  return (
    <FormControl>
      <Checkbox
        isChecked={memoryGamePlayableCheckbox}
        onChange={e => {
          setSettings({ ...settings, isPlayable: e.target.checked });
          setMemoryGamePlayableCheckbox(e.target.checked);
        }}
        size='lg'>
        <strong>Enable Game</strong>
      </Checkbox>
      <FormHelperText>Whether the memory game is playable in the town</FormHelperText>
      <br />
      <FormLabel>{disablableText('Starting Lives')}</FormLabel>
      <NumberInput
        isDisabled={!memoryGamePlayableCheckbox}
        allowMouseWheel
        value={settings.startingLives}
        onChange={value => setSettings({ ...settings, startingLives: parseInt(value) || 0 })}
        min={1}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <FormHelperText>
        {disablableText('Number of lives players start with in the memory game, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Board Size')}</FormLabel>
      <HStack>
        <NumberInput
          isDisabled={!memoryGamePlayableCheckbox}
          allowMouseWheel
          value={settings.startingBoardSize.rows}
          onChange={value =>
            setSettings({
              ...settings,
              startingBoardSize: {
                ...settings.startingBoardSize,
                rows: parseInt(value) || 0,
                columns: parseInt(value) || 0,
              },
            })
          }
          min={1}
          max={24}>
          <InputGroup>
            <InputLeftAddon>{disablableText('Rows')}</InputLeftAddon>
            <NumberInputField />
          </InputGroup>
        </NumberInput>
        <NumberInput
          isDisabled={!memoryGamePlayableCheckbox}
          allowMouseWheel
          value={settings.startingBoardSize.columns}
          onChange={value =>
            setSettings({
              ...settings,
              startingBoardSize: {
                ...settings.startingBoardSize,
                rows: parseInt(value) || 0,
                columns: parseInt(value) || 0,
              },
            })
          }
          min={1}
          max={24}>
          <InputGroup>
            <InputLeftAddon>{disablableText('Columns')}</InputLeftAddon>
            <NumberInputField />
          </InputGroup>
        </NumberInput>
      </HStack>
      <FormHelperText>
        {disablableText('Initial size of the game board, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Memorization Time')}</FormLabel>
      <NumberInput
        isDisabled={!memoryGamePlayableCheckbox}
        allowMouseWheel
        precision={1}
        step={0.5}
        value={settings.memorizationTimeSeconds}
        onChange={value => setSettings({ ...settings, memorizationTimeSeconds: parseFloat(value) })}
        min={0.1}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <FormHelperText>
        {disablableText('Amount of seconds players have to memorize the tiles, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Guessing Time')}</FormLabel>
      <NumberInput
        isDisabled={!memoryGamePlayableCheckbox}
        allowMouseWheel
        precision={1}
        step={0.5}
        value={settings.guessingTimeSeconds}
        onChange={value => setSettings({ ...settings, guessingTimeSeconds: parseFloat(value) })}
        min={0.1}>
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <FormHelperText>
        {disablableText('Amount of seconds players have to guess the tiles, by default')}
      </FormHelperText>
      <br />
      <Checkbox
        isDisabled={!memoryGamePlayableCheckbox}
        isChecked={settings.increasingDifficulty}
        onChange={e => setSettings({ ...settings, increasingDifficulty: e.target.checked })}>
        Ramping Difficulty
      </Checkbox>
      <FormHelperText>
        {disablableText('If the game gets harder as players progress, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Target Tile Density')}</FormLabel>
      <NumberInput
        isDisabled={!memoryGamePlayableCheckbox}
        allowMouseWheel
        value={settings.targetTilesPercentage * 100}
        onChange={value =>
          setSettings({ ...settings, targetTilesPercentage: (parseInt(value) || 0) / 100 })
        }
        min={0}
        step={5}
        max={100}>
        <InputGroup>
          <NumberInputField />
          <InputRightAddon>{disablableText('%')}</InputRightAddon>
        </InputGroup>
      </NumberInput>
      <FormHelperText>
        {disablableText('How many tiles on a board should be clicked, by default')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Tile Color')}</FormLabel>
      <Select
        isDisabled={!memoryGamePlayableCheckbox}
        value={settings.unknownTileColor}
        backgroundColor={settings.unknownTileColor}
        color={
          ['blue', 'purple', 'green', 'black', 'brown'].indexOf(settings.unknownTileColor || '') >=
          0
            ? 'white'
            : 'black'
        }
        onChange={e =>
          setSettings({
            ...settings,
            unknownTileColor: e.target.value as UnknownTileColor,
          })
        }>
        {unknownTileColors.map((color, idx) => (
          <option key={idx} value={color} style={{ color: 'black' }}>
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </option>
        ))}
      </Select>
      <FormHelperText>
        {disablableText('The color of the unmarked/unknown game tiles')}
      </FormHelperText>
      <br />
      <FormLabel>{disablableText('Tile Shape')}</FormLabel>
      <Select
        isDisabled={!memoryGamePlayableCheckbox}
        value={settings.tileShape}
        onChange={e =>
          setSettings({
            ...settings,
            tileShape: e.target.value as TileShape,
          })
        }>
        {tileShapes.map((shape, idx) => (
          <option key={idx} value={shape}>
            {shape.charAt(0).toUpperCase() + shape.slice(1)}
          </option>
        ))}
      </Select>
      <FormHelperText>{disablableText('The shape of the game tiles')}</FormHelperText>
      <br />
      <HStack>
        <Button colorScheme='blue' isDisabled={savingChanges} onClick={() => handleSave(false)}>
          Save
        </Button>
        <Popover>
          <PopoverTrigger>
            <Button colorScheme='red' isDisabled={savingChanges}>
              Save & Reset Leaderboard
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader fontWeight='semibold'>Confirmation</PopoverHeader>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody>
              Are you sure? All leaderboard scores will be deleted. This <strong>cannot</strong> be
              undone.
            </PopoverBody>
            <PopoverFooter display='flex' justifyContent='flex-end'>
              <Button
                colorScheme='red'
                size='sm'
                isDisabled={savingChanges}
                onClick={() => handleSave(true)}>
                Save & Reset
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Popover>
      </HStack>
    </FormControl>
  );
}

/**
 * A component that renders the admin leaderboard panel.
 *
 * It uses Chakra-UI components (does not use other GUI widgets)
 *
 * It uses the AdminController of the town
 *
 * It renders the following:
 *  - A menu to change the town's memory game settings
 *  - A menu to change the town's leaderboard display settings
 *
 */
export default function AdminLeaderboardPanel(): JSX.Element {
  const townController = useTownController();
  const adminController = useAdminController();
  const isAdmin = townController.ourPlayer.isAdmin;

  const [leaderboardSettings, setLeaderboardSettings] = useState(
    adminController.leaderboardSettings,
  );

  const [memoryGameSettings, setMemoryGameSettings] = useState(adminController.memoryGameSettings);

  const handleSaveLeaderboardSettings = async () => {
    if (!(await adminController.setLeaderboardSettings(leaderboardSettings))) {
      throw new Error('Error saving leaderboard settings');
    }
  };

  const handleResetLeaderboard = async () => {
    if (
      !(await adminController.setLeaderboardSettings({
        ...adminController.leaderboardSettings,
        reset: true,
      }))
    ) {
      throw new Error('Error resetting leaderboard');
    }
  };

  const handleSaveMemoryGameSettings = async () => {
    if (!(await adminController.setMemoryGameSettings(memoryGameSettings))) {
      throw new Error('Error saving memory game settings');
    }
  };

  const adminSettings = isAdmin ? (
    <Accordion allowToggle>
      <AccordionItem>
        <AccordionButton>
          <Box flex='1' textAlign='left'>
            Administrator Leaderboard Settings
          </Box>
          <AccordionIcon />
        </AccordionButton>
        <AccordionPanel>
          <LeaderboardSettingsComponent
            settings={leaderboardSettings}
            setSettings={setLeaderboardSettings}
            saveChanges={handleSaveLeaderboardSettings}
            resetLeaderboard={handleResetLeaderboard}
          />
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem>
        <AccordionButton>
          <Box flex='1' textAlign='left'>
            Administrator Memory Game Settings
          </Box>
          <AccordionIcon />
        </AccordionButton>
        <AccordionPanel>
          <MemoryGameSettingsComponent
            settings={memoryGameSettings}
            setSettings={setMemoryGameSettings}
            saveChanges={handleSaveMemoryGameSettings}
            resetLeaderboard={handleResetLeaderboard}
          />
        </AccordionPanel>
      </AccordionItem>
      <br />
    </Accordion>
  ) : (
    <>Ask a Town Administrator to Change Settings</>
  );
  return <>{adminSettings}</>;
}
