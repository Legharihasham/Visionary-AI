import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.API_KEY = 'test-api-key';

// Mock Web APIs
global.AudioContext = vi.fn(function(this: any) {
  this.createBuffer = vi.fn();
  this.createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  }));
  this.createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
  }));
  this.createScriptProcessor = vi.fn(() => ({
    onaudioprocess: null,
    connect: vi.fn(),
  }));
  this.destination = {};
  this.currentTime = 0;
  this.sampleRate = 48000;
  return this;
}) as any;

// Mock MediaStream
class MockMediaStream {
  tracks: any[];

  constructor(tracks: any[] = []) {
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

global.MediaStream = MockMediaStream as any;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getDisplayMedia: vi.fn(),
    getUserMedia: vi.fn(),
  },
});

// Mock HTMLVideoElement properties
Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  writable: true,
  value: 4, // HAVE_ENOUGH_DATA
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  writable: true,
  value: 1920,
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  writable: true,
  value: 1080,
});

// Mock srcObject setter to accept our mocked MediaStream
Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
  get() {
    return this._srcObject || null;
  },
  set(value) {
    this._srcObject = value;
  },
  configurable: true,
});

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  canvas: {},
})) as any;

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  const blob = new Blob(['test'], { type: 'image/jpeg' });
  callback(blob);
});

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(function(this: any) {
  this.readAsDataURL = vi.fn(function(this: any) {
    this.onloadend?.();
  });
  this.result = 'data:image/jpeg;base64,dGVzdA==';
  this.onerror = null;
  return this;
}) as any;

// Mock window.clearInterval
global.clearInterval = vi.fn();