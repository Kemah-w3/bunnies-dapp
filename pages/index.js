import Head from "next/head"
import Web3Modal from "web3modal"
import { BigNumber, Contract, providers, utils } from "ethers"
import styles from "../styles/Home.module.css"
import { useEffect, useState, useRef } from "react"
import { BUNNIES_CONTRACT_ADDRESS, BUNNIES_CONTRACT_ABI } from "../constants"
import { merkleTree, rootHash } from "../whitelist/merkleProof"
import { keccak256 } from "ethers/lib/utils"

export default function Home() {
  const one = BigNumber.from(1)
  const [walletConnected, setWalletConnected] = useState(false)
  const web3ModalRef = useRef()
  const [quantity, setQuantity] = useState(one)
  const [whitelistMintStage, setWhitelistMintStage] = useState(false)
  const [publicMintStage, setPublicMintStage] = useState(false)
  // const [merkleRoot, setMerkleRoot] = useState(rootHash)
  const [loading, setLoading] = useState(false)
  const [mintedForFree, setMintedForFree] = useState(false)
  const [freeMinted, setFreeMinted] = useState(0)
  const [userAddress, setUserAddress] = useState("")
  const [merkleProof, setMerkleProof] = useState([])
  const [totalAmountMinted, setTotalAmountMinted] = useState(0)
  const [maxSupply, setMaxSupply] = useState(0)

  const onPageLoad = async() => {
    setInterval(async() => {
      await getTotalAndMaxSupply()
      await getMintStatus()
    }, 5 * 1000)
    checkFreeMint()
    checkTotalFreeMinted()
    getProof()
    console.log(rootHash)
  }

  const getProof = async() => {
    const signer = await getProviderOrSigner(true)
    const _userAddress = await signer.getAddress()
    const _leaf = keccak256(_userAddress)
    const _merkleProof = merkleTree.getHexProof(_leaf)
    setUserAddress(_userAddress)
    setMerkleProof(_merkleProof)
  }

  useEffect(() => {
    web3ModalRef.current = new Web3Modal({
      network: "goerli",
      providerOptions: {},
      disableInjectedProvider: false
    })
    checkFreeMint()
    checkTotalFreeMinted()
    getTotalAndMaxSupply()
    onPageLoad()
  }, [walletConnected])


  const getProviderOrSigner = async(isSigner = false) => {
    const provider = await web3ModalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()

    if(chainId != 5) {
      window.alert("Incorrect network, please connect to goerli")
      throw new Error("Connect to goerli")
    }

    if(isSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }
    return web3Provider
  }

  const connectWallet = async() => {
    try {
      await getProviderOrSigner()
      setWalletConnected(true)
    } catch (error) {
      console.error(error)
    }
  }

  const handleIncrement = () => {
    if(quantity < 2){
      return(
        setQuantity(quantity.add(1))
      )
    }
  }

  const handleDecrement = () => {
    if(quantity > 1){
      return(
        setQuantity(quantity.sub(1))
      )
    }
  }

  const getMintStatus = async() => {
    try {  
      const provider = await getProviderOrSigner()
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        provider
      )
      const _whitelistMintStage = await bunniesContract.whitelist_MintEnabled()
      setWhitelistMintStage(_whitelistMintStage)
      const _publicMintStage = await bunniesContract.public_MintEnabled()
      setPublicMintStage(_publicMintStage)
    } catch (error) {
      console.error(error)
    }
  }

  const checkFreeMint = async() => {
    try {
      const provider = await getProviderOrSigner()
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        provider
      )
      const hasMintedFree = await bunniesContract.mintedFree(userAddress)
      console.log(hasMintedFree)
      setMintedForFree(hasMintedFree)
    } catch (error) {
      console.error(error)
    }
  }

  const checkTotalFreeMinted = async() => {
    try {
      const provider = await getProviderOrSigner()
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        provider
      )
      const totalFreeMinted = (await bunniesContract.totalFreeMinted()).toNumber()
      console.log(totalFreeMinted)
      setFreeMinted(totalFreeMinted)
    } catch (error) {
      console.error(error)
    }
  }

  const callWhitelistMint = async() => {
    try {
      const signer = await getProviderOrSigner(true)
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        signer
      )
      let mintPrice
      if (freeMinted <= 900) {
        if(quantity > 1) {
          if(!mintedForFree) {
            mintPrice = (utils.parseEther("0.007")).mul(quantity - 1)
          } else {
            mintPrice = (utils.parseEther("0.007").mul(quantity))
          }
        } else if(quantity == 1) {
          if(!mintedForFree) {
            mintPrice = utils.parseEther("0")
          } else {
            mintPrice = (utils.parseEther("0.007").mul(quantity))
          } 
        }
      } else {
        mintPrice = (utils.parseEther("0.007").mul(quantity))
      }
      
      // const mintPrice = (utils.parseEther("0.007").mul(quantity))
      const tx = await bunniesContract.mint(
        quantity,
        merkleProof,
        {
          value: mintPrice
        }
      )
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Mint successful!")
    } catch (error) {
      console.error(error)
    }
  }

  const callPublicMint = async() => {
    try {
      const signer = await getProviderOrSigner(true)
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        signer
      )
      
      const mintPrice = (utils.parseEther("0.007").mul(quantity))
      const tx = await bunniesContract.publicMint(
        quantity,
        {
          value: mintPrice
        }
      )
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Mint successful!")
    } catch (error) {
      console.error(error)
    }
  }

  const getTotalAndMaxSupply = async() => {
    try {
      const provider = await getProviderOrSigner()
      const bunniesContract = new Contract(
        BUNNIES_CONTRACT_ADDRESS,
        BUNNIES_CONTRACT_ABI,
        provider
      )

      const _totalSupply = await bunniesContract.totalSupply()
      const _maxSupply = await bunniesContract.maxSupply()
      setMaxSupply(_maxSupply.toNumber())
      setTotalAmountMinted(_totalSupply.toNumber())
      console.log("max supply 2", maxSupply)
      console.log("total supply 2", totalAmountMinted)
    } catch (error) {
      console.log(error)
    }
  }

  function renderMint() {
    if(whitelistMintStage) {
      if(merkleProof.length > 0) {
        return (
          <div>
            <div className={styles.input_div}>
              <button className={styles.button} onClick={handleDecrement}>-</button>
              <input
                className={styles.input}
                type="number"
                value={quantity}
                disabled="disabled"
              />
              <button className={styles.button} onClick={handleIncrement}>+</button>
            </div>
            {}
            <button className={styles.mint_button} onClick={callWhitelistMint}>Mint</button>
            <div>
              Congrats! Your Wallet
              <br/>
              <span className={styles.address}>{userAddress}</span> 
              <br/>
              Is Whitelisted
            </div>
          </div>
        )
      }else {
        return(
          <div>
            Sorry! Your Wallet
            <br/>
            <span className={styles.address}>{userAddress}</span>
            <br/>
            Is NOT Whitelisted
            <br/>
            You can get one on opensea
          </div>
        )
      }
    }

    if(publicMintStage) {
      return(
        <div>
            <div className={styles.input_div}>
              <button className={styles.button} onClick={handleDecrement}>-</button>
              <input
                className={styles.input}
                type="number"
                value={quantity}
                disabled="disabled"
              />
              <button className={styles.button} onClick={handleIncrement}>+</button>
            </div>
            <button className={styles.mint_button} onClick={callPublicMint}>Mint</button>
        </div>
      )
    }
  }

  function renderMintStatus() {
    if(whitelistMintStage) {
      return(
        <span className={styles.stage}>WHITELIST MINT</span>
      )
    } else if(publicMintStage){
      return(
        <span className={styles.stage}>PUBLIC MINT</span>
      )
    } else {
      <span className={styles.stage}> MINT IS NOT LIVE</span>
    }
  }

  function renderSoldOut() {
    console.log("Total amount minted", totalAmountMinted)
    console.log("Max supply", maxSupply)
    if(totalAmountMinted + 50 == maxSupply) {
      return(
        <div className={styles.title}>
          Sold Out!
        </div>
      )
    }
  }

  return(
    <div className={styles.container}>
      <Head>
        <title>Bunnies NFT</title>
        <meta name="description" content="Bunnies Minting dApp"/>
        <link rel="icon" href="./bunnies.ico"/>
      </Head>
      <div className={styles.navbar}>
        <div className={styles.socials}>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./twitter.png"/>
            <a href="https://twitter.com/home" target="blank">twitter</a>
          </div>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./discord.png"/>
            <a href="https://discord.com/" target="blank">discord</a>
          </div>
          <div className={styles.icon_div}>
            <img className={styles.icon} src="./opensea.png"/>
            <a href="https://testnets.opensea.io/collection/" target="blank">opensea</a>
          </div>
        </div>
        {walletConnected ?
        <p className={styles.connect}>{userAddress.slice(0,6)}...{userAddress.slice(38,42)}</p>
        : <button className={styles.button} onClick={connectWallet}>Connect Wallet</button>
        }
      </div>

      <div className={styles.main}>
        <div className={styles.main_container}>
          <div className={styles.image}>
            <img className={styles.logo} src="./bunnies.png"/>
          </div>
          <div className={styles.description}>
            <h1 className={styles.title}>BUNNIES NFT</h1>
            <p className={styles.description}>
              Bunnies NFT is a degen collection made for true degens
            </p>
            <div>
              <p>Mint Stage : {renderMintStatus()} </p>
              <p>{totalAmountMinted} / {maxSupply} have been minted</p>
            </div>
            {(totalAmountMinted + 2009 >= maxSupply) ? renderSoldOut() : renderMint()}
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        Made with 💙 for NFT degens!
      </footer>

    </div>
  )
}