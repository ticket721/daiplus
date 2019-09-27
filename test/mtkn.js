const {ERC2280Signer} = require('@ticket721/e712');
const ethers = require('ethers');

// Helper to generate domain
const domain = (address) => ({
    name: 'DaiPlus Meta-Stablecoin v1.0',
    version: '1',
    chainId: 1,
    verifyingContract: address
});

// Ganache method to create a snapshot of current blockchain state
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

// Revert the state of the blockchain to previously saved snapshot
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

const display_state = async (accounts, daiplus) => {

    for (const account of accounts) {
        console.log(`Accounts ${account[0]} : ${account[1]}`);
        console.log(`  Ethers: ${web3.utils.fromWei(await web3.eth.getBalance(account[0]), 'ether')}`);
        console.log(`  Tokens: ${await daiplus.balanceOf(account[0])}`);
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

contract('daiplus', (accounts) => {

    before(async () => {
        this.snap_id = await snapshot();
    });

    beforeEach(async () => {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    it('supportsInterface 0x6941bcc3 (daiplus) & 0x01ffc9a7 (ERC-165) & 0x36372b07 (ERC-20) & 0x06fdde03 (ERC-20::name) & 0x95d89b41 (ERC-20::symbol) & 0x313ce567 (ERC-20::decimals)', async () => {
        const daiplus= artifacts.require('DaiPlus');
        const daiplus_instance= await daiplus.deployed();

        expect(await daiplus_instance.supportsInterface('0x6941bcc3')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x01ffc9a7')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x36372b07')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x06fdde03')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x95d89b41')).to.equal(true);
        expect(await daiplus_instance.supportsInterface('0x313ce567')).to.equal(true);

    });

    it('mTransfer', async () => {
        const daiplus= artifacts.require('DaiPlus');
        const daiplus_instance= await daiplus.deployed();

        const domain_value = domain(daiplus_instance.address);
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);
        const wallet = ethers.Wallet.createRandom();
        const to = accounts[0];
        const gasPrice = 1000000;

        // Prepare payload data
        const mTransferPayload = {
            recipient: to,
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
        const signature = await daiplus_signer.transfer(
            mTransferPayload.recipient,
            mTransferPayload.amount,
            mTransferPayload.actors,
            mTransferPayload.txparams,
            wallet.privateKey
        );

        // Verify signature with helper
        const verification = await daiplus_signer.verifyTransfer(
            mTransferPayload.recipient,
            mTransferPayload.amount,
            mTransferPayload.actors,
            mTransferPayload.txparams,
            signature.hex
        );

        expect(verification).to.equal(true);

        // Give tokens to signer balance
        await daiplus_instance.test__mint(wallet.address, 1000000);

        console.log('BEFORE signedTransfer META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Recipient'],
            [accounts[1], 'Relayer']
        ], daiplus_instance);

        // Execute Constant verifier
        const res = await daiplus_instance.verifyTransfer(

            [
                mTransferPayload.actors.signer,
                mTransferPayload.actors.relayer,
                mTransferPayload.recipient
            ],

            [
                mTransferPayload.txparams.nonce,
                mTransferPayload.txparams.gasLimit,
                mTransferPayload.txparams.gasPrice,
                mTransferPayload.txparams.reward,
                mTransferPayload.amount
            ],

            signature.hex
            , {from: accounts[1], gasPrice});

        expect(res).to.equal(true);

        // Execute Meta Transaction
        await daiplus_instance.signedTransfer(

            [
                mTransferPayload.actors.signer,
                mTransferPayload.actors.relayer,
                mTransferPayload.recipient
            ],

            [
                mTransferPayload.txparams.nonce,
                mTransferPayload.txparams.gasLimit,
                mTransferPayload.txparams.gasPrice,
                mTransferPayload.txparams.reward,
                mTransferPayload.amount
            ],

            signature.hex
            , {from: accounts[1], gasPrice});

        console.log('AFTER signedTransfer META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Recipient'],
            [accounts[1], 'Relayer']
        ], daiplus_instance);

    });

    it('mApprove', async () => {
        const daiplus= artifacts.require('DaiPlus');
        const daiplus_instance= await daiplus.deployed();

        const domain_value = domain(daiplus_instance.address);
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);
        const wallet = ethers.Wallet.createRandom();
        const to = accounts[0];
        const gasPrice = 1000000;

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

        // Give tokens to signer balance
        await daiplus_instance.test__mint(wallet.address, 1000000);

        console.log('BEFORE signedApprove META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Spender'],
            [accounts[1], 'Relayer']
        ], daiplus_instance);

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

        console.log('AFTER signedApprove META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Spender'],
            [accounts[1], 'Relayer']
        ], daiplus_instance);

    });

    it('mTransferFrom', async () => {

        // 1. Build the Contract to recover informations and send meta-transactions
        const daiplus= artifacts.require('DaiPlus');
        const daiplus_instance= await daiplus.deployed();

        const domain_value = domain(daiplus_instance.address);
        const daiplus_signer = new ERC2280Signer(domain_value.name, domain_value.version, domain_value.chainId, domain_value.verifyingContract);
        const wallet = ethers.Wallet.createRandom();
        const from = accounts[0];
        const to = accounts[1];
        const signer = wallet.address;
        const gasPrice = 1000000;

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

        // Give tokens to signer balance
        await daiplus_instance.test__mint(accounts[0], 1234);
        await daiplus_instance.test__mint(wallet.address, 100000);
        await daiplus_instance.approve(wallet.address, 1234, {from: accounts[0]});

        console.log('BEFORE signedTransferFrom META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Sender'],
            [accounts[1], 'Recipient'],
            [accounts[2], 'Relayer']
        ], daiplus_instance);

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

        console.log('AFTER signedTransferFrom META-TRANSACTION');
        await display_state([
            [wallet.address, 'Signer'],
            [accounts[0], 'Sender'],
            [accounts[1], 'Recipient'],
            [accounts[2], 'Relayer']
        ], daiplus_instance);

    });

});
