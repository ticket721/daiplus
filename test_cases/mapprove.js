const {ERC2280Signer} = require('@ticket721/e712');
const ethers = require('ethers');
const {ZERO, display_state, domain} = require('./utils');

module.exports = {
    mapprove: async function mapprove(accounts, expect) {

        // Recover Dai+ Contract Instance from artifacts
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        // Recover DevDai Contract Instance from artifacts
        const devdai = artifacts.require('DevDai');
        const devdai_instance = await devdai.deployed();

        // Setup constant values
        const domain_value = domain(daiplus_instance.address);
        const wallet = ethers.Wallet.createRandom();
        const to = accounts[0];
        const gasPrice = 1000000;

        // Setup ERC712 signer
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);

        // Prepare payload data
        const mApprovePayload = {
            spender: to,
            amount: 1234,

            actors: {
                signer: wallet.address,
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
        const signature = await daiplus_signer.approve(
            mApprovePayload.spender,
            mApprovePayload.amount,
            mApprovePayload.actors,
            mApprovePayload.txparams,
            wallet.privateKey
        );

        // Verify signature with helper
        const verification = await daiplus_signer.verifyApprove(
            mApprovePayload.spender,
            mApprovePayload.amount,
            mApprovePayload.actors,
            mApprovePayload.txparams,
            signature.hex
        );

        expect(verification).to.equal(true);

        const amount = 1000000;
        // Give amount DevDai to accounts[0]
        await devdai_instance.test__mint(accounts[0], amount, {from: accounts[0]});
        // Approve DaiPlus for amount
        await devdai_instance.approve(daiplus_instance.address, amount, {from: accounts[0]});

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);

        // Wrap for wallet.address amount tokens. Called by accounts[0]
        await daiplus_instance.wrap(wallet.address, amount, {from: accounts[0]});

        expect((await devdai_instance.balanceOf(wallet.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(to)).toNumber()).to.equal(0);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(amount);
        expect((await daiplus_instance.balanceOf(to)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(0);

        await display_state('BEFORE signedApprove META-TRANSACTION',
            [
                [wallet.address, 'Signer'],
                [accounts[0], 'Spender'],
                [accounts[1], 'Relayer']
            ], daiplus_instance, devdai_instance);

        // Execute Constant verifier
        const res = await daiplus_instance.verifyApprove(
            [
                mApprovePayload.actors.signer,
                mApprovePayload.actors.relayer,
                mApprovePayload.spender
            ],

            [
                mApprovePayload.txparams.nonce,
                mApprovePayload.txparams.gasLimit,
                mApprovePayload.txparams.gasPrice,
                mApprovePayload.txparams.reward,
                mApprovePayload.amount
            ],

            signature.hex
            , {from: accounts[1], gasPrice});

        expect(res).to.equal(true);

        // Execute Meta Transaction
        await daiplus_instance.signedApprove(
            [
                mApprovePayload.actors.signer,
                mApprovePayload.actors.relayer,
                mApprovePayload.spender
            ],

            [
                mApprovePayload.txparams.nonce,
                mApprovePayload.txparams.gasLimit,
                mApprovePayload.txparams.gasPrice,
                mApprovePayload.txparams.reward,
                mApprovePayload.amount
            ],

            signature.hex
            , {from: accounts[1], gasPrice});

        await display_state('AFTER signedApprove META-TRANSACTION', [
            [wallet.address, 'Signer'],
            [accounts[0], 'Spender'],
            [accounts[1], 'Relayer']
        ], daiplus_instance, devdai_instance);

        expect((await daiplus_instance.balanceOf(wallet.address)).toNumber()).to.equal(amount - 100000);
        expect((await daiplus_instance.balanceOf(to)).toNumber()).to.equal(0);
        expect((await daiplus_instance.balanceOf(accounts[1])).toNumber()).to.equal(100000);

        expect((await daiplus_instance.allowance(wallet.address, to)).toNumber()).to.equal(1234);
        expect((await daiplus_instance.allowance(wallet.address, accounts[1])).toNumber()).to.equal(0);

    }
}
