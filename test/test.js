const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const {revert, snapshot} = require('../test_cases/utils');
chai.use(chaiAsPromised);

const {erc165_interfaces_check} = require('../test_cases/erc165_interfaces_check');
const {backer_address_check} = require('../test_cases/backer_address_check');
const {mtransfer} = require('../test_cases/mtransfer');
const {mtransfer_invalid_signature} = require('../test_cases/mtransfer_invalid_signature');
const {mapprove} = require('../test_cases/mapprove');
const {mapprove_invalid_signature} = require('../test_cases/mapprove_invalid_signature');
const {mtransferfrom} = require('../test_cases/mtransferfrom');
const {mtransferfrom_invalid_signature} = require('../test_cases/mtransferfrom_invalid_signature');
const {wrap_unwrap} = require('../test_cases/wrap_unwrap');
const {mtransfer_unwrap} = require('../test_cases/mtransfer_unwrap');
const {mtransferfrom_unwrap} = require('../test_cases/mtransferfrom_unwrap');
const {mtransferfrom_unwrap_transfer} = require('../test_cases/mtransferfrom_unwrap_transfer');
const {mtransferfrom_wrap} = require('../test_cases/mtransferfrom_wrap');
const {mtransferfrom_wrap_transfer} = require('../test_cases/mtransferfrom_wrap_transfer');
const {transfer_unwrap} = require('../test_cases/transfer_unwrap');
const {transferfrom_unwrap} = require('../test_cases/transferfrom_unwrap');
const {transferfrom_unwrap_transfer} = require('../test_cases/transferfrom_unwrap_transfer');
const {transferfrom_wrap} = require('../test_cases/transferfrom_wrap');
const {transferfrom_wrap_transfer} = require('../test_cases/transferfrom_wrap_transfer');
const {mtransfer_invalid_nonce} = require('../test_cases/mtransfer_invalid_nonce');
const {mtransfer_replay_attack} = require('../test_cases/mtransfer_replay_attack');
const {mtransfer_gasprice_too_low} = require('../test_cases/mtransfer_gasprice_too_low');
const {mtransfer_gaslimit_too_low} = require('../test_cases/mtransfer_gaslimit_too_low');
const {mtransfer_specific_relayer} = require('../test_cases/mtransfer_specific_relayer');
const {mtransfer_invalid_specific_relayer} = require('../test_cases/mtransfer_invalid_specific_relayer');
const {mtransfer_invalid_signature_length} = require('../test_cases/mtransfer_invalid_signature_length');
const {mtransfer_invalid_signature_v} = require('../test_cases/mtransfer_invalid_signature_v');
const {transferfrom} = require('../test_cases/transferfrom');
const {transfer} = require('../test_cases/transfer');

const expect = chai.expect;
contract('daiplus', (accounts) => {

    before(async () => {
        this.snap_id = await snapshot();
    });

    beforeEach(async () => {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    it('supportsInterface 0x6941bcc3 (daiplus) & 0x01ffc9a7 (ERC-165) & 0x36372b07 (ERC-20) & 0x06fdde03 (ERC-20::name) & 0x95d89b41 (ERC-20::symbol) & 0x313ce567 (ERC-20::decimals)',
        erc165_interfaces_check.bind(null, accounts, expect));
    it('getBacker',
        backer_address_check.bind(null, accounts, expect));
    it('mTransfer',
        mtransfer.bind(null, accounts, expect));
    it('mTransfer with invalid signature',
        mtransfer_invalid_signature.bind(null, accounts, expect));
    it('mApprove',
        mapprove.bind(null, accounts, expect));
    it('mApprove with invalid signature',
        mapprove_invalid_signature.bind(null, accounts, expect));
    it('mTransferFrom',
        mtransferfrom.bind(null, accounts, expect));
    it('mTransferFrom with invalid signature',
        mtransferfrom_invalid_signature.bind(null, accounts, expect));
    it('wrap + unwrap',
        wrap_unwrap.bind(null, accounts, expect));
    it('mTransfer to unwrap',
        mtransfer_unwrap.bind(null, accounts, expect));
    it('mTransferFrom to unwrap',
        mtransferfrom_unwrap.bind(null, accounts, expect));
    it('mTransferFrom to unwrap + transfer',
        mtransferfrom_unwrap_transfer.bind(null, accounts, expect));
    it('mTransferFrom to wrap',
        mtransferfrom_wrap.bind(null, accounts, expect));
    it('mTransferFrom to wrap + transfer',
        mtransferfrom_wrap_transfer.bind(null, accounts, expect));
    it('transfer to unwrap',
        transfer_unwrap.bind(null, accounts, expect));
    it('transferFrom to unwrap',
        transferfrom_unwrap.bind(null, accounts, expect));
    it('transferFrom to unwrap + transfer',
        transferfrom_unwrap_transfer.bind(null, accounts, expect));
    it('transferFrom to wrap',
        transferfrom_wrap.bind(null, accounts, expect));
    it('transferFrom to wrap + transfer',
        transferfrom_wrap_transfer.bind(null, accounts, expect));
    it('mTransfer with invalid nonce',
        mtransfer_invalid_nonce.bind(null, accounts, expect));
    it('mTransfer replay attack',
        mtransfer_replay_attack.bind(null, accounts, expect));
    it('mTransfer gasPrice too low',
        mtransfer_gasprice_too_low.bind(null, accounts, expect));
    it('mTransfer gasLimit too low',
        mtransfer_gaslimit_too_low.bind(null, accounts, expect));
    it('mTransfer with specific relayer',
        mtransfer_specific_relayer.bind(null, accounts, expect));
    it('mTransfer with invalid specific relayer',
        mtransfer_invalid_specific_relayer.bind(null, accounts, expect));
    it('mTransfer with invalid signature length',
        mtransfer_invalid_signature_length.bind(null, accounts, expect));
    it('mTransfer with invalid signature v',
        mtransfer_invalid_signature_v.bind(null, accounts, expect));
    it('transferFrom',
        transferfrom.bind(null, accounts, expect));
    it('transfer',
        transfer.bind(null, accounts, expect));

});
