import { Card, Upload, Input, Button, Form, Steps, Typography, Row, Col } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import React, { useState } from "react";
import { NFTStorage } from "nft.storage/dist/bundle.esm.min.js";
import { Transactor } from "../helpers";
import { NFT_STORAGE_KEY } from "../constants";

const STEP_CONNECT_WALLET = 0;
const STEP_ENTER_INFO = 1;
const STEP_UPLOAD = 2;
const STEP_MINT = 3;
const STEP_FINISHED = 4;

async function mintNFT({
  contract,
  ownerAddress,
  provider,
  gasPrice,
  image,
  name,
  description,
  setStatus,
  setCurrentStep,
}) {
  // First we use the nft.storage client library to add the image and metadata to IPFS / Filecoin
  const client = new NFTStorage({ token: NFT_STORAGE_KEY });
  setStatus("Uploading to nft.storage...");
  setCurrentStep(STEP_UPLOAD);
  const metadata = await client.store({
    name,
    description,
    image,
  });
  setStatus(`Upload complete! Minting token with metadata URI: ${metadata.url}`);
  setCurrentStep(STEP_MINT);

  // scaffold-eth's Transactor helper gives us a nice UI popup when a transaction is sent
  const transactor = Transactor(provider, gasPrice);
  const tx = await transactor(contract.mint(ownerAddress, metadata.url));

  if (!tx) {
    setStatus("Transaction failed... is the contract deployed?");
    return;
  }

  setStatus("Blockchain transaction sent, waiting confirmation...");

  // Wait for the transaction to be confirmed, then get the token ID out of the emitted Transfer event.
  const receipt = await tx.wait();
  let tokenId = null;
  console.log("tx receipt:", receipt);
  for (const event of receipt.events) {
    if (event.event !== "Transfer") {
      continue;
    }
    tokenId = event.args.tokenId.toString();
    break;
  }
  setStatus(`Minted token #${tokenId}`);
  setCurrentStep(STEP_FINISHED);
  return tokenId;
}

function openSeaURL(tokenId, selectedNetwork, contractAddress) {
  if (!tokenId || !contractAddress) {
    return null;
  }
  const address = contractAddress.toLowerCase();
  switch (selectedNetwork) {
    case "rinkeby":
      return `https://testnets.opensea.io/assets/${address}/${tokenId}`;
    case "mainnnet":
      return `https://opensea.io/assets/${address}/${tokenId}`;
    default:
      return null;
  }
}

export default function Minter({ contract, signer, provider, gasPrice, selectedNetwork }) {
  const initialStep = signer == null ? STEP_CONNECT_WALLET : STEP_ENTER_INFO;

  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [nftName, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minting, setMinting] = useState(false);
  const [status, setStatus] = useState("");
  const [tokenId, setTokenId] = useState(null);
  const [currentStep, setCurrentStep] = useState(initialStep);

  const contractAddress = contract ? contract.address : undefined;
  console.log(`selected network: ${selectedNetwork}, address: ${contractAddress}`);

  if (currentStep === STEP_CONNECT_WALLET && signer != null) {
    setCurrentStep(STEP_ENTER_INFO);
  }

  const beforeUpload = (file, fileList) => {
    console.log(file, fileList);
    setFile(file);
    setPreviewURL(URL.createObjectURL(file));
    return false;
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Choose image</div>
    </div>
  );

  const uploadView = (
    <div>
      Drop an image file or click below to select.
      <Upload
        name="avatar"
        accept=".jpeg,.jpg,.png,.gif"
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        action="https://www.mocky.io/v2/5cc8019d300000980a055e76"
        beforeUpload={beforeUpload}
      >
        {uploadButton}
      </Upload>
    </div>
  );

  const preview = previewURL ? <img src={previewURL} style={{ maxWidth: "800px" }} /> : <div />;

  const nameField = (
    <Form.Item label="Name">
      <Input
        placeholder="Enter a name for your NFT"
        onChange={e => {
          setName(e.target.value);
        }}
      />
    </Form.Item>
  );

  const descriptionField = (
    <Form.Item label="Description">
      <Input.TextArea
        placeholder="Enter a description"
        onChange={e => {
          setDescription(e.target.value);
        }}
      />
    </Form.Item>
  );

  const mintEnabled = file != null && !!nftName;

  const startMinting = () => {
    console.log(`minting nft with name ${nftName}`);
    setMinting(true);
    signer.getAddress().then(ownerAddress => {
      mintNFT({
        contract,
        provider,
        ownerAddress,
        gasPrice,
        setStatus,
        setCurrentStep,
        name: nftName,
        image: file,
        description,
      }).then(newTokenId => {
        setMinting(false);
        console.log("minting complete. Token id:", newTokenId);
        setTokenId(newTokenId);
      });
    });
  };

  const mintButton = (
    <Form.Item>
      <Button type="primary" disabled={!mintEnabled} onClick={startMinting}>
        {minting ? <LoadingOutlined /> : "Mint!"}
      </Button>
    </Form.Item>
  );

  const mintingSteps = (
    <Steps current={currentStep}>
      <Steps.Step title="Connect your wallet" />
      <Steps.Step title="Enter NFT info" />
      <Steps.Step title="Upload to nft.storage" />
      <Steps.Step title="Mint" />
      <Steps.Step title="Finished!" />
    </Steps>
  );

  const minterForm = (
    <div style={{ margin: "auto", width: "70vw" }}>
      {mintingSteps}
      <Card title={<div>Mint an NFT!</div>} size="large" style={{ marginTop: 25, width: "100%" }} loading={false}>
        <Form labelCol={{ span: 2 }}>
          {file == null && uploadView}
          {preview}
          {nameField}
          {descriptionField}
          {mintButton}
          {status}
        </Form>
      </Card>
    </div>
  );

  const openSeaHref = openSeaURL(tokenId, selectedNetwork, contractAddress);
  const openSeaLink = openSeaHref ? <a href={openSeaHref}>View on OpenSea</a> : undefined;

  const finishedView = (
    <div style={{ margin: "auto", width: "70vw" }}>
      {mintingSteps}
      <Card title={<div>Token #{tokenId}</div>} size="large" style={{ marginTop: 25, width: "100%" }} loading={false}>
        {preview}
        <Row justify="start" gutter={2}>
          <Col span={2} offset={5}>
            <Typography.Text strong>Name:</Typography.Text>
          </Col>
          <Col span={4}>{nftName}</Col>
        </Row>
        <Row justify="start" gutter={2}>
          <Col span={2} offset={5}>
            <Typography.Text strong>Description:</Typography.Text>
          </Col>
          <Col span={8}>{description}</Col>
        </Row>
        {status}
        <Row justify="center">{openSeaLink}</Row>
      </Card>
    </div>
  );

  const notConnectedView = (
    <div style={{ margin: "auto", width: "70vw" }}>
      {mintingSteps}
      <Card title="Connect your wallet" size="large" style={{ marginTop: 25, width: "100%" }} loading={false}>
        <Typography.Text>
          You'll need to connect your Ethereum wallet to get started. Look for a "Connect" button at the top of the
          page!
        </Typography.Text>
      </Card>
    </div>
  );

  if (currentStep === STEP_CONNECT_WALLET) {
    return notConnectedView;
  }

  if (currentStep === STEP_FINISHED) {
    return finishedView;
  }

  return minterForm;
}
