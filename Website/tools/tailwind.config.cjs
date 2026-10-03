const path = require('node:path');

module.exports = {
    content: [path.join(__dirname, '../v1/**/*.{html,js}')],
    theme: { extend: {} },
    plugins: [],
};
