import "./App.css";
import "./bootstrap.min.css";
//import 'bootstrap/dist/css/bootstrap.min.css'
import React from "react";
import MyAlgoConnect from "@randlabs/myalgo-connect";
import { useState } from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";

import { useEffect } from "react";
// import Toast from "react-bootstrap/Toast";
// import ToastContainer from "react-bootstrap/ToastContainer";
import logo from "./logo.png";
import Home from "./pages/home";
import Pool from "./pages/pool";
import Swap from "./pages/swap";
import Burn from "./pages/burn";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

const myAlgoWallet = new MyAlgoConnect();

function App() {

  const connect = async () => {
    try {
      const accounts = await myAlgoWallet.connect();
      const addresses = accounts.map((account) => account.address);
      console.log("addresses : ", addresses);
      localStorage.setItem("walletAddress", addresses[0]);
      setShowButton(false);
    } catch (err) {
      console.error(err);
    }
  };
  const wallet = async() => {
    let v = localStorage.getItem("walletAddress");
    if(v){
      setShowButton(false)
    }
    else{
      setShowButton(true)
    }
  }
  useEffect(() =>{wallet()},[localStorage.getItem("walletAddress")])

  const [showButton, setShowButton] = useState(true);
  let walletAddress = localStorage.getItem("walletAddress");

  const disconnect = async() => {
    localStorage.setItem("walletAddress", "");
    setShowButton(true)
  }

  return (
    <Router>
      <Navbar bg="white" variant="light" sticky="top">
        <Container fluid>
          <Navbar.Brand href="/home">
            <img
              alt=""
              src={logo}
              width="40"
              height="40"
              className="d-inline-block App-logo"
            />{" "}
            Element Swap
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="responsive-navbar-nav" />
          <Navbar.Collapse id="responsive-navbar-nav">
            <Nav variant="pills" defaultActiveKey="/home">
              <Link to="/pool">
                  <Button variant="light">
                      Pool
                  </Button>
              </Link>
              &nbsp;&nbsp;&nbsp;
              <Link to="/swap">
                  <Button variant="light">
                      Swap
                  </Button>
              </Link>
              &nbsp;&nbsp;&nbsp;
              <Link to="/burn">
                  <Button variant="light">
                      Remove Liquidity
                  </Button>
              </Link>
            </Nav>
          </Navbar.Collapse>
          { showButton ? <Button variant="light" onClick={() => connect()}>
            Connect to Wallet
          </Button> : <Button variant="light"  onClick={() => disconnect()}>{(localStorage.getItem("walletAddress")).substring(0, 6)}...{(localStorage.getItem("walletAddress")).substring((localStorage.getItem("walletAddress")).length -4, (localStorage.getItem("walletAddress")).length)}</Button>}
          
        </Container>
      </Navbar>
      <Switch>
        <Route exact path="/">
          <Home />
        </Route>
        <Route path="/home">
          <Home />
        </Route>
        <Route path="/pool">
          <Pool />
        </Route>
        <Route path="/swap">
          <Swap />
        </Route>
        <Route path="/burn">
          <Burn />
        </Route>
      </Switch>
    </Router>

  );
}
export default App;
