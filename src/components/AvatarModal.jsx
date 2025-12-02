import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    createSession,
    initializeAgoraSDK,
    joinAgoraChannel,
    joinChat,
    sendMessage as sendSDKMessage,
    setupSDKEventHandlers,
    leaveChannel,
    closeSession
} from '../services/akoolService';
import './AvatarModal.css';

const AvatarModal = ({ isOpen, onClose }) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const agoraSDKRef = useRef(null);
    const videoContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const sessionIdRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            initializeSession();
        } else {
            // Cleanup when modal closes
            cleanup();
        }

        return () => {
            cleanup();
        };
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatSDKMessage = (message) => {
        const content = typeof message === 'string'
            ? message
            : message?.text
            ?? message?.content
            ?? message?.message
            ?? (message ? JSON.stringify(message) : '');

        return {
            id: message?.id || `msg-${Date.now()}`,
            type: message?.isSentByMe ? 'user' : 'ai',
            content: content?.trim() || '',
            timestamp: new Date()
        };
    };

    const upsertMessageFromSDK = (message) => {
        if (!message) return;

        setMessages(prev => {
            const formatted = formatSDKMessage(message);
            const existingIndex = prev.findIndex(msg => msg.id === formatted.id);

            if (existingIndex === -1) {
                return [...prev, formatted];
            }

            const updatedMessages = [...prev];
            updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                content: formatted.content || updatedMessages[existingIndex].content
            };
            return updatedMessages;
        });
    };

    const cleanup = async () => {
        if (agoraSDKRef.current) {
            await leaveChannel(agoraSDKRef.current);
            agoraSDKRef.current = null;
        }
        if (sessionIdRef.current) {
            try {
                await closeSession(sessionIdRef.current);
            } catch (error) {
                console.error('Failed to close session:', error);
            } finally {
                sessionIdRef.current = null;
            }
        }
        setIsConnected(false);
        setMessages([]);
        setInputValue('');
    };

    const initializeSession = async () => {
        setIsLoading(true);
        try {
            // Step 1: Create session to get Agora credentials
            const sessionData = await createSession();
            console.log('Session created:', sessionData);

            const sessionId =
                sessionData?.session_id ||
                sessionData?.sessionId ||
                sessionData?.data?.session_id ||
                sessionData?.data?.sessionId ||
                sessionData?.credentials?.session_id ||
                sessionData?.credentials?.sessionId;

            if (sessionId) {
                sessionIdRef.current = sessionId;
            } else {
                console.warn('Session created but no session ID returned. Session close may fail.');
            }

            // Extract Agora credentials from session response
            // The response structure may vary, so we check multiple possible formats
            const credentials = sessionData.credentials || sessionData.data?.credentials || sessionData;

            if (!credentials.agora_app_id || !credentials.agora_channel || !credentials.agora_token) {
                throw new Error('Missing Agora credentials in session response. Please check the API response format.');
            }

            // Step 2: Initialize Agora SDK
            const agoraSDK = initializeAgoraSDK();
            agoraSDKRef.current = agoraSDK;

            // Step 3: Setup event handlers
            setupSDKEventHandlers(agoraSDK, {
                onUserPublished: async (user, mediaType, sdk) => {
                    console.log('User published:', user, mediaType);
                    if (mediaType === 'video' && videoContainerRef.current) {
                        try {
                            const remoteTrack = await sdk.getClient().subscribe(user, mediaType);
                            if (remoteTrack) {
                                remoteTrack.play(videoContainerRef.current);
                                console.log('Video track playing');
                            }
                        } catch (error) {
                            console.error('Error playing video track:', error);
                        }
                    } else if (mediaType === 'audio') {
                        try {
                            const remoteTrack = await sdk.getClient().subscribe(user, mediaType);
                            if (remoteTrack) {
                                remoteTrack.play();
                                console.log('Audio track playing');
                            }
                        } catch (error) {
                            console.error('Error playing audio track:', error);
                        }
                    }
                },
                onMessageReceived: (message) => {
                    console.log('Message received:', message);
                    upsertMessageFromSDK(message);
                },
                onMessageUpdated: (message) => {
                    console.log('Message updated:', message);
                    upsertMessageFromSDK(message);
                },
                onException: (error) => {
                    console.error('SDK exception:', error);
                    setMessages(prev => [...prev, {
                        id: Date.now(),
                        type: 'error',
                        content: `Error: ${error.message || 'An error occurred'}`,
                        timestamp: new Date()
                    }]);
                }
            });

            // Step 4: Join Agora channel
            await joinAgoraChannel(agoraSDK, credentials);

            // Step 5: Join chat
            await joinChat(agoraSDK);

            setIsConnected(true);
            setIsLoading(false);

            // Add welcome message
            setMessages([{
                id: Date.now(),
                type: 'ai',
                content: 'Hello! I\'m your AI Assistant. How can I help you today?',
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Failed to initialize session:', error);
            setIsLoading(false);
            setIsConnected(false);
            sessionIdRef.current = null;

            // Show detailed error message
            let errorMessage = 'Sorry, I\'m having trouble connecting. Please try again later.';

            if (error.message) {
                if (error.message.includes('Missing required environment variables')) {
                    errorMessage = 'Configuration Error: Please check your .env file and ensure all Akool credentials are set.';
                } else if (error.message.includes('Network error') || error.message.includes('CORS')) {
                    errorMessage = 'Connection Error: Unable to reach Akool API. Please check the browser console for details.';
                } else if (error.message.includes('Missing Agora credentials')) {
                    errorMessage = 'API Error: Session created but missing Agora credentials. Please check the API response format.';
                } else {
                    errorMessage = `Error: ${error.message}. Check the browser console (F12) for more details.`;
                }
            }

            setMessages([{
                id: Date.now(),
                type: 'error',
                content: errorMessage,
                timestamp: new Date()
            }]);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading || !isConnected || !agoraSDKRef.current) return;

        const messageText = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

        try {
            await sendSDKMessage(agoraSDKRef.current, messageText);
            // Message will be added when we receive response via onMessageReceived
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: `Sorry, I encountered an error sending your message: ${error.message || 'Unknown error'}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const renderMessageContent = (message) => {
        if (message.type === 'ai') {
            return (
                <div className="avatar-message-content">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, ...props }) => (
                                <a target="_blank" rel="noopener noreferrer" {...props} />
                            )
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            );
        }

        return <p className="avatar-message-content">{message.content}</p>;
    };

    if (!isOpen) return null;

    return (
        <div className="avatar-modal-overlay" onClick={onClose}>
            <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
                <button className="avatar-modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>

                <div className="avatar-modal-content">
                    {/* Avatar Video Section */}
                    <div className="avatar-video-container">
                        <div
                            ref={videoContainerRef}
                            className="avatar-video"
                            id="remote-video"
                        >
                            {isLoading && (
                                <div className="avatar-loading">
                                    <div className="avatar-loading-spinner"></div>
                                    <p>Connecting to AI Assistant...</p>
                                </div>
                            )}
                            {!isLoading && !isConnected && (
                                <div className="avatar-placeholder-content">
                                    <div className="avatar-placeholder-image">
                                        <div className="avatar-placeholder-face"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title Section */}
                    <div className="avatar-title-section">
                        <h2 className="avatar-title">
                            Your <span className="avatar-title-highlight">AI Assistant</span>
                        </h2>
                    </div>

                    {/* Messages Section */}
                    <div className="avatar-messages-container">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`avatar-message avatar-message--${message.type}`}
                            >
                                {renderMessageContent(message)}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="avatar-message avatar-message--ai avatar-message--loading">
                                <div className="avatar-typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Section */}
                    <div className="avatar-input-container">
                        <div className="avatar-input-wrapper">
                            <button className="avatar-mic-button" aria-label="Voice input">
                                <Mic size={18} />
                            </button>
                            <input
                                type="text"
                                className="avatar-input"
                                placeholder="Ask me anything about your projects"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={isLoading || !isConnected}
                            />
                            <button
                                className="avatar-send-button"
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isLoading || !isConnected}
                                aria-label="Send message"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarModal;
