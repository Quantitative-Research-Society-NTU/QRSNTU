const path = require('node:path');

module.exports = {
    content: [path.join(__dirname, '../site/**/*.{html,js}')],
    theme: { extend: {} },
    plugins: [],
};
