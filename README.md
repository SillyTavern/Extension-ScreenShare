# Screen Share

Provides the screen image for multimodal models when you send a message.

Works only if the last chat message is from a user.

## How to install

Install via the SillyTavern extension installer.

```txt
https://github.com/Cohee1207/Extension-ScreenShare
```

## Prerequisites

The latest staging version of SillyTavern is preferred.

Your browser must support ImageCapture API.

See: <https://caniuse.com/imagecapture>

## How to use

0. Make sure that you're using a multimodal model for Chat Completion APIs and have "Send inline images" enabled.
1. Initialize the screen-sharing session by choosing "Screen Share" from the "wand" menu.
2. Start chatting! Every last user message will include the screen image as an inline attachment.
3. When you're done, choose "Stop Screen Share" from the "wand" menu. Changing a chat or stopping the track via the browser also stops sharing.

**Important!** Images are not saved and are not posted anywhere besides your API backend provider.

## License

AGPLv3
