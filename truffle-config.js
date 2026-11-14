/**
 * Truffle configuration
 * Connects Truffle to the local Ganache blockchain.
 *
 * Ganache desktop app (GUI) runs on port 7545  <- default here
 * Ganache command line (CLI) runs on port 8545 <- change the port below if you use the CLI
 */

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",   // localhost
      port: 7545,          // Ganache GUI port
      network_id: "*",     // match any network id (Ganache uses 5777)
    },
  },

  // Settings for the Solidity compiler
  compilers: {
    solc: {
      version: "0.8.20",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200,
        },
        // "paris" keeps the bytecode compatible with Ganache
        // (newer EVM versions use an opcode Ganache doesn't support)
        evmVersion: "paris",
      },
    },
  },
};
