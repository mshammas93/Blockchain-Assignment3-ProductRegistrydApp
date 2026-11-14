# Product Registry dApp: Truffle & Ganache

**MG3012: Blockchain Technology for Business, Assignment 3**
**Student:** Shammas Cheema 24i-5598 · BSFT 5th Semester, Fall 2026
**Instructor:** Dr. Usama Arshad

This project continues Assignment 2. The **ProductRegistry** smart contract, which was deployed with Remix
on Sepolia, is now compiled, deployed and tested with the **Truffle Suite** on a local **Ganache** blockchain.
A second contract, **ProductReviews**, was added as the bonus feature. It works together with
ProductRegistry so customers can give products a 1 to 5 star rating.

## 📂 Project Structure

```
├── contracts/
│   ├── SmartContract.sol        # ProductRegistry (from Assignment 2)
│   └── ProductReviews.sol       # Bonus: second contract that uses ProductRegistry
├── migrations/
│   └── 1_deploy_contract.js     # Deploys ProductRegistry, then ProductReviews with its address
├── test/
│   └── productRegistry.test.js  # 7 automated tests (truffle test)
├── src/
│   ├── index.html               # Frontend page
│   ├── script.js                # ethers.js logic (MetaMask + contracts)
│   ├── style.css                # Styling
│   └── logo.svg                 # Logo image
├── truffle-config.js            # Connects Truffle to Ganache (127.0.0.1:7545)
├── README.md
└── screenshots/
```

## 🧩 Smart Contracts

### ProductRegistry (`contracts/SmartContract.sol`)
| Function | Type | Description |
|---|---|---|
| `addProduct(name, price)` | Write | Lists a new product. The caller becomes its seller. |
| `updatePrice(id, newPrice)` | Write | Changes the price. Only the product's seller can do this. |
| `getProduct(id)` | Read | Returns name, price and seller. |
| `getProductCount()` | Read | Number of products listed. |
| `owner()` | Read | The account that deployed the contract. |

### ProductReviews (`contracts/ProductReviews.sol`) ⭐ bonus
| Function | Type | Description |
|---|---|---|
| `addReview(productId, rating, comment)` | Write | Adds a 1 to 5 star review. It checks with ProductRegistry that the product exists and that the reviewer isn't the seller. Each account can review a product only once. |
| `getReviewCount(productId)` | Read | Number of reviews for a product. |
| `getReview(productId, index)` | Read | One review (reviewer, rating, comment). |
| `getAverageRating(productId)` | Read | Average rating × 10 (e.g. 45 = 4.5 stars). |

## 🛠️ Requirements

- [Node.js](https://nodejs.org) (LTS version)
- Truffle: `npm install -g truffle`
- [Ganache](https://archive.trufflesuite.com/ganache/) desktop app (RPC server `HTTP://127.0.0.1:7545`, chain ID 1337, network ID 5777)
- MetaMask browser extension
- VS Code with the **Live Server** extension

## ⚙️ Setup & Commands

```bash
# 1. Check installation
truffle version

# 2. Create the project (done once)
truffle init

# 3. Compile the contracts  ->  creates build/contracts/*.json
truffle compile

# 4. Deploy to Ganache (Ganache must be running)
truffle migrate
#    deploy again from scratch (e.g. after restarting Ganache)
truffle migrate --reset

# 5. Run the automated tests
truffle test

# 6. (Optional) interact from the Truffle console
truffle console
> const r = await ProductRegistry.deployed()
> await r.addProduct("Laptop Bag", 2500)
> (await r.getProductCount()).toString()
```

## 🌐 Running the Frontend

1. Start Ganache and run `truffle migrate`.
2. In MetaMask, import one or two Ganache accounts: in Ganache, click the 🔑 key icon and copy the private key,
   then in MetaMask choose **Add account → Import account**.
3. Open the **project folder** in VS Code, right-click `src/index.html` and choose **Open with Live Server**.
4. Click **Connect MetaMask**. The page switches MetaMask to Ganache, or adds the network if it's missing.
5. Add products, update prices, then switch to another account and leave a review.

The frontend reads each contract's **ABI and address automatically** from `build/contracts/*.json`,
the files Truffle writes during migration. This means there's no need to copy addresses by hand after redeploying.

## 🧪 How to Test

- **Automated:** `truffle test` runs 7 tests covering adding and reading products, price updates,
  access control (only the seller), input validation, reviews, average rating, duplicate and self-review blocking.
- **Manual (UI):** add a product, update its price with the same account, then switch accounts and review it.
  Each transaction's hash, block number and gas used appear in the status box and can be found in Ganache's
  **Transactions** tab.

## 🖼️ Screenshots

| | |
|---|---|
| Truffle init | ![init](screenshots/1-truffle-init.png) |
| Truffle compile | ![compile](screenshots/2-truffle-compile.png) |
| Truffle migrate | ![migrate](screenshots/3-truffle-migrate.png) |
| Truffle test | ![test](screenshots/4-truffle-test.png) |
| Ganache transactions | ![ganache](screenshots/5-ganache.png) |
| dApp connected | ![connected](screenshots/6-ui-connected.png) |
| dApp transaction | ![transaction](screenshots/7-ui-transaction.png) |

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `truffle : running scripts is disabled` (PowerShell) | Use **Command Prompt** instead, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Could not connect to your Ethereum client` | Ganache isn't running, or the port in `truffle-config.js` doesn't match Ganache's |
| `Could not load ../build/contracts/...` on the page | Run `truffle migrate`, and open the **project folder** (not `src`) in VS Code |
| `nonce too high` in MetaMask after restarting Ganache | MetaMask → Settings → Advanced → **Clear activity tab data** |
| `No contract found at ...` | Ganache was restarted: run `truffle migrate --reset` |

## 🧰 Technologies
Solidity 0.8.20 · Truffle v5 · Ganache · MetaMask · ethers.js v6 · HTML/CSS/JavaScript
