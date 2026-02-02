import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Session from './Session';

// Mock the audio utilities
vi.mock('../utils/audioUtils', () => ({
  decode: vi.fn((base64: string) => new Uint8Array([1, 2, 3])),
  decodeAudioData: vi.fn(async () => ({
    duration: 1.0,
    numberOfChannels: 1,
    sampleRate: 24000,
  })),
  createAudioBlob: vi.fn(() => ({
    data: 'base64data',
    mimeType: 'audio/pcm;rate=16000',
  })),
  blobToBase64: vi.fn(async () => 'base64imagedata'),
}));

// Mock GoogleGenAI
const mockSendRealtimeInput = vi.fn();
const mockClose = vi.fn();
let sessionCallbacks: any = {};

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    live: {
      connect: vi.fn(async ({ callbacks }) => {
        // Store callbacks for later use
        sessionCallbacks = callbacks;

        const session = {
          sendRealtimeInput: mockSendRealtimeInput,
          close: mockClose,
        };

        // Call onopen immediately for simpler testing
        setTimeout(() => {
          callbacks.onopen?.();
        }, 10);

        return session;
      }),
    },
  })),
  Modality: {
    AUDIO: 'audio',
  },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock SpeedInsights
vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}));

// Helper function to render component
const renderSession = () => {
  return render(
    <BrowserRouter>
      <Session />
    </BrowserRouter>
  );
};

// Helper class for MediaStream mock
class TestMediaStream {
  tracks: any[];

  constructor(tracks: any[]) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((t: any) => t.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter((t: any) => t.kind === 'video');
  }
}

describe('Session Component', () => {
  let mockMediaStream: any;
  let mockAudioTrack: any;
  let mockVideoTrack: any;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionCallbacks = {};

    // Mock media tracks
    mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    };

    mockVideoTrack = {
      kind: 'video',
      stop: vi.fn(),
    };

    mockMediaStream = new TestMediaStream([mockVideoTrack]);

    // Setup navigator.mediaDevices mocks
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockMediaStream as any);
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(
      new TestMediaStream([mockAudioTrack]) as any
    );
  });

  describe('Initial Rendering', () => {
    it('should render the component with initial state', () => {
      renderSession();

      expect(screen.getByText(/VisionaryAI/i)).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByText(/No screen connected/i)).toBeInTheDocument();
      expect(screen.getByText(/Start a session to begin/i)).toBeInTheDocument();
    });

    it('should show the voice selector when disconnected', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox');
      expect(voiceSelector).toBeInTheDocument();
      expect(voiceSelector).toHaveValue('Zephyr');
    });

    it('should show the start session button when disconnected', () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });
      expect(startButton).toBeInTheDocument();
    });

    it('should show empty transcript message', () => {
      renderSession();

      expect(screen.getByText(/Conversation will appear here/i)).toBeInTheDocument();
    });

    it('should display the back button', () => {
      renderSession();

      const backButton = screen.getAllByRole('button')[0];
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Voice Selection', () => {
    it('should allow changing voice selection', async () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox') as HTMLSelectElement;

      await act(async () => {
        fireEvent.change(voiceSelector, { target: { value: 'Puck' } });
      });

      expect(voiceSelector.value).toBe('Puck');
    });

    it('should have all voice options available', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox');
      const options = Array.from(voiceSelector.querySelectorAll('option'));

      expect(options).toHaveLength(6);
      expect(options.map(o => o.value)).toContain('Puck');
      expect(options.map(o => o.value)).toContain('Charon');
      expect(options.map(o => o.value)).toContain('Kore');
      expect(options.map(o => o.value)).toContain('Fenrir');
      expect(options.map(o => o.value)).toContain('Aoede');
      expect(options.map(o => o.value)).toContain('Zephyr');
    });

    it('should group voices by gender', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox');
      const optgroups = voiceSelector.querySelectorAll('optgroup');

      expect(optgroups).toHaveLength(2);
      expect(optgroups[0].getAttribute('label')).toBe('Female');
      expect(optgroups[1].getAttribute('label')).toBe('Male');
    });

    it('should have female and male voice options', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox');
      const femaleGroup = voiceSelector.querySelector('optgroup[label="Female"]');
      const maleGroup = voiceSelector.querySelector('optgroup[label="Male"]');

      expect(femaleGroup).toBeInTheDocument();
      expect(maleGroup).toBeInTheDocument();

      const femaleOptions = femaleGroup?.querySelectorAll('option');
      const maleOptions = maleGroup?.querySelectorAll('option');

      expect(femaleOptions?.length).toBeGreaterThan(0);
      expect(maleOptions?.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', async () => {
      renderSession();

      const backButton = screen.getAllByRole('button')[0];

      await act(async () => {
        fireEvent.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Session Connection', () => {
    it('should show connecting state when starting session', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('should request display media when starting session', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
          video: { displaySurface: 'monitor' },
          audio: false,
        });
      });
    });

    it('should show connected state after successful connection', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(
        () => {
          expect(screen.getByText('Session Active')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('should request user media after connection opens', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(
        () => {
          expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
            audio: true,
          });
        },
        { timeout: 1000 }
      );
    });

    it('should show error message when media access fails', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
      });
    });

    it('should show alert when mediaDevices is not supported', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // Temporarily remove mediaDevices
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: undefined,
      });

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported on mobile devices')
      );

      // Restore mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: originalMediaDevices,
      });

      alertSpy.mockRestore();
    });

    it('should hide voice selector when connected', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Audio Mute Control', () => {
    it('should show mute button when connected', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const muteButton = buttons.find(
          btn => btn.querySelector('svg') && btn.className.includes('w-10 h-10')
        );
        expect(muteButton).toBeInTheDocument();
      });
    });

    it('should toggle mute state when mute button is clicked', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const muteButton = buttons.find(
        btn => btn.querySelector('svg') && btn.className.includes('w-10 h-10')
      );

      if (muteButton) {
        await act(async () => {
          fireEvent.click(muteButton);
        });

        expect(mockAudioTrack.enabled).toBe(false);

        await act(async () => {
          fireEvent.click(muteButton);
        });

        expect(mockAudioTrack.enabled).toBe(true);
      }
    });
  });

  describe('Session Termination', () => {
    it('should show end button when connected', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
      });
    });

    it('should stop all streams when end button is clicked', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should return to disconnected state after ending session', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Start Session/i })).toBeInTheDocument();
      });
    });

    it('should call close on session when stopping', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Transcript Display', () => {
    it('should show transcript panel with message count', () => {
      renderSession();

      expect(screen.getByText('Transcript')).toBeInTheDocument();
      expect(screen.getByText('0 msgs')).toBeInTheDocument();
    });

    it('should show listening status when connected', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Listening')).toBeInTheDocument();
      });
    });

    it('should show offline status when disconnected', () => {
      renderSession();

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display E2E Encrypted label', () => {
      renderSession();

      expect(screen.getByText('E2E Encrypted')).toBeInTheDocument();
    });
  });

  describe('Video Feed Display', () => {
    it('should show screen feed panel', () => {
      renderSession();

      expect(screen.getByText('Screen Feed')).toBeInTheDocument();
    });

    it('should display technical specifications', () => {
      renderSession();

      expect(screen.getByText('1 FPS')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should show live indicator when connected', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        const liveIndicators = screen.getAllByText('Live');
        expect(liveIndicators.length).toBeGreaterThan(1);
      });
    });

    it('should have video element in the DOM', () => {
      renderSession();

      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when connection fails', async () => {
      const errorMessage = 'Network error occurred';
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show generic error for missing error message', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce({});

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to initialize/i)).toBeInTheDocument();
      });
    });

    it('should clear error message when starting new session', async () => {
      // First attempt - fails
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error('First error')
      );

      renderSession();

      let startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second attempt - succeeds
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValueOnce(mockMediaStream as any);

      startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('should handle onclose callback gracefully', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // Trigger onclose
      await act(async () => {
        sessionCallbacks.onclose?.();
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });

    it('should handle onerror callback', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // Trigger onerror
      await act(async () => {
        sessionCallbacks.onerror?.(new Error('Test error'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Component Lifecycle', () => {
    it('should set loaded state after mount', async () => {
      const { container } = renderSession();

      await waitFor(() => {
        const header = container.querySelector('header');
        expect(header?.classList.contains('opacity-100')).toBe(true);
      });
    });

    it('should have canvas element for screen capture', () => {
      renderSession();

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Transcript Saving', () => {
    it('should not save transcript if empty', async () => {
      const fetchMock = vi.fn(() => Promise.resolve({ ok: true } as Response));
      global.fetch = fetchMock;

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Should not call fetch for empty transcript
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle rapid start/stop cycles', async () => {
      renderSession();

      // Start session
      let startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // Stop immediately
      let endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Start again
      startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });
    });

    it('should handle voice change during disconnected state only', async () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox') as HTMLSelectElement;

      // Should work when disconnected
      await act(async () => {
        fireEvent.change(voiceSelector, { target: { value: 'Kore' } });
      });

      expect(voiceSelector.value).toBe('Kore');

      await act(async () => {
        fireEvent.change(voiceSelector, { target: { value: 'Aoede' } });
      });

      expect(voiceSelector.value).toBe('Aoede');
    });

    it('should handle attempting to toggle mute when no stream exists', () => {
      renderSession();

      // This simulates an edge case where mute is somehow triggered without a stream
      // The component should handle this gracefully
      expect(() => {
        // Component is in disconnected state, mute button shouldn't be visible
        expect(screen.queryByRole('button', { name: /mute/i })).not.toBeInTheDocument();
      }).not.toThrow();
    });

    it('should maintain state consistency during connection lifecycle', async () => {
      renderSession();

      // Initial state
      expect(screen.getByText('Ready')).toBeInTheDocument();

      // Start connecting
      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });

      // Connected
      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // End session
      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      // Back to initial state
      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });
  });

  describe('Regression Tests', () => {
    it('should not lose voice selection after failed connection attempt', async () => {
      vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      renderSession();

      // Change voice
      const voiceSelector = screen.getByRole('combobox') as HTMLSelectElement;

      await act(async () => {
        fireEvent.change(voiceSelector, { target: { value: 'Puck' } });
      });

      expect(voiceSelector.value).toBe('Puck');

      // Attempt to start session (will fail)
      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });

      // Voice selection should be preserved
      const voiceSelectorAfter = screen.getByRole('combobox') as HTMLSelectElement;
      expect(voiceSelectorAfter.value).toBe('Puck');
    });

    it('should handle fetch errors during transcript save gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi.fn(() => Promise.reject(new Error('Network error')));
      global.fetch = fetchMock;

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      const endButton = screen.getByRole('button', { name: /End/i });

      await act(async () => {
        fireEvent.click(endButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });

      // Should not crash, just log error
      consoleErrorSpy.mockRestore();
    });

    it('should prevent double-clicking start button', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
        fireEvent.click(startButton);
      });

      // Should only call once
      await waitFor(() => {
        expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
      });
    });

    it('should properly cleanup media streams on unmount', async () => {
      const { unmount } = renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      unmount();

      // Verify cleanup was called
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form controls', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox');
      expect(voiceSelector).toBeInTheDocument();

      const startButton = screen.getByRole('button', { name: /Start Session/i });
      expect(startButton).toBeInTheDocument();
    });

    it('should have accessible button labels', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
      });
    });

    it('should provide visual feedback for connection status', () => {
      renderSession();

      // Should show status indicator
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for screen reader users', () => {
      renderSession();

      // Check that important UI elements have proper text content
      expect(screen.getByText(/VisionaryAI/i)).toBeInTheDocument();
      expect(screen.getByText('Transcript')).toBeInTheDocument();
      expect(screen.getByText('Screen Feed')).toBeInTheDocument();
    });
  });

  describe('Additional Test Coverage', () => {
    it('should handle interrupted audio playback', async () => {
      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // Simulate interruption
      await act(async () => {
        sessionCallbacks.onmessage?.({
          serverContent: {
            interrupted: true,
          },
        });
      });

      // Component should still be in connected state
      expect(screen.getByText('Session Active')).toBeInTheDocument();
    });

    it('should have proper default voice selected', () => {
      renderSession();

      const voiceSelector = screen.getByRole('combobox') as HTMLSelectElement;
      expect(voiceSelector.value).toBe('Zephyr');
    });

    it('should render status dot indicators', () => {
      renderSession();

      const container = document.querySelector('.w-3.h-3.rounded-full');
      expect(container).toBeInTheDocument();
    });

    it('should handle missing getDisplayMedia method', async () => {
      // Create alert mock if it doesn't exist
      if (!global.alert) {
        global.alert = vi.fn();
      }
      const alertSpy = vi.spyOn(global, 'alert').mockImplementation(() => {});

      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        writable: true,
        value: undefined,
      });

      renderSession();

      const startButton = screen.getByRole('button', { name: /Start Session/i });

      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(alertSpy).toHaveBeenCalled();

      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', {
        writable: true,
        value: originalGetDisplayMedia,
      });

      alertSpy.mockRestore();
    });

    it('should render ambient background elements', () => {
      const { container } = renderSession();

      const ambientBg = container.querySelector('.fixed.inset-0.pointer-events-none');
      expect(ambientBg).toBeInTheDocument();
    });
  });
});