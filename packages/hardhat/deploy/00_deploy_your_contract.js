// deploy/00_deploy_self_serve_mint.js

const CHAIN_ID_MAINNET = "1";
const CHAIN_ID_RINKEBY = "4";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();
  let openSeaProxyAddress;
  switch (chainId) {
    case CHAIN_ID_MAINNET:
      openSeaProxyAddress = "0xa5409ec958c83c3f309868babaca7c86dcb077c1";
      break;
    case CHAIN_ID_RINKEBY:
      openSeaProxyAddress = "0x1E525EEAF261cA41b809884CBDE9DD9E1619573A";
      break;
    default:
      openSeaProxyAddress = "0x0000000000000000000000000000000000000000";
  }

  console.log(
    `Deploying to chain id ${chainId}. OpenSea proxy: ${openSeaProxyAddress}`
  );

  await deploy("SelfServeMint", {
    from: deployer,
    args: [openSeaProxyAddress],
    log: true,
    waitConfirmations: 5,
  });
};
module.exports.tags = ["SelfServeMint"];
