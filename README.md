
# Visionary AI: Real-time Screen & Voice Assistant

Visionary AI is a state-of-the-art React application that enables human-like interaction with your computer screen. By combining **Gemini 2.5 Flash Native Audio** with real-time screen capture, this app can see what you see, hear what you say, and talk back to you with helpful, context-aware guidance.

## Key Features

- **Real-time Screen Reasoning**: Unlike traditional OCR, Gemini understands UI hierarchies, buttons, forms, and visual errors in context.
- **Voice-to-Voice Interaction**: Seamless audio input and output for a natural conversational experience.
- **Multimodal Context**: The AI correlates your verbal questions with the visual state of your screen.
- **Neural Voice Output**: High-quality, expressive speech that describes the UI and provides guidance.
- **Zero Backend**: Runs entirely in the browser using the Google GenAI SDK.

## Prerequisites

1. **Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
2. **Modern Browser**: Chrome, Edge, or Firefox (must support `getDisplayMedia` and `Web Audio API`).
3. **Microphone Access**: Required for voice commands.
4. **Screen Recording Permission**: Required for visual analysis.

## Setup Instructions

After cloning the repository:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   The application expects the API key to be provided via environment variables. Create a `.env` file in the root directory:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

3. **Start the Application**:
   ```bash
   npm run dev
   ```

4. **Access the App**:
   Open `http://localhost:3000` in your browser.

## Usage Guide

1. **Start Session**: Click the "Start Session" button in the header.
2. **Permissions**:
   - Your browser will ask for microphone access. Allow it.
   - A screen selection dialog will appear. Choose the screen, window, or tab you want the AI to "look" at. For the best experience, select your entire monitor.
3. **Interact**:
   - Simply start speaking. You can ask things like:
     - *"What is on my screen right now?"*
     - *"I'm stuck on this form, what should I do next?"*
     - *"Where is the 'Submit' button?"*
     - *"Can you explain the error message shown in the red box?"*
4. **Guidance**: Gemini will respond verbally, describing the UI and giving you step-by-step instructions.
5. **Stop Session**: Click "Stop Session" when finished to release the camera and microphone.

## Technical Notes

- **Screen Capture**: Uses the `navigator.mediaDevices.getDisplayMedia` API. Frames are captured at 1 frame per second to ensure low latency while providing enough visual context for reasoning.
- **Audio Processing**: Raw PCM data (16kHz in, 24kHz out) is streamed via WebSockets using the Gemini Live protocol.
- **Multimodal AI**: Uses `gemini-2.5-flash-native-audio-preview-12-2025` which is specifically optimized for low-latency voice and vision tasks.
- **Mute Microphone**: Added a mute microphone button to toggle microphone input.


### More features coming soon