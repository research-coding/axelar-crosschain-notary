const { createNetwork, relay } = require('@axelar-network/axelar-local-dev');
const express = require('express');
const bodyParser = require('body-parser');
const { getDefaultProvider, Contract, utils } = require('ethers');
const { utils: { deployContract } } = require('@axelar-network/axelar-local-dev');
const { IInterchainTokenService } = require('@axelar-network/axelar-local-dev/dist/contracts');
const { interchainTransfer } = require('../../../scripts/libs/its-utils');
const Notary = require('../../../artifacts/examples/evm/cross-benchmark-notary/Notary.sol/Notary.json');

async function deploy(chain, wallet) {
    console.log(`Deploying Notary for ${chain.name}.`);
    //chain.provider =  getDefaultProvider(chain.providerUrl),
    chain.Notary = await deployContract(wallet, Notary, [["0x1016f75c54c607f082ae6b0881fac0abeda21781"]]);
    //chain.wallet = wallet;
    const isValid = await chain.Notary.validateTransaction("0x1016f75c54c607f082ae6b0881fac0abeda21781", '0x1016f75c54c607f082ae6b0881fac0abeda21781', 100e6);
    console.log(`Transaction is valid: ${isValid}`);
    console.log(`Deployed Notary for ${chain.name} at ${chain.Notary.address}.`);
}

// 创建Express应用
const app = express();
app.use(bodyParser.json());

async function initializeTokens1(networks, tokenSymbol) {
    // Deploy tokens on each network
    await networks.source.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
    await networks.destination.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
    
	//   await deploy(networks.source, networks.source.userWallets[0], networks.source.tokenAddress);
	await deploy(networks.source,networks.source.userWallets[0]);
    //await deploy(networks.destination, networks.destination.userWallets[0], networks.destination.tokenAddress);
    
    // Extract user accounts
    const [sourceUserWallet1] = networks.source.userWallets;
    const [destinationUserWallet1] = networks.destination.userWallets;

    // Mint tokens on the source chain
    await networks.source.giveToken(sourceUserWallet1.address, `a${tokenSymbol}`, BigInt(100e18));

    // Extract token contracts
    const tokenSourceContract1 = await networks.source.getTokenContract(`a${tokenSymbol}`);
    const tokenDestinationContract1 = await networks.destination.getTokenContract(`a${tokenSymbol}`);

    return {
        sourceUserWallet1,
        destinationUserWallet1,
        tokenSourceContract1,
        tokenDestinationContract1,
    };
}

async function initializeTokens(networks, tokenSymbol) {
    // Deploy tokens on each network
    await networks.source.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
    await networks.destination.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
    //await deploy(networks.source, networks.source.userWallets[0], networks.source.tokenAddress);
	await deploy(networks.source,networks.source.userWallets[0]);
    //await deploy(networks.destination, networks.destination.userWallets[0], networks.destination.tokenAddress);
    
    // Extract user accounts
    const [sourceUserWallet] = networks.source.userWallets;
    const [destinationUserWallet] = networks.destination.userWallets;

    // Mint tokens on the source chain
    await networks.source.giveToken(sourceUserWallet.address, `a${tokenSymbol}`, BigInt(100e18));

    // Extract token contracts
    const tokenSourceContract = await networks.source.getTokenContract(`a${tokenSymbol}`);
    const tokenDestinationContract = await networks.destination.getTokenContract(`a${tokenSymbol}`);

    return {
        sourceUserWallet,
        destinationUserWallet,
        tokenSourceContract,
        tokenDestinationContract,
    };
}

async function sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol) {
    // Approve gateway to use token on the source chain
   /* const isValid = await networks.source.Notary.validateTransaction(sourceUserWallet.address, networks.destination.userWallets[0].address, 100e6);
    if (!isValid) {
        throw new Error('Transaction not valid by Notary');
    } else {
        console.log("Transaction valid by Notary");
    }*/

    const sourceApproveTx = await tokenSourceContract
        .connect(sourceUserWallet)
        .approve(networks.source.Notary.address, 100e6);
    await sourceApproveTx.wait();

    // Transfer tokens to Notary contract
 /*   const depositTx = await networks.source.Notary.deposit(100e6, { from: sourceUserWallet.address });
    await depositTx.wait();
*/
    const sourceGatewayTx = await networks.source.gateway
    .connect(sourceUserWallet)
    .sendToken(networks.destination.name, networks.destination.userWallets[0].address, `a${tokenSymbol}`, 100e6);
  await sourceGatewayTx.wait();


    // Relay transactions
    await relay();

    // Log balances
    const sourceBalance = (await tokenSourceContract.balanceOf(sourceUserWallet.address)) / 1e6;
    const destinationBalance = (await tokenDestinationContract.balanceOf(networks.destination.userWallets[0].address)) / 1e6;

    console.log(
        `Source Chain ${networks.source.name} Balance: `, sourceBalance,
        ` a${tokenSymbol}`
    );
    console.log(
        `Destination Chain ${networks.destination.name} Balance: `, destinationBalance,
        ` a${tokenSymbol}`
    );

    return {
        sourceBalance,
        destinationBalance
    };
}

async function getEthBalance(wallet, provider) {
    const balance = await provider.getBalance(wallet.address);
    return parseFloat(utils.formatEther(balance));
}

async function main(sourceName, destinationName, tokenSymbol, tokenSymbol1) {
    // Create source network
    const source = await createNetwork({
        name: sourceName,
    });

    // Create destination network
    const destination = await createNetwork({
        name: destinationName,
    });

    const networks = {
        source,
        destination,
    };
    const networks1 = {
        source: destination,
        destination: source,
    };

    // Initialize tokens
    const { sourceUserWallet, destinationUserWallet, tokenSourceContract, tokenDestinationContract } = await initializeTokens(networks, tokenSymbol);
    const { sourceUserWallet1, destinationUserWallet1, tokenSourceContract1, tokenDestinationContract1 } = await initializeTokens1(networks1, tokenSymbol1);

    // Start Express server
    app.post('/swap-tokens', async (req, res) => {
        try {
            const result = await sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol);
            const result1 = await sendTokens(networks1, sourceUserWallet1, tokenSourceContract1, tokenDestinationContract1, tokenSymbol1);

            const initialSourceBalance = await getEthBalance(sourceUserWallet, networks.source.provider);
            console.log(`Initial Source Chain ${networks.source.name} ETH Balance:`, initialSourceBalance);

            result.ethBalance = initialSourceBalance;
            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred during execution.');
        }
    });

    app.post('/send-tokens', async (req, res) => {
        try {
            const result = await sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol);

            const initialSourceBalance = await getEthBalance(sourceUserWallet, networks.source.provider);
            console.log(`Initial Source Chain ${networks.source.name} ETH Balance:`, initialSourceBalance);

            result.ethBalance = initialSourceBalance;
            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).send('An error occurred during execution.');
        }
    });

    // 启动服务器
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

main('Ethereum', 'Fantom', 'DAI', 'USDC').catch(console.error);
