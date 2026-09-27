import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from './home';

describe('HomeScreen', () => {
  it('renders the neutral Android application foundation', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('The Android app foundation is ready.')).toBeOnTheScreen();
  });
});
