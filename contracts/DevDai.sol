pragma solidity >=0.5.0 <0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract DevDai is ERC20, ERC20Detailed {

    constructor () ERC20Detailed("DaiPlus Meta-Stablecoin v1.0", "DAI+", 18)
    public {
    }

    function test__mint(address owner, uint256 amount) public {
        ERC20._mint(owner, amount);
    }

}
