const { blob } = require('@solana/buffer-layout');
const { PublicKey } = require('@solana/web3.js');
const encodeDecode = (layout) => {
    const decode = layout.decode.bind(layout);
    const encode = layout.encode.bind(layout);
    return { decode, encode };
};
exports.publicKey = (property) => {
    const layout = blob(32, property);
    const { encode, decode } = encodeDecode(layout);
    const publicKeyLayout = layout;
    publicKeyLayout.decode = (buffer, offset) => {
        const src = decode(buffer, offset);
        return new PublicKey(src);
    };
    publicKeyLayout.encode = (publicKey, buffer, offset) => {
        const src = publicKey.toBuffer();
        return encode(src, buffer, offset);
    };
    console.log("Pub")
    return publicKeyLayout;
};