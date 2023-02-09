//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract OwnableDelegateProxy {}

/**
 * Used to delegate ownership of a contract to another address, to save on unneeded transactions to approve contract use for users
 */
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}


/// @notice SelfServeMint is an ERC721 contract that allows anyone to mint an NFT by calling the `mint` function.
contract SelfServeMint is ERC721URIStorage {
  uint256 private _idCounter;
  address private _proxyRegistryAddress;

  constructor(address proxyRegistryAddress)
    ERC721("SelfServe", "SSRV") {
        _proxyRegistryAddress = proxyRegistryAddress;
    }

  /// @notice Calling the mint function will create a new token and transfer it to the `to` address. 
  /// The `tokenURI` should resolve to a metadata JSON object describing the NFT, as described in EIP-721.
  function mint(address to, string memory tokenURI) public {
      uint tokenId = ++_idCounter;
      _safeMint(to, tokenId);
      _setTokenURI(tokenId, tokenURI);
  }

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable listing on OpenSea without
     * paying gas for an additional approval. 
     * See https://docs.opensea.io/docs/1-structuring-your-smart-contract#opensea-whitelisting-optional
     */
    function isApprovedForAll(address owner, address operator)
        override
        public
        view
        returns (bool)
    {
        // The OpenSea proxy only exists on mainnet and rinkeby.
        // The deploy script will set the proxy address to zero for other networks.
        if (_proxyRegistryAddress == address(0)) {
            return super.isApprovedForAll(owner, operator);
        }

        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }
}
