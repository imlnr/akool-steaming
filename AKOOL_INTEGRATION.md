# Akool API Integration Guide

This document provides guidance on integrating the Akool streaming avatar API with the React components.

## Components Created

1. **AvatarButton** (`src/components/AvatarButton.jsx`)
   - Floating button at bottom-right of the page
   - Opens the avatar modal when clicked

2. **AvatarModal** (`src/components/AvatarModal.jsx`)
   - Modal dialog with avatar video display
   - Chat interface for user interaction
   - Handles message sending and receiving

3. **Akool Service** (`src/services/akoolService.js`)
   - API integration layer for Akool
   - Functions for initializing chat, sending messages, and getting avatar URLs

## Configuration

Your Akool credentials are stored in `src/config/custom.js`:

- `AKOOL_KW_ID` - Knowledge Base ID
- `AKOOL_VOICE_ID` - Voice ID
- `AKOOL_AVATAR_NAME` - Avatar Name
- `AKOOL_BEARER_TOKEN` - Bearer Token for authentication

## API Endpoint Updates Required

The Akool service uses placeholder API endpoints. You'll need to update `src/services/akoolService.js` with the actual endpoints from Akool's documentation:

### 1. Update Base URL

```javascript
const AKOOL_API_BASE = 'https://api.akool.com'; // Update if different
```

### 2. Update Initialize Chat Endpoint

The `initializeChat()` function may need to use a different endpoint. Common patterns:

- `POST /v1/chat/sessions`
- `POST /api/v1/sessions`
- `POST /chat/init`

### 3. Update Send Message Endpoint

The `sendMessage()` function may need to use a different endpoint. Common patterns:

- `POST /v1/chat/messages`
- `POST /api/v1/chat`
- `POST /chat/send`

### 4. Update Avatar URL Format

The `getAvatarEmbedUrl()` function may need a different URL format. Check Akool's documentation for:

- Embed/iframe URLs
- WebSocket URLs for streaming
- HLS streaming URLs

## Response Format

The service expects responses in a specific format. Update the response parsing in `AvatarModal.jsx` if Akool returns a different structure:

```javascript
// Current expectation:
const aiMessage = {
  content: response.message || response.text || response.response
};

// Update based on actual Akool response structure
```

## Testing

1. Make sure your `.env` file has the correct Akool credentials:

   ```
   VITE_KW_ID=your_knowledge_base_id
   VITE_VOICE_ID=your_voice_id
   VITE_AVATAR_NAME=your_avatar_name
   VITE_BEARER_TOKEN=your_bearer_token
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Click the avatar button at the bottom-right to open the modal

4. Check the browser console for any API errors and adjust endpoints accordingly

## Common Issues

1. **CORS Errors**: If you encounter CORS errors, you may need to:
   - Use a backend proxy for API calls
   - Configure CORS on Akool's side
   - Use Akool's SDK if available

2. **Authentication Errors**: Verify that:
   - Your bearer token is correct
   - The token hasn't expired
   - The Authorization header format is correct

3. **Avatar Not Displaying**: Check:
   - The embed URL format is correct
   - The iframe has proper permissions (camera, microphone)
   - The avatar name matches your Akool account

## Next Steps

1. Review Akool's API documentation: <https://docs.akool.com>
2. Update the API endpoints in `akoolService.js`
3. Test the integration with your actual Akool account
4. Adjust response parsing based on actual API responses
5. Add error handling for edge cases
