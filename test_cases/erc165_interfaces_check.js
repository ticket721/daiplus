module.exports = {
    erc165_interfaces_check: async function erc165_interfaces_check(accounts, expect) {
        const daiplus = artifacts.require('DaiPlus');
        const daiplus_instance = await daiplus.deployed();

        expect(await daiplus_instance.supportsInterface('0x25961920')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x01ffc9a7')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x36372b07')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x06fdde03')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x95d89b41')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x313ce567')).to.equal(true);
    }
}
