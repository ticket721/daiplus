const ethers = require('ethers');
const config = require('../truffle-config');

const getEthersDevDaiContract = async (wallet) => {
    const devdai = artifacts.require('DevDai');
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const connected_wallet = new ethers.Wallet(wallet.privateKey, provider);
    const truffle_devdai = await devdai.deployed();

    const devdai_factory = new ethers.ContractFactory(devdai.abi, devdai.deployedBytecode, wallet, wallet);
    const devdai_ethers = await devdai_factory.attach(truffle_devdai.address);
    return devdai_ethers.connect(connected_wallet)
};

const domain = (address) => {

    let name = 'DaiPlus Meta-Stablecoin v1.0';

    if (config.extra_config && config.extra_config.external_modules && config.extra_config.external_modules.daiplus) {
        const arguments = config.extra_config.external_modules.daiplus.arguments;
        if (arguments !== null) {
            name = arguments[0];
        }
    }

    return {
        name,
        version: '1',
        chainId: 1,
        verifyingContract: address
    }
};

const snapshot = () => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_snapshot',
            params: [],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const revert = (snap_id) => {
    return new Promise((ok, ko) => {
        web3.currentProvider.send({
            method: 'evm_revert',
            params: [snap_id],
            jsonrpc: '2.0',
            id: new Date().getTime()
        }, (error, res) => {
            if (error) {
                return ko(error);
            } else {
                ok(res.result);
            }
        })
    })
};

const ZERO = '0x0000000000000000000000000000000000000000';
const ZEROSIG = `0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`

const display_state = async (title, accounts, daiplus, devdai) => {

    if (process.env.VERBOSE) {

        console.log(title);

        accounts.push([daiplus.address, 'Dai+']);

        for (const account of accounts) {
            console.log(`Accounts ${account[0]} : ${account[1]}`);
            console.log(`  Ethers: ${web3.utils.fromWei(await web3.eth.getBalance(account[0]), 'ether')}`);
            console.log(`  Dai+ Tokens: ${await daiplus.balanceOf(account[0])}`);
            console.log(`  DevDai Tokens: ${await devdai.balanceOf(account[0])}`);
            console.log(`  Nonce: ${await daiplus.nonceOf(account[0])}`);
            console.log('  Allowances');
            for (const allowance_accounts of accounts) {
                if (allowance_accounts[0] !== account[0]) {
                    console.log(`    ${allowance_accounts[0]} is allowed to use ${await daiplus.allowance(account[0], allowance_accounts[0])} tokens`)
                }
            }
            console.log();
        }
    }

}

module.exports = {
    display_state,
    ZERO,
    ZEROSIG,
    revert,
    snapshot,
    domain,
    getEthersDevDaiContract
}
