const { deployments } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

const setupTest = deployments.createFixture(
  async ({ deployments, getNamedAccounts, ethers }) => {
    await deployments.fixture();
    const { testUser1 } = await getNamedAccounts();
    const UserContract = await ethers.getContract("SelfServeMint", testUser1);
    return {
      testUser1: {
        address: testUser1,
        contract: UserContract,
      },
    };
  }
);

describe("SXSW Minting Demo", function () {
  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("SelfServeMint", function () {
    it("Should mint an NFT", async () => {
      const { testUser1 } = await setupTest();
      await testUser1.contract.mint(
        testUser1.address,
        "ipfs://not-a-real-cid"
      );
    });
  });
});
