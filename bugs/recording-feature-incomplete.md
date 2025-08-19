# Report: Recording Feature is Incomplete

## Status

The recording feature is partially implemented. The frontend logic for recording
audio in the content script is in place, but the backend logic for saving and
managing the recordings is missing. The recordings are currently only stored in
memory and are lost when the user leaves the page.

## Frontend (Content Script)

- **`lib/content/features/recording.ts`:** This file contains the core logic for
  recording audio from the user's microphone.
  - It uses `navigator.mediaDevices.getUserMedia` to get access to the
    microphone.
  - It uses `MediaRecorder` to record the audio.
  - The recorded audio is stored in a `Blob` in the `recordingState.audioBlob`
    property.
  - It provides functions to start, stop, play, and clear the recording.
- **`lib/content/main-orchestrator.ts`:** This file integrates the
  `RecordingFeature` with the rest of the content script.
  - It creates a record button and a keyboard shortcut to toggle the recording.
  - It calls the `clearRecording` function when the video changes.
  - It provides the recorded audio `Blob` to the `ComparisonFeature`.

## Backend (Background Script & Storage)

- **`background.ts`:** The background script currently does not have any logic
  for handling recordings. There are no message listeners for saving, loading,
  or managing recordings.
- **`sidepanel.tsx`:** The sidepanel has a UI for displaying recordings, but
  it's not fully functional.
  - It retrieves recording data from a Supabase store
    (`useFluentFlowSupabaseStore`), but the data is not being saved to the store
    in the first place.
  - The delete functionality is not implemented.

## Required Steps to Complete the Feature

To complete the feature, the following steps are required:

1.  **Implement a message in `background.ts` to handle saving recordings.** This
    message should receive the audio data (as a `Blob` or a base64 string) from
    the content script.
2.  **Create a function in a new `recording-handler.ts` file in `lib/background`
    to handle the save message.** This function should save the recording to
    Supabase.
3.  **Implement messages for listing and deleting recordings.**
4.  **Update the `sidepanel.tsx` to use these new messages to manage the
    recordings.** The `deleteRecording` function needs to be implemented to send
    a `DELETE_RECORDING` message to the background script.
5.  **Update the `useFluentFlowSupabaseStore` to correctly interact with the
    Supabase backend for recordings.**
