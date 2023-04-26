import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {
    const [name, setName] = useState();
    const [owner, setOwner] = useState();
    const [image, setImage] = useState();
    const [button, setButton] = useState();
    const [priceInput, setPriceInput] = useState();
    const [loaderHidden, setLoaderHidden] = useState(true);
    const [blur, setBlur] = useState();
    const [sellStatus, setSellStatus] = useState("");
    const [priceLabel, setPriceLabel] = useState();
    const [shouldDisplay, setDisplay] = useState(true);

    const id = props.id;
    const localhost = "http://localhost:8080/";
    const agent = new HttpAgent({ host: localhost });
    //TODO: When deploying line remove the following line
    agent.fetchRootKey();
    //TODO: When deploying line remove the above line

    let NFTActor;
    async function loadNFT() {
        NFTActor = await Actor.createActor(idlFactory, {
            agent,
            canisterId: id,
        });

        const name = await NFTActor.getName();
        const owner = await NFTActor.getOwner();
        const imageDate = await NFTActor.getAsset();
        const imageContent = new Uint8Array(imageDate);
        const image = URL.createObjectURL(
            new Blob([imageContent.buffer], { type: "image/png" })
        );

        setName(name);
        setOwner(owner.toText());
        setImage(image);

        if (props.role == "collection") {
            const nftIsListed = await opend.isListed(props.id);
            if (nftIsListed) {
                setOwner("OpenD");
                setBlur({ filter: "blur(4px)" });
                setSellStatus("Listed");
            } else {
                setButton(<Button handleClick={handleSell} text={"Sell"} />);
            }
        } else if (props.role == "discover") {
            const originalOwner = await opend.getOriginalOwner(props.id);
            if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
                setButton(<Button handleClick={handleBuy} text={"Buy"} />);
            }

            const price = await opend.getListedNFTPrice(props.id);
            setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
        }
    }

    useEffect(() => {
        loadNFT();
    }, []);

    let price;
    function handleSell() {
        console.log("Sold!");
        setPriceInput(
            <input
                placeholder="Price in DARD"
                type="number"
                className="price-input"
                value={price}
                onChange={(e) => (price = e.target.value)}
            />
        );
        setButton(<Button handleClick={sellItem} text={"Confirm"} />);
    }

    async function sellItem() {
        setLoaderHidden(false);
        console.log(props.id);
        const listingResult = await opend.listItem(props.id, Number(price));
        console.log(listingResult);
        if (listingResult == "Success") {
            const opendId = await opend.getOpenDCanisterId();
            const transferResult = await NFTActor.transferOwnership(opendId);
            console.log("trasfer" + transferResult);
            if (transferResult == "Success") {
                setLoaderHidden(true);
                setButton();
                setPriceInput();
                setOwner("OpenD");
            }
        }
    }

    async function handleBuy() {
        // console.log(Buy);
        setLoaderHidden(false);
        const tokenActor = await Actor.createActor(tokenIdlFactory, {
            agent,
            canisterId: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
        });

        const sellerId = await opend.getOriginalOwner(props.id);
        const itemPrice = await opend.getListedNFTPrice(props.id);

        const result = await tokenActor.transer(sellerId, itemPrice);
        if (result == "Success") {
            const transferResult = await opend.completePurchase(
                props.id,
                sellerId,
                CURRENT_USER_ID
            );
            console.log(transferResult);
            setLoaderHidden(true);
            setDisplay(false);
        }
    }

    return (
        <div
            style={{ display: shouldDisplay ? "inline" : "none" }}
            className="disGrid-item"
        >
            <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
                <img
                    className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
                    src={image}
                    style={blur}
                />
                <div hidden={loaderHidden} className="lds-ellipsis">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <div className="disCardContent-root">
                    {priceLabel}
                    <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
                        {name}
                        <span className="purple-text">{sellStatus}</span>
                    </h2>
                    <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
                        Owner: {owner}
                    </p>
                    {priceInput}
                    {button}
                </div>
            </div>
        </div>
    );
}

export default Item;
