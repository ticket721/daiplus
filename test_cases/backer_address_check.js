module.exports = {
    backer_address_check: async function backer_address_check(accounts, expect) {
        const daiplus = artifacts.require('DaiPlus');
        const devdai = artifacts.require('DevDai');

        const daiplus_instance = await daiplus.deployed();
        const devdai_instance = await devdai.deployed();

        expect(daiplus_instance.getBacker()).to.eventually.equal(devdai_instance.address);

    }
}
