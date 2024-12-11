// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';

contract Notary is  Ownable, AxelarExecutable {
    IAxelarGasService public immutable gasService;
    mapping(address => bool) public validators;
    struct UTXO {
        address owner;
        uint256 amount;
        bool spent;
        string symbol;
    }
    event CrossSendExecuted(
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string thisSymbol,
        string targetChain,
        string targetContract,
        bool success
    );

    event Executed(
        uint256 amount,
        string thisSymbol,
        bool success
    );
    UTXO[] public utxos;
    mapping(address => uint256[]) public userUTXOIndexes;



    constructor(address[] memory _validators,
                address _gateway, 
                address _gasReceiver
                ) AxelarExecutable(_gateway)  {

        gasService = IAxelarGasService(_gasReceiver);
        for (uint256 i = 0; i < _validators.length; i++) {
            validators[_validators[i]] = true;
        }


    }

    function getAllUTXOs() public view returns (UTXO[] memory) {
        return utxos;
    }

    function getUserUTXOIndexes(address user) external view returns (uint256[] memory) {
        return userUTXOIndexes[user];
    }



    function validateTransaction(address sender) external view returns (bool) {
        return validators[sender];
    }

    function test(uint256 amount, string memory this_symbol) external view returns (address){
        
        address _tokenAddress = gateway.tokenAddresses(this_symbol);
        IERC20 this_token;
        this_token = IERC20(_tokenAddress);
        return _tokenAddress;
    }

    function deposit(uint256 amount, string memory this_symbol) external {
        
        address _tokenAddress = gateway.tokenAddresses(this_symbol);
        IERC20 this_token;
        this_token = IERC20(_tokenAddress);

        require(amount > 0, "Amount must be greater than zero");
        require(this_token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        utxos.push(UTXO({
            owner: msg.sender,
            amount: amount,
            spent: false,
            symbol: this_symbol
        }));
        userUTXOIndexes[msg.sender].push(utxos.length - 1);
    }

    function withdraw(uint256 utxoIndex, string memory this_symbol) external {
        require(utxoIndex < utxos.length, "Invalid UTXO index");

        address _tokenAddress = gateway.tokenAddresses(this_symbol);
        IERC20 this_token;
        this_token = IERC20(_tokenAddress);

        UTXO storage utxo = utxos[utxoIndex];
        require(utxo.owner == msg.sender, "Not the owner of the UTXO");
        require(keccak256(abi.encodePacked(utxo.symbol)) == keccak256(abi.encodePacked(this_symbol)), "Not the owner of the UTXO");
        require(!utxo.spent, "UTXO has already been spent");

        utxo.spent = true;
        require(this_token.transfer(msg.sender, utxo.amount), "Token transfer failed");
    }


    function crossSend( address receiver, 
                        uint256 amount,
                        string memory this_symbol,
                        string memory targetChain,
                        string memory targetContract
                        ) external payable {
        address _tokenAddress = gateway.tokenAddresses(this_symbol);
        IERC20 this_token;
        this_token = IERC20(_tokenAddress);
        require(amount > 0, "Amount must be greater than zero");
        require(this_token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        bytes memory payload = abi.encode(receiver, amount);
        gasService.payNativeGasForContractCallWithToken{ value: msg.value }(
            address(this),
            targetChain,
            targetContract,
            payload,
            this_symbol,
            amount,
            msg.sender
        );
        this_token.approve(address(gateway), amount);
        gateway.callContractWithToken(targetChain, targetContract, payload, this_symbol, amount);
        emit CrossSendExecuted(
            msg.sender,
            receiver,
            amount,
            this_symbol,
            targetChain,
            targetContract,
            true
        );
    }
    

    function _executeWithToken(
        string calldata,
        string calldata,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override{
        emit Executed(
            amount,
            tokenSymbol,
            true
        );
        // (address receiver, uint256 depositAmount) = abi.decode(payload, (address, uint256));

        
        // address _tokenAddress = gateway.tokenAddresses(tokenSymbol);
        // IERC20 this_token;
        // this_token = IERC20(_tokenAddress);
        // this_token.transfer(receiver, depositAmount);
        // utxos.push(UTXO({
        //         owner: receiver,
        //         amount: depositAmount,
        //         spent: false,
        //         symbol: tokenSymbol
        //     }));
        // userUTXOIndexes[receiver].push(utxos.length - 1);
    }
}


