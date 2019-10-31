import ApolloClient from "apollo-boost";
import gql from "graphql-tag";
import fetch from "node-fetch";

var express = require("express");

const client = new ApolloClient({
  uri: `https://demo-api.spendhub.net`,
  fetch: fetch
});

var app = express();
app.use(express.json());

// GET method route
app.get("/", function(req, res) {
  res.send("You are not authorize to acces this page.");
});

// POST method route  for Physical Card transaction
app.post("/physicalcard", async function(req, res) {
  console.log("INQUIRY RECEIVED for Physical card.");
  // Validation of OverBudget/ active user /

  let payloadPermission = {};
  console.log(req.body);
  payloadPermission.user = req.body.user_token;
  payloadPermission.amount = req.body.amount;
  payloadPermission.card_token = req.body.card_token;
  payloadPermission.Merchant = req.body.card_acceptor.mid;

  const permissionGql = gql`
    query GettransactionPermForPhysicalcard(
      $user: String
      $amount: Float
      $card_token: String
      $Merchant: String
    ) {
      gettransactionPermForPhysicalcard(
        data: {
          user: $user
          amount: $amount
          card_token: $card_token
          Merchant: $Merchant
        }
      ) {
        text
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
  console.log(respx);
  let resp = {};

  resp["token"] = req.body.gpa_order.jit_funding.token;
  resp["method"] = req.body.gpa_order.jit_funding.method;
  resp["user_token"] = req.body.gpa_order.jit_funding.user_token;
  resp["amount"] = req.body.gpa_order.jit_funding.amount;
  resp["original_jit_funding_token"] = req.body.gpa_order.jit_funding.token;

  // console.log("Request received. Sending" + respx.data.gettransactionPerm.text);
  res.setHeader("Content-Type", "application/json");
  res.status(respx.data.gettransactionPermForPhysicalcard.text);
  res.send({
    jit_funding: resp
  });
});

// POST method route virtulecard
app.post("/virtulecard", async function(req, res) {
  console.log("INQUIRY RECEIVED for Virtule card.");
  console.log(req.body);
  // Validation Merchan type/ Budget / aprove or decline transections here.

  let payloadPermission = {};

  payloadPermission.user = req.body.user_token;
  payloadPermission.amount = req.body.amount;
  payloadPermission.card_token = req.body.card_token;
  payloadPermission.Merchant = req.body.card_acceptor.mid;

  // GET DATA from CARD Table
  // console.log(payloadPermission);

  const permissionGql = gql`
    query getTransactionPermission(
      $user: String
      $amount: Float
      $card_token: String
      $Merchant: String
    ) {
      gettransactionPerm(
        data: {
          user: $user
          amount: $amount
          card_token: $card_token
          Merchant: $Merchant
        }
      ) {
        text
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

  // console.log("------");
  // console.log(respx);
  // console.log("------");

  let resp = {};
  resp["token"] = req.body.gpa_order.jit_funding.token;
  resp["method"] = req.body.gpa_order.jit_funding.method;
  resp["user_token"] = req.body.gpa_order.jit_funding.user_token;
  resp["amount"] = req.body.gpa_order.jit_funding.amount;
  resp["original_jit_funding_token"] = req.body.gpa_order.jit_funding.token;

  // console.log("Request received. Sending" + respx.data.gettransactionPerm.text);
  res.setHeader("Content-Type", "application/json");
  res.status(respx.data.gettransactionPerm.text);
  res.send({
    jit_funding: resp
  });
});

app.post("/response", async function(req, res) {
  console.log("reponse...");
  var data = JSON.stringify(req.body.transactions);
  data = JSON.parse(data)[0];
  // console.log("---------------------------");
  // console.log(data);
  // console.log("---------------------------");
  const find = gql`
    mutation TEST(
      $title: String #here Title is Customer Name
      $user_token: String
      $token: String
      $state: Boolean
      $card_token: String
      $user_transaction_time: String
      $ImpacktedAmount: Float
    ) {
      transections(
        data: {
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
  
  // Temp Ejustment 
  state = Math.random() < 0.7;
  console.log('state',state);
  
  let respx = null;
  if (data.hasOwnProperty("card_acceptor")) {
    console.log("2nd Response received...");
    console.log(data);

    await client
      .mutate({
        mutation: find,
        variables: {
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
});
