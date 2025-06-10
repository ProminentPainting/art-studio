// file: netlify/functions/analyze-image.js

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { IMAGGA_API_KEY, IMAGGA_API_SECRET } = process.env;

    if (!IMAGGA_API_KEY || !IMAGGA_API_SECRET) {
        const errorMessage = 'API key or secret is not configured correctly on the server.';
        console.error(errorMessage);
        return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);
        const formData = new FormData();
        formData.append('image_base64', imageBase64);
        const authHeader = 'Basic ' + btoa(IMAGGA_API_KEY + ':' + IMAGGA_API_SECRET);

        const [tagsResponse, colorsResponse] = await Promise.all([
            fetch('https://api.imagga.com/v2/tags', {
                method: 'POST',
                headers: { 'Authorization': authHeader },
                body: formData
            }),
            fetch('https://api.imagga.com/v2/colors', {
                method: 'POST',
                headers: { 'Authorization': authHeader },
                body: formData
            })
        ]);

        if (!tagsResponse.ok || !colorsResponse.ok) {
            const errorText = !tagsResponse.ok ? await tagsResponse.text() : await colorsResponse.text();
            console.error('Imagga API Error:', errorText);
            throw new Error(`The API provider returned an error. Please check your keys.`);
        }

        const tagsData = await tagsResponse.json();
        const colorsData = await colorsResponse.json();

        return {
            statusCode: 200,
            body: JSON.stringify({ tags: tagsData.result.tags, colors: colorsData.result.colors })
        };

    } catch (error) {
        console.error('Serverless function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to analyze the image due to a server error.' })
        };
    }
};
