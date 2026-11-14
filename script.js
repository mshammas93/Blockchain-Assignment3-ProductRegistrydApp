// =====================================================================
// Product Registry dApp - frontend logic (ethers.js v6)
// The contract ABIs and addresses are read automatically from the files
// Truffle creates in build/contracts/ when you run `truffle migrate`.
// =====================================================================

const REGISTRY_JSON = "../build/contracts/ProductRegistry.json";
const REVIEWS_JSON = "../build/contracts/ProductReviews.json";

// Ganache desktop app settings (chain ID 1337 = 0x539, RPC port 7545)
const GANACHE_CHAIN_ID = "0x539";
const GANACHE_RPC_URL = "http://127.0.0.1:7545";

let provider, signer, registry, reviews, currentAccount;

const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
function showStatus(message, type = "") {
  const box = $("status");
  box.className = "status " + type;
  box.innerHTML = message;
}

function shortAddr(a) {
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function readableError(err) {
  if (err.code === "ACTION_REJECTED" || err.code === 4001) return "You rejected the transaction in MetaMask.";
  return err.reason || err.shortMessage || err.message || String(err);
}

function stars(avgTimes10) {
  if (avgTimes10 === 0) return "no reviews yet";
  return "★ " + (avgTimes10 / 10).toFixed(1) + " / 5";
}

// Load a Truffle artifact (ABI + deployed address) from build/contracts
async function loadArtifact(path, networkId) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Could not load ${path}. Run "truffle migrate" first, and open the PROJECT folder ` +
      `(not the src folder) in VS Code before starting Live Server.`
    );
  }
  const artifact = await res.json();
  const networks = artifact.networks || {};
  // Use the deployment for the current network, or the latest one if not found
  const deployment = networks[networkId] || networks[Object.keys(networks).pop()];
  if (!deployment) throw new Error(`${artifact.contractName} has not been deployed. Run "truffle migrate".`);
  return { abi: artifact.abi, address: deployment.address };
}

// Make sure MetaMask is connected to Ganache (adds the network if missing)
async function switchToGanache() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId === GANACHE_CHAIN_ID) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GANACHE_CHAIN_ID }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: GANACHE_CHAIN_ID,
          chainName: "Ganache Local",
          rpcUrls: [GANACHE_RPC_URL],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        }],
      });
    } else {
      throw err;
    }
  }
}

// ---------- connect ----------
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    showStatus("MetaMask not found. Install MetaMask and open this page with Live Server.", "error");
    return;
  }
  try {
    showStatus("Connecting to MetaMask and Ganache...");
    await switchToGanache();

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    currentAccount = await signer.getAddress();

    const networkId = await provider.send("net_version", []);
    const reg = await loadArtifact(REGISTRY_JSON, networkId);
    const rev = await loadArtifact(REVIEWS_JSON, networkId);

    registry = new ethers.Contract(reg.address, reg.abi, signer);
    reviews = new ethers.Contract(rev.address, rev.abi, signer);

    // Check that a contract really exists at that address (catches an old/reset Ganache)
    if ((await provider.getCode(reg.address)) === "0x") {
      throw new Error(`No contract found at ${reg.address}. Ganache was probably restarted: run "truffle migrate --reset".`);
    }

    const network = await provider.getNetwork();
    const balance = await provider.getBalance(currentAccount);

    $("account").textContent = currentAccount;
    $("network").textContent = `Ganache (chain ID ${network.chainId}, network ID ${networkId}) · balance ${Number(ethers.formatEther(balance)).toFixed(2)} ETH`;
    $("registryAddr").textContent = reg.address;
    $("reviewsAddr").textContent = rev.address;
    $("connectBtn").textContent = "Connected ✓ " + shortAddr(currentAccount);
    ["addBtn", "updateBtn", "reviewBtn", "refreshBtn"].forEach((id) => ($(id).disabled = false));

    showStatus(`Connected to Ganache.\nAccount: ${currentAccount}\nProductRegistry: ${reg.address}\nProductReviews: ${rev.address}`, "ok");
    await loadProducts();
  } catch (err) {
    showStatus("Connection failed: " + readableError(err), "error");
  }
}

// ---------- READ: products + ratings ----------
async function loadProducts() {
  try {
    const count = Number(await registry.getProductCount());
    $("productCount").textContent = count;
    const list = $("productList");
    list.innerHTML = "";

    if (count === 0) {
      list.innerHTML = '<li class="muted">No products yet. Add the first one above.</li>';
      return;
    }
    for (let i = 0; i < count; i++) {
      const [name, price, seller] = await registry.getProduct(i);
      const avg = Number(await reviews.getAverageRating(i));
      const reviewCount = Number(await reviews.getReviewCount(i));
      const mine = seller.toLowerCase() === currentAccount.toLowerCase() ? " (you)" : "";

      const li = document.createElement("li");
      li.innerHTML =
        `<strong>#${i}</strong> ${escapeHtml(name)}: <strong>PKR ${price.toString()}</strong>` +
        ` · ${stars(avg)} (${reviewCount} review${reviewCount === 1 ? "" : "s"})` +
        ` <span class="muted">· seller ${shortAddr(seller)}${mine}</span>`;

      // show each review's comment under the product
      if (reviewCount > 0) {
        const sub = document.createElement("ul");
        for (let r = 0; r < reviewCount; r++) {
          const [reviewer, rating, comment] = await reviews.getReview(i, r);
          const item = document.createElement("li");
          item.className = "muted";
          item.textContent = `${"★".repeat(Number(rating))} "${comment}" by ${shortAddr(reviewer)}`;
          sub.appendChild(item);
        }
        li.appendChild(sub);
      }
      list.appendChild(li);
    }
  } catch (err) {
    showStatus("Could not read products: " + readableError(err), "error");
  }
}

// ---------- send a transaction and show the result ----------
async function sendTx(label, txPromiseFn) {
  try {
    showStatus("Please confirm the transaction in MetaMask...");
    const tx = await txPromiseFn();
    showStatus(`Transaction sent. Waiting for confirmation...\nTx hash: ${tx.hash}`);
    const receipt = await tx.wait();
    showStatus(
      `✅ ${label}\nTx hash: ${tx.hash}\nBlock: ${receipt.blockNumber}\nGas used: ${receipt.gasUsed.toString()}`,
      "ok"
    );
    await loadProducts();
    return true;
  } catch (err) {
    showStatus(`${label.replace("!", "")} failed: ` + readableError(err), "error");
    return false;
  }
}

// ---------- WRITE: addProduct ----------
async function addProduct() {
  const name = $("productName").value.trim();
  const price = $("productPrice").value;
  if (!name || !price || Number(price) <= 0) {
    showStatus("Please enter a product name and a price greater than 0.", "error");
    return;
  }
  const ok = await sendTx("Product added!", () => registry.addProduct(name, BigInt(price)));
  if (ok) {
    $("productName").value = "";
    $("productPrice").value = "";
  }
}

// ---------- WRITE: updatePrice ----------
async function updatePrice() {
  const id = $("updateId").value;
  const newPrice = $("updatePriceInput").value;
  if (id === "" || !newPrice || Number(newPrice) <= 0) {
    showStatus("Please enter a product ID and a new price greater than 0.", "error");
    return;
  }
  if (BigInt(id) >= (await registry.getProductCount())) {
    showStatus(`Product #${id} does not exist.`, "error");
    return;
  }
  const [, , seller] = await registry.getProduct(BigInt(id));
  if (seller.toLowerCase() !== currentAccount.toLowerCase()) {
    showStatus("Only the seller who added this product can change its price.", "error");
    return;
  }
  await sendTx(`Price updated for product #${id}!`, () => registry.updatePrice(BigInt(id), BigInt(newPrice)));
}

// ---------- WRITE: addReview (second contract) ----------
async function addReview() {
  const id = $("reviewId").value;
  const rating = $("reviewRating").value;
  const comment = $("reviewComment").value.trim();
  if (id === "" || !comment) {
    showStatus("Please enter a product ID and a comment.", "error");
    return;
  }
  // Friendly checks before sending (the contract enforces these rules too)
  if (BigInt(id) >= (await registry.getProductCount())) {
    showStatus(`Product #${id} does not exist.`, "error");
    return;
  }
  const [, , seller] = await registry.getProduct(BigInt(id));
  if (seller.toLowerCase() === currentAccount.toLowerCase()) {
    showStatus("Sellers cannot review their own product. Switch to another MetaMask account.", "error");
    return;
  }
  if (await reviews.hasReviewed(BigInt(id), currentAccount)) {
    showStatus("You already reviewed this product.", "error");
    return;
  }
  const ok = await sendTx(`Review added for product #${id}!`, () => reviews.addReview(BigInt(id), Number(rating), comment));
  if (ok) $("reviewComment").value = "";
}

// ---------- button events ----------
$("connectBtn").addEventListener("click", connectWallet);
$("addBtn").addEventListener("click", addProduct);
$("updateBtn").addEventListener("click", updatePrice);
$("reviewBtn").addEventListener("click", addReview);
$("refreshBtn").addEventListener("click", loadProducts);

// Reload when the user switches account or network in MetaMask
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
