import ApolloClient from "apollo-boost";
import gql from "graphql-tag";
import fetch from "node-fetch";
const fs = require('fs');
var express = require("express");
const dotenv = require('dotenv');

dotenv.config();

let uri =  process.env.API_URI;

const client = new ApolloClient({
  
  uri: `https://078ab386.ngrok.io`,
  
  fetch: fetch,
  request: (operation) => {
    operation.setContext({
      headers: {
        authorization: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InNlcnZpY2UiOiJkZWZhdWx0QGRlZmF1bHQiLCJyb2xlcyI6WyJhZG1pbiJdfSwiaWF0IjoxNTc1OTc3NzE3LCJleHAiOjE1NzY1ODI1MTd9.avWQFoDeioxiEA5GHDDXDdebC0tTrrviXD0e78d3MYE"
      }
    });
  }
});

var app = express();
app.use(express.json());

// GET method route
app.get("/", function(req, res) {
  res.status(200).send(`You are not authorize to access this page4. \n File Updated ${fs.statSync('validate-transaction.js').mtime}`);
  // res.send
});

app.post("/response", async function(req, res) {
  console.log('response');

  let payloadPermission = {};
  
  payloadPermission.user = req.body.acting_user_token;
  payloadPermission.amount = req.body.amount;
  payloadPermission.card_token = req.body.card_token;
  payloadPermission.Merchant = req.body.card_acceptor.mid;


    const permissionGql = gql`
    query inquiryAboutTransaction(
      $user: String
      $amount: Float
      $card_token: String
      $Merchant: String
    ) {
      inquiryAboutTransaction(
        data: {
          user: $user
          amount: $amount
          card_token: $card_token
          Merchant: $Merchant
        }
      ) {
        text
        note
      }
    }
  `;

  let respx = null;

  await client
    .query({
      query: permissionGql,
      variables: {
        user:payloadPermission.user,
        amount: payloadPermission.amount,
        card_token: payloadPermission.card_token,
        Merchant: payloadPermission.Merchant,
      },
      fetchPolicy: "network-only"
    })
    .then(resp => (respx = resp));

  console.log("------");
  console.log(respx);
  console.log("------");

  let resp = {};
  resp["token"] = req.body.gpa_order.jit_funding.token;
  resp["method"] = req.body.gpa_order.jit_funding.method;
  resp["user_token"] = req.body.gpa_order.jit_funding.user_token;
  resp["amount"] = req.body.gpa_order.jit_funding.amount;
  resp["original_jit_funding_token"] = req.body.gpa_order.jit_funding.token;

  
  res.setHeader("Content-Type", "application/json");
  res.status(respx.data.inquiryAboutTransaction);
  res.send({
    jit_funding: resp
  });

});

app.post("/acknowledgment", async function(req, res) {
  console.log("acknowledgment...");
  var data = JSON.stringify(req.body.transactions);
  data = JSON.parse(data)[0];
  // console.log("---------------------------");
  // console.log(data);
  // console.log("---------------------------");
  const find = gql`
    mutation transaction(
      $marqetaTransactionId: String!
      $title: String #here Title is Customer Name
      $user_token: String
      $token: String
      $state: Boolean
      $card_token: String
      $user_transaction_time: String
      $ImpacktedAmount: Float
    ) {
      transaction(
        data: {
          marqetaTransactionId: $marqetaTransactionId,
          title: $title
          user_token: $user_token
          token: $token
          state: $state
          card_token: $card_token
          user_transaction_time: $user_transaction_time
          ImpacktedAmount: $ImpacktedAmount
        }
      ) {
        text
      }
    }
  `;

  var state = false;
  if (data.state == "PENDING") {
    state = true;
  }
  
  // state = Math.random() < 0.7;
  console.log('state',state);
  
  let respx = null;
  if (data.hasOwnProperty("card_acceptor")) {
    console.log("2nd Response received...");
    console.log(data);

    await client
      .mutate({
        mutation: find,
        variables: {
          marqetaTransactionId: data.token,
          user_token: data.user_token,
          token: data.token,
          user_transaction_time: data.user_transaction_time,
          ImpacktedAmount: data.amount,
          card_token: data.card_token,
          state: state,
          ImpacktedAmount: parseFloat(data.amount),
          title: data.card_acceptor.mid
        },
        fetchPolicy: "no-cache"
      })
      .then(resp => (respx = resp));
    // console.log("return from node");
    // console.log(respx);
  } else {
    // console.log("1st Response received...");
    // console.log(data);
  }
  return "true";
});

var server = app.listen(3000, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("SpendHub 2nd endpint http://%s:%s", host, port);
  console.log("connected API URL:",uri);
});
