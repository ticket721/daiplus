const DaiPlus = artifacts.require("DaiPlus");
const DevDai = artifacts.require("DevDai");
const config = require('../truffle-config');

module.exports = async function(deployer) {
    let dai_contract_address = null;

    let name = "DaiPlus Meta-Stablecoin v1.0";
    let symbol = 'Dai+';
    let decimal = 18;

    if (config.args) {
        const args = config.args;
        if (args !== null) {
            console.log('Build arguments provided in config');
            name = args.ERC20.name;
            symbol = args.ERC20.symbol;
            decimal = args.ERC20.decimals;
            if (args.DaiAddress) {
                dai_contract_address = args.DaiAddress;
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
