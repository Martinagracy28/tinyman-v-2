import React from "react";
import MyAlgoConnect from "@randlabs/myalgo-connect";
import algosdk from "algosdk";
import { useState } from "react";
import { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";
import "./../bootstrap.min.css";

const myAlgoWallet = new MyAlgoConnect();
const algodClient = new algosdk.Algodv2('', 'https://api.testnet.algoexplorer.io', '');
let appID_global = 56830710;
let data = `#pragma version 4
    
// Element Pool LogicSig


// This code should be read in conjunction with validator_approval.teal.
// The validation logic is split between these two programs.

// ensure ASSET_ID_1 > ASSET_ID_2
int Token1   
int Token2   
>
assert

txn CloseRemainderTo
global ZeroAddress
==
assert

txn AssetCloseTo
global ZeroAddress
==
assert

txn RekeyTo
global ZeroAddress
==
assert

global GroupSize
int 1
>
assert

// ensure gtxn 1 is ApplicationCall to Validator App
gtxn 1 Sender
txn Sender
==
assert

gtxn 1 TypeEnum
int appl // ApplicationCall
==
assert

gtxn 1 ApplicationID
int 56830710
==
assert

// Bootstrap?
gtxn 1 OnCompletion
int OptIn
==
gtxn 1 NumAppArgs
int 3
==
&&
gtxna 1 ApplicationArgs 0
byte "bootstrap"
==
&&
bnz bootstrap


// The remaining operations (Mint/Burn/Swap/Redeem/Fees) must all have OnCompletion=NoOp
gtxn 1 OnCompletion
int NoOp
==
assert

// Swap?
gtxn 1 NumAppArgs
int 2
==
gtxna 1 ApplicationArgs 0
byte "swap"
==
&&
bnz swap


// The remaining operations (Mint/Burn/Redeem/Fees) must all have NumAppArgs=1
gtxn 1 NumAppArgs
int 1
==
assert

// Mint?
gtxna 1 ApplicationArgs 0
byte "mint"
==
bnz mint


// Burn?
gtxna 1 ApplicationArgs 0
byte "burn"
==
bnz burn

// Redeem?
gtxna 1 ApplicationArgs 0
byte "redeem"
==
bnz redeem

// Fees?
gtxna 1 ApplicationArgs 0
byte "fees"
==
bnz redeem_fees

err


bootstrap:
    // Ensure group size is correct 4 or 5:
    // 0: Pay Fees (signed by Pooler)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Creation (signed by Pool LogicSig)
    // 3: Asset Optin (signed by Pool LogicSig)
    // If asset 2 is an ASA:
    // (4): Asset Optin (signed by Pool LogicSig)
    int 5 // 5 if asset 2 is an ASA
    int 4 // 4 if asset 2 is Algo
    int Token2
    int 0 // Algo
    ==
    select
    global GroupSize
    ==
    assert

    gtxna 1 ApplicationArgs 1
    btoi
    int Token1
    ==
    gtxna 1 ApplicationArgs 2
    btoi
    int Token2
    ==
    &&
    assert

    // ensure sender (signer) of AssetConfig tx is same as sender of app call
    gtxn 2 Sender
    txn Sender
    ==
    assert

    // ensure gtxn 2 is type AssetConfig
    gtxn 2 TypeEnum
    int acfg
    ==
    assert

    // ensure a new asset is being created
    gtxn 2 ConfigAsset
    int 0
    ==
    assert

       // ensure asset total amount is max int
          gtxn 2 ConfigAssetTotal
          int 0
          > // inverse of 0 is max int
          assert


    // ensure decimals is 6
    gtxn 2 ConfigAssetDecimals
    int 6
    ==
    assert

    // ensure default frozen is false
    gtxn 2 ConfigAssetDefaultFrozen
    int 0
    ==
    assert

    // ensure unit name is 'TM1POOL'
    gtxn 2 ConfigAssetUnitName
    byte "ELEMPOOL"
    ==
    assert

    // ensure asset name begins with 'Element Pool '
    // the Validator app ensures the name ends with "{asset1_unit_name}-{asset2_unit_name}"
    gtxn 2 ConfigAssetName
    substring 0 13
    byte "Element Pool "
    ==
    assert

    // ensure asset url is 'https://Element.org'
    gtxn 2 ConfigAssetURL
    byte "https://Element.org"
    ==
    assert

    // ensure no asset manager address is set
    gtxn 2 ConfigAssetManager
    global ZeroAddress
    ==
    assert

    // ensure no asset reserve address is set
    gtxn 2 ConfigAssetReserve
    global ZeroAddress
    ==
    assert

    // ensure no asset freeze address is set
    gtxn 2 ConfigAssetFreeze
    global ZeroAddress
    ==
    assert

    // ensure no asset clawback address is set
    gtxn 2 ConfigAssetClawback
    global ZeroAddress
    ==
    assert

    // Asset 1 optin
    // Ensure optin txn is signed by the same sig as this txn
    gtxn 3 Sender
    txn Sender
    ==
    assert

    // ensure txn type is AssetTransfer
    gtxn 3 TypeEnum
    int axfer
    ==
    assert

    // ensure the asset id is the same as asset 1
    gtxn 3 XferAsset
    int Token1
    ==
    assert

    // ensure the receiver is the sender
    gtxn 3 AssetReceiver
    txn Sender
    ==
    assert

    // ensure the amount is 0 for Optin
    gtxn 3 AssetAmount
    int 0
    ==
    assert

    // if asset 2 is not 0 (Algo), it needs an optin
    int Token2
    int 0
    !=
    bnz bootstrap__non_algo

    gtxn 1 Fee
    gtxn 2 Fee
    +
    gtxn 3 Fee
    +
    store 1 // fee_total
    b check_fees


    bootstrap__non_algo:
    // verify 5th txn is asset 2 optin txn
    gtxn 4 Sender
    txn Sender
    ==
    assert
    gtxn 4 TypeEnum
    int axfer
    ==
    assert

    // ensure the asset id is the same as asset 2
    gtxn 4 XferAsset
    int Token2   
    ==
    assert

    // ensure the receiver is the sender
    gtxn 4 AssetReceiver
    txn Sender
    ==
    assert

    // ensure the amount is 0 for Optin
    gtxn 4 AssetAmount
    int 0
    ==
    assert

    gtxn 1 Fee
    gtxn 2 Fee
    +
    gtxn 3 Fee
    +
    gtxn 4 Fee
    +
    store 1 // fee_total
    b check_fees

mint:
    // Mint Checks:
    //
    // # ensure group size is 5
    // global GroupSize == 5

    // 	# ensure transaction fees are covered by txn 0
    // 	# ensure Pool is not paying the fee
    // 	gtxn 0 Sender != txn Sender
    // 	gtxn 0 Receiver == txn Sender
    // 	gtxn 0 Amount >= (gtxn 1 Fee + gtxn 4 Fee)

    // 	# verify the receiver of the liquidity token asset is the one whose local state is updated
    // 	gtxna 1 Accounts 1 != txn Sender
    // 	gtxna 1 Accounts 1 == gtxn 4 AssetReceiver

    // 	# from Pooler to Pool asset 1
    // 	gtxn 2 Sender (Pooler) != txn Sender (Pool)
    // 	gtxn 2 AssetReceiver (Pool) == txn Sender (Pool)
    // 	gtxn 2 Sender (Pooler) == gtxn 3 Sender (Pooler)

    // 	# from Pooler to Pool asset 2
    // 	txn Sender (Pool) == (gtxn 3 AssetReceiver or gtxn 3 Receiver) (Pool)


    // 	# from Pool to Pooler liquidity token
    // 	gtxn 4 AssetReceiver (Pooler) == gtxn 2 Sender (Poooler)
    // 	gtxn 4 Sender (Pool) == txn Sender (Pool)


    // ensure group size is 5:
    // 0: Pay Fees (signed by Pooler)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Transfer/Pay (signed by Pooler)
    // 3: Asset Transfer/Pay (signed by Pooler)
    // 4: Asset Transfer/Pay (signed by Pool LogicSig)
    global GroupSize
    int 5
    ==
    assert

    // verify the receiver of the asset is the one whose local state is updated
    gtxna 1 Accounts 1
    txn Sender
    !=
    assert

    gtxna 1 Accounts 1
    gtxn 4 AssetReceiver
    ==
    assert

    // verify txn 2 is AssetTransfer from Pooler to Pool
    gtxn 2 Sender
    txn Sender
    !=
    assert

    gtxn 2 AssetReceiver
    txn Sender
    ==
    assert

    gtxn 3 Sender
    gtxn 2 Sender
    ==
    assert

    // verify txn 3 is AssetTransfer from Pooler to Pool
    gtxn 3 AssetReceiver
    gtxn 3 Receiver
    gtxn 3 TypeEnum
    int pay
    == // check if Algo
    select
    txn Sender
    ==
    assert

    // verify txn 4 is AssetTransfer from Pool to Pooler
    gtxn 4 Sender
    txn Sender
    ==
    assert

    gtxn 4 AssetReceiver
    gtxn 2 Sender
    ==
    assert

    gtxn 1 Fee
    gtxn 4 Fee
    +
    store 1 // fee_total
    b check_fees


burn:
    // Burn Checks:
    //
    // # ensure group size is 5
    // global GroupSize == 5

    // # ensure transaction fees are covered by txn 0
    // # ensure Pool is not paying the fee
    // gtxn 0 Sender != txn Sender
    // gtxn 0 Receiver == txn Sender
    // gtxn 0 Amount >= (gtxn 1 Fee + gtxn 2 Fee gtxn 3 Fee)

    // # ensure the calculated amounts are not 0
    // calculated_asset1_out != 0
    // calculated_asset2_out != 0

    // # verify the receiver of the assets is the one whose local state is updated
    // gtxna 1 Accounts 1 != txn Sender
    // gtxna 1 Accounts 1 == gtxn 2 AssetReceiver
    // gtxna 1 Accounts 1 == (gtxn 3 AssetReceiver or gtxn 3 Receiver)

    // # from Pool to Pooler asset 1
    // gtxn 2 Sender (Pooler) == txn Sender (Pool)
    // gtxn 2 AssetReceiver (Pool) == gtxn 4 Sender (Pool)
    // gtxn 3 Sender (Pool) == txn Sender (Pool)

    // # from Pool to Pooler asset 2
    // gtxn 4 Sender (Pooler) == (gtxn 3 AssetReceiver or gtxn 3 Receiver) (Pool)


    // # from Pooler to Pool liquidity token
    // gtxn 4 Sender (Pooler) != txn Sender (Pool)
    // gtxn 4 AssetReceiver == txn Sender (Pool)

    // ensure group size is 5:
    // 0: Pay Fees (signed by Pooler)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Transfer/Pay (signed by Pool LogicSig)
    // 3: Asset Transfer/Pay (signed by Pool LogicSig)
    // 4: Asset Transfer/Pay (signed by Pooler)
    global GroupSize
    int 5
    ==
    assert

    // verify the receiver of the assets is the one whose local state is updated
    gtxna 1 Accounts 1
    txn Sender
    !=
    assert

    gtxna 1 Accounts 1
    gtxn 2 AssetReceiver
    ==
    assert

    gtxn 3 AssetReceiver
    gtxn 3 Receiver
    gtxn 3 TypeEnum
    int pay
    ==
    select
    gtxna 1 Accounts 1
    ==
    assert

    // 2: AssetTransfer - from Pool to Pooler asset 1
    gtxn 2 Sender
    txn Sender
    ==
    assert

    gtxn 2 AssetReceiver
    gtxn 4 Sender
    ==
    assert

    gtxn 3 Sender
    txn Sender
    ==
    assert

    // 3: AssetTransfer - from Pool to Pooler asset 2
    gtxn 3 AssetReceiver
    gtxn 3 Receiver
    gtxn 3 TypeEnum
    int pay
    == // if algo
    select
    gtxn 4 Sender
    ==
    assert

    // 4: AssetTransfer - from Pooler to Pool liquidity token
    gtxn 4 Sender
    txn Sender
    !=
    assert

    gtxn 4 AssetReceiver
    txn Sender
    ==
    assert

    gtxn 1 Fee
    gtxn 2 Fee
    +
    gtxn 3 Fee
    +
    store 1 // fee_total
    b check_fees


swap:
    // ensure group size is 4:
    // 0: Pay Fees (signed by Swapper)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Transfer/Pay (signed by Swapper)
    // 3: Asset Transfer/Pay (signed by Pool LogicSig)
    global GroupSize
    int 4
    ==
    assert

    //  ensure accounts[1] is not Pool
    gtxna 1 Accounts 1
    txn Sender
    !=
    assert

    // ensure the sender of asset in is the one whose local state is updated
    gtxn 2 Sender
    gtxna 1 Accounts 1
    ==
    assert

    // ensure txn 2 sender is not the Pool
    gtxn 2 Sender
    txn Sender
    !=
    assert

    // ensure txn 3 sender is the Pool
    gtxn 3 Sender
    txn Sender
    ==
    assert

    // ensure txn 2 receiver is Pool
    gtxn 2 AssetReceiver
    gtxn 2 Receiver
    gtxn 2 TypeEnum
    int pay
    == // if Algo
    select
    txn Sender
    ==
    assert

    // ensure txn 3 receiver is Swapper (sender of txn 2)
    gtxn 3 AssetReceiver
    gtxn 3 Receiver
    gtxn 3 TypeEnum
    int pay
    == // if Algo
    select
    gtxn 2 Sender
    ==
    assert

    gtxn 1 Fee
    gtxn 3 Fee
    +
    store 1 // fee_total
    b check_fees


redeem:
    // ensure group size is 3:
    // 0: Pay Fees (signed by Swapper)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Transfer/Pay (signed by Pool LogicSig)
    global GroupSize
    int 3
    ==
    assert

    //  ensure accounts[1] is not Pool
    gtxna 1 Accounts 1
    txn Sender
    !=
    assert

    // ensure the receiver of the asset is the one whose local state is updated
    gtxn 2 AssetReceiver
    gtxn 2 Receiver
    gtxn 2 TypeEnum
    int pay
    == // if algo
    select
    gtxna 1 Accounts 1
    ==
    assert

    gtxn 1 Fee
    gtxn 2 Fee
    +
    store 1 // fee_total
    b check_fees


redeem_fees:
    // ensure group size is 3:
    // 0: Pay Fees (signed by User)
    // 1: Call App (signed by Pool LogicSig)
    // 2: Asset Transfer/Pay (signed by Pool LogicSig)
    global GroupSize
    int 3
    ==
    assert

    gtxn 1 Fee
    gtxn 2 Fee
    +
    store 1 // fee_total
    b check_fees



check_fees:
    // ensure gtxn 0 amount covers all fees
     // ensure Pool is not paying the fee
    gtxn 0 Sender
    txn Sender
    !=
    assert

     // ensure Pool is receiving the fee
    gtxn 0 Receiver
    txn Sender
    ==
    assert

    gtxn 0 Amount
    load 1 // fee_total
    >=
    return`;
  
  
function Burn() {

    const [s1, sets1] = useState("");
    const [s2, sets2] = useState("");
    const [ilt, setilt] = useState("");
    const [tokenid1,settoken1] = useState("");
    const [tokenid2,settoken2] = useState("");
    const [appId,setAppId] = useState("");
    const[swapamount,set_inp_goal] = useState("");
    const[samount,sets] = useState("");
    const[swapbutton,setswapbutton] = useState("");
    const[txId, setTxId] = useState("");
    const [show, setShow] = useState(false);
    const[liquidity_asset_in,setLiquidityassetin] = useState("");
     
    const waitForConfirmation = async function (algodclient, txId) {
      let status = await algodclient.status().do();
      let lastRound = status["last-round"];
      while (true) {
        const pendingInfo = await algodclient
          .pendingTransactionInformation(txId)
          .do();
        if (
          pendingInfo["confirmed-round"] !== null &&
          pendingInfo["confirmed-round"] > 0
        ) {
          //Got the completed Transaction
          console.log(
            "Transaction " +
              txId +
              " confirmed in round " +
              pendingInfo["confirmed-round"]
          );
          break;
        }
        lastRound++;
        await algodclient.statusAfterBlock(lastRound).do();
      }
    };

    async function readLocalState(client, account, index1){
        let accountInfoResponse = await client.accountInformation(account).do();
        console.log("accinfo",accountInfoResponse);
       
        for (let i = 0; i < accountInfoResponse['apps-local-state'].length; i++) { 
          if (accountInfoResponse['apps-local-state'][i].id == index1) {
              console.log("Application's global state:");
              for (let n = 0; n < accountInfoResponse['apps-local-state'][i]['key-value'].length; n++) {
                 // console.log(accountInfoResponse['apps-local-state'][i]['key-value']);
                  let enc = accountInfoResponse['apps-local-state'][i]['key-value'][n];
                  if(enc['key'] === "czE="){
                    sets1(enc.value.uint)
                  }
                  if(enc['key'] === "czI="){
                    sets2(enc.value.uint)
                  }
                  if(enc['key'] === "aWx0"){
                    setilt(enc.value.uint)
                  }             
              }
              
          }
      }
    }
    const selecttoken = async(appid) =>{
      let index = parseInt(appid);
      console.log("appId inside donate", index);

      let t1,t2;
      if(tokenid1 > tokenid2 ){
          t1 = tokenid1;
          t2 = tokenid2;
          
      }
      else{
          t1 = tokenid2;
          t2 = tokenid1;
          
      }
      setAppId(appid);
      let replacedData = data.replaceAll("Token1",t1);
      let replacedData2 = replacedData.replaceAll("Token2",t2);
      let replacedData3 = replacedData2.replaceAll("appId",appId);
     console.log("compiling")
      let results = await algodClient.compile(replacedData3).do();
      localStorage.setItem("escrow",results.hash);
      readLocalState(algodClient,results.hash,appId);
      setswapbutton(true);

    } 
    useEffect(() =>{first()},[s1,s2])
    const first = () =>{
      const algodClient = new algosdk.Algodv2(
        "",
        "https://api.testnet.algoexplorer.io",
        ""
      );
      
      readLocalState(algodClient,localStorage.getItem("escrow"),appID_global)
    }

    const burn = async (appid,asset_in_amount) => {
 
      let index = parseInt(appid);
      console.log("appId inside donate", index);

      setAppId(appid);
      let t1,t2;
      if(tokenid1 > tokenid2 ){
          t1 = tokenid1;
          t2 = tokenid2;
          
      }
      else{
          t1 = tokenid2;
          t2 = tokenid1;
          
      }
      let replacedData = data.replaceAll("Token1",t1).replaceAll("Token2",t2).replaceAll("appId",appId);
      let results = await algodClient.compile(replacedData).do();
   console.log("data")

      console.log("Hash = " + results.hash);
      console.log("Result = " + results.result);
      let escrowaddress = localStorage.getItem("escrow");
      console.log("escrow",escrowaddress)
      let accountInfoResponse = await algodClient.accountInformation(results.hash).do();
      console.log("account",accountInfoResponse);
      let assetId3 = accountInfoResponse['created-assets'][0]['index'];
      console.log('Asset 3 ID: ', assetId3);
  
      let program = new Uint8Array(Buffer.from(results.result, "base64"));
  
      let lsig = algosdk.makeLogicSig(program);
      console.log("Escrow =", lsig.address()); 

          readLocalState(algodClient,escrowaddress,appId);
          console.log(s1)
          let asset1_amount = (liquidity_asset_in * s1) / ilt ;
          let asset2_amount = (liquidity_asset_in * s2) / ilt ;
          let asset1_amount_out = asset1_amount - (asset1_amount * 0.5)
          let asset2_amount_out = asset2_amount - (asset2_amount * 0.5)

          try {
            // const accounts = await myAlgoWallet.connect();
            // const addresses = accounts.map(account => account.address);
            const params = await algodClient.getTransactionParams().do();
            
            let sender =  localStorage.getItem("walletAddress");
            let recv_escrow = lsig.address();
            let amount = 3000;
            
            let note1=[];
            note1.push(new Uint8Array(Buffer.from("fee")));
            let transaction1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
              from:  localStorage.getItem("walletAddress"), 
              to: recv_escrow, 
              amount: amount, 
              //  note: note1,  
               suggestedParams: params
             });
           
             let appArg = [];
             appArg.push(new Uint8Array(Buffer.from("burn")));
             
             let foreignassets = [];
            //  let decAddr = algosdk.decodeAddress(addresses[0]);
            //  foreignassets.push(decAddr.publicKey);
             foreignassets.push(parseInt(t1));
             foreignassets.push(parseInt(t2));
             foreignassets.push(parseInt(assetId3));
             const transaction2 = algosdk.makeApplicationNoOpTxnFromObject({
                 from: recv_escrow, 
                 appIndex: index,
                 appArgs: appArg,
                 appAccounts: localStorage.getItem("walletAddress"),
                 accounts: [ localStorage.getItem("walletAddress")],
                 foreignAssets:foreignassets,
                 suggestedParams: params
               });
      
             
              console.log(parseInt(asset1_amount).toFixed(0))
              const transaction3 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                from:recv_escrow ,
                to:  localStorage.getItem("walletAddress"),
                assetIndex: parseInt(t1),
                note: undefined,
                accounts:  localStorage.getItem("walletAddress"),
                amount: parseInt(parseInt(asset1_amount_out.toFixed(0))),
                suggestedParams: params
              });
  
              const transaction4 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                from:recv_escrow ,
                to:  localStorage.getItem("walletAddress"),
                assetIndex: parseInt(t2),
                note: undefined,
                accounts:  localStorage.getItem("walletAddress"),
                amount: parseInt(asset2_amount_out.toFixed(0)),
                suggestedParams: params
              });
              
              let foreignassetliquidity =[];
              foreignassetliquidity.push(parseInt(assetId3));
              // let decAddr = algosdk.decodeAddress(recv_escrow);
              // let acc =[];
              // acc.push(decAddr.publicKey);
              const transaction5 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                from:  localStorage.getItem("walletAddress") ,
                to:recv_escrow ,
                assetIndex: parseInt(assetId3),
                note: undefined,
                accounts: [recv_escrow],
                appAccounts:recv_escrow,
                foreignAssets:foreignassetliquidity,
                amount: parseInt(liquidity_asset_in),
                suggestedParams: params
              });
      
          
            const groupID = algosdk.computeGroupID([ transaction1, transaction2, transaction3, transaction4, transaction5]);
            const txs = [ transaction1, transaction2, transaction3, transaction4, transaction5];
            txs[0].group = groupID;
            txs[1].group = groupID;
            txs[2].group = groupID;
            txs[3].group = groupID;
            txs[4].group = groupID;
            
            const signedTx1 = await myAlgoWallet.signTransaction([txs[0].toByte(),txs[4].toByte()]);
            const signedTx2 = algosdk.signLogicSigTransaction(txs[1], lsig);
            const signedTx3 = algosdk.signLogicSigTransaction(txs[2], lsig);
            const signedTx4 = algosdk.signLogicSigTransaction(txs[3], lsig);
            // const signedTx5 = await myAlgoWallet.signTransaction(txs[4].toByte());
      
      const response = await algodClient.sendRawTransaction([ signedTx1[0].blob, signedTx2.blob, signedTx3.blob, signedTx4.blob, signedTx1[1].blob ]).do();
         
    console.log("TxID", JSON.stringify(response, null, 1));
    setTxId(response.txId);
    setShow(true);
    await waitForConfirmation(algodClient, response.txId);
      } catch (err) {
        console.error(err);
      }
    };

    function setvalue(asset_in_amount){

        set_inp_goal(asset_in_amount);
        let k = s1 * s2 ;
        console.log(s1)
        let asset_in_amount_minus_fee = (asset_in_amount * 997) / 1000
            
        let swap_fees = asset_in_amount - asset_in_amount_minus_fee
            
        let l = asset_in_amount_minus_fee - swap_fees;
        let asset_out_amount = s2 - (k / (s1 + l ))   
        console.log("s",asset_out_amount);
        
        sets(asset_out_amount);
    
    }
  
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "88vh",
        }}
      >
       
        <Container>
          <Row className="justify-content-md-center">
            <Col xs lg="4"></Col>
            <Col xs lg="5">
              <h1>Remove Liquidity</h1>
            </Col>          
            <Col xs lg="3"></Col>
          </Row>
          <br/>
          <br/>            
            {!swapbutton ?<div><Row className="justify-content-md-center">
              <Col xs lg="4" className = "text-right">Select Asset 1 : </Col>
              <Col xs lg="2">
                <input type="number" name="Asset1" placeholder="Enter Asset 1" onChange={event => settoken1(event.target.value)} />           
            </Col> 
            <Col xs lg="4"></Col>
            </Row>
            <br/>
            <Row className="justify-content-md-center">
              <Col xs lg="4" className = "text-right">Select Asset 2 : </Col>
              <Col xs lg="2">
                <input type="number" placeholder="Enter Asset 2" onChange={event => settoken2(event.target.value)} />
            </Col>
            <Col xs lg="4"></Col>
            </Row></div>
            :
            <div><Row className="justify-content-md-center">
              <Col xs lg="4" className = "text-right">Enter Asset 1 Amount : </Col>
              <Col xs lg="2">
                <input type="number" name="Amount1" placeholder="Enter Asset 1 Amount" autoComplete='off' onChange={event => setLiquidityassetin((event.target.value) * 1000000)} />           
            </Col> 
            <Col xs lg="4"></Col>
            </Row>
            <br/>
            <Row className="justify-content-md-center">
            {/* <Col xs lg="4" className = "text-right">Asset 2 Amount : </Col>
            <Col xs lg="2">
                <input type="number" placeholder="Asset 2 Amount" value={samount}  />
            </Col> 
             <Col xs lg="4"></Col> */}
             </Row> </div> 
              }
          <br/>
          <Row className="justify-content-md-center">
            <Col xs lg="5"></Col>
            {!swapbutton ?
              <Col xs lg="4">
              <Button variant="primary" onClick={()=>selecttoken(appID_global)}>Confirm</Button>
              </Col> 
            :null}
            {swapbutton ?
              <Col xs lg="4">
              <Button variant="primary" onClick={()=>burn(appID_global,liquidity_asset_in)}>Burn</Button>
              </Col> 
            :null}
                     
            <Col xs lg="3"></Col>
          </Row>   
          <ToastContainer position="bottom-end" className="p-3">
            <Toast
                className="d-inline-block m-1"
                bg="light"
                key="6"
                onClose={() => setShow(false)}
                show={show}
                delay={3000}                
                >
                <Toast.Header>
                    <img
                    src="holder.js/20x20?text=%20"
                    className="rounded me-2"
                    alt=""
                    />
                    <strong className="me-auto">Element Swap</strong>
                </Toast.Header>
                <Toast.Body>Asset swapped with Transaction Id : {txId}</Toast.Body>
                </Toast>
            </ToastContainer>     
        </Container>
      </div>
    );
  };

  export default Burn;