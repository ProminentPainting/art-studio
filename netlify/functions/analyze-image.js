// In file: netlify/functions/analyze-image.js

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { GEMINI_API_KEY } = process.env;

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }) };
    }

    try {
        const { imageBase64, prompt } = JSON.parse(event.body);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
                ]
            }],
            generation_config: { response_mime_type: "application/json" }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error("Gemini API Error:", errorBody);
            throw new Error("The AI model failed to process the request.");
        }

        const result = await apiResponse.json();

        if (result.candidates?.[0]?.content?.parts?.[0]) {
             return {
                statusCode: 200,
                // The response from Gemini is a JSON string, which we pass directly.
                body: result.candidates[0].content.parts[0].text
            };
        } else {
             console.error("Unexpected API response structure:", result);
             throw new Error("Could not parse the analysis from the API response.");
        }

    } catch (error) {
        console.error('Serverless function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'An internal server error occurred.' })
        };
    }
};
