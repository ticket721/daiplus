pragma solidity >=0.5.0 <0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "erc2280/contracts/IERC2280.sol";
import "erc2280/contracts/ERC2280Domain.sol";


//  _____        _
// |  __ \      (_)  _
// | |  | | __ _ _ _| |_
// | |  | |/ _` | |_   _|
// | |__| | (_| | | |_|
// |_____/ \__,_|_|
//
contract DaiPlus is IERC2280, ERC20, ERC20Detailed, ERC2280Domain, ERC165 {

    bytes4 constant public ERC2280_ERC165_SIGNATURE = 0x6941bcc3;
    // Equivalent of the following:
    // bytes4(keccak256('nonceOf(address)')) ^
    // bytes4(keccak256('verifyTransfer(address,uint256,address[2],uint256[4],bytes)')) ^
    // bytes4(keccak256('signedTransfer(address,uint256,address[2],uint256[4],bytes)')) ^
    // bytes4(keccak256('verifyApprove(address,uint256,address[2],uint256[4],bytes)')) ^
    // bytes4(keccak256('signedApprove(address,uint256,address[2],uint256[4],bytes)')) ^
    // bytes4(keccak256('verifyTransferFrom(address,address,uint256,address[2],uint256[4],bytes)')) ^
    // bytes4(keccak256('signedTransferFrom(address,address,uint256,address[2],uint256[4],bytes)')) == 0x6941bcc3;

    IERC20 public backer;

    constructor (string memory name, string memory symbol, uint8 decimals, address _dai_address)
    ERC20Detailed(name, symbol, decimals)
    ERC2280Domain(name, "1", 1)
    ERC165()
    public {
        _registerInterface(ERC2280_ERC165_SIGNATURE);
        _registerInterface(0x36372b07); // ERC-20
        _registerInterface(0x06fdde03); // ERC-20::name
        _registerInterface(0x95d89b41); // ERC-20::symbol
        _registerInterface(0x313ce567); // ERC-20::decimals
        backer = IERC20(_dai_address);
    }

    // Public Interface

    // @notice Verifies that a transfer to `recipient` from `signer` of `amount` tokens
    //         is possible with the provided signature and with current contract state.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough
    //      tokens to spend on transfer and on reward (`balanceOf(signer) >= amount + reward`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `recipient` is the address receiving the token transfer (`actors[2]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens transferred from `signer` to `recipient` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]`, `relayer` as `actors[1]`,
    //               `recipient` as `actors[2]` in this precise order.
    //
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function verifyTransfer(address[3] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external view
    nonceBarrier(actors[0], txparams[0])
    relayerBarrier(actors[1])
    gasBarrier(gasleft(), txparams[1], txparams[2])
    returns (bool) {

        mTransfer memory mtransfer = mTransfer({

            recipient: actors[2],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })

            });

        Signature memory sig = _splitSignature(signature);

        require(verify(mtransfer, sig), "DaiPlus::verifyTransfer | invalid signer");

        // Unwrap scenario
        if (mtransfer.recipient == address(this)) {

            require(
                balanceOf(mtransfer.actors.signer)
                >= mtransfer.amount + mtransfer.txparams.reward,
                "DaiPlus::verifyTransfer | signer has not enough funds for unwrap");

        } else {
            // solhint-disable-next-line max-line-length
            require(balanceOf(actors[0]) >= txparams[4] + txparams[3], "DaiPlus::verifyTransfer | signer has not enough funds for transfer + reward");

        }


        return true;

    }

    // @notice Transfers `amount` amount of tokens to address `recipient`, and fires the Transfer event.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough
    //      tokens to spend on transfer and on reward (`balanceOf(signer) >= amount + reward`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `recipient` is the address receiving the token transfer (`actors[2]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens transferred from `signer` to `recipient` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]`, `relayer` as `actors[1]`,
    //               `recipient` as `actors[2]` in this precise order.
    //
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function signedTransfer(address[3] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external returns (bool) {

        uint256 gas_left_approximation = gasleft();

        Signature memory sig = _splitSignature(signature);

        _signedTransfer(

            mTransfer({

            recipient: actors[2],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })


            }),

            sig,

            gas_left_approximation

        );

        return true;

    }

    // @notice Verifies that an approval for `spender` of `amount` tokens on
    //         `signer`'s balance is possible with the provided signature and with current contract state.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough tokens
    //      to spend on allowance and on reward (`balanceOf(signer) >= amount + reward`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `spender` is the address being approved by `signer` (`actors[2]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens approved by `signer` to `spender` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]`, `relayer` as `actors[1]`,
    //               `spender` as `actors[2]` in this precise order.
    //
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function verifyApprove(address[3] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external view
    nonceBarrier(actors[0], txparams[0])
    relayerBarrier(actors[1])
    gasBarrier(gasleft(), txparams[1], txparams[2])
    returns (bool) {

        mApprove memory mapprove = mApprove({

            spender: actors[2],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })

            });

        Signature memory sig = _splitSignature(signature);

        require(verify(mapprove, sig), "DaiPlus::verifyApprove | invalid signer");

        // solhint-disable-next-line max-line-length
        require(balanceOf(actors[0]) >= txparams[4] + txparams[3], "DaiPlus::verifyApprove | signer has not enough funds for approval + reward");

        return true;

    }

    // @notice Approves `amount` amount of tokens from `signer`'s balance to address `spender`, and
    //         MUST fire the Approve event.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough tokens
    //      to spend on allowance and on reward (`balanceOf(signer) >= amount + reward`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `spender` is the address being approved by `signer` (`actors[2]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens approved by `signer` to `spender` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]`, `relayer` as `actors[1]`,
    //               `spender` as `actors[2]` in this precise order.
    //
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function signedApprove(address[3] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external returns (bool) {

        uint256 gas_left_approximation = gasleft();

        Signature memory sig = _splitSignature(signature);

        _signedApprove(

            mApprove({

            spender: actors[2],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })

            }),

            sig,

            gas_left_approximation

        );

        return true;
    }

    // @notice Verifies that a transfer from `sender` to `recipient` of `amount` tokens and that
    //         `signer` has at least `amount` allowance from `sender` is possible with the
    //         provided signature and with current contract state.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough tokens to spend
    //      on reward (`balanceOf(signer) >= reward`).
    //
    // @dev The function SHOULD throw if the `signer`’s account allowance from `sender` is at least `amount`
    //      (`allowance(sender, signer) >= amount`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `sender` is the account sending the tokens, and should have approved `signer` (`actors[2]`)
    // @dev `recipient` is the account receiving the tokens (`actors[3]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens transferred from `sender` to `recipient` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]` and `relayer` as `actors[1]`, `sender`
    //               as `actors[2]` and `recipient` as `actors[3]`
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function verifyTransferFrom(address[4] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external view
    nonceBarrier(actors[0], txparams[0])
    relayerBarrier(actors[1])
    gasBarrier(gasleft(), txparams[1], txparams[2])
    returns (bool) {

        mTransferFrom memory mtransfer_from = mTransferFrom({

            sender: actors[2],
            recipient: actors[3],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })

            });

        require(verify(mtransfer_from, _splitSignature(signature)), "DaiPlus::verifyTransferFrom | invalid signer");

        // Wrap Scenario
        if (mtransfer_from.sender == address(this)) {

            require(
                backer.balanceOf(mtransfer_from.actors.signer)
                >= mtransfer_from.amount + mtransfer_from.txparams.reward,
                "DaiPlus::verifyTransferFrom | signer has not enough DAI funds for wrap");

            // Unwrap Scenario
        } else if (mtransfer_from.recipient == address(this)) {

            require(
                balanceOf(mtransfer_from.actors.signer)
                >= mtransfer_from.amount + mtransfer_from.txparams.reward,
                "DaiPlus::verifyTransferFrom | signer has not enough funds for unwrap");

            // Classic transfer scenario
        } else {
            // solhint-disable-next-line max-line-length
            require(balanceOf(actors[2]) >= txparams[4], "DaiPlus::verifyTransferFrom | sender has not enough funds for transfer");
            // solhint-disable-next-line max-line-length
            require(balanceOf(actors[0]) >= txparams[3], "DaiPlus::verifyTransferFrom | signer has not enough funds for reward");

        }


        return true;
    }

    // @notice Triggers transfer from `sender` to `recipient` of `amount` tokens. `signer`
    //         MUST have at least `amount` allowance from `sender`.
    //         It MUST trigger a Transfer event.
    //
    // @dev The function MUST throw if the `mTransfer` payload signature is
    //      invalid (resulting signer is different than provided `signer`).
    //
    // @dev The function MUST throw if real `nonce` is not high enough to
    //      match the `nonce` provided in the `mTransfer` payload.
    //
    // @dev The function MUST throw if provided `gas` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload.
    //      This should be checked as soon as the function starts. (`gasleft() >= gasLimit`)
    //
    // @dev The function MUST throw if provided `gasPrice` is not high enough
    //      to match the `gasLimit` provided in the `mTransfer` payload. (`tx.gasprice >= gasPrice`)
    //
    // @dev The function MUST throw if provided `relayer` is not `address(0)` AND `relayer`
    //      is different than `msg.sender`.
    //
    // @dev The function SHOULD throw if the `signer`’s account balance does not have enough tokens to spend
    //      on reward (`balanceOf(signer) >= reward`).
    //
    // @dev The function SHOULD throw if the `signer`’s account allowance from `sender` is at least `amount`
    //      (`allowance(sender, signer) >= amount`).
    //
    // @dev `signer` is the address signing the meta transaction (`actors[0]`)
    // @dev `relayer` is the address posting the meta transaction to the contract (`actors[1]`)
    // @dev `sender` is the account sending the tokens, and should have approved `signer` (`actors[2]`)
    // @dev `recipient` is the account receiving the tokens (`actors[3]`)
    // @dev `nonce` is the meta transaction count on this specific token for `signer` (`txparams[0]`)
    // @dev `gasLimit` is the wanted gas limit, set by `signer`, should be respected by `relayer` (`txparams[1]`)
    // @dev `gasPrice` is the wanted gas price, set by `signer`, should be respected by `relayer` (`txparams[2]`)
    // @dev `reward` is the amount of tokens that are given to `relayer` from `signer` (`txparams[3]`)
    // @dev `amount` is the amount of tokens transferred from `sender` to `recipient` (`txparams[4]`)
    //
    // @param actors Array of `address`es that contains `signer` as `actors[0]` and `relayer` as `actors[1]`, `sender`
    //               as `actors[2]` and `recipient` as `actors[3]`
    // @param txparams Array of `uint256` that MUST contain `nonce` as `txparams[0]`, `gasLimit` as `txparams[1]`,
    //                 `gasPrice` as `txparams[2]`, `reward` as `txparams[3]` and `amount` as `txparams[4]`.
    //
    function signedTransferFrom(address[4] calldata actors, uint256[5] calldata txparams, bytes calldata signature)
    external returns (bool) {

        uint256 gas_left_approximation = gasleft();

        Signature memory sig = _splitSignature(signature);

        _signedTransferFrom(

            mTransferFrom({

            sender: actors[2],
            recipient: actors[3],
            amount: txparams[4],

            actors: mActors({
                signer: actors[0],
                relayer: actors[1]
                }),

            txparams: mTxParams({
                nonce: txparams[0],
                gasLimit: txparams[1],
                gasPrice: txparams[2],
                reward: txparams[3]
                })

            }),

            sig,

            gas_left_approximation

        );

        return true;
    }

    // @notice Return the current expected nonce for given `account`.
    //
    // @return The current nonce for `account`
    //
    function nonceOf(address account) external view returns (uint256) {
        return nonces[account];
    }

    // @notice Utility to retrieve backing ERC-20 contract address.
    //
    function getBacker() external view returns (address) {
        return address(backer);
    }

    // @notice Triggers wrap machanism. Caller should approve Dai+ of amount Dai. Transfer from
    //         Dai to Dai+ will be done and appropriate amount of Dai+ will be minted for user.
    //
    // @param `recipient` is the account receiving the Dai+ tokens
    // @param `amount` is the amount of tokens transferred from `msg.sender` to `recipient`
    //
    function wrap(address recipient, uint256 amount) external {
        _wrap(msg.sender, recipient, amount);
    }

    // @notice Triggers unwrap machanism. Amount of Dai+ is burned and Dai is sent to recipient.
    //
    // @param `recipient` is the account receiving the Dai tokens
    // @param `amount` is the amount of tokens transferred from `msg.sender` to `recipient`
    //
    function unwrap(address recipient, uint256 amount) external {
        _unwrap(msg.sender, recipient, amount);
    }

    //
    // @dev See `IERC20.transfer`.
    //
    // Requirements:
    //
    // - `recipient` cannot be the zero address.
    // - the caller must have a balance of at least `amount`.
    //
    function transfer(address recipient, uint256 amount) public returns (bool) {
        if (recipient == address(this)) {
            _unwrap(msg.sender, msg.sender, amount);
        } else {
            _transfer(msg.sender, recipient, amount);
        }
        return true;
    }

    // @dev See `IERC20.transferFrom`.
    //
    // Emits an `Approval` event indicating the updated allowance. This is not
    // required by the EIP. See the note at the beginning of `ERC20`;
    //
    // Requirements:
    // - `sender` and `recipient` cannot be the zero address.
    // - `sender` must have a balance of at least `value`.
    // - the caller must have allowance for `sender`'s tokens of at least
    // `amount`.
    //
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        if (sender == address(this)) {

            _wrap(msg.sender, recipient, amount);

        } else if (recipient == address(this)) {

            _unwrap(msg.sender, sender, amount);

        } else {
            _transfer(sender, recipient, amount);
            _approve(sender, msg.sender, ERC20.allowance(sender, msg.sender).sub(amount));
        }
        return true;
    }

    mapping (address => uint256) private nonces;

    function _splitSignature(bytes memory signature) private pure returns (Signature memory sig) {
        require(signature.length == 65, "DaiPlus::_splitSignature | invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "DaiPlus::_splitSignature | invalid v argument");
        return Signature({
            v: v,
            r: r,
            s: s
            });
    }

    modifier gasBarrier(uint256 gas_left, uint256 expected_gas, uint256 expected_gasPrice) {
        require(expected_gas <= gas_left, "DaiPlus::gasBarrier | insufficient gas provided by the relayer");
        // solhint-disable-next-line max-line-length
        require(expected_gasPrice <= tx.gasprice, "DaiPlus::gasBarrier | insufficient gasPrice provided by the relayer");
        _;
    }

    modifier nonceBarrier(address signer, uint256 nonce) {
        require(nonces[signer] == nonce, "DaiPlus::nonceBarrier | invalid nonce");
        _;
    }

    modifier relayerBarrier(address relayer) {
        if (relayer == address(0)) {
            _;
        } else {
            require(relayer == msg.sender, "DaiPlus::relayerBarrier | relayer restriction not met");
            _;
        }
    }

    function _signedTransfer(mTransfer memory mtransfer, Signature memory signature, uint256 gas_left)
    internal
    nonceBarrier(mtransfer.actors.signer, mtransfer.txparams.nonce)
    gasBarrier(gas_left, mtransfer.txparams.gasLimit, mtransfer.txparams.gasPrice)
    relayerBarrier(mtransfer.actors.relayer) {
        require(verify(mtransfer, signature), "DaiPlus::_signedTransfer | invalid signer");

        if (mtransfer.recipient == address(this)) {

            _unwrap(mtransfer.actors.signer, mtransfer.actors.signer, mtransfer.amount);

        } else {

            ERC20._transfer(mtransfer.actors.signer, mtransfer.recipient, mtransfer.amount);

        }

        ERC20._transfer(mtransfer.actors.signer, msg.sender, mtransfer.txparams.reward);

        nonces[mtransfer.actors.signer] = nonces[mtransfer.actors.signer].add(1);

    }

    function _signedApprove(mApprove memory mapprove, Signature memory signature, uint256 gas_left)
    internal
    nonceBarrier(mapprove.actors.signer, mapprove.txparams.nonce)
    gasBarrier(gas_left, mapprove.txparams.gasLimit, mapprove.txparams.gasPrice)
    relayerBarrier(mapprove.actors.relayer) {
        require(verify(mapprove, signature), "DaiPlus::_signedApprove | invalid signer");

        ERC20._approve(mapprove.actors.signer, mapprove.spender, mapprove.amount);
        ERC20._transfer(mapprove.actors.signer, msg.sender, mapprove.txparams.reward);
        nonces[mapprove.actors.signer] = nonces[mapprove.actors.signer].add(1);
    }

    function _signedTransferFrom(mTransferFrom memory mtransfer_from, Signature memory signature, uint256 gas_left)
    internal
    nonceBarrier(mtransfer_from.actors.signer, mtransfer_from.txparams.nonce)
    gasBarrier(gas_left, mtransfer_from.txparams.gasLimit, mtransfer_from.txparams.gasPrice)
    relayerBarrier(mtransfer_from.actors.relayer) {
        require(verify(mtransfer_from, signature), "DaiPlus::_signedTransferFrom | invalid signer");

        // This is a wrap call, the signer should have approved the contract in DAI
        // The recipient will receive Dai+ if this contract is able to take the same
        // amount from the signer
        if (mtransfer_from.sender == address(this)) {

            _wrap(mtransfer_from.actors.signer, mtransfer_from.recipient, mtransfer_from.amount); // Amount
            _wrap(mtransfer_from.actors.signer, msg.sender, mtransfer_from.txparams.reward); // Reward

        } else if (mtransfer_from.recipient == address(this)) {

            _unwrap(mtransfer_from.actors.signer, mtransfer_from.sender, mtransfer_from.amount); // Amount
            ERC20._transfer(mtransfer_from.actors.signer, msg.sender, mtransfer_from.txparams.reward); // Reward

        } else {

            ERC20._transfer(mtransfer_from.sender, mtransfer_from.recipient, mtransfer_from.amount); // Amount
            ERC20._approve(mtransfer_from.sender, mtransfer_from.actors.signer,
                ERC20.allowance(mtransfer_from.sender, mtransfer_from.actors.signer).sub(mtransfer_from.amount));
            ERC20._transfer(mtransfer_from.actors.signer, msg.sender, mtransfer_from.txparams.reward); // Reward

        }

        nonces[mtransfer_from.actors.signer] = nonces[mtransfer_from.actors.signer].add(1);

    }

    function _wrap(address dai_owner, address dai_plus_recipient, uint256 amount) internal {
        require(backer.allowance(dai_owner, address(this)) >= amount,
            "DaiPlus::wrap | Unable to wrap provided amount, allowance too low");

        backer.transferFrom(dai_owner, address(this), amount);
        ERC20._mint(dai_plus_recipient, amount);

        emit IERC20.Transfer(address(this), dai_owner, amount);
        if (dai_owner != dai_plus_recipient) {
            emit IERC20.Transfer(dai_owner, dai_plus_recipient, amount);
        }
    }

    function _unwrap(address dai_plus_owner, address dai_recipient, uint256 amount) internal {
        require(ERC20.balanceOf(dai_plus_owner) >= amount,
            "DaiPlus::unwrap | Unable to unwrap provided amount, balance too low");
        ERC20._burn(dai_plus_owner, amount);

        emit IERC20.Transfer(dai_plus_owner, address(this), amount);

        backer.transfer(dai_recipient, amount);
    }

}
