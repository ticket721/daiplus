const DaiPlus = artifacts.require("DaiPlus");
const DevDai = artifacts.require("DevDai");
const config = require('../truffle-config');

module.exports = async function(deployer) {
    let dai_contract_address = null;

    let name = "DaiPlus Meta-Stablecoin v1.0";
    let symbol = 'Dai+';
    let decimal = 18;

    if (config.extra_config && config.extra_config.external_modules && config.extra_config.external_modules.daiplus) {
        const arguments = config.extra_config.external_modules.daiplus.arguments;
        if (arguments !== null) {
            console.log('Build arguments provided in config');
            name = arguments[0];
            symbol = arguments[1];
            decimal = arguments[2];
            if (arguments[3]) {
                dai_contract_address = arguments[3];
            }
        }
    }

    if (dai_contract_address === null) {
        console.log('No erc-20 to wrap provided in config, deploying mock erc-20');
        await deployer.deploy(DevDai);
        dai_contract_address = DevDai.address;
    }

    await deployer.deploy(DaiPlus, name, symbol, decimal, dai_contract_address);
};
