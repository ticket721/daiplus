
// Initial Configuration
const config = {
    compilers: {
        solc: {
            version: "0.5.7",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
            }
        },
    },
    plugins: ["solidity-coverage"],
    mocha: {
        
    }
};

try {
    const outter_config = require('../../prism');
    module.exports = {
        ...config,
        ...outter_config,
        plugins: [
            ...config.plugins,
            ...(outter_config.plugins || [])
        ]
    };
} catch (e) {
    console.log('Prism loading failed. No worries, default configuration is used !');
    module.exports = config;
}

