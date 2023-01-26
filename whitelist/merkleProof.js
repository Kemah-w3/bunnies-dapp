const { WHITELIST_ADDRESS } = require("./whitelist_Address")
const keccak256 = require("keccak256")
const { MerkleTree } = require("merkletreejs")


const addressLeaves = WHITELIST_ADDRESS.map(x => keccak256(x))
const merkleTree = new MerkleTree(addressLeaves, keccak256, {
    sortPairs : true
})

const rootHash = merkleTree.getHexRoot()

module.exports = { merkleTree, rootHash }