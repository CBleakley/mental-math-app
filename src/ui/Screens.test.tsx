import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SessionState } from '../core/contracts';
import { fakeStates, fakeVoices, type FakeStateName } from './preview/fake-states';
import { Screens, type ScreensProps } from './Screens';

async function renderScreens(state: SessionState, overrides: Partial<ScreensProps> = {}) {
  const props: ScreensProps = {
    state,
    voices: fakeVoices,
    selectedVoiceId: null,
    onStart: jest.fn(),
    onEnd: jest.fn(),
    onDone: jest.fn(),
    onSelectVoice: jest.fn(),
    onPlaySample: jest.fn(),
    ...overrides,
  };
  const utils = await render(<Screens {...props} />);
  return { ...utils, props };
}

describe('Screens', () => {
  it.each(Object.keys(fakeStates) as FakeStateName[])('renders the %s fake state', async (name) => {
    await expect(renderScreens(fakeStates[name])).resolves.toBeDefined();
  });

  describe('home', () => {
    it('shows the six topics with only Addition selected and enabled', async () => {
      await renderScreens(fakeStates.idle);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(6);
      const addition = screen.getByRole('radio', { name: /Addition/ });
      expect(addition).toBeChecked();
      expect(addition).toBeEnabled();
      for (const name of ['Subtraction', 'Multiplication', 'Division', 'Percentages', 'Mix']) {
        const topic = screen.getByRole('radio', { name: new RegExp(name) });
        expect(topic).not.toBeChecked();
        expect(topic).toBeDisabled();
      }
    });

    it('starts a session', async () => {
      const { props } = await renderScreens(fakeStates.idle);
      await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
      expect(props.onStart).toHaveBeenCalledTimes(1);
    });

    it('shows an error from the last attempt', async () => {
      await renderScreens(fakeStates.idleWithError);
      expect(screen.getByRole('alert')).toHaveTextContent(/Microphone access was refused/);
    });

    it('opens settings and comes back', async () => {
      await renderScreens(fakeStates.idle);
      await fireEvent.press(screen.getByRole('button', { name: 'Voice settings' }));
      expect(screen.getByText('Settings')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Back to home' }));
      expect(screen.getByRole('button', { name: 'Start' })).toBeOnTheScreen();
    });
  });

  describe('session', () => {
    it('shows time left and progress but never the score', async () => {
      await renderScreens(fakeStates.listening);
      expect(screen.getByText('3:12')).toBeOnTheScreen();
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 36, min: 0, max: 100 });
      expect(screen.queryByText(/\b9\b/)).toBeNull();
      expect(screen.queryByText(/\b11\b/)).toBeNull();
    });

    it('shows Speaking while the app speaks', async () => {
      await renderScreens(fakeStates.speaking);
      expect(screen.getByText('Speaking')).toBeOnTheScreen();
      expect(screen.getByText('3:04')).toBeOnTheScreen();
    });

    it('shows Listening while the mic is on', async () => {
      await renderScreens(fakeStates.listening);
      expect(screen.getByText('Listening…')).toBeOnTheScreen();
    });

    it('shows Correct after a right answer', async () => {
      await renderScreens(fakeStates.correct);
      expect(screen.getByText('Correct')).toBeOnTheScreen();
    });

    it('shows the question and correct answer after a wrong answer', async () => {
      await renderScreens(fakeStates.wrong);
      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(screen.getByText('47 plus 38')).toBeOnTheScreen();
      expect(screen.getByText('85')).toBeOnTheScreen();
    });

    it('says Missed when the problem was skipped or timed out', async () => {
      await renderScreens(fakeStates.missed);
      expect(screen.getByText('Missed')).toBeOnTheScreen();
    });

    it('reads 0:00 and a full bar while the last problem finishes', async () => {
      await renderScreens(fakeStates.lastProblem);
      expect(screen.getByText('0:00')).toBeOnTheScreen();
      expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 100 });
    });

    it('shows a mic error', async () => {
      await renderScreens(fakeStates.micError);
      expect(screen.getByRole('alert')).toHaveTextContent('The microphone stopped working.');
    });

    it('ends the session', async () => {
      const { props } = await renderScreens(fakeStates.speaking);
      await fireEvent.press(screen.getByRole('button', { name: 'End' }));
      expect(props.onEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('summary', () => {
    it('shows score, average time and accuracy', async () => {
      await renderScreens(fakeStates.summary);
      expect(screen.getByText('18')).toBeOnTheScreen();
      expect(screen.getByText('out of 22')).toBeOnTheScreen();
      expect(screen.getByText('3.1s')).toBeOnTheScreen();
      expect(screen.getByText('82%')).toBeOnTheScreen();
    });

    it('shows a dash for average time when nothing was answered', async () => {
      await renderScreens(fakeStates.summaryNothingAnswered);
      expect(screen.getByText('—')).toBeOnTheScreen();
      expect(screen.getByText('0%')).toBeOnTheScreen();
    });

    it('goes back home on Done', async () => {
      const { props } = await renderScreens(fakeStates.summary);
      await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
      expect(props.onDone).toHaveBeenCalledTimes(1);
    });
  });

  describe('settings', () => {
    async function openSettings(overrides: Partial<ScreensProps> = {}) {
      const result = await renderScreens(fakeStates.idle, overrides);
      await fireEvent.press(screen.getByRole('button', { name: 'Voice settings' }));
      return result;
    }

    it('lists voices with their quality and checks the default when none is chosen', async () => {
      await openSettings();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(screen.getByText('Premium')).toBeOnTheScreen();
      expect(screen.getByText('Enhanced')).toBeOnTheScreen();
      expect(screen.getByText('Standard')).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Daniel' })).toBeChecked();
    });

    it('checks the chosen voice', async () => {
      await openSettings({ selectedVoiceId: 'kate' });
      expect(screen.getByRole('radio', { name: 'Kate' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Daniel' })).not.toBeChecked();
    });

    it('picks a voice and plays the sample', async () => {
      const { props } = await openSettings();
      await fireEvent.press(screen.getByRole('radio', { name: 'Serena' }));
      expect(props.onSelectVoice).toHaveBeenCalledWith('serena');
      await fireEvent.press(screen.getByRole('button', { name: 'Play “47 plus 38”' }));
      expect(props.onPlaySample).toHaveBeenCalledTimes(1);
    });

    it('says so when the device has no voices', async () => {
      await openSettings({ voices: [] });
      expect(screen.getByText('No voices found on this device.')).toBeOnTheScreen();
    });

    it('has no export button in M1', async () => {
      await openSettings();
      expect(screen.queryByText(/Export/)).toBeNull();
    });
  });
});
