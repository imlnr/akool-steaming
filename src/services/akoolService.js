import { GenericAgoraSDK } from 'akool-streaming-avatar-sdk';
import { AKOOL_KW_ID, AKOOL_VOICE_ID, AKOOL_AVATAR_NAME, AKOOL_BEARER_TOKEN } from '../config/custom';

// Akool API base URL for session creation
const AKOOL_API_BASE = 'https://openapi.akool.com';

/**
 * Create a session with Akool API to get Agora credentials
 * This is required before using the SDK
 */
export const createSession = async () => {
    try {
        if (!AKOOL_AVATAR_NAME) {
            throw new Error('Missing required environment variable: VITE_AVATAR_NAME. Please check your .env file.');
        }
        if (!AKOOL_BEARER_TOKEN) {
            throw new Error('Missing required environment variable: VITE_BEARER_TOKEN. Please check your .env file.');
        }

        const url = `${AKOOL_API_BASE}/api/open/v4/liveAvatar/session/create`;
        const requestBody = {
            avatar_id: AKOOL_AVATAR_NAME,
            duration: 60,
            knowledge_id: AKOOL_KW_ID,
            voice_id: AKOOL_VOICE_ID
        };

        // Note: Knowledge base can also be passed in session creation as 'knowledge_id'
        // However, it's currently passed in joinChat() which also works
        // If you prefer to pass it in session creation, uncomment the line below:
        // if (AKOOL_KW_ID) {
        //     requestBody.knowledge_id = AKOOL_KW_ID;
        // }

        console.log('Creating Akool session:', { url, avatar_id: AKOOL_AVATAR_NAME });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AKOOL_BEARER_TOKEN}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = JSON.stringify(errorData);
            } catch (e) {
                try {
                    errorText = await response.text();
                } catch (e2) {
                    errorText = response.statusText;
                }
            }
            console.error('Akool API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
        }

        const data = await response.json();
        console.log('Successfully created session:', data);
        return data;
    } catch (error) {
        console.error('Error creating session:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to Akool API. Please check your network connection and API configuration.');
        }
        throw error;
    }
};

/**
 * Initialize and return an Agora SDK instance
 */
export const initializeAgoraSDK = () => {
    return new GenericAgoraSDK({
        mode: 'rtc',
        codec: 'vp8'
    });
};

/**
 * Join Agora channel with credentials from session
 */
export const joinAgoraChannel = async (agoraSDK, credentials) => {
    try {
        await agoraSDK.joinChannel({
            agora_app_id: credentials.agora_app_id,
            agora_channel: credentials.agora_channel,
            agora_token: credentials.agora_token,
            agora_uid: credentials.agora_uid
        });
        console.log('Successfully joined Agora channel');
    } catch (error) {
        console.error('Error joining Agora channel:', error);
        throw error;
    }
};

/**
 * Join chat with avatar parameters
 * 
 * @param {GenericAgoraSDK} agoraSDK - The Agora SDK instance
 * @param {Object} options - Optional parameters to override defaults
 * @param {string} options.voiceId - Voice ID (defaults to AKOOL_VOICE_ID)
 * @param {string} options.lang - Language code (defaults to 'en')
 * @param {number} options.mode - Chat mode: 1 for repeat mode, 2 for dialog mode (defaults to 2)
 * 
 * Note: Knowledge base ID is automatically added if AKOOL_KW_ID is configured
 */
export const joinChat = async (agoraSDK, options = {}) => {
    try {
        // Validate voice ID is provided
        const voiceId = options.voiceId || AKOOL_VOICE_ID;
        if (!voiceId) {
            console.warn('Warning: No voice ID provided. Chat may not work correctly.');
        }

        const chatOptions = {
            vid: voiceId || '',
            lang: options.lang || 'en',
            mode: options.mode || 2 // 1 for repeat mode, 2 for dialog mode
        };

        // Add knowledge base ID if available
        // The SDK accepts knowledgeBaseId parameter for knowledge base integration
        if (AKOOL_KW_ID) {
            chatOptions.knowledgeBaseId = AKOOL_KW_ID;
            console.log('Knowledge base ID added to chat options:', AKOOL_KW_ID);
        } else {
            console.log('No knowledge base ID configured - chat will work without knowledge base');
        }

        await agoraSDK.joinChat(chatOptions);
        console.log('Successfully joined chat with options:', {
            vid: chatOptions.vid ? '✓' : '✗',
            lang: chatOptions.lang,
            mode: chatOptions.mode,
            knowledgeBaseId: chatOptions.knowledgeBaseId ? '✓' : '✗'
        });
    } catch (error) {
        console.error('Error joining chat:', error);
        throw error;
    }
};

/**
 * Send a message through the SDK
 */
export const sendMessage = async (agoraSDK, message) => {
    try {
        if (!message || !message.trim()) {
            throw new Error('Message cannot be empty');
        }
        await agoraSDK.sendMessage(message);
        console.log('Message sent:', message);
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

/**
 * Setup event handlers for the SDK
 */
export const setupSDKEventHandlers = (agoraSDK, callbacks = {}) => {
    agoraSDK.on({
        onException: (error) => {
            console.error('SDK exception:', error);
            if (callbacks.onException) {
                callbacks.onException(error);
            }
        },
        onMessageReceived: (message) => {
            console.log('New message received:', message);
            if (callbacks.onMessageReceived) {
                callbacks.onMessageReceived(message);
            }
        },
        onMessageUpdated: (message) => {
            console.log('Message updated:', message);
            if (callbacks.onMessageUpdated) {
                callbacks.onMessageUpdated(message);
            }
        },
        onUserPublished: async (user, mediaType) => {
            console.log('User published:', user, mediaType);
            if (callbacks.onUserPublished) {
                await callbacks.onUserPublished(user, mediaType, agoraSDK);
            }
        }
    });
};

/**
 * Leave channel and cleanup
 */
export const leaveChannel = async (agoraSDK) => {
    try {
        if (agoraSDK) {
            if (typeof agoraSDK.leaveChannel === 'function') {
                await agoraSDK.leaveChannel();
            } else if (typeof agoraSDK.leave === 'function') {
                await agoraSDK.leave();
            }
            console.log('Left Agora channel');
        }
    } catch (error) {
        console.error('Error leaving channel:', error);
    }
};

/**
 * Close an active Akool session
 * @param {string} sessionId - Session identifier returned from createSession
 */
export const closeSession = async (sessionId) => {
    try {
        if (!sessionId) {
            console.warn('closeSession called without a sessionId');
            return;
        }

        const url = `${AKOOL_API_BASE}/api/open/v4/liveAvatar/session/close`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AKOOL_BEARER_TOKEN}`
            },
            body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to close session (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('Session closed successfully:', data);
        return data;
    } catch (error) {
        console.error('Error closing session:', error);
    }
};