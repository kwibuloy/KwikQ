import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 5000;

createApp().listen(PORT, () => {
    console.log(`KwikQ API listening on port ${PORT}`);
});
