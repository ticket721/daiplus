module.exports = {
    transferfrom_wrap: async function transferfrom_wrap(accounts, expect) {

        // Recover Dai+ Contract Instance from artifacts
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        // Recover DevDai Contract Instance from artifacts
        const devdai = artifacts.require('DevDai');
        const devdai_instance = await devdai.deployed();

        // Setup constant values
        const to = daiplus_instance.address;
        const amount = 1000000;

        // Give amount DevDai to accounts[0]
        await devdai_instance.test__mint(accounts[0], amount, { from: accounts[0] });
        // Approve DaiPlus for amount
        await devdai_instance.approve(daiplus_instance.address, amount, { from: accounts[0] });

        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);

        // Wrap for wallet.address amount tokens. Called by accounts[0]
        await daiplus_instance.transferFrom(to, accounts[0], amount, { from: accounts[0] });

        expect((await devdai_instance.balanceOf(accounts[0])).toNumber()).to.equal(0);
        expect((await devdai_instance.balanceOf(to)).toNumber()).to.equal(amount);

        expect((await daiplus_instance.balanceOf(accounts[0])).toNumber()).to.equal(amount);


    }
}
