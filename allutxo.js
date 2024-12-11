const { createNetwork, relay } = require('@axelar-network/axelar-local-dev');
const express = require('express');
const bodyParser = require('body-parser');
const { getDefaultProvider, Contract, utils, ethers } = require('ethers');

const { utils: { deployContract }, } = require('@axelar-network/axelar-local-dev');
const { IInterchainTokenService } = require('@axelar-network/axelar-local-dev/dist/contracts');
const { interchainTransfer } = require('../../../scripts/libs/its-utils');
// const Notary = require('../../../artifacts/examples/evm/cross-benchmark-notary/Notary.sol/Notary.json');
const Notary = require('./art/Notary.sol/Notary.json');
//  const Notary = require('./art/Notarybp.sol/Notary.json');

async function deploy(chain, wallet, tokenSymbol) {
    console.log(`Deploying Notary for ${chain.name}.`);
    console.log(`chain.gateway  ${chain.gateway.address}.`);
    console.log(`tokenSymbol  ${tokenSymbol}.`);
    
    // chain.Notary = await deployContract(wallet, Notary, [chain.gateway.address, chain.gasService]);
    chain.Notary = await deployContract(wallet, Notary, [["0x1016f75c54c607f082ae6b0881fac0abeda21781"], chain.gateway.address, chain.gasService.address]);
    console.log(`Running validateTransaction`);
    const isValid = await chain.Notary.validateTransaction("0x1016f75c54c607f082ae6b0881fac0abeda21781");
    console.log(`Deployed Notary for ${chain.name} at ${chain.Notary.address}.`);
}


// 创建Express应用
const app = express();
app.use(bodyParser.json());

async function initializeTokens1(networks, tokenSymbol) {
  // Deploy tokens on each network
  await networks.source.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
  await networks.destination.deployToken(tokenSymbol, `a${tokenSymbol}`, 6, BigInt(100_000e18));
  await deploy(networks.source, networks.source.userWallets[0],`a${tokenSymbol}`);
  //await deploy(networks.destination,networks.destination.userWallets[0]);
  
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
  await deploy(networks.source, networks.source.userWallets[0], `a${tokenSymbol}`);
  //await deploy(networks.destination,networks.destination.userWallets[0]);
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
 // Log balances
  async function log_balance() {
    const sourceBalancea = (await tokenSourceContract.balanceOf(sourceUserWallet.address)) / 1e6;
    const sourceBalancek = (await tokenSourceContract.balanceOf(networks.source.Notary.address)) / 1e6;
    const destinationBalancek = (await tokenDestinationContract.balanceOf(networks.destination.Notary.address)) / 1e6;
    const destinationBalancea = (await tokenDestinationContract.balanceOf(networks.destination.userWallets[0].address)) / 1e6;

    console.log(
      `Source Chain ${networks.source.name} user Balance: `, sourceBalancea,
      ` a${tokenSymbol}`
    );
    console.log(
      `Source Chain ${networks.source.name} Noatary Balance: `, sourceBalancek,
      ` a${tokenSymbol}`
    );
    console.log(
      `Destination Chain ${networks.destination.name} user Balance: `, destinationBalancea,
      ` a${tokenSymbol}`
    );
    console.log(
      `Destination Chain ${networks.destination.name} Noatary Balance: `, destinationBalancek,
      ` a${tokenSymbol}`
    );
  }

  // approve token
  async function approve(value) {
    const tokenWithSigner = tokenSourceContract.connect(sourceUserWallet);
    const approveTx = await tokenWithSigner.approve(networks.source.Notary.address, value);
    await approveTx.wait();
  }


  // Approve gateway to use token on the source chain
    console.log(`Beginning of the sendTokens: ${sourceUserWallet.address}`);


    // eth balance
    const ethBalance = await networks.source.provider.getBalance(sourceUserWallet.address);
    console.log("ETH Balance: ", ethers.utils.formatEther(ethBalance)); 



    await log_balance()


  


    // const fee = await calculateBridgeFee(source, destination);
    // const destinationbalance1 = await networks.destination.Notary.getBalance(networks.destination.userWallets[0].address);
    // console.log(`destinationbalance: ${destinationbalance1}`);

    

    // deposit
    // console.log(`${tokenSymbol}`)
    // const depositTx = await networks.source.Notary.deposit(100e6, `a${tokenSymbol}`, {from: sourceUserWallet.address});
    // await depositTx.wait();

     // approve token
    await approve(BigInt(100e6))

    // crosssend
    console.log(`networks.source.name ${networks.source.name}, 
networks.source.userWallets[0].address ${networks.source.userWallets[0].address},
networks.source.Notary.address ${networks.source.Notary.address},
networks.destination.name ${networks.destination.name}, 
networks.destination.userWallets[0].address ${networks.destination.userWallets[0].address},
networks.destination.Notary.address ${networks.destination.Notary.address} `);


    const crossTx = await networks.source.Notary.crossSend(
        networks.destination.userWallets[0].address, 
        BigInt(100e6), 
        `a${tokenSymbol}`,
        networks.destination.name, 
        networks.destination.Notary.address, 
        {from: sourceUserWallet.address, value:BigInt(100e10),});

    (async () => {
          const filter = networks.source.Notary.filters.CrossSendExecuted();
          networks.source.Notary.on(filter, (sender, receiver, amount, thisSymbol, targetChain, targetContract, success, event) => {
              console.log("Event received:");
              console.log("Sender:", sender);
              console.log("Receiver:", receiver);
              console.log("Amount:", ethers.utils.formatUnits(amount, 18));
              console.log("Token Symbol:", thisSymbol);
              console.log("Target Chain:", targetChain);
              console.log("Target Contract:", targetContract);
              console.log("Success:", success);
              // console.log("Event Data:", event);
          });
      })();

    (async () => {
        const filter = networks.destination.Notary.filters.Executed();
        networks.destination.Notary.on(filter, (amount, thisSymbol, success, event) => {
            console.log("Event received:");
            console.log("Amount:", ethers.utils.formatUnits(amount, 18));
            console.log("Token Symbol:", thisSymbol);
            console.log("Success:", success);
            // console.log("Event Data:", event);
        });
    })();


    console.log(`crossTx.wait()`);
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await sleep(1000);
    await crossTx.wait(); 
    await sleep(1000);
    await log_balance();   


  // const sourceApproveTx = await tokenSourceContract
  //   .connect(sourceUserWallet)
  //   .approve(networks.source.gateway.address, 100e6);
  // console.log(`sourceApproveTx`);
  // await sourceApproveTx.wait();
  // console.log(`sourceApproveTx.wait()`);

  	
  // Ask gateway on the source chain to send tokens to the destination chain
  // const sourceGatewayTx = await networks.source.gateway
  //   .connect(sourceUserWallet)
  //   .sendToken(networks.destination.name, networks.destination.userWallets[0].address, `a${tokenSymbol}`, 100e6);
  // await sourceGatewayTx.wait();


  

  // const destinationbalance = await networks.destination.Notary.getBalance(networks.destination.userWallets[0].address);
  // console.log(`destinationbalance: ${destinationbalance}`);
  const utxolist = await networks.source.Notary.getAllUTXOs()
  console.log(`utxolist: ${utxolist}`);

  const indexlist = await networks.destination.Notary.getUserUTXOIndexes(networks.destination.userWallets[0].address)
  console.log(`indexlist: ${indexlist}`);
  this_index = indexlist[-1]

  // withdraw
  const withdrawTx = await networks.destination.Notary.withdraw(
    this_index, 
    `a${tokenSymbol}`, 
    {from: networks.destination.userWallets[0].address});
  console.log(`withdrawTx`);
  await withdrawTx.wait();
  console.log(`withdrawTx.wait()`);


  // Relay transactions
  await relay();

  // Log balances
  log_balance()

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
    source:source,
    destination:destination,
  };
  const networks1 = {
	  source:destination,
    destination:source,
  };
  //console.log(networks)
  //console.log(networks1.source.name,networks1.destination.name)


  // Initialize tokens
  const { sourceUserWallet, destinationUserWallet, tokenSourceContract, tokenDestinationContract } = await initializeTokens(networks, tokenSymbol);
  const { sourceUserWallet1, destinationUserWallet1, tokenSourceContract1, tokenDestinationContract1 } = await initializeTokens1(networks1, tokenSymbol1);
  //console.log(tokenSourceContract1)
  // Start Express server
  app.post('/swap-tokens', async (req, res) => {
    try {
      console.log(`Initial Source Chain ${networks.source.name}`);
      const result = await sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol);
      // console.log(`result ${result}`);
      const result1 = await sendTokens(networks1, sourceUserWallet1, tokenSourceContract1, tokenDestinationContract1, tokenSymbol1);
      // const result = await sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol);

      // console.log(`result1 ${result1}`);

      const initialSourceBalance = await getEthBalance(sourceUserWallet, networks.source.provider);
      console.log(`Initial Source Chain ${networks.source.name} ETH Balance:`, initialSourceBalance);
      // 返回执行结果
      result.ethBalance = initialSourceBalance;

      // 返回执行结果
      res.status(200).json(result);
      //res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred during execution.');
    }
  });

  app.post('/send-tokens', async (req, res) => {
    try {
        //const result1 = await sendTokens(networks1, sourceUserWallet1, tokenSourceContract1, tokenDestinationContract1, tokenSymbol1);

        const result = await sendTokens(networks, sourceUserWallet, tokenSourceContract, tokenDestinationContract, tokenSymbol);

        const initialSourceBalance = await getEthBalance(sourceUserWallet, networks.source.provider);
        console.log(`Initial Source Chain ${networks.source.name} ETH Balance:`, initialSourceBalance);
        // 返回执行结果
        result.ethBalance = initialSourceBalance;

        // 返回执行结果
        res.status(200).json(result);
        //res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred during execution.');
    }
  });

  // 启动服务器
  const PORT = process.env.PORT || 3010;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main('Ethereum', 'Fantom', 'DAI','USDC').catch(console.error);
