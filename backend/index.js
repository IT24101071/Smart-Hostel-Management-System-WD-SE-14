const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Crucial for allowing your app to talk to the server
app.use(express.json());

app.get('/', (req, res) => res.send('API is running!'));

app.listen(3000, () => console.log('Server on port 3000'));