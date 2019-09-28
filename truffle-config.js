
// Initial Configuration
const config = {
    compilers: {
        solc: {
            version: "0.5.7"
        }
    },
    plugins: ["solidity-coverage"]
};

try {
    const outter_config = require('../../prism');
    module.exports = {
        ...config,
        ...outter_config
    };
} catch (e) {
    module.exports = config;
}

