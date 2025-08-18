# Bug Report: Loop state is incorrectly reset when applying a loop to a new video.

**Root Cause:**

The root cause of the bug is a race condition between the video change detection
mechanism and the loop application process. When a user applies a saved loop for
a different video, the following sequence of events occurs:

1.  The sidepanel opens the new video in a new tab.
2.  The content script for the new tab initializes.
3.  The `YouTubePlayerService` detects the new video and fires an
    `onVideoChange` event.
4.  The `main-orchestrator.ts` handles this event by calling
    `this.loopFeature.clearLoop()`, which resets the loop state to its default
    (empty) values.
5.  Almost simultaneously, the `applyLoop` message is received from the
    sidepanel, and the `loopFeature.applyLoop()` method is called, which
    correctly sets the loop's start and end times.
6.  However, the UI is re-rendered due to the video change, and the user
    interacts with a new set of UI controls. When the user clicks the "play"
    button, the `toggleLoopPlayback` function is called, but it reads the
    cleared loop state, leading to the "Please set both loop start and end
    points first" error.

**Impact:**

This bug prevents users from applying saved loops to different videos, which is
a core feature of the extension. It leads to a confusing and frustrating user
experience.

**Suggested Fix:**

The fix is to prevent the `clearLoop()` function from being called when a loop
is being applied. We need to introduce a mechanism to signal that a loop
application is in progress and that the state should not be cleared.

Here's a possible approach:

1.  When the `applyLoop` message is sent from the sidepanel, include a flag
    indicating that a loop is being applied, for example,
    `isApplyingLoop: true`.
2.  In the `setupVideoChangeDetection` function in `main-orchestrator.ts`, check
    for this flag before clearing the loop state. If the flag is present, skip
    the `clearLoop()` call.
3.  The flag should be cleared after the loop has been successfully applied.

This will ensure that the loop state is preserved during the video change and
that the loop can be played correctly.
