const express = require('express');
const axios = require('axios');
const app = express();
const port = 9876;

let window = [];
const windowSize = 10;
let authToken = null;

// Registration data
const registrationData = {
    companyName: "EaseGo",
    ownerName: "Ashmit",
    rollNo: "2100271530025",
    ownerEmail: "ashmittyagi8@gmail.com",
    accessCode: "EKDLjg" // Assuming access code is the same for all registrations
};

// Authorization data
const authorizationData = {
    companyName: "EaseGo",
    clientID: "c2e2d451-4bee-4e1c-9cdb-27338470d860",
    clientSecret: "UazgPArZplrfQACK",
    ownerName: "Ashmit",
    ownerEmail: "ashmittyagi8@gmail.com",
    rollNo: "2100271530025"
};

// Register with the test server
async function register() {
    try {
        const response = await axios.post('http://20.244.56.144/test/register', registrationData);
        console.log('Registration successful:', response.data);
        return response.data;
    } catch (error) {
        // If registration fails due to conflict (409), return the existing registration data
        if (error.response && error.response.status === 409) {
            console.log('Registration already exists:', error.response.data);
            return error.response.data;
        }
        throw new Error(`Registration failed: ${error.message}`);
    }
}

// Obtain authorization token
async function getAuthToken() {
    try {
        const response = await axios.post('http://20.244.56.144/test/auth', authorizationData);
        console.log('Authorization successful:', response.data);
        authToken = response.data['access_token'];
        return authToken;
    } catch (error) {
        throw new Error(`Authorization failed: ${error.message}`);
    }
}

// Middleware to ensure authorization before each request
app.use(async (req, res, next) => {
    try {
        if (!authToken) {
            const registrationResponse = await register();
            if (registrationResponse.clientID && registrationResponse.clientSecret) {
                authorizationData.clientID = registrationResponse.clientID;
                authorizationData.clientSecret = registrationResponse.clientSecret;
            }
            await getAuthToken();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to fetch numbers based on type
app.get('/numbers/:type', async (req, res) => {
    const { type } = req.params;
    let url;

    switch (type) {
        case 'p':
            url = 'http://20.244.56.144/test/primes';
            break;
        case 'f':
            url = 'http://20.244.56.144/test/fibo';
            break;
        case 'e':
            url = 'http://20.244.56.144/test/even';
            break;
        case 'r':
            url = 'http://20.244.56.144/test/rand';
            break;
        default:
            return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        const response = await axios.get(url, { 
            headers: {
                Authorization: `Bearer ${authToken}`
            },
            timeout: 500
        });
        const newNumbers = response.data.numbers;
        const prevWindow = [...window];

        window = [...new Set([...window, ...newNumbers])];
        if (window.length > windowSize) {
            window = window.slice(window.length - windowSize);
        }

        const average = window.reduce((sum, num) => sum + num, 0) / window.length;

        res.json({
            numbers: newNumbers,
            windowPrevState: prevWindow,
            windowCurrState: window,
            avg: average.toFixed(2)
        });
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return res.status(500).json({ error: 'Request timeout' });
        }
        return res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
