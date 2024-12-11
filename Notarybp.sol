// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Notary is Ownable {
    mapping(address => bool) public validators;
    mapping(address => uint256) public tokenBalances;

    IERC20 public token;

  /*  constructor(address[] memory _validators, address _tokenAddress) {
        for (uint256 i = 0; i < _validators.length; i++) {
            validators[_validators[i]] = true;
        }
        token = IERC20(_tokenAddress);
   a }

    function validateTransaction(address sender, address receiver, uint256 amount) external view returns (bool) {
        return validators[sender];
    }*/
   constructor(address[] memory _validators) {
        for (uint256 i = 0; i < _validators.length; i++) {
            validators[_validators[i]] = true;
        }
    }

    function validateTransaction(address sender) external view returns (bool) {
        return validators[sender];
    }


    function deposit(uint256 amount) external {
      //  require(amount > 0, "Amount must be greater than zero");
        //require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        tokenBalances[msg.sender] += amount;
    }

    function withdraw(uint256 amount, address recipient) external onlyOwner {
        //require(amount > 0, "Amount must be greater than zero");
        //require(tokenBalances[recipient] >= amount, "Insufficient balance");
        tokenBalances[recipient] -= amount;
        //require(token.transfer(recipient, amount), "Transfer failed");
    }

    function getBalance(address user) external view returns (uint256) {
        return tokenBalances[user];
    }
}
