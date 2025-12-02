# Troubleshooting Akool API Integration

## Common Issues and Solutions

### 1. "Sorry, I'm having trouble connecting" Error

This error appears when the API call to initialize the chat session fails. Here's how to debug:

#### Check Environment Variables

1. Make sure you have a `.env` file in the root of your project
2. Verify all variables are set:

   ```
   VITE_KW_ID=your_knowledge_base_id
   VITE_VOICE_ID=your_voice_id
   VITE_AVATAR_NAME=your_avatar_name
   VITE_BEARER_TOKEN=your_bearer_token
   ```

3. Restart your dev server after changing `.env` file

#### Check Browser Console

1. Open browser DevTools (F12)
2. Go to the Console tab
3. Look for error messages that show:
   - Which endpoint was tried
   - What the API response was
   - Any CORS or network errors

#### Check Network Tab

1. Open browser DevTools (F12)
2. Go to the Network tab
3. Filter by "Fetch/XHR"
4. Look for the failed `sessions` request
5. Click on it to see:
   - Request URL
   - Request Headers
   - Response (if any)
   - Status code

### 2. CORS Errors

If you see CORS errors in the console:

- The API might not allow requests from `localhost:5173`
- You may need to:
  - Configure CORS on Akool's side
  - Use a backend proxy
  - Use Akool's SDK instead of direct API calls

### 3. 404 or 405 Errors

If you see 404/405 errors:

- The API endpoint path is incorrect
- Update the endpoint in `src/services/akoolService.js`
- Check Akool's API documentation for the correct endpoint

### 4. Authentication Errors (401/403)

If you see 401 or 403 errors:

- Your bearer token might be incorrect or expired
- Verify the token in your `.env` file
- Check if the token format is correct (should start with the token value)

### 5. Wrong API Base URL

The default base URL is `https://api.akool.com`. If this is incorrect:

1. Check Akool's documentation for the correct base URL
2. Update `AKOOL_API_BASE` in `src/services/akoolService.js`

### 6. Request Body Format

The service tries multiple endpoint patterns, but the request body format might be wrong:

1. Check Akool's API documentation
2. Update the request body in `initializeChat()` and `sendMessage()` functions
3. Common field names might be:
   - `knowledge_base_id` instead of `knowledgeBaseId`
   - `voice_id` instead of `voiceId`
   - `avatar_name` instead of `avatarName`

## Debug Steps

1. **Check Console Logs**: The service now logs which endpoints it's trying and the configuration status
2. **Verify Environment Variables**: Check that all variables are loaded (console will show ✓ or ✗)
3. **Test API Manually**: Try making a request to Akool's API using Postman or curl to verify:
   - The endpoint exists
   - Your credentials work
   - The request format is correct
4. **Check Akool Documentation**: Review Akool's official API documentation for:
   - Correct base URL
   - Correct endpoint paths
   - Correct request/response formats
   - Authentication method

## Getting Help

If you're still having issues:

1. Check the browser console for detailed error messages
2. Check the Network tab to see the exact request/response
3. Verify your Akool account credentials
4. Contact Akool support with:
   - The endpoint you're trying to use
   - The error message
   - Your account details (if appropriate)
