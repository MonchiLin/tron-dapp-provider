import { useEffect, useRef, useState } from 'react'
import { Button } from "antd";
import ReactJson from 'react-json-view'
import BN from 'bn.js'
// const usdtContract = `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
// https://nile.tronscan.org/#/contract/TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3
const usdtContract = `TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3`

const toAddress = `TVHNnhfQZesPqKSwHc9ZevmWHdkwjpgbPp`

const fromDecimal = (value: any, decimals: number) => {
  const multiplier = Math.pow(10, decimals);
  return value / multiplier;
}

const toDecimal = (value: any, decimals: number) => {
  const multiplier = Math.pow(10, decimals);
  return value * multiplier;
}

let tronWeb: any = null

// 轮训获取 hash
const getTransactionInfo = async (hash: string) => {
  let timer: any = null
  return new Promise((resolve, reject) => {
    timer = setInterval(async () => {
      const info = await tronWeb.trx.getTransactionInfo(hash)
      if (info.receipt) {
        clearInterval(timer)
        resolve(info)
      }
    }, 1000)
  })
}

const options = {
  feeLimit: 100_000_000,
  callValue: 0,
};

function App() {
  const [status, setStatus] = useState(false)
  const issuerAddressRef = useRef("");
  const [stringAmount, setStringAmount] = useState<any>("");

  const sendTrx = async () => {
    const tx = await window.tronWeb.transactionBuilder.sendTrx(toAddress, window.tronWeb.toSun(1), issuerAddressRef.current)
    const signedTx = await window.tronWeb.trx.sign(tx)
    const broastTx = await window.tronWeb.trx.sendRawTransaction(signedTx)
    console.log("signedTx", signedTx)
    console.log("broastTx", broastTx)
    setStringAmount(broastTx)
  }
  const getAccount = async () => {
    const data = await window.tronWeb.trx.getAccount(issuerAddressRef.current)
    setStringAmount(data)
  }
  const getBalance = async () => {
    const data = await window.tronWeb.trx.getBalance(issuerAddressRef.current)
    setStringAmount({
      balance: data,
    })
  }

  const contract1 = async () => {
    const contract = await tronWeb.contract().at(usdtContract)
    const decimalsRes = await contract.methods.decimals().call(options)
    const decimals = decimalsRes.toNumber()
    const balanceRes = await contract.methods.balanceOf(issuerAddressRef.current).call(options)
    const balance = balanceRes.div(tronWeb.BigNumber(10 ** decimals).toString()).toNumber()
    setStringAmount({
      decimals: decimals,
      balanceOf: balance
    })
  }

  const contract2 = async () => {
    const contract = await tronWeb.contract().at(usdtContract)
    const decimalsRes = await contract.methods.decimals().call(options)
    const decimals = decimalsRes.toNumber()

    // hash
    const hash = await contract.methods
      .transfer(
        toAddress,
        tronWeb.toBigNumber(2).times(10 ** decimals).toString()
      )
      .send(options)
      .catch((err: any) => {
        console.error("err => ", err)
      })
    setStringAmount({
      transferHash: hash
    })
    // 获取 hash 交易信息
    const txInfo = await getTransactionInfo(hash)
    setStringAmount({
      txHash: hash,
      txInfo: txInfo,
    })
  }

  const triggerSmartContract1 = async () => {
    const decimalsRes = await window.tronWeb.transactionBuilder
      .triggerSmartContract(
        usdtContract,
        "decimals()",
        options,
        [],
        issuerAddressRef.current
      );
    const balanceOfRes = await window.tronWeb.transactionBuilder
      .triggerSmartContract(
        usdtContract,
        "balanceOf(address)",
        options,
        [
          {
            type: 'address',
            value: issuerAddressRef.current
          }
        ],
        issuerAddressRef.current
      );
    const decimals = parseInt(decimalsRes.constant_result[0], 16)
    setStringAmount({
      decimals: decimals,
      balanceOf: fromDecimal(parseInt(balanceOfRes.constant_result[0], 16), decimals)
    })
  }

  const triggerSmartContract2 = async () => {
    const decimalsRes = await tronWeb.transactionBuilder
      .triggerSmartContract(
        usdtContract,
        "decimals()",
        options,
        [],
        issuerAddressRef.current
      );

    const decimals = parseInt(decimalsRes.constant_result[0], 16)

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      usdtContract,
      "transfer(address,uint256)",
      options,
      [
        {type: 'address', value: toAddress},
        {type: 'uint256', value: tronWeb.toBigNumber(2).times(10 ** decimals).toString()}
      ],
      issuerAddressRef.current
    );

    const signedTx = await tronWeb.trx.sign(tx.transaction);
    const broastTx = await tronWeb.trx.sendRawTransaction(signedTx);
    console.log(broastTx);
    setStringAmount(broastTx)
  }

  useEffect(() => {
    const obj = setInterval(async () => {
      if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        clearInterval(obj)
        tronWeb = window.tronWeb
        setStatus(true)
        issuerAddressRef.current = window.tronWeb.defaultAddress.base58
      }
    }, 10)

  }, [])

  return (
    <div className={"w-screen h-screen flex justify-center flex-col px-4"}>
      <div onClick={sendTrx} className={"mt-5"}>
        <p>链接状态 {status ? "已连接" : "未连接"}</p>
        <p>节点 {status ? window.tronWeb.fullNode.host : "false"}</p>
      </div>
      <div className={"flex flex-col mt-5"}>
        <Button onClick={sendTrx} className={"mt-2"}>
          发送 TRX
        </Button>
        <Button onClick={getAccount} className={"mt-2"}>
          getAccount
        </Button>
        <Button onClick={getBalance} className={"mt-2"}>
          getBalance
        </Button>
        <Button onClick={triggerSmartContract1} className={"mt-2"}>
          triggerConstantContract(获取余额和精度)
        </Button>
        <Button onClick={triggerSmartContract2} className={"mt-2"}>
          triggerSmartContract(转账)
        </Button>
        <Button onClick={contract1} className={"mt-2"}>
          contract 实例(获取余额和精度)
        </Button>
        <Button onClick={contract2} className={"mt-2"}>
          contract 实例(转账)
        </Button>
      </div>
      <div
        className={"w-screen overflow-auto mt-5"}
      >
        {
          typeof stringAmount === "object"
            ? <ReactJson src={stringAmount}/>
            : stringAmount
        }
      </div>
    </div>
  )
}

export default App
