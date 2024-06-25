class ScreenShareSession {
    /**
     * @type {ImageCapture}
     */
    imageCapture = null;
    /**
     * @type {MediaStream}
     */
    stream = null;
    /**
     * @type {MediaStreamTrack}
     */
    videoTrack = null;

    /**
     * Creates a new Stream object.
     * @param {MediaStream} stream Stream object
     * @param {ImageCapture} imageCapture ImageCapture object
     * @param {MediaStreamTrack} videoTrack Video track object
     */
    constructor(stream, imageCapture, videoTrack) {
        this.stream = stream;
        this.imageCapture = imageCapture;
        this.videoTrack = videoTrack;
    }
}

/**
 * @type {ScreenShareSession}
 */
let session = null;

const { eventSource, event_types } = SillyTavern.getContext();
const canvas = new OffscreenCanvas(window.screen.width, window.screen.height);

const button = createButton();

function updateUI() {
    const icon = button.querySelector('i');
    const text = button.querySelector('span');
    const isSessionActive = !!session;
    icon.classList.toggle('fa-desktop', !isSessionActive);
    icon.classList.toggle('fa-hand', isSessionActive);
    text.innerText = isSessionActive ? 'Stop Screen Share' : 'Screen Share';
}

function createButton() {
    const menu = document.getElementById('screen_share_wand_container') ?? document.getElementById('extensionsMenu');
    menu.classList.add('interactable');
    menu.tabIndex = 0;
    const extensionButton = document.createElement('div');
    extensionButton.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
    extensionButton.tabIndex = 0;
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', 'fa-desktop');
    const text = document.createElement('span');
    text.innerText = 'Screen Share';
    extensionButton.appendChild(icon);
    extensionButton.appendChild(text);
    extensionButton.onclick = handleClick;

    async function handleClick() {
        if (session) {
            session.videoTrack.stop();
            session = null;
            updateUI();
            return console.log('Screen sharing stopped.');
        }

        await launchScreenShare();
        updateUI();
        return console.log('Screen sharing started.');
    }

    if (!menu) {
        console.warn('createButton: menu not found');
        return extensionButton;
    }

    menu.appendChild(extensionButton);
    return extensionButton;
}

async function grabFrame(chat) {
    if (!Array.isArray(chat) || chat.length === 0) {
        console.debug('grabFrame: chat is empty');
        return;
    }

    if (!session) {
        console.debug('grabFrame: stream is not initialized');
        return;
    }

    if (!session.stream.active) {
        console.warn('grabFrame: stream is not active');
        return;
    }

    // We don't want to modify the original message object
    // Since it's saved in the chat history
    const lastChatMessage = structuredClone(chat[chat.length - 1]);

    if (!lastChatMessage) {
        console.warn('grabFrame: message is gone??');
        return;
    }

    if (!lastChatMessage.is_user) {
        console.debug('grabFrame: message is not from user');
        return;
    }

    if (!lastChatMessage.extra) {
        lastChatMessage.extra = {};
    }

    if (lastChatMessage.extra.image) {
        console.debug('grabFrame: image already exists');
        return;
    }

    // Do a little bamboozle to hack the message
    chat[chat.length - 1] = lastChatMessage;

    // Grab frame
    const bitmap = await session.imageCapture.grabFrame();

    // Draw frame to canvas
    console.debug('launchScreenShare: drawing frame to canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Convert to base64 PNG string
    console.debug('launchScreenShare: converting canvas to base64');
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });

    console.log('launchScreenShare: sending frame to chat');
    lastChatMessage.extra.image = base64;
}

async function launchScreenShare() {
    try {
        if (!window.ImageCapture) {
            toastr.error('Your browser does not support ImageCapture API. Please use a different browser.');
            return;
        }

        // Get permission to capture the screen
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

        if (!stream) {
            toastr.error('Failed to start screen sharing. Please try again.');
            return;
        }

        const context = SillyTavern.getContext();

        if (context.mainApi !== 'openai') {
            toastr.warning('Screen sharing is only supported in Chat Completions.', 'Unsupported API');
            return;
        }

        const imageInliningCheckbox = document.getElementById('openai_image_inlining');

        if (imageInliningCheckbox instanceof HTMLInputElement) {
            if (!imageInliningCheckbox.checked) {
                toastr.warning('Image inlining is turned off. The screen share feature will not work.');
            }
        }

        // Get the video track
        const [videoTrack] = stream.getVideoTracks();

        if (!videoTrack) {
            throw new Error('Failed to get the video track.');
        }

        // Create an image capture object
        const imageCapture = new ImageCapture(videoTrack);

        // If the video track is ended, stop the worker
        videoTrack.addEventListener('ended', () => {
            console.log('launchScreenShare: video ended, stopping session.');
            session = null;
            updateUI();
        });

        // If the chat is changed, stop the worker
        eventSource.once(event_types.CHAT_CHANGED, () => {
            console.log('launchScreenShare: chat changed, stopping session.');
            videoTrack.stop();
            session = null;
            updateUI();
        });

        // Create a new session object
        session = new ScreenShareSession(stream, imageCapture, videoTrack);
    } catch (error) {
        console.error('Failed to start screen sharing.', error);
        toastr.error('Failed to start screen sharing. Check debug console for more details.');
    }
};

window['extension_ScreenShare_interceptor'] = grabFrame;
