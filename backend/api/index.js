// Import the Express app and expose it as a (req, res) handler for Vercel
const app = require('../index.js');
module.exports = (req, res) => app(req, res);
