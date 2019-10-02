const {display_state} = require('./utils');

module.exports = {
    wrap_unwrap: async function wrap_unwrap(accounts, expect) {

        // Recover Dai+ Contract Instance from artifacts
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        // Recover DevDai Contract Instance from artifacts
        const devdai = artifacts.require('DevDai');
        const devdai_instance = await devdai.deployed();

        // Give tokens to signer balance
        const amount = 100000;
        await devdai_instance.test__mint(accounts[0], amount, {from: accounts[0]});

        await display_state('BEFORE wrap',
            [
                [accounts[0], 'User']
            ], daiplus_instance, devdai_instance);

        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);

        await devdai_instance.approve(daiplus_instance.address, amount, {from: accounts[0]});
        await daiplus_instance.wrap(accounts[0], amount, {from: accounts[0]});

        await display_state('AFTER wrap',
            [
                [accounts[0], 'User']
            ], daiplus_instance, devdai_instance);

        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(amount);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);

        await daiplus_instance.unwrap(accounts[0], amount, {from: accounts[0]});

        await display_state('AFTER unwrap',
            [
                [accounts[0], 'User']
            ], daiplus_instance, devdai_instance);

        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(daiplus_instance.address)).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);

    }
}
