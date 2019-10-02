const {ERC2280Signer} = require('@ticket721/e712');
const ethers = require('ethers');
const {ZERO, display_state, domain} = require('./utils');

module.exports = {
    mtransferfrom: async function mtransferfrom(accounts, expect) {

        // Recover Dai+ Contract Instance from artifacts
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        // Recover DevDai Contract Instance from artifacts
        const devdai = artifacts.require('DevDai');
        const devdai_instance = await devdai.deployed();

        // Setup constant values
        const domain_value = domain(daiplus_instance.address);
        const wallet = ethers.Wallet.createRandom();
        const from = accounts[0];
        const to = accounts[1];
        const signer = wallet.address;
        const gasPrice = 1000000;
        // Setup ERC712 signer
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);

        // Prepare payload data
        const mTransferFromPayload = {
            sender: from,
            recipient: to,
            amount: 1234,

            actors: {
                signer,
                relayer: ZERO
            },

            txparams: {
                nonce: parseInt(await daiplus_instance.nonceOf(wallet.address)),
                gasLimit: 1000000,
                gasPrice,
                reward: 100000,
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
        expect((await devdai_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        const signer_amount = 100000;
        // Give signer_amount DevDai to accounts[0]
        await devdai_instance.test__mint(accounts[0], signer_amount, {from: accounts[0]});
        // Approve DaiPlus for signer_amount
        await devdai_instance.approve(daiplus_instance.address, signer_amount, {from: accounts[0]});

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(signer_amount);
        expect((await devdai_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        // Wrap for wallet.address signer_amount tokens. Called by accounts[0]
        await daiplus_instance.wrap(wallet.address, signer_amount, {from: accounts[0]});

        const relayer_amount = 1234;
        // Give relayer_amount DevDai to accounts[0]
        await devdai_instance.test__mint(accounts[0], relayer_amount, {from: accounts[0]});
        // Approve DaiPlus for relayer_amount
        await devdai_instance.approve(daiplus_instance.address, relayer_amount, {from: accounts[0]});

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(relayer_amount);
        expect((await devdai_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(signer_amount);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(signer_amount);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        // Wrap for accounts[0] relayer_amount tokens. Called by accounts[0]
        await daiplus_instance.wrap(accounts[0], relayer_amount, {from: accounts[0]});

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(signer_amount + relayer_amount);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(signer_amount);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(relayer_amount);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        // Approve wallet.address for relayer_amount. Called by accounts[0]
        await daiplus_instance.approve(wallet.address, relayer_amount, {from: accounts[0]});

        expect((await daiplus_instance.allowance(accounts[0], wallet.address)).toNumber()).to.equal(relayer_amount);

        await display_state('BEFORE signedTransferFrom META-TRANSACTION',
            [
                [wallet.address, 'Signer'],
                [accounts[0], 'Sender'],
                [accounts[1], 'Recipient'],
                [accounts[2], 'Relayer']
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
            , {from: accounts[2], gasPrice});

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
            , {from: accounts[2], gasPrice});

        await display_state('AFTER signedTransferFrom META-TRANSACTION',
            [
                [wallet.address, 'Signer'],
                [accounts[0], 'Sender'],
                [accounts[1], 'Recipient'],
                [accounts[2], 'Relayer']
            ], daiplus_instance, devdai_instance);

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[2])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(signer_amount + relayer_amount);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(relayer_amount);
        expect((await daiplus_instance.balanceOf(accounts[2])).toNumber()).to.equal(signer_amount);
        expect((await daiplus_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);

        expect((await daiplus_instance.allowance(accounts[0], wallet.address)).toNumber()).to.equal(0);


    }
}
