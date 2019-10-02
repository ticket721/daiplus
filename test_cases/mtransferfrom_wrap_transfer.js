const {ERC2280Signer} = require('@ticket721/e712');
const ethers = require('ethers');
const {ZERO, display_state, domain, getEthersDevDaiContract} = require('./utils');

module.exports = {
    mtransferfrom_wrap_transfer: async function mtransferfrom_wrap_transfer(accounts, expect) {

        // Recover Dai+ Contract Instance from artifacts
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        // Recover DevDai Contract Instance from artifacts
        const devdai = artifacts.require('DevDai');
        const devdai_instance = await devdai.deployed();

        // Setup constant values
        const domain_value = domain(daiplus_instance.address);
        const wallet = ethers.Wallet.createRandom();
        const devdai_ethers = await getEthersDevDaiContract(wallet);
        const from = daiplus_instance.address;
        const to = accounts[0];
        const signer = wallet.address;
        const gasPrice = 1000000;
        const reward = 100000;
        const amount = 1234;
        // Setup ERC712 signer
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);

        // Prepare payload data
        const mTransferFromPayload = {
            sender: from,
            recipient: to,
            amount,

            actors: {
                signer,
                relayer: ZERO
            },

            txparams: {
                nonce: parseInt(await daiplus_instance.nonceOf(wallet.address)),
                gasLimit: 1000000,
                gasPrice,
                reward,
            }

        };

        // Generate signature with helper
        const signature = await daiplus_signer.transferFrom(
            mTransferFromPayload.sender,
            mTransferFromPayload.recipient,
            mTransferFromPayload.amount,
            mTransferFromPayload.actors,
            mTransferFromPayload.txparams,
            wallet.privateKey
        );

        // Verify signature with helper
        const verification = await daiplus_signer.verifyTransferFrom(
            mTransferFromPayload.sender,
            mTransferFromPayload.recipient,
            mTransferFromPayload.amount,
            mTransferFromPayload.actors,
            mTransferFromPayload.txparams,
            signature.hex
        );

        expect(verification).to.equal(true);

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        await web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: web3.utils.toWei('1', 'ether')});

        await devdai_instance.test__mint(wallet.address, amount + reward, {from: accounts[0]});
        await devdai_ethers.functions.approve(daiplus_instance.address, amount + reward);

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(amount + reward);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        await display_state('BEFORE signedTransferFrom META-TRANSACTION',
            [
                [wallet.address, 'Signer'],
                [accounts[0], 'Relayer & Recipient']
            ], daiplus_instance, devdai_instance);

        // Execute Constant verifier
        const res = await daiplus_instance.verifyTransferFrom(
            [
                mTransferFromPayload.actors.signer,
                mTransferFromPayload.actors.relayer,
                mTransferFromPayload.sender,
                mTransferFromPayload.recipient
            ],

            [
                mTransferFromPayload.txparams.nonce,
                mTransferFromPayload.txparams.gasLimit,
                mTransferFromPayload.txparams.gasPrice,
                mTransferFromPayload.txparams.reward,
                mTransferFromPayload.amount
            ],

            signature.hex
            , {from: accounts[0], gasPrice});

        expect(res).to.equal(true);

        // Execute Meta Transaction
        await daiplus_instance.signedTransferFrom(
            [
                mTransferFromPayload.actors.signer,
                mTransferFromPayload.actors.relayer,
                mTransferFromPayload.sender,
                mTransferFromPayload.recipient
            ],

            [
                mTransferFromPayload.txparams.nonce,
                mTransferFromPayload.txparams.gasLimit,
                mTransferFromPayload.txparams.gasPrice,
                mTransferFromPayload.txparams.reward,
                mTransferFromPayload.amount
            ],

            signature.hex
            , {from: accounts[0], gasPrice});

        await display_state('AFTER signedTransferFrom META-TRANSACTION',
            [
                [wallet.address, 'Signer'],
                [accounts[0], 'Relayer & Recipient']
            ], daiplus_instance, devdai_instance);

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(amount + reward);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(reward + amount);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);


    }
}
